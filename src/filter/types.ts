import { Opportunity } from '../core/types/opportunity.js';

/**
 * Audit record explaining whether an opportunity passed or was filtered out.
 */
export interface FilterDecision {
  /** Identifier of the evaluated opportunity */
  opportunityId: string;
  /** Whether the opportunity passed all active hard filters */
  passed: boolean;
  /** Reasons for rejection or filter passage */
  reasons: string[];
}

/**
 * Options controlling filter strictness.
 */
export interface FilterOptions {
  /** If true, strictly requires location to match when specified in UserRequest */
  strictLocation?: boolean;
  /** If true, strictly requires remote status to match when specified in UserRequest */
  strictRemote?: boolean;
  /** Reference ISO timestamp used for deadline evaluation (defaults to now) */
  referenceDate?: string;
}

/**
 * Result of the hard filtering stage.
 */
export interface FilterResult {
  /** Opportunities that met all hard constraints */
  passedOpportunities: Opportunity[];
  /** Opportunities rejected by hard constraints */
  filteredOutOpportunities: Opportunity[];
  /** Detailed filter decision for every evaluated opportunity */
  decisions: FilterDecision[];
}
