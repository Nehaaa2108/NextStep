import { WebEvidenceProvider } from './provider.js';
import { WebTask } from '../core/types/webtask.js';
import { WebEvidence } from '../core/types/evidence.js';
import { FixtureName, KNOWN_FIXTURES, loadFixture } from '../fixtures/index.js';

/**
 * Options for configuring MockWebEvidenceProvider behavior.
 */
export interface MockProviderOptions {
  /** Default fixture name to load if not specified in task */
  defaultFixture?: FixtureName;
}

/**
 * Mock provider implementation for deterministic offline development,
 * fixture-based testing, and normalization validation without live WebCMD.
 */
export class MockWebEvidenceProvider implements WebEvidenceProvider {
  readonly providerName = 'mock-provider';
  private readonly defaultFixture: FixtureName;

  constructor(options?: MockProviderOptions | FixtureName) {
    if (typeof options === 'string') {
      this.defaultFixture = options;
    } else {
      this.defaultFixture = options?.defaultFixture ?? 'success';
    }
  }

  /**
   * Loads and returns a deterministic WebEvidence fixture.
   *
   * Fixture selection precedence:
   * 1. task.options.metadata.fixture
   * 2. task.options.filters.fixture
   * 3. task.targetScope (if matches a known fixture name)
   * 4. Provider defaultFixture (default: 'success')
   *
   * @param task Generic web task specification
   * @returns Promise resolving to a WebEvidence envelope
   */
  async run(task: WebTask): Promise<WebEvidence> {
    const candidateName =
      (task.options?.metadata?.fixture as FixtureName | undefined) ||
      (task.options?.filters?.fixture as FixtureName | undefined) ||
      (task.targetScope && KNOWN_FIXTURES.includes(task.targetScope as FixtureName)
        ? (task.targetScope as FixtureName)
        : undefined) ||
      this.defaultFixture;

    const fixture = loadFixture(candidateName);

    // Return a deep clone so subsequent modifications don't mutate cached fixture
    return JSON.parse(JSON.stringify(fixture)) as WebEvidence;
  }
}
