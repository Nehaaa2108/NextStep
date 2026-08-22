import { Opportunity } from '../core/types/opportunity.js';
import {
  DuplicateGroup,
  DeduplicationResult,
} from './types.js';

/**
 * Tracking parameters stripped during URL canonicalization.
 */
const TRACKING_PARAMS: ReadonlySet<string> = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'source',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
]);

/**
 * Deterministically normalizes a URL string for duplicate comparison.
 * - Trims whitespace
 * - Standardizes host & protocol casing
 * - Removes tracking query parameters
 * - Removes hash fragment
 * - Strips redundant trailing slash on pathnames
 */
export function normalizeUrlForDedupe(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Strip tracking query parameters
    const searchParams = new URLSearchParams(parsed.search);
    for (const key of Array.from(searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        searchParams.delete(key);
      }
    }

    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    const cleanSearch = searchParams.toString();
    const finalSearch = cleanSearch.length > 0 ? `?${cleanSearch}` : '';

    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${pathname}${finalSearch}`;
  } catch {
    return null;
  }
}

/**
 * Safely normalizes text for exact matching (lowercased, collapsed whitespace, punctuation stripped).
 */
export function normalizeTextForMatching(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const collapsed = text
    .trim()
    .toLowerCase()
    .replace(/[\s\-_/\\|,.]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  return collapsed.length > 0 ? collapsed : null;
}

/**
 * Computes a completeness score for an Opportunity record to guide merge precedence.
 */
export function calculateCompletenessScore(opp: Opportunity): number {
  let score = 0;

  if (opp.title && opp.title.trim().length > 0) score += 2;
  if (opp.organization && opp.organization.trim().length > 0) score += 2;
  if (opp.url && opp.url.trim().length > 0) score += 2;
  if (opp.description && opp.description.trim().length > 0) score += 3;
  if (opp.eligibility && opp.eligibility.trim().length > 0) score += 2;
  if (opp.deadline && opp.deadline.trim().length > 0) score += 2;
  if (opp.stipend_or_salary && opp.stipend_or_salary.trim().length > 0) score += 2;
  if (opp.duration && opp.duration.trim().length > 0) score += 1;
  if (opp.location && opp.location.trim().length > 0) score += 1;
  if (opp.posted_date && opp.posted_date.trim().length > 0) score += 1;
  if (opp.remote !== null && opp.remote !== undefined) score += 1;
  if (opp.opportunity_type) score += 1;
  if (Array.isArray(opp.skills) && opp.skills.length > 0) score += opp.skills.length;

  return score;
}

/**
 * Merges two duplicate opportunities deterministically.
 * Preserves the base (more complete) record and enriches it with non-conflicting data from other.
 */
export function mergeDuplicatePair(base: Opportunity, other: Opportunity): Opportunity {
  // Combine and deduplicate skills (case-insensitive comparison)
  const combinedSkills: string[] = [];
  const seenSkills = new Set<string>();

  for (const skill of base.skills ?? []) {
    const key = skill.trim().toLowerCase();
    if (key.length > 0 && !seenSkills.has(key)) {
      seenSkills.add(key);
      combinedSkills.push(skill.trim());
    }
  }

  for (const skill of other.skills ?? []) {
    const key = skill.trim().toLowerCase();
    if (key.length > 0 && !seenSkills.has(key)) {
      seenSkills.add(key);
      combinedSkills.push(skill.trim());
    }
  }

  return {
    ...base,
    organization: base.organization ?? other.organization ?? null,
    url: base.url ?? other.url ?? null,
    opportunity_type: base.opportunity_type ?? other.opportunity_type ?? null,
    location: base.location ?? other.location ?? null,
    remote: base.remote !== null && base.remote !== undefined ? base.remote : (other.remote ?? null),
    description: base.description ?? other.description ?? null,
    skills: combinedSkills,
    eligibility: base.eligibility ?? other.eligibility ?? null,
    deadline: base.deadline ?? other.deadline ?? null,
    posted_date: base.posted_date ?? other.posted_date ?? null,
    stipend_or_salary: base.stipend_or_salary ?? other.stipend_or_salary ?? null,
    duration: base.duration ?? other.duration ?? null,
    raw_source_data: base.raw_source_data ?? other.raw_source_data ?? null,
  };
}

/**
 * Deterministically deduplicates an array of canonical Opportunity records.
 *
 * Matching Hierarchy:
 * 1. Exact Canonical URL
 * 2. Source-specific identifier (raw_source_data.id)
 * 3. Strong Title + Organization match
 *
 * @param opportunities Array of canonical Opportunity objects
 * @returns DeduplicationResult with deduplicated opportunities and summary metrics
 */
export function deduplicateOpportunities(opportunities: Opportunity[]): DeduplicationResult {
  if (opportunities.length === 0) {
    return {
      opportunities: [],
      summary: {
        totalInput: 0,
        uniqueCount: 0,
        duplicatesRemoved: 0,
        duplicateGroups: [],
      },
    };
  }

  const urlMap = new Map<string, number>();
  const sourceIdMap = new Map<string, number>();
  const titleOrgMap = new Map<string, number>();

  // Stores cluster arrays of duplicate opportunities
  const clusters: Opportunity[][] = [];
  const clusterMatchReasons: DuplicateGroup['matchReason'][] = [];

  for (const opp of opportunities) {
    const normUrl = normalizeUrlForDedupe(opp.url);
    const normTitle = normalizeTextForMatching(opp.title);
    const normOrg = normalizeTextForMatching(opp.organization);

    const rawId =
      opp.raw_source_data && typeof opp.raw_source_data === 'object' && 'id' in opp.raw_source_data
        ? String(opp.raw_source_data.id).trim()
        : null;

    let matchedClusterIndex: number | null = null;
    let matchReason: DuplicateGroup['matchReason'] = 'CANONICAL_URL';

    // 1. Try URL match
    if (normUrl && urlMap.has(normUrl)) {
      matchedClusterIndex = urlMap.get(normUrl)!;
      matchReason = 'CANONICAL_URL';
    }
    // 2. Try Source Identifier match
    else if (rawId && rawId.length > 0) {
      const sourceIdKey = `${opp.source}::${rawId}`;
      if (sourceIdMap.has(sourceIdKey)) {
        matchedClusterIndex = sourceIdMap.get(sourceIdKey)!;
        matchReason = 'SOURCE_IDENTIFIER';
      }
    }
    // 3. Try Strong Title + Organization match
    else if (normTitle && normOrg) {
      const titleOrgKey = `${normTitle}::${normOrg}`;
      if (titleOrgMap.has(titleOrgKey)) {
        matchedClusterIndex = titleOrgMap.get(titleOrgKey)!;
        matchReason = 'TITLE_ORGANIZATION_MATCH';
      }
    }

    if (matchedClusterIndex !== null) {
      // Add to existing cluster and record the matching criterion
      clusters[matchedClusterIndex].push(opp);
      clusterMatchReasons[matchedClusterIndex] = matchReason;
    } else {
      // Create new cluster
      const newIndex = clusters.length;
      clusters.push([opp]);
      clusterMatchReasons.push(matchReason);

      if (normUrl) {
        urlMap.set(normUrl, newIndex);
      }
      if (rawId && rawId.length > 0) {
        sourceIdMap.set(`${opp.source}::${rawId}`, newIndex);
      }
      if (normTitle && normOrg) {
        titleOrgMap.set(`${normTitle}::${normOrg}`, newIndex);
      }
    }
  }

  const mergedOpportunities: Opportunity[] = [];
  const duplicateGroups: DuplicateGroup[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];

    if (cluster.length === 1) {
      mergedOpportunities.push(cluster[0]);
    } else {
      // Sort cluster by completeness score descending (stable tie-breaking)
      const scored = cluster.map((opp, idx) => ({
        opp,
        score: calculateCompletenessScore(opp),
        originalIndex: idx,
      }));

      scored.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);

      let canonical = scored[0].opp;
      const mergedIds: string[] = [];

      for (let j = 1; j < scored.length; j++) {
        canonical = mergeDuplicatePair(canonical, scored[j].opp);
        mergedIds.push(scored[j].opp.id);
      }

      mergedOpportunities.push(canonical);
      duplicateGroups.push({
        canonicalId: canonical.id,
        mergedIds,
        matchReason: clusterMatchReasons[i],
      });
    }
  }

  const duplicatesRemoved = opportunities.length - mergedOpportunities.length;

  return {
    opportunities: mergedOpportunities,
    summary: {
      totalInput: opportunities.length,
      uniqueCount: mergedOpportunities.length,
      duplicatesRemoved,
      duplicateGroups,
    },
  };
}

/**
 * Convenience wrapper returning deduplicated Opportunity records directly.
 */
export function deduplicate(opportunities: Opportunity[]): Opportunity[] {
  return deduplicateOpportunities(opportunities).opportunities;
}
