import { Opportunity } from '../core/types/opportunity.js';

/**
 * Diagnostic entry for a group of duplicate records merged into a single canonical Opportunity.
 */
export interface DuplicateGroup {
  /** Identifier of the preserved canonical Opportunity */
  canonicalId: string;
  /** Identifiers of duplicate records that were merged into the canonical record */
  mergedIds: string[];
  /** The matching criterion that triggered deduplication */
  matchReason: 'CANONICAL_URL' | 'SOURCE_IDENTIFIER' | 'TITLE_ORGANIZATION_MATCH';
}

/**
 * Summary metrics of a deduplication execution.
 */
export interface DeduplicationSummary {
  /** Total count of opportunities before deduplication */
  totalInput: number;
  /** Count of unique opportunities after deduplication */
  uniqueCount: number;
  /** Total count of duplicate opportunities merged/removed */
  duplicatesRemoved: number;
  /** Details of all detected duplicate clusters */
  duplicateGroups: DuplicateGroup[];
}

/**
 * Detailed output from the deduplication engine.
 */
export interface DeduplicationResult {
  /** Deduplicated, merged canonical Opportunity records */
  opportunities: Opportunity[];
  /** Detailed summary of duplicate detection and resolution */
  summary: DeduplicationSummary;
}
