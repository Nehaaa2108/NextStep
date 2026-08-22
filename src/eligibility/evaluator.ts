import { Opportunity } from '../core/types/opportunity.js';
import { UserRequest } from '../core/types/request.js';
import { EligibilityEvaluation } from './types.js';

/**
 * Standardizes student level/year tokens for comparison.
 */
function extractStudentLevel(text: string | null | undefined): {
  isUndergrad: boolean;
  isGraduate: boolean;
  yearNumber: number | null;
} {
  const norm = (text ?? '').toLowerCase();

  let yearNumber: number | null = null;
  if (norm.includes('freshman') || norm.includes('1st year') || norm.includes('first year') || norm.includes('first-year')) {
    yearNumber = 1;
  } else if (norm.includes('sophomore') || norm.includes('2nd year') || norm.includes('second year') || norm.includes('second-year')) {
    yearNumber = 2;
  } else if (norm.includes('junior') || norm.includes('3rd year') || norm.includes('third year') || norm.includes('third-year')) {
    yearNumber = 3;
  } else if (norm.includes('senior') || norm.includes('4th year') || norm.includes('fourth year') || norm.includes('final year') || norm.includes('final-year')) {
    yearNumber = 4;
  }

  const isGraduate = norm.includes('masters') || norm.includes('graduate') || norm.includes('phd') || norm.includes('m.s.');
  const isUndergrad = !isGraduate || norm.includes('undergraduate') || norm.includes('bachelor') || norm.includes('b.s.') || norm.includes('btech') || yearNumber !== null;

  return { isUndergrad, isGraduate, yearNumber };
}

/**
 * Evaluates whether a student appears eligible for an opportunity based on available textual evidence.
 * Never invents eligibility when data is missing.
 *
 * @param opp Canonical opportunity record
 * @param request User criteria including academic year and constraints
 * @param referenceDate Optional ISO reference date for checking deadlines (default: current date)
 * @returns Structured EligibilityEvaluation
 */
export function evaluateEligibility(
  opp: Opportunity,
  request: UserRequest,
  referenceDate: string = new Date().toISOString()
): EligibilityEvaluation {
  const reasons: string[] = [];
  const mismatches: string[] = [];

  const rawEligibility = opp.eligibility;
  const oppDesc = opp.description ?? '';
  const combinedText = `${rawEligibility ?? ''} ${oppDesc}`.toLowerCase();

  // 1. Check Deadline Expiration
  if (opp.deadline) {
    const oppTime = Date.parse(opp.deadline);
    const refTime = Date.parse(referenceDate);
    if (!Number.isNaN(oppTime) && !Number.isNaN(refTime) && oppTime < refTime) {
      mismatches.push(`Application deadline (${opp.deadline}) has already expired`);
      return {
        status: 'not_eligible',
        reasons,
        mismatches,
        confidence: 'high',
      };
    }
  }

  // 2. Check If Eligibility Metadata Is Completely Absent
  if (!rawEligibility || rawEligibility.trim().length === 0) {
    // If no eligibility string exists, check if general description mentions student eligibility
    if (combinedText.includes('open to all students') || combinedText.includes('open to university students')) {
      reasons.push('General description indicates broad student openness');
      return {
        status: 'possibly_eligible',
        reasons,
        mismatches,
        confidence: 'medium',
      };
    }

    return {
      status: 'unknown',
      reasons: ['No formal eligibility criteria specified in listing'],
      mismatches: [],
      confidence: 'low',
    };
  }

  const eligibilityLower = rawEligibility.toLowerCase();
  const userLevel = extractStudentLevel(request.eligibilityYear);

  // 3. Broad Student Inclusions
  const isBroadlyInclusive =
    eligibilityLower.includes('open to all') ||
    eligibilityLower.includes('university students worldwide') ||
    eligibilityLower.includes('college students') ||
    eligibilityLower.includes('any student') ||
    eligibilityLower.includes('all undergraduate students');

  if (isBroadlyInclusive) {
    reasons.push(`Listing indicates broad student eligibility: "${rawEligibility}"`);
    return {
      status: 'eligible',
      reasons,
      mismatches,
      confidence: 'high',
    };
  }

  // 4. Specific Academic Standing Checks
  if (request.eligibilityYear) {
    // Check if listing explicitly excludes user's standing
    if (userLevel.yearNumber !== null && userLevel.yearNumber <= 2) {
      if (
        eligibilityLower.includes('final year only') ||
        eligibilityLower.includes('seniors only') ||
        eligibilityLower.includes('graduating seniors only') ||
        eligibilityLower.includes('final-year students only')
      ) {
        mismatches.push(`Listing requires final-year / graduating seniors, but user is ${request.eligibilityYear}`);
        return {
          status: 'not_eligible',
          reasons,
          mismatches,
          confidence: 'high',
        };
      }
    }

    if (userLevel.yearNumber !== null && userLevel.yearNumber >= 3) {
      if (eligibilityLower.includes('freshmen only') || eligibilityLower.includes('first-year only')) {
        mismatches.push(`Listing requires freshmen / first-year students, but user is ${request.eligibilityYear}`);
        return {
          status: 'not_eligible',
          reasons,
          mismatches,
          confidence: 'high',
        };
      }
    }

    // Check positive matches
    const matchesUserYear =
      (userLevel.yearNumber === 1 && (eligibilityLower.includes('first') || eligibilityLower.includes('freshman') || eligibilityLower.includes('1st'))) ||
      (userLevel.yearNumber === 2 && (eligibilityLower.includes('second') || eligibilityLower.includes('sophomore') || eligibilityLower.includes('2nd'))) ||
      (userLevel.yearNumber === 3 && (eligibilityLower.includes('third') || eligibilityLower.includes('junior') || eligibilityLower.includes('3rd'))) ||
      (userLevel.yearNumber === 4 && (eligibilityLower.includes('fourth') || eligibilityLower.includes('senior') || eligibilityLower.includes('4th') || eligibilityLower.includes('final')));

    if (matchesUserYear) {
      reasons.push(`Academic standing (${request.eligibilityYear}) matches listing criteria: "${rawEligibility}"`);
      return {
        status: 'eligible',
        reasons,
        mismatches,
        confidence: 'high',
      };
    }

    if (userLevel.isUndergrad && eligibilityLower.includes('undergraduate')) {
      reasons.push(`Undergraduate standing matches listing requirements: "${rawEligibility}"`);
      return {
        status: 'eligible',
        reasons,
        mismatches,
        confidence: 'high',
      };
    }
  }

  // 5. Default to possibly_eligible if text exists and has no obvious disqualifications
  reasons.push(`Eligibility criteria provided without explicit disqualifications: "${rawEligibility}"`);
  return {
    status: 'possibly_eligible',
    reasons,
    mismatches,
    confidence: 'medium',
  };
}
