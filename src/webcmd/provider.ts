import { WebTask } from '../core/types/webtask.js';
import { WebEvidence } from '../core/types/evidence.js';

/**
 * Common contract for all web evidence providers.
 * All WebCMD or discovery integrations remain behind this abstraction.
 */
export interface WebEvidenceProvider {
  /** Identifier of the provider implementation (e.g. 'mock', 'webcmd') */
  readonly providerName: string;

  /**
   * Executes a web task and returns collected raw/semi-structured evidence.
   *
   * @param task Generic web task specification
   * @returns Promise resolving to a WebEvidence envelope
   */
  run(task: WebTask): Promise<WebEvidence>;
}
