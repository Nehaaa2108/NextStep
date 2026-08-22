export interface Opportunity {
  id: string;
  title: string;
  organization?: string;
  type: "internship" | "hackathon" | "competition" | "scholarship" | "other";
  url: string;
  source?: string;
  location?: string;
  remote?: boolean;
  deadline?: string;
  description?: string;
  skills?: string[];
  eligibility?: string[];
  matchScore?: number;
  matchReason?: string;
}

export interface StudentProfile {
  name?: string;
  degree?: string;
  year?: number;
  skills: string[];
  preferredLocations: string[];
  remotePreference?: "remote" | "hybrid" | "onsite" | "any";
  opportunityTypes: string[];
}

export interface SearchCriteria {
  query?: string;
  types?: string[];
  location?: string;
  remote?: boolean;
  skills?: string[];
}

export interface SearchMetadata {
  sources?: string[];
  failedSources?: string[];
  partial?: boolean;
}

export interface SearchResponse {
  results: Opportunity[];
  metadata?: SearchMetadata;
}
