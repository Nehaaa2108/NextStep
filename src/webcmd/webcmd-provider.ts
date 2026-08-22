import { WebEvidenceProvider } from './provider.js';
import { WebTask } from '../core/types/webtask.js';
import { WebEvidence, WebEvidenceItem } from '../core/types/evidence.js';
import { UserRequest } from '../core/types/request.js';
import { SourceAdapter, SourceAdapterOptions } from './sources/types.js';
import { DevfolioAdapter } from './sources/devfolio.js';
import { ArbeitnowAdapter } from './sources/arbeitnow.js';

/**
 * Options for WebCmdProvider.
 */
export interface WebCmdProviderOptions {
  /**
   * If true, all source adapters use their deterministic offline fixtures.
   * Enables fully offline testing without any network or webcmd process calls.
   * @default false
   */
  useFixture?: boolean;

  /**
   * Per-source timeout in milliseconds.
   * @default 15000
   */
  timeoutMs?: number;

  /**
   * Custom source adapters to use instead of the built-in set.
   * Useful for injecting stubs in tests.
   */
  adapters?: SourceAdapter[];
}

/**
 * Real WebCMD provider implementation.
 *
 * Queries multiple registered source adapters in parallel, merges their
 * WebEvidence results into a single combined envelope, and surfaces
 * source-level failures as warnings without crashing the pipeline.
 *
 * Architecture:
 *   WebCmdProvider.run(task)
 *     → DevfolioAdapter.fetch()  → WebEvidence (devfolio items)
 *     → ArbeitnowAdapter.fetch() → WebEvidence (arbeitnow items)
 *     → merge into combined WebEvidence
 *     → upstream normalization pipeline
 *
 * Failure handling:
 *   - If one source fails: results from the other source are returned + warning
 *   - If all sources fail: empty WebEvidence + warnings (no crash)
 *   - Malformed outputs: recorded as warnings, not exceptions
 */
export class WebCmdProvider implements WebEvidenceProvider {
  readonly providerName = 'webcmd';

  private readonly adapters: SourceAdapter[];
  private readonly useFixture: boolean;
  private readonly timeoutMs: number;

  constructor(options: WebCmdProviderOptions = {}) {
    this.useFixture = options.useFixture ?? false;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.adapters = options.adapters ?? [
      new DevfolioAdapter(),
      new ArbeitnowAdapter(),
    ];
  }

  /**
   * Executes all registered source adapters in parallel and merges their
   * evidence into a single WebEvidence envelope.
   *
   * @param task WebTask carrying UserRequest fields
   * @returns Combined WebEvidence from all available sources
   */
  async run(task: WebTask): Promise<WebEvidence> {
    const retrievedAt = new Date().toISOString();

    // Reconstruct a lightweight UserRequest from the WebTask
    // The orchestrator previously embedded request fields in task.options.filters
    const userRequest: UserRequest = {
      query: task.query,
      opportunityTypes: task.options?.filters?.['opportunityTypes'] as UserRequest['opportunityTypes'] ?? undefined,
      location: task.options?.filters?.['location'] as string | undefined,
      remote: task.options?.filters?.['remote'] as boolean | undefined,
      skills: task.options?.filters?.['skills'] as string[] | undefined,
    };

    const adapterOptions: SourceAdapterOptions = {
      referenceDate: retrievedAt,
      timeoutMs: this.timeoutMs,
      useFixture: this.useFixture,
    };

    // ── Run all adapters in parallel ─────────────────────────────────────
    const settledResults = await Promise.allSettled(
      this.adapters.map((adapter) => adapter.fetch(userRequest, adapterOptions))
    );

    const allItems: WebEvidenceItem[] = [];
    const warnings: string[] = [];
    const sourcesQueried: string[] = [];

    for (let i = 0; i < settledResults.length; i++) {
      const adapter = this.adapters[i];
      const settled = settledResults[i];

      if (settled.status === 'rejected') {
        // Unexpected thrown exception (should not happen per SourceAdapter contract)
        warnings.push(
          `[${adapter.sourceId}] Unexpected adapter exception: ${
            settled.reason instanceof Error ? settled.reason.message : String(settled.reason)
          }`
        );
        continue;
      }

      const result = settled.value;

      if (!result.ok) {
        warnings.push(`[${result.sourceId}] ${result.code}: ${result.error}`);
        continue;
      }

      // Merge items and track which sources contributed
      allItems.push(...result.evidence.results);
      sourcesQueried.push(adapter.sourceId);

      // Bubble up any source-level warnings
      if (result.evidence.warnings && result.evidence.warnings.length > 0) {
        warnings.push(
          ...result.evidence.warnings.map((w) => `[${adapter.sourceId}] ${w}`)
        );
      }
    }

    if (sourcesQueried.length === 0) {
      warnings.push(
        'All source adapters failed. Returning empty evidence. Check webcmd availability and network access.'
      );
    }

    return {
      source: 'webcmd',
      command: `multi-source: ${sourcesQueried.join(', ') || 'none'}`,
      strategy: 'parallel-source-fetch',
      retrievedAt,
      results: allItems,
      warnings,
    };
  }
}
