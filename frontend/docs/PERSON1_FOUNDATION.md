# Person 1 Foundation

## Current Frontend Architecture
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 6
- **Styling:** Tailwind CSS (v4) + PostCSS
- **State:** React Local State (`useState`, `useEffect`)

## Important Files
- `src/App.tsx`: Main dashboard and search orchestrator. Handles loading, error, empty, and partial-result UI states.
- `src/components/OpportunityCard.tsx`: Robust display component. Safely handles missing fields (like missing location, deadline, or match score).
- `src/services/api.ts`: The primary integration boundary.
- `src/types/index.ts`: Shared domain types (`Opportunity`, `SearchCriteria`, `StudentProfile`).

## Frontend Service Boundary
All backend interactions are localized to:
```typescript
// src/services/api.ts
export async function searchOpportunities(criteria: SearchCriteria): Promise<Opportunity[]>
```

## Current Mock Implementation
The frontend uses a local hardcoded array (`src/data/mockData.ts`). The mock service simulates network delay (800ms).
**QA Features:**
- A test opportunity (`opp_4`) is included with sparsely populated fields to verify UI robustness.
- Typing `error` into the search bar will simulate a failed request and display the Error State.

## Integration Expectations for Person 2
Person 2 (WebCMD Engineer) should **not** modify this frontend. Your responsibility is to use WebCMD to fetch data, build browser workflows, and push that data to Person 3's backend.

## Integration Expectations for Person 3
Person 3 (Backend Engineer) is expected to:
1. Replace `searchOpportunities` in `api.ts` with a real `fetch`/`axios` call to the backend.
2. Ensure the backend response matches the `Opportunity` interface.
3. If partial results/metadata are needed, wrap the response in the optional `SearchResponse` interface (defined in `types/index.ts`) and modify `App.tsx` state to consume the metadata.

## Known Limitations
- The student profile is currently read-only and hardcoded.
- Filtering is extremely basic (only Types and Remote are strictly evaluated). Complex query parsing and skill-matching is delegated to the future backend.
- We do not use Redux/Zustand or handle deep-linking/URL state for search filters.

## Exact Verification Commands
1. **Type & Build Check:** `npm run build`
2. **Start Dev Server:** `npm run dev`
