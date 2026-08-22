import { Opportunity } from '../core/types/opportunity.js';

/**
 * Structured diagnostic information for items that encountered issues during normalization.
 */
export interface NormalizationIssue {
  /** Index of the raw item in the evidence.results array */
  itemIndex: number;
  /** Machine-readable issue code */
  code: 'MALFORMED_ITEM' | 'MISSING_TITLE' | 'UNRECOGNIZED_FORMAT' | 'INVALID_FIELD';
  /** Human-readable description of the issue */
  message: string;
  /** The raw input data that caused the issue */
  rawItem?: unknown;
}

/**
 * Standard output returned by the normalization layer.
 */
export interface NormalizationResult {
  /** Canonical Opportunity domain records successfully normalized */
  opportunities: Opportunity[];
  /** Combined warnings from evidence envelope and normalizer diagnostics */
  warnings: string[];
  /** Structured issues recorded during normalization */
  issues: NormalizationIssue[];
  /** The source system from which evidence was derived */
  evidenceSource: string;
  /** ISO 8601 timestamp of retrieval */
  retrievedAt: string;
}
