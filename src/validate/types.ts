import { Opportunity } from '../core/types/opportunity.js';

/**
 * Severity level for validation issues.
 * - 'error': Critical failure; renders the opportunity unusable.
 * - 'warning': Missing or suspect optional field; opportunity remains usable.
 * - 'info': Diagnostic notice.
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Detailed description of a validation check result.
 */
export interface ValidationIssue {
  /** Identifier of the opportunity under validation */
  opportunityId?: string;
  /** The field associated with this issue */
  field: string;
  /** Machine-readable validation code */
  code: string;
  /** Human-readable explanation */
  message: string;
  /** Severity level of the issue */
  severity: ValidationSeverity;
}

/**
 * Validation result for a single Opportunity.
 */
export interface SingleValidationResult {
  /** True if the opportunity meets all required usability criteria */
  valid: boolean;
  /** The opportunity evaluated */
  opportunity: Opportunity;
  /** List of issues encountered during validation */
  issues: ValidationIssue[];
}

/**
 * Batch validation result for multiple Opportunity records.
 */
export interface BatchValidationResult {
  /** True if all opportunities in the batch are valid */
  valid: boolean;
  /** Total count of opportunities evaluated */
  total: number;
  /** Usable opportunities that passed critical validation */
  opportunities: Opportunity[];
  /** Invalid opportunities that failed critical validation */
  invalidOpportunities: Opportunity[];
  /** All validation issues collected across the batch */
  issues: ValidationIssue[];
}
