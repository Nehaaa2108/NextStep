# Integration Contract: Opportunity Radar API

## FRONTEND INPUT:
`SearchCriteria`

## FRONTEND OUTPUT:
`Opportunity[]`

## CURRENT IMPLEMENTATION:
mock/local (Simulates network delays, partial data, and UI testing features like forcing errors)

## FUTURE IMPLEMENTATION:
Person 3's backend may replace the service implementation. The frontend should continue calling only `searchOpportunities(criteria)`.

## PERSON 2 RESPONSIBILITY:
WebCMD retrieval / browser workflows / adapters / source interaction.

## PERSON 3 RESPONSIBILITY:
ingestion / normalization / deduplication / eligibility / ranking / backend logic.

## PERSON 1 RESPONSIBILITY:
Render normalized `Opportunity[]` results. Handle UX, loading, errors, empty states, partial data fallbacks, and the integration orchestrator.

## IMPORTANT RULE:
The frontend must not depend on how WebCMD obtains the data. We do not assume WebCMD behaves synchronously or perfectly. Person 1 is unaware of the backend architecture or scraping mechanics. 
