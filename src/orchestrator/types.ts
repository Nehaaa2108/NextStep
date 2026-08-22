import { RankingOptions } from '../ranking/types.js';
import { WebEvidenceProvider } from '../webcmd/provider.js';
import { ProductResult } from '../core/types/result.js';

/**
 * Configuration options for the orchestration pipeline run.
 */
export interface OrchestratorOptions {
  /**
   * Evidence provider to use.
   * Defaults to MockWebEvidenceProvider when not supplied.
   */
  provider?: WebEvidenceProvider;

  /**
   * ISO reference timestamp used for deadline evaluation and urgency scoring.
   * Defaults to the current time when not supplied.
   */
  referenceDate?: string;

  /**
   * Forwarded options for the ranking stage (scoring weights, min score, etc.)
   */
  rankingOptions?: RankingOptions;
}

/**
 * Pipeline stage counters attached to the orchestration response.
 * Useful for debugging, observability, and test assertions.
 */
export interface PipelineMetadata {
  /** Number of raw results returned by the provider */
  rawResultCount: number;
  /** Number of opportunities after normalization */
  normalizedCount: number;
  /** Number of opportunities that passed validation */
  validatedCount: number;
  /** Number of validation issues (invalid records dropped) */
  validationIssueCount: number;
  /** Number of opportunities after deduplication */
  deduplicatedCount: number;
  /** Number of duplicates removed */
  duplicatesRemovedCount: number;
  /** Number of opportunities after hard filtering */
  filteredCount: number;
  /** Number of opportunities removed by hard filters */
  hardFilteredOutCount: number;
  /** Number of opportunities in final ranked output */
  rankedCount: number;
  /** Provider name that supplied the evidence */
  providerName: string;
}

/**
 * Complete result returned by the orchestration layer.
 * Extends the canonical ProductResult with pipeline observability metadata.
 */
export interface OrchestratorResult extends ProductResult {
  /** Detailed per-stage pipeline counters */
  pipeline: PipelineMetadata;
}
