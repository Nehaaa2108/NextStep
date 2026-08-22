import { Opportunity } from '../core/types/opportunity.js';
import { OpportunityType } from '../core/types/request.js';
import { WebEvidence, WebEvidenceItem } from '../core/types/evidence.js';
import { NormalizationIssue, NormalizationResult } from './types.js';

/**
 * Known canonical OpportunityType values for case-insensitive normalization.
 */
const CANONICAL_OPPORTUNITY_TYPES: Set<OpportunityType> = new Set([
  'internship',
  'hackathon',
  'grant',
  'fellowship',
  'job',
  'scholarship',
  'research',
  'other',
]);

/**
 * Trims strings and returns null if empty or if input is not a string.
 */
function sanitizeString(val: unknown): string | null {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

/**
 * Extracts the first non-empty string among candidate keys from a raw record.
 */
function pickFirstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    if (key in record && record[key] !== undefined && record[key] !== null) {
      const sanitized = sanitizeString(record[key]);
      if (sanitized !== null) {
        return sanitized;
      }
    }
  }
  return null;
}

/**
 * Safely parses boolean remote status from boolean or string indicators.
 */
function normalizeRemote(record: Record<string, unknown>): boolean | null {
  const candidateKeys = ['_computed_remote', 'remote', 'is_remote', 'isRemote', 'remote_status', 'work_type', 'is_online'];

  for (const key of candidateKeys) {
    if (key in record && record[key] !== undefined && record[key] !== null) {
      const val = record[key];
      if (typeof val === 'boolean') {
        return val;
      }
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (['true', 'yes', 'remote', 'fully remote', 'virtual'].includes(lower)) {
          return true;
        }
        if (['false', 'no', 'onsite', 'on-site', 'in-person', 'in person'].includes(lower)) {
          return false;
        }
        if (['hybrid', 'flexible'].includes(lower)) {
          // Hybrid is neither strictly 100% remote nor 100% onsite; return null
          return null;
        }
      }
    }
  }

  return null;
}

/**
 * Normalizes skills from arrays or delimited string values into string[].
 */
function normalizeSkills(record: Record<string, unknown>): string[] {
  const candidateKeys = ['skills', 'technologies', 'tags', 'tech_stack', 'required_skills', 'themes'];

  for (const key of candidateKeys) {
    if (key in record && record[key] !== undefined && record[key] !== null) {
      const val = record[key];
      if (Array.isArray(val)) {
        return val
          .map((item) => sanitizeString(item))
          .filter((item): item is string => item !== null);
      }
      if (typeof val === 'string') {
        const parts = val.split(/[,;/•\n]+/);
        const cleaned = parts
          .map((p) => sanitizeString(p))
          .filter((p): p is string => p !== null);
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  }

  return [];
}

/**
 * Normalizes opportunity type into canonical OpportunityType or preserved string.
 */
function normalizeOpportunityType(record: Record<string, unknown>): OpportunityType | string | null {
  const candidateKeys = ['_computed_type', 'opportunity_type', 'opportunityType', 'type', 'category', 'kind'];
  const rawType = pickFirstString(record, candidateKeys);

  if (!rawType) {
    return null;
  }

  const lower = rawType.toLowerCase();
  if (CANONICAL_OPPORTUNITY_TYPES.has(lower as OpportunityType)) {
    return lower as OpportunityType;
  }

  return rawType;
}

/**
 * Normalizes an individual raw evidence item into a canonical Opportunity record.
 * Returns null if the item cannot be safely converted without fabricating data.
 */
export function normalizeRawItem(
  rawItem: WebEvidenceItem | Record<string, unknown>,
  index: number,
  evidenceSource: string,
  retrievedAt: string,
  issues: NormalizationIssue[]
): Opportunity | null {
  if (!rawItem || typeof rawItem !== 'object') {
    issues.push({
      itemIndex: index,
      code: 'MALFORMED_ITEM',
      message: `Item at index ${index} is not a valid object`,
      rawItem,
    });
    return null;
  }

  const record = rawItem as Record<string, unknown>;

  // If the item has a nested raw payload, merge properties for comprehensive extraction
  const mergedRecord: Record<string, unknown> = {
    ...(typeof record['raw'] === 'object' && record['raw'] !== null ? (record['raw'] as Record<string, unknown>) : {}),
    ...record,
  };

  const title = pickFirstString(mergedRecord, [
    'title',
    'job_title',
    'jobTitle',
    'opportunity_title',
    'opportunityTitle',
    'name',
    'role',
    'headline',
  ]);

  if (!title) {
    issues.push({
      itemIndex: index,
      code: 'MISSING_TITLE',
      message: `Item at index ${index} lacks a recognizable title or role name`,
      rawItem,
    });
    return null;
  }

  const organization = pickFirstString(mergedRecord, [
    'organization',
    'company',
    'company_name',
    'companyName',
    'org',
    'host',
    'sponsor',
    'institution',
    'employer',
  ]);

  const url = pickFirstString(mergedRecord, [
    'url',
    'apply_url',
    'applyUrl',
    'link',
    'href',
    'target_url',
    'page_url',
    'application_link',
  ]);

  const location = pickFirstString(mergedRecord, [
    '_computed_location',
    'location',
    'city',
    'place',
    'address',
    'geographic_location',
    'work_location',
  ]);

  const description = pickFirstString(mergedRecord, [
    '_computed_description',
    'description',
    'desc',
    'summary',
    'details',
    'snippet',
    'overview',
  ]);

  const eligibility = pickFirstString(mergedRecord, [
    'eligibility',
    'criteria',
    'qualification',
    'requirements',
    'prerequisites',
    'target_audience',
  ]);

  const deadline = pickFirstString(mergedRecord, [
    '_computed_deadline',
    'deadline',
    'due_date',
    'dueDate',
    'application_deadline',
    'expires_at',
    'close_date',
  ]);

  const postedDate = pickFirstString(mergedRecord, [
    '_computed_posted_date',
    'posted_date',
    'postedDate',
    'posted_at',
    'date_posted',
    'published_at',
    'created_at',
  ]);

  const stipendOrSalary = pickFirstString(mergedRecord, [
    'stipend_or_salary',
    'salary',
    'stipend',
    'compensation',
    'pay',
    'prize',
    'prizes',
    'prize_pool',
    'award',
    'amount',
  ]);

  const duration = pickFirstString(mergedRecord, [
    'duration',
    'program_length',
    'programLength',
    'period',
    'length',
    'timeline',
  ]);

  const remote = normalizeRemote(mergedRecord);
  const skills = normalizeSkills(mergedRecord);
  const opportunityType = normalizeOpportunityType(mergedRecord);

  // Deterministic canonical ID
  const rawId = sanitizeString(mergedRecord['id']);
  const canonicalId = rawId ? `${evidenceSource}-${rawId}` : `opp-${evidenceSource}-${index + 1}`;

  return {
    id: canonicalId,
    source: evidenceSource,
    title,
    organization: organization ?? null,
    url: url ?? null,
    opportunity_type: opportunityType,
    location: location ?? null,
    remote: remote ?? null,
    description: description ?? null,
    skills,
    eligibility: eligibility ?? null,
    deadline: deadline ?? null,
    posted_date: postedDate ?? null,
    stipend_or_salary: stipendOrSalary ?? null,
    duration: duration ?? null,
    raw_source_data: record,
    retrieved_at: retrievedAt,
  };
}

/**
 * Main normalization function. Converts raw WebEvidence into canonical Opportunity domain records.
 *
 * Guarantees:
 * - Deterministic output for identical input.
 * - Never invents missing values (preserves as null/undefined).
 * - Records malformed items as structured issues without halting execution.
 *
 * @param evidence WebEvidence envelope from a provider
 * @returns NormalizationResult containing canonical opportunities and diagnostic metadata
 */
export function normalizeEvidence(evidence: WebEvidence): NormalizationResult {
  const warnings: string[] = [...(evidence.warnings ?? [])];
  const issues: NormalizationIssue[] = [];
  const opportunities: Opportunity[] = [];

  const rawResults = evidence.results ?? [];
  const evidenceSource = evidence.source || 'webcmd';
  const retrievedAt = evidence.retrievedAt || new Date().toISOString();

  for (let i = 0; i < rawResults.length; i++) {
    const rawItem = rawResults[i];
    const canonical = normalizeRawItem(rawItem, i, evidenceSource, retrievedAt, issues);

    if (canonical) {
      opportunities.push(canonical);
    } else {
      warnings.push(`Raw item at index ${i} could not be normalized (missing title or malformed)`);
    }
  }

  return {
    opportunities,
    warnings,
    issues,
    evidenceSource,
    retrievedAt,
  };
}
