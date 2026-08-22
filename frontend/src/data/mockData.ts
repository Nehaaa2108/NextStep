import type { Opportunity, StudentProfile } from '../types';

export const mockProfile: StudentProfile = {
  name: "Alex Student",
  degree: "Computer Science",
  year: 3,
  skills: ["React", "TypeScript", "Node.js", "Python"],
  preferredLocations: ["San Francisco, CA", "New York, NY", "Seattle, WA"],
  remotePreference: "hybrid",
  opportunityTypes: ["internship", "hackathon"],
};

export const mockOpportunities: Opportunity[] = [
  {
    id: "opp_1",
    title: "Frontend Engineering Intern (Summer 2027)",
    organization: "TechNova",
    type: "internship",
    url: "https://example.com/technova-intern",
    source: "Greenhouse",
    location: "San Francisco, CA",
    remote: false,
    deadline: "2026-10-15T00:00:00Z",
    description: "Join our core product team to build the next generation of our web platform.",
    skills: ["React", "TypeScript", "GraphQL"],
    matchScore: 92,
    matchReason: "Strong match for your React and TypeScript skills, and matches your preferred location (San Francisco)."
  },
  {
    id: "opp_2",
    title: "Global AI Hackathon 2026",
    organization: "AI Builders Alliance",
    type: "hackathon",
    url: "https://example.com/ai-hackathon",
    source: "Devpost",
    location: "Global",
    remote: true,
    deadline: "2026-09-01T00:00:00Z",
    description: "A 48-hour virtual hackathon focused on building agentic AI tools.",
    skills: ["Python", "AI", "Machine Learning"],
    matchScore: 85,
    matchReason: "Matches your interest in hackathons and leverages your Python background."
  },
  {
    id: "opp_3",
    title: "Software Developer Intern",
    organization: "FinStack",
    type: "internship",
    url: "https://example.com/finstack",
    source: "Workday",
    location: "New York, NY",
    remote: true,
    deadline: "2026-11-01T00:00:00Z",
    description: "Help build robust financial APIs using Node.js.",
    skills: ["Node.js", "PostgreSQL", "AWS"],
    matchScore: 78,
    matchReason: "Matches your Node.js skill and remote preference."
  },
  {
    id: "opp_4",
    title: "Design Research Scholarship",
    type: "scholarship",
    url: "https://example.com/scholarship-design",
    // Missing organization, source, location, deadline, skills, matchScore, and matchReason
    // to test UI robustness against sparse real-world data
  }
];
