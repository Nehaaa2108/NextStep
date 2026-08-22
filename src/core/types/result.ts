import { Opportunity } from './opportunity.js';

/**
 * Status indicator for the overall execution and synthesis.
 */
export type ProductResultStatus = 'success' | 'partial' | 'error';

/**
 * An individual opportunity match ready for frontend rendering.
 */
export interface ProductOpportunityResult {
  /** Unique identifier of the opportunity */
  id: string;
  /** Title of the opportunity */
  title: string;
  /** Calculated relevance or fit score (null if un-scored at initial phase) */
  score?: number | null;
  /** Human-readable explanation of why this was matched */
  reason?: string | null;
  /** Direct link to the opportunity page */
  url?: string | null;
  /** Optional full canonical opportunity details */
  opportunity?: Opportunity;
}

/**
 * Final product response contract returned by the backend to the application/API layer.
 */
export interface ProductResult {
  /** Tracking identifier of the incoming user request */
  requestId: string;
  /** High-level execution status */
  status: ProductResultStatus;
  /** Human-readable summary of the findings or status message */
  summary: string;
  /** List of matched and structured opportunity results */
  results: ProductOpportunityResult[];
  /** Breakdown or list of sources queried to produce this result */
  sources: string[];
  /** System, provider, or processing warnings */
  warnings: string[];
}
