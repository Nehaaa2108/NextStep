import { OpportunityType } from './request.js';

/**
 * Canonical domain record representing a discovered opportunity.
 * Unknown or optional properties are explicitly typed with null/undefined
 * rather than invented default values.
 */
export interface Opportunity {
  /** Unique canonical identifier for the opportunity record */
  id: string;
  /** Originating source or platform (e.g. 'devpost', 'linkedin', 'webcmd') */
  source: string;
  /** Title or role name of the opportunity */
  title: string;
  /** Hosting organization, sponsor, or hiring company */
  organization?: string | null;
  /** Canonical direct URL to opportunity or application page */
  url?: string | null;
  /** Type of opportunity */
  opportunity_type?: OpportunityType | string | null;
  /** Physical/geographic location if applicable */
  location?: string | null;
  /** Remote availability status (true: remote, false: onsite, null/undefined: unknown) */
  remote?: boolean | null;
  /** Full text or summary description */
  description?: string | null;
  /** Extracted or required skill tags */
  skills?: string[];
  /** Eligibility requirements (e.g., student status, location limits, prerequisites) */
  eligibility?: string | null;
  /** Application or submission deadline in ISO 8601 string format */
  deadline?: string | null;
  /** Date when the opportunity was posted in ISO 8601 string format */
  posted_date?: string | null;
  /** Compensation, prize amount, stipend, or salary info */
  stipend_or_salary?: string | null;
  /** Expected duration or program length (e.g., '12 weeks', '3 days', 'Summer 2026') */
  duration?: string | null;
  /** Raw un-normalized attributes for auditability and debugging */
  raw_source_data?: Record<string, unknown> | null;
  /** ISO 8601 timestamp when this record was retrieved */
  retrieved_at: string;
}
