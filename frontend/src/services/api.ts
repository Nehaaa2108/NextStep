import type { Opportunity, SearchCriteria } from '../types';

/**
 * Searches for opportunities based on the given criteria by hitting the real backend API.
 * 
 * @param criteria - The filters applied by the user
 * @returns A promise resolving to an array of Opportunity objects
 */
export async function searchOpportunities(criteria: SearchCriteria): Promise<Opportunity[]> {
  // Magic keyword 'error' to test frontend error handling
  if (criteria.query && criteria.query.toLowerCase() === 'error') {
    throw new Error("Simulated backend failure for UX testing");
  }

  const payload = {
    query: criteria.query || "intern",
    opportunityTypes: criteria.types && criteria.types.length > 0 ? criteria.types : undefined,
    location: criteria.location || undefined,
    remote: criteria.remote !== undefined ? criteria.remote : undefined,
    skills: criteria.skills || undefined,
  };

  const response = await fetch("http://localhost:3000/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Backend search failed with status ${response.status}`);
  }

  const data = await response.json();
  const results = data.results || [];

  return results.map((res: any) => {
    let opportunityType: "internship" | "hackathon" | "competition" | "scholarship" | "other" = "other";
    const rawType = res.opportunity?.opportunity_type?.toLowerCase();
    if (rawType === "internship") {
      opportunityType = "internship";
    } else if (rawType === "hackathon") {
      opportunityType = "hackathon";
    } else if (rawType === "competition") {
      opportunityType = "competition";
    } else if (rawType === "scholarship") {
      opportunityType = "scholarship";
    }

    return {
      id: res.id,
      title: res.title,
      organization: res.opportunity?.organization ?? undefined,
      type: opportunityType,
      url: res.url,
      source: res.opportunity?.source ?? undefined,
      location: res.opportunity?.location ?? undefined,
      remote: res.opportunity?.remote ?? undefined,
      deadline: res.opportunity?.deadline ?? undefined,
      description: res.opportunity?.description ?? undefined,
      skills: res.opportunity?.skills ?? [],
      eligibility: res.opportunity?.eligibility ? [res.opportunity.eligibility] : [],
      matchScore: res.score,
      matchReason: res.reason,
    };
  });
}
