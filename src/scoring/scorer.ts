import { Opportunity } from '../core/types/opportunity.js';
import { UserRequest } from '../core/types/request.js';
import { evaluateEligibility } from '../eligibility/evaluator.js';
import { DEFAULT_SCORING_WEIGHTS, ScoringWeights } from './config.js';
import { OpportunityScoreResult, ScoreBreakdown } from './types.js';

/**
 * Normalizes text token for fuzzy-safe equality comparison.
 */
function normalizeToken(text: string | null | undefined): string {
  return (text ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Calculates the transparent 100-point relevance score and generated explanation reasons.
 *
 * @param opp Canonical Opportunity record
 * @param request User search intent and criteria
 * @param weights Optional custom scoring weights (defaults to DEFAULT_SCORING_WEIGHTS)
 * @param referenceDate Optional ISO reference date for temporal scoring
 * @returns OpportunityScoreResult with total score, breakdown, eligibility, and human-readable reasons
 */
export function scoreOpportunity(
  opp: Opportunity,
  request: UserRequest,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  referenceDate: string = new Date().toISOString()
): OpportunityScoreResult {
  const reasons: string[] = [];

  // ----------------------------------------------------
  // 1. Skill Match (30 pts)
  // ----------------------------------------------------
  let skillScore = 0;
  const reqSkills = request.skills ?? [];

  if (reqSkills.length > 0) {
    const oppSkillTokens = (opp.skills ?? []).map((s) => normalizeToken(s));
    const descNorm = (opp.description ?? '').toLowerCase();

    const matchedSkills: string[] = [];

    for (const skill of reqSkills) {
      const token = normalizeToken(skill);
      const skillLower = skill.trim().toLowerCase();

      const inStructured = oppSkillTokens.some((s) => s.includes(token) || token.includes(s));
      const inDescription = skillLower.length > 2 && descNorm.includes(skillLower);

      if (inStructured || inDescription) {
        matchedSkills.push(skill);
      }
    }

    const matchRatio = matchedSkills.length / reqSkills.length;
    skillScore = Math.round(matchRatio * weights.skillMatch);

    if (matchedSkills.length > 0) {
      reasons.push(`Matched ${matchedSkills.length}/${reqSkills.length} requested skills: ${matchedSkills.join(', ')}`);
    }
  } else {
    // Neutral skill score if user requested no specific skills
    skillScore = Math.round(weights.skillMatch * 0.7);
  }

  // ----------------------------------------------------
  // 2. Eligibility Compatibility (20 pts)
  // ----------------------------------------------------
  const eligibilityEval = evaluateEligibility(opp, request, referenceDate);
  let eligibilityScore = 0;

  switch (eligibilityEval.status) {
    case 'eligible':
      eligibilityScore = Math.round(weights.eligibilityCompatibility * 1.0);
      break;
    case 'possibly_eligible':
      eligibilityScore = Math.round(weights.eligibilityCompatibility * 0.65);
      break;
    case 'unknown':
      eligibilityScore = Math.round(weights.eligibilityCompatibility * 0.4);
      break;
    case 'not_eligible':
      eligibilityScore = 0;
      break;
  }

  if (eligibilityEval.reasons.length > 0) {
    reasons.push(...eligibilityEval.reasons);
  }

  // ----------------------------------------------------
  // 3. Location / Remote Compatibility (15 pts)
  // ----------------------------------------------------
  let locationRemoteScore = 0;

  if (request.remote === true) {
    if (opp.remote === true) {
      locationRemoteScore = weights.locationRemoteMatch;
      reasons.push('Remote listing matches remote preference');
    } else if (opp.remote === null || opp.remote === undefined) {
      locationRemoteScore = Math.round(weights.locationRemoteMatch * 0.5);
    } else {
      locationRemoteScore = 0;
    }
  } else if (request.location && request.location.trim().length > 0) {
    const reqLoc = request.location.trim().toLowerCase();
    const oppLoc = (opp.location ?? '').toLowerCase();

    if (oppLoc.includes(reqLoc) || (reqLoc.length > 3 && oppLoc.includes(reqLoc.slice(0, 4)))) {
      locationRemoteScore = weights.locationRemoteMatch;
      reasons.push(`Location matches preferred region: "${opp.location}"`);
    } else if (opp.remote === true) {
      locationRemoteScore = Math.round(weights.locationRemoteMatch * 0.8);
      reasons.push('Remote flexibility accommodates geographic preference');
    } else if (!opp.location) {
      locationRemoteScore = Math.round(weights.locationRemoteMatch * 0.5);
    } else {
      locationRemoteScore = Math.round(weights.locationRemoteMatch * 0.15);
    }
  } else {
    // Neutral when no location constraint specified
    locationRemoteScore = weights.locationRemoteMatch;
  }

  // ----------------------------------------------------
  // 4. Opportunity Type Match (15 pts)
  // ----------------------------------------------------
  let typeScore = 0;
  if (request.opportunityTypes && request.opportunityTypes.length > 0) {
    const reqTypes = request.opportunityTypes.map((t) => t.toLowerCase());
    const oppType = (opp.opportunity_type ?? '').toLowerCase();

    if (reqTypes.includes(oppType)) {
      typeScore = weights.opportunityTypeMatch;
      reasons.push(`Opportunity category "${opp.opportunity_type}" directly matches request`);
    } else if (!opp.opportunity_type) {
      typeScore = Math.round(weights.opportunityTypeMatch * 0.5);
    } else {
      typeScore = 0;
    }
  } else {
    typeScore = weights.opportunityTypeMatch;
  }

  // ----------------------------------------------------
  // 5. User Preferences (10 pts)
  // ----------------------------------------------------
  let preferenceScore = 0;
  const prefs = request.preferences ?? {};
  const hasSpecificPrefs = Object.keys(prefs).length > 0;

  if (hasSpecificPrefs) {
    let earned = 0;
    let totalChecks = 0;

    if (prefs.preferPaid || prefs.requirePaid || prefs.minStipend || prefs.minPrize) {
      totalChecks += 5;
      if (opp.stipend_or_salary && !['unpaid', '$0', '0'].includes(opp.stipend_or_salary.toLowerCase().trim())) {
        earned += 5;
        reasons.push(`Compensation provided: ${opp.stipend_or_salary}`);
      }
    }

    if (prefs.duration || prefs.preferredDuration) {
      totalChecks += 5;
      const prefDur = String(prefs.duration || prefs.preferredDuration).toLowerCase();
      const oppDur = `${opp.duration ?? ''} ${opp.description ?? ''}`.toLowerCase();
      if (oppDur.includes(prefDur)) {
        earned += 5;
        reasons.push(`Duration matches preference: ${opp.duration}`);
      }
    }

    preferenceScore = totalChecks > 0 ? Math.round((earned / totalChecks) * weights.userPreferences) : weights.userPreferences;
  } else {
    preferenceScore = weights.userPreferences;
  }

  // ----------------------------------------------------
  // 6. Deadline Urgency (5 pts)
  // ----------------------------------------------------
  let deadlineScore = 0;
  if (opp.deadline) {
    const deadlineTime = Date.parse(opp.deadline);
    const refTime = Date.parse(referenceDate);

    if (!Number.isNaN(deadlineTime) && !Number.isNaN(refTime)) {
      const diffDays = (deadlineTime - refTime) / (1000 * 60 * 60 * 24);
      if (diffDays < 0) {
        deadlineScore = 0;
      } else if (diffDays <= 7) {
        deadlineScore = weights.deadlineUrgency;
        reasons.push(`Application closing soon in ${Math.ceil(diffDays)} days (${opp.deadline})`);
      } else if (diffDays <= 30) {
        deadlineScore = Math.round(weights.deadlineUrgency * 0.8);
        reasons.push(`Active application deadline: ${opp.deadline}`);
      } else if (diffDays <= 90) {
        deadlineScore = Math.round(weights.deadlineUrgency * 0.6);
      } else {
        deadlineScore = Math.round(weights.deadlineUrgency * 0.4);
      }
    }
  } else {
    deadlineScore = Math.round(weights.deadlineUrgency * 0.4);
  }

  // ----------------------------------------------------
  // 7. Data Quality (5 pts)
  // ----------------------------------------------------
  let qualityPoints = 0;
  if (opp.description && opp.description.trim().length > 15) qualityPoints += 1;
  if (opp.url && opp.url.startsWith('http')) qualityPoints += 1;
  if (opp.organization && opp.organization.trim().length > 0) qualityPoints += 1;
  if (Array.isArray(opp.skills) && opp.skills.length > 0) qualityPoints += 1;
  if (opp.deadline || opp.stipend_or_salary) qualityPoints += 1;

  const qualityScore = Math.min(weights.dataQuality, qualityPoints);

  // ----------------------------------------------------
  // Total Sum
  // ----------------------------------------------------
  const totalScore = Math.min(
    100,
    Math.max(
      0,
      skillScore +
        eligibilityScore +
        locationRemoteScore +
        typeScore +
        preferenceScore +
        deadlineScore +
        qualityScore
    )
  );

  const breakdown: ScoreBreakdown = {
    skillScore,
    eligibilityScore,
    locationRemoteScore,
    typeScore,
    preferenceScore,
    deadlineScore,
    qualityScore,
    totalScore,
  };

  return {
    opportunity: opp,
    score: totalScore,
    eligibility: eligibilityEval,
    reasons,
    breakdown,
  };
}
