/**
 * Category of student eligibility compatibility.
 * - 'eligible': Direct positive evidence that the user meets all stated criteria.
 * - 'possibly_eligible': Criteria appear compatible or general, but lack explicit year-by-year confirmation.
 * - 'not_eligible': Explicit negative evidence or clear violation of stated eligibility requirements.
 * - 'unknown': No eligibility information is available in the listing.
 */
export type EligibilityStatus =
  | 'eligible'
  | 'possibly_eligible'
  | 'not_eligible'
  | 'unknown';

/**
 * Detailed structured evaluation of a candidate's eligibility for an opportunity.
 */
export interface EligibilityEvaluation {
  /** High-level eligibility status */
  status: EligibilityStatus;
  /** Positive evidence confirming or supporting eligibility */
  reasons: string[];
  /** Explicit mismatches or disqualifying criteria */
  mismatches: string[];
  /** Confidence level based on available listing text */
  confidence: 'high' | 'medium' | 'low';
}
