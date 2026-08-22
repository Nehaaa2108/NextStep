/**
 * Represents an individual structured or semi-structured evidence item
 * discovered by a web evidence provider.
 */
export interface WebEvidenceItem {
  /** Identifier of the item within the provider output if available */
  id?: string;
  /** Title or headline of the discovered entry */
  title?: string;
  /** Direct URL or link captured in the evidence */
  url?: string;
  /** Text snippet, summary, or extracted content */
  snippet?: string;
  /** Raw properties or unstructured payload for future normalization */
  raw?: Record<string, unknown>;
}

/**
 * Standard envelope containing all evidence produced by a WebEvidenceProvider run.
 */
export interface WebEvidence {
  /** Name of the evidence source/provider (e.g. 'webcmd', 'mock-provider') */
  source: string;
  /** The command, search expression, or query executed to retrieve this evidence */
  command?: string;
  /** The extraction or discovery strategy used (e.g. 'dom-extract', 'cli-search') */
  strategy?: string;
  /** Browser or execution engine metadata if applicable */
  browser?: string | null;
  /** ISO 8601 timestamp when the evidence was collected */
  retrievedAt: string;
  /** Discovered structured source evidence items ready for subsequent normalization */
  results: WebEvidenceItem[];
  /** Non-fatal warnings or diagnostic notices generated during discovery */
  warnings?: string[];
  /** Reference identifier or pointer to raw output / session artifact */
  rawRef?: string | null;
}
