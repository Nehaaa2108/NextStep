import type { Opportunity, SearchCriteria } from '../types';
import { mockOpportunities } from '../data/mockData';

/**
 * Searches for opportunities based on the given criteria.
 * 
 * @param criteria - The filters applied by the user
 * @returns A promise resolving to an array of Opportunity objects
 */
export async function searchOpportunities(criteria: SearchCriteria): Promise<Opportunity[]> {
  // Simulate network delay for UI loading states
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Magic keyword 'error' to test frontend error handling
  if (criteria.query && criteria.query.toLowerCase() === 'error') {
    throw new Error("Simulated backend failure for UX testing");
  }

  let results = [...mockOpportunities];

  if (criteria.query) {
    const q = criteria.query.toLowerCase();
    results = results.filter(
      (opp) =>
        opp.title.toLowerCase().includes(q) ||
        (opp.organization && opp.organization.toLowerCase().includes(q))
    );
  }

  if (criteria.types && criteria.types.length > 0) {
    results = results.filter((opp) => criteria.types!.includes(opp.type));
  }

  if (criteria.remote !== undefined) {
    results = results.filter((opp) => opp.remote === criteria.remote);
  }

  // Future logic: Person 3 will replace this entire implementation with an actual
  // API call to their backend system which coordinates with WebCMD.

  return results;
}
