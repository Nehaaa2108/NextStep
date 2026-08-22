import { Opportunity } from '../core/types/opportunity.js';
import {
  ValidationIssue,
  SingleValidationResult,
  BatchValidationResult,
} from './types.js';

/**
 * Checks if a string is non-null, non-undefined, and contains non-whitespace characters.
 */
function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

/**
 * Performs safe, offline structural validation on a URL string.
 * Ensures the URL is parseable and uses http or https protocol.
 */
export function isValidHttpUrl(urlString: unknown): boolean {
  if (!isNonEmptyString(urlString)) {
    return false;
  }

  try {
    const parsed = new URL(urlString.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (!parsed.hostname || parsed.hostname.trim().length === 0) {
      return false;
    }
    // Ensure hostname contains valid dot or is localhost
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a single canonical Opportunity record against core usability requirements.
 *
 * Critical Requirements (errors):
 * - id: non-empty string
 * - source: non-empty string
 * - title: non-empty string
 * - organization: non-empty string
 * - url: non-empty, structurally valid http(s) URL
 *
 * Optional Fields (warnings only if malformed, never invalidates):
 * - deadline, posted_date: verified for safe parseability if provided
 *
 * @param opportunity The canonical Opportunity to validate
 * @returns SingleValidationResult with validity status and diagnostic issues
 */
export function validateOpportunity(opportunity: Opportunity): SingleValidationResult {
  const issues: ValidationIssue[] = [];
  const oppId = opportunity.id;

  // 1. Validate ID
  if (!isNonEmptyString(opportunity.id)) {
    issues.push({
      opportunityId: oppId,
      field: 'id',
      code: 'MISSING_ID',
      message: 'Opportunity id is missing or whitespace-only',
      severity: 'error',
    });
  }

  // 2. Validate Source
  if (!isNonEmptyString(opportunity.source)) {
    issues.push({
      opportunityId: oppId,
      field: 'source',
      code: 'MISSING_SOURCE',
      message: 'Opportunity source is missing or whitespace-only',
      severity: 'error',
    });
  }

  // 3. Validate Title
  if (!isNonEmptyString(opportunity.title)) {
    issues.push({
      opportunityId: oppId,
      field: 'title',
      code: 'MISSING_TITLE',
      message: 'Opportunity title is required and cannot be empty or whitespace-only',
      severity: 'error',
    });
  }

  // 4. Validate Organization
  if (!isNonEmptyString(opportunity.organization)) {
    issues.push({
      opportunityId: oppId,
      field: 'organization',
      code: 'MISSING_ORGANIZATION',
      message: 'Opportunity organization is required and cannot be empty or whitespace-only',
      severity: 'error',
    });
  }

  // 5. Validate URL
  if (!isNonEmptyString(opportunity.url)) {
    issues.push({
      opportunityId: oppId,
      field: 'url',
      code: 'MISSING_URL',
      message: 'Opportunity URL is required for user application/reference',
      severity: 'error',
    });
  } else if (!isValidHttpUrl(opportunity.url)) {
    issues.push({
      opportunityId: oppId,
      field: 'url',
      code: 'INVALID_URL_FORMAT',
      message: `Opportunity URL "${opportunity.url}" is not a structurally valid http(s) URL`,
      severity: 'error',
    });
  }

  // 6. Optional Field Sanity Checks (non-fatal warnings)
  if (opportunity.deadline !== null && opportunity.deadline !== undefined) {
    if (isNonEmptyString(opportunity.deadline)) {
      const parsedTime = Date.parse(opportunity.deadline);
      if (Number.isNaN(parsedTime)) {
        issues.push({
          opportunityId: oppId,
          field: 'deadline',
          code: 'UNPARSEABLE_DATE',
          message: `Opportunity deadline "${opportunity.deadline}" is not a recognized date format`,
          severity: 'warning',
        });
      }
    }
  }

  if (opportunity.posted_date !== null && opportunity.posted_date !== undefined) {
    if (isNonEmptyString(opportunity.posted_date)) {
      const parsedTime = Date.parse(opportunity.posted_date);
      if (Number.isNaN(parsedTime)) {
        issues.push({
          opportunityId: oppId,
          field: 'posted_date',
          code: 'UNPARSEABLE_DATE',
          message: `Opportunity posted_date "${opportunity.posted_date}" is not a recognized date format`,
          severity: 'warning',
        });
      }
    }
  }

  const hasErrors = issues.some((issue) => issue.severity === 'error');

  return {
    valid: !hasErrors,
    opportunity,
    issues,
  };
}

/**
 * Validates a batch of canonical Opportunity records.
 * Segregates usable opportunities from invalid ones while accumulating diagnostic issues.
 *
 * @param opportunities List of canonical opportunities to validate
 * @returns BatchValidationResult with valid/invalid lists and collected issues
 */
export function validateOpportunities(opportunities: Opportunity[]): BatchValidationResult {
  const validOpportunities: Opportunity[] = [];
  const invalidOpportunities: Opportunity[] = [];
  const allIssues: ValidationIssue[] = [];

  for (const opp of opportunities) {
    const singleResult = validateOpportunity(opp);
    allIssues.push(...singleResult.issues);

    if (singleResult.valid) {
      validOpportunities.push(opp);
    } else {
      invalidOpportunities.push(opp);
    }
  }

  return {
    valid: invalidOpportunities.length === 0,
    total: opportunities.length,
    opportunities: validOpportunities,
    invalidOpportunities,
    issues: allIssues,
  };
}
