/**
 * Configurable weights for the transparent 100-point scoring model.
 */
export interface ScoringWeights {
  /** Points allocated to proportional skill match (default: 30) */
  skillMatch: number;
  /** Points allocated to student eligibility evaluation (default: 20) */
  eligibilityCompatibility: number;
  /** Points allocated to location / remote compatibility (default: 15) */
  locationRemoteMatch: number;
  /** Points allocated to opportunity type alignment (default: 15) */
  opportunityTypeMatch: number;
  /** Points allocated to user custom preferences (default: 10) */
  userPreferences: number;
  /** Points allocated to deadline urgency and freshness (default: 5) */
  deadlineUrgency: number;
  /** Points allocated to listing data completeness/quality (default: 5) */
  dataQuality: number;
}

/**
 * Default initial scoring weights.
 * Centralized for easy post-MVP calibration.
 */
export const DEFAULT_SCORING_WEIGHTS: Readonly<ScoringWeights> = {
  skillMatch: 30,
  eligibilityCompatibility: 20,
  locationRemoteMatch: 15,
  opportunityTypeMatch: 15,
  userPreferences: 10,
  deadlineUrgency: 5,
  dataQuality: 5,
};
