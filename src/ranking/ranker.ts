import { Opportunity } from '../core/types/opportunity.js';
import { UserRequest } from '../core/types/request.js';
import { filterOpportunities } from '../filter/filter.js';
import { scoreOpportunity } from '../scoring/scorer.js';
import { OpportunityScoreResult } from '../scoring/types.js';
import { RankedOpportunity, RankingOptions, RankingResult } from './types.js';

/**
 * Numeric priority for eligibility tie-breaking.
 */
function getEligibilityPriority(status: string): number {
  switch (status) {
    case 'eligible':
      return 3;
    case 'possibly_eligible':
      return 2;
    case 'unknown':
      return 1;
    default:
      return 0;
  }
}

/**
 * Deterministic comparator for ranked opportunities.
 *
 * Tie-breaking rules:
 * 1. Score descending
 * 2. Eligibility status priority descending
 * 3. Earlier deadline ascending (if both deadlines exist and are valid)
 * 4. Canonical Opportunity ID ascending
 */
export function compareRankedOpportunities(
  a: OpportunityScoreResult,
  b: OpportunityScoreResult
): number {
  // 1. Primary: Score descending
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  // 2. Secondary: Eligibility priority descending
  const prioA = getEligibilityPriority(a.eligibility.status);
  const prioB = getEligibilityPriority(b.eligibility.status);
  if (prioB !== prioA) {
    return prioB - prioA;
  }

  // 3. Tertiary: Earlier deadline ascending
  const deadA = a.opportunity.deadline ? Date.parse(a.opportunity.deadline) : NaN;
  const deadB = b.opportunity.deadline ? Date.parse(b.opportunity.deadline) : NaN;

  if (!Number.isNaN(deadA) && !Number.isNaN(deadB) && deadA !== deadB) {
    return deadA - deadB;
  }

  // 4. Quaternary: Lexicographical canonical ID ascending
  return a.opportunity.id.localeCompare(b.opportunity.id);
}

/**
 * Executes the complete intelligence pipeline:
 * Filter -> Score -> Sort -> Assign Ranks
 *
 * @param opportunities Canonical opportunity records
 * @param request User criteria and preferences
 * @param options Configuration for scoring weights, threshold, and dates
 * @returns RankingResult with deterministically ordered opportunities
 */
export function rankOpportunities(
  opportunities: Opportunity[],
  request: UserRequest,
  options: RankingOptions = {}
): RankingResult {
  const refDate = options.referenceDate ?? new Date().toISOString();

  // 1. Hard Filtering
  const filterResult = filterOpportunities(opportunities, request, {
    strictLocation: options.strictLocation,
    referenceDate: refDate,
  });

  // 2. Scoring & Eligibility Evaluation
  const scoredResults: OpportunityScoreResult[] = [];
  const minScore = options.minScoreThreshold ?? 0;

  for (const opp of filterResult.passedOpportunities) {
    const scored = scoreOpportunity(opp, request, options.weights, refDate);
    if (scored.score >= minScore) {
      scoredResults.push(scored);
    }
  }

  // 3. Deterministic Sorting
  scoredResults.sort(compareRankedOpportunities);

  // 4. Assign 1-indexed ranks
  const rankedOpportunities: RankedOpportunity[] = scoredResults.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  return {
    rankedOpportunities,
    filterResult,
    totalEvaluated: opportunities.length,
    totalRanked: rankedOpportunities.length,
  };
}
