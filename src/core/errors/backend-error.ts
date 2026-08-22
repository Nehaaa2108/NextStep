/**
 * Pipeline stages where backend errors can occur.
 */
export type ErrorStage =
  | 'discovery'
  | 'execution'
  | 'parse'
  | 'validation'
  | 'domain';

/**
 * Machine-readable details for backend errors.
 */
export interface BackendErrorDetails {
  /** The stage in the pipeline where the error occurred */
  stage: ErrorStage;
  /** Machine-readable error code (e.g. 'PROVIDER_TIMEOUT', 'PARSE_FAILURE') */
  code: string;
  /** Human-readable explanation of the error */
  message: string;
  /** Additional diagnostic details or metadata */
  details?: unknown;
  /** Underlying cause if wrapping another error */
  cause?: unknown;
}

/**
 * Standard backend error class providing structured stage and code tracking.
 */
export class BackendError extends Error {
  readonly stage: ErrorStage;
  readonly code: string;
  readonly details?: unknown;

  constructor(options: BackendErrorDetails) {
    super(options.message);
    this.name = 'BackendError';
    this.stage = options.stage;
    this.code = options.code;
    this.details = options.details;
    if (options.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serializes the error to a machine-readable JSON structure.
   */
  toJSON(): BackendErrorDetails {
    return {
      stage: this.stage,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
