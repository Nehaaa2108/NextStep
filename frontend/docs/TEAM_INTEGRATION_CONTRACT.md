# TEAM INTEGRATION CONTRACT

## A. System Architecture

Person 2  
(WebCMD)  
↓  
raw web data  
↓  
Person 3  
(normalization / deduplication / eligibility / ranking)  
↓  
canonical `Opportunity[]`  
↓  
Person 1  
(frontend)  

## B. Person 2 Handoff Requirements

- working WebCMD commands/adapters
- exact commands
- sample outputs
- source reliability expectations
- required setup
- limitations

## C. Person 3 Handoff Requirements

- backend implementation
- canonical `Opportunity` schema fulfillment
- API contract endpoints
- ranking logic details
- setup commands
- smoke tests
- limitations

## D. Person 1 Integration Point

```typescript
searchOpportunities(criteria)
```
Located in `src/services/api.ts`. All UI components depend strictly on this boundary.

## E. Rules

- **No teammate rewrites another person's subsystem without coordination.**
- **No credentials/cookies/browser sessions committed.**
- **No source-specific assumptions in frontend.** (e.g., hardcoded CSS selectors or site names acting as unique keys).
- **No frontend ranking logic.**
- **No WebCMD logic inside React components.**

## F. Final Integration Sequence

1. Person 2 complete
2. → Person 3 complete
3. → inspect both handoffs
4. → agree on final contract
5. → replace mock service
6. → end-to-end test
7. → polish
8. → demo
