/**
 * Common opportunity categories supported by Opportunity Radar.
 */
export type OpportunityType =
  | 'internship'
  | 'hackathon'
  | 'grant'
  | 'fellowship'
  | 'job'
  | 'scholarship'
  | 'research'
  | 'other';

/**
 * Represents the incoming student/user search intent and criteria.
 */
export interface UserRequest {
  /** Natural language search intent or keyword query */
  query: string;
  /** Opportunity types of interest (e.g. hackathon, internship) */
  opportunityTypes?: OpportunityType[];
  /** Preferred location constraint (e.g., 'San Francisco', 'India', 'Global') */
  location?: string;
  /** Whether the user prefers remote opportunities (true: remote, false: in-person, undefined: no preference) */
  remote?: boolean;
  /** List of relevant user skills or focus technologies */
  skills?: string[];
  /** Academic year, education level, or graduation cohort (e.g., 'Sophomore', 'Class of 2027', 'Masters') */
  eligibilityYear?: string;
  /** ISO date or temporal constraint (e.g., 'after 2026-09-01', 'within 30 days') */
  deadlineConstraint?: string;
  /** Additional user preferences (e.g. minimum stipend, specific duration) */
  preferences?: Record<string, string | number | boolean>;
}
