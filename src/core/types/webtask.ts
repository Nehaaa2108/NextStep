/**
 * Execution parameters and configuration for a web evidence task.
 */
export interface WebTaskOptions {
  /** Maximum number of raw results or evidence snippets to retrieve */
  maxResults?: number;
  /** Timeout in milliseconds for task execution */
  timeoutMs?: number;
  /** Category or tags guiding discovery (e.g. ['hackathons', 'internships']) */
  categories?: string[];
  /** Custom filters or extraction parameters */
  filters?: Record<string, unknown>;
  /** Additional contextual metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Generic task specification passed to any WebEvidenceProvider implementation.
 * Designed to remain website-agnostic and provider-agnostic.
 */
export interface WebTask {
  /** Unique task identifier */
  taskId: string;
  /** Primary search query or intent to execute */
  query: string;
  /** Optional target scope or discovery domain */
  targetScope?: string;
  /** Optional execution parameters */
  options?: WebTaskOptions;
}
