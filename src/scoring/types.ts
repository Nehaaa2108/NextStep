import { Opportunity } from '../core/types/opportunity.js';
import { EligibilityEvaluation } from '../eligibility/types.js';

/**
 * Breakdown of individual scoring dimensions contributing to the total score.
 */
export interface ScoreBreakdown {
  skillScore: number;
  eligibilityScore: number;
  locationRemoteScore: number;
  typeScore: number;
  preferenceScore: number;
  deadlineScore: number;
  qualityScore: number;
  totalScore: number;
}

/**
 * Evaluation and scored result for an opportunity against a user request.
 */
export interface OpportunityScoreResult {
  opportunity: Opportunity;
  score: number;
  eligibility: EligibilityEvaluation;
  reasons: string[];
  breakdown: ScoreBreakdown;
}
