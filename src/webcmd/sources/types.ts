import { WebEvidence } from '../../core/types/evidence.js';
import { UserRequest } from '../../core/types/request.js';

/**
 * Identifies a registered data source supported by the WebCMD provider.
 */
export type SourceId = 'devfolio' | 'arbeitnow';

/**
 * Result of a single source adapter run — either evidence or a structured failure.
 */
export type SourceResult =
  | { ok: true; evidence: WebEvidence }
  | { ok: false; sourceId: SourceId; error: string; code: string };

/**
 * Configuration passed to every source adapter at execution time.
 */
export interface SourceAdapterOptions {
  /**
   * ISO reference timestamp for this request.
   * Used to stamp retrieved_at on evidence records.
   */
  referenceDate?: string;
  /**
   * Timeout in milliseconds for this source fetch.
   * @default 15000
   */
  timeoutMs?: number;
  /**
   * If true, load data from the deterministic offline fixture instead of making
   * a live call. Used in unit tests and offline development.
   * @default false
   */
  useFixture?: boolean;
}

/**
 * Contract for a single source adapter.
 *
 * Each adapter is responsible for:
 * - Mapping a UserRequest to a source-specific invocation
 * - Executing the invocation (live command or fixture)
 * - Returning raw evidence in the standard WebEvidence envelope
 * - Handling source-specific failures gracefully
 */
export interface SourceAdapter {
  /** Unique identifier for this source */
  readonly sourceId: SourceId;

  /**
   * Fetch raw evidence for the given user request.
   *
   * MUST NOT throw. Returns a discriminated SourceResult union instead.
   * MUST NOT normalize, filter, or score results.
   * Raw source-specific JSON should be preserved in WebEvidenceItem.raw.
   */
  fetch(request: UserRequest, options?: SourceAdapterOptions): Promise<SourceResult>;
}
