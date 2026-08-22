import { UserRequest } from '../core/types/request.js';
import { ProductOpportunityResult, ProductResultStatus } from '../core/types/result.js';
import { WebTask } from '../core/types/webtask.js';
import { normalizeEvidence } from '../normalize/index.js';
import { validateOpportunities } from '../validate/index.js';
import { deduplicateOpportunities } from '../dedupe/index.js';
import { rankOpportunities } from '../ranking/ranker.js';
import { MockWebEvidenceProvider } from '../webcmd/mock-provider.js';
import { OrchestratorOptions, OrchestratorResult } from './types.js';

/**
 * Generates a lightweight deterministic request ID from a timestamp and query string.
 * No external crypto dependency required.
 */
function generateRequestId(query: string): string {
  const ts = Date.now().toString(36);
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (Math.imul(31, hash) + query.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash).toString(36).padStart(6, '0');
  return `req-${ts}-${h}`;
}

/**
 * Executes the complete offline-first intelligence pipeline:
 *
 *   UserRequest
 *     -> WebTask construction
 *     -> WebEvidenceProvider.run(task)
 *     -> normalizeEvidence
 *     -> validateOpportunities
 *     -> deduplicateOpportunities
 *     -> rankOpportunities (filter + score + rank)
 *     -> OrchestratorResult (ProductResult + pipeline metadata)
 *
 * The provider is injected — pass MockWebEvidenceProvider for offline use,
 * or any WebEvidenceProvider implementation for live use.
 *
 * @param request User search criteria and preferences
 * @param options Injection point for provider, reference date, and ranking options
 * @returns Promise resolving to the fully populated OrchestratorResult
 */
export async function runOpportunitySearch(
  request: UserRequest,
  options: OrchestratorOptions = {}
): Promise<OrchestratorResult> {
  const provider = options.provider ?? new MockWebEvidenceProvider('success');
  const refDate = options.referenceDate ?? new Date().toISOString();
  const requestId = generateRequestId(request.query);

  const warnings: string[] = [];

  // ── 1. Build WebTask from UserRequest ───────────────────────────────────
  const task: WebTask = {
    taskId: requestId,
    query: request.query,
    options: {
      filters: {
        opportunityTypes: request.opportunityTypes,
        location: request.location,
        remote: request.remote,
        skills: request.skills,
      },
    },
  };

  // ── 2. Fetch evidence from provider ─────────────────────────────────────
  const evidence = await provider.run(task);
  const rawResultCount = evidence.results.length;

  if (evidence.warnings && evidence.warnings.length > 0) {
    warnings.push(...evidence.warnings.map((w) => `[provider] ${w}`));
  }

  // ── 3. Normalize raw evidence → canonical Opportunity[] ─────────────────
  const normResult = normalizeEvidence(evidence);
  const normalizedCount = normResult.opportunities.length;

  if (normResult.issues && normResult.issues.length > 0) {
    warnings.push(
      ...normResult.issues.map((i) => `[normalize] ${i.code}: ${i.message}`)
    );
  }

  // ── 4. Validate ─────────────────────────────────────────────────────────
  const valResult = validateOpportunities(normResult.opportunities);
  const validatedCount = valResult.opportunities.length;
  const validationIssueCount = valResult.invalidOpportunities
    ? valResult.invalidOpportunities.length
    : normResult.opportunities.length - validatedCount;

  if (validationIssueCount > 0) {
    warnings.push(
      `[validate] ${validationIssueCount} opportunity record(s) failed validation and were removed`
    );
  }

  // ── 5. Deduplicate ───────────────────────────────────────────────────────
  const dedupeResult = deduplicateOpportunities(valResult.opportunities);
  const deduplicatedCount = dedupeResult.opportunities.length;
  const duplicatesRemovedCount = validatedCount - deduplicatedCount;

  if (duplicatesRemovedCount > 0) {
    warnings.push(
      `[dedupe] ${duplicatesRemovedCount} duplicate record(s) merged`
    );
  }

  // ── 6. Filter + Score + Rank ─────────────────────────────────────────────
  const rankingResult = rankOpportunities(
    dedupeResult.opportunities,
    request,
    {
      ...options.rankingOptions,
      referenceDate: refDate,
    }
  );

  const filteredCount = rankingResult.filterResult.passedOpportunities.length;
  const hardFilteredOutCount = rankingResult.filterResult.filteredOutOpportunities.length;
  const rankedCount = rankingResult.totalRanked;

  if (hardFilteredOutCount > 0) {
    warnings.push(
      `[filter] ${hardFilteredOutCount} opportunity record(s) removed by hard filters`
    );
  }

  // ── 7. Map RankedOpportunity[] → ProductOpportunityResult[] ─────────────
  const results: ProductOpportunityResult[] = rankingResult.rankedOpportunities.map(
    (ranked) => ({
      id: ranked.opportunity.id,
      title: ranked.opportunity.title,
      score: ranked.score,
      reason: ranked.reasons.slice(0, 3).join(' | '),
      url: ranked.opportunity.url ?? null,
      opportunity: ranked.opportunity,
    })
  );

  // ── 8. Determine overall status ──────────────────────────────────────────
  let status: ProductResultStatus;
  if (results.length === 0) {
    status = 'partial';
  } else if (warnings.length > 0) {
    status = 'partial';
  } else {
    status = 'success';
  }

  // ── 9. Build summary ─────────────────────────────────────────────────────
  const summary =
    results.length === 0
      ? `No matching opportunities found for "${request.query}".`
      : `Found ${results.length} opportunity${results.length === 1 ? '' : 's'} matching "${request.query}". Top result: "${results[0].title}" (score: ${results[0].score}).`;

  return {
    requestId,
    status,
    summary,
    results,
    sources: [provider.providerName],
    warnings,
    pipeline: {
      rawResultCount,
      normalizedCount,
      validatedCount,
      validationIssueCount,
      deduplicatedCount,
      duplicatesRemovedCount,
      filteredCount,
      hardFilteredOutCount,
      rankedCount,
      providerName: provider.providerName,
    },
  };
}
