import { Opportunity } from '../core/types/opportunity.js';
import { UserRequest } from '../core/types/request.js';
import { FilterDecision, FilterOptions, FilterResult } from './types.js';

/**
 * Normalizes text for case-insensitive keyword checking.
 */
function normalizeKeyword(text: string | null | undefined): string {
  return (text ?? '').trim().toLowerCase();
}

/**
 * Evaluates an opportunity against hard user constraints.
 * Unknown or unpopulated optional fields do NOT trigger rejection.
 */
export function evaluateHardFilters(
  opp: Opportunity,
  request: UserRequest,
  options: FilterOptions = {}
): FilterDecision {
  const rejectionReasons: string[] = [];
  const acceptanceReasons: string[] = [];

  // 1. Opportunity Type Filter
  if (request.opportunityTypes && request.opportunityTypes.length > 0) {
    if (opp.opportunity_type !== null && opp.opportunity_type !== undefined) {
      const oppType = normalizeKeyword(opp.opportunity_type);
      const requestedTypes = request.opportunityTypes.map((t) => normalizeKeyword(t));

      if (!requestedTypes.includes(oppType)) {
        rejectionReasons.push(
          `Opportunity type "${opp.opportunity_type}" does not match requested types: [${request.opportunityTypes.join(', ')}]`
        );
      } else {
        acceptanceReasons.push(`Opportunity type matches requested "${opp.opportunity_type}"`);
      }
    }
  }

  // 2. Strict Remote Filter (when strictRemote option is enabled or explicitly required in preferences)
  const isStrictRemote =
    options.strictRemote === true ||
    request.preferences?.requireRemote === true ||
    request.preferences?.mandatoryRemote === true;

  if (isStrictRemote && request.remote !== undefined && request.remote !== null) {
    if (request.remote === true && opp.remote === false) {
      rejectionReasons.push('User strictly requires remote opportunities, but this listing is strictly onsite');
    } else if (request.remote === false && opp.remote === true) {
      rejectionReasons.push('User strictly requires onsite opportunities, but this listing is strictly remote');
    }
  }

  // 3. Deadline Constraint Filter
  if (request.deadlineConstraint) {
    const refDateStr = options.referenceDate ?? new Date().toISOString();
    const constraintTimestamp = Date.parse(request.deadlineConstraint) || Date.parse(refDateStr);

    if (opp.deadline && !Number.isNaN(constraintTimestamp)) {
      const oppDeadlineTimestamp = Date.parse(opp.deadline);
      if (!Number.isNaN(oppDeadlineTimestamp) && oppDeadlineTimestamp < constraintTimestamp) {
        rejectionReasons.push(
          `Opportunity deadline (${opp.deadline}) expired before requested threshold (${request.deadlineConstraint})`
        );
      }
    }
  }

  // 4. Strict Location Filter (optional mode)
  if (options.strictLocation && request.location && request.location.trim().length > 0) {
    const reqLoc = normalizeKeyword(request.location);
    if (opp.location && opp.remote !== true) {
      const oppLoc = normalizeKeyword(opp.location);
      if (!oppLoc.includes(reqLoc) && !reqLoc.includes(oppLoc)) {
        rejectionReasons.push(`Location "${opp.location}" does not match strictly required "${request.location}"`);
      }
    }
  }

  // 5. Mandatory Paid Filter (if explicitly declared in preferences)
  if (request.preferences?.requirePaid === true || request.preferences?.mandatoryPaid === true) {
    if (opp.stipend_or_salary) {
      const stipendNorm = normalizeKeyword(opp.stipend_or_salary);
      if (stipendNorm === 'unpaid' || stipendNorm === '$0' || stipendNorm === '0') {
        rejectionReasons.push('User strictly requires paid opportunities, but listing is explicitly unpaid');
      }
    }
  }

  const passed = rejectionReasons.length === 0;

  return {
    opportunityId: opp.id,
    passed,
    reasons: passed ? acceptanceReasons : rejectionReasons,
  };
}

/**
 * Filters an array of canonical Opportunity records against hard user constraints.
 *
 * @param opportunities Canonical opportunity records to filter
 * @param request User request criteria
 * @param options Optional filter settings
 * @returns FilterResult with segregated passed and rejected opportunities
 */
export function filterOpportunities(
  opportunities: Opportunity[],
  request: UserRequest,
  options: FilterOptions = {}
): FilterResult {
  const passedOpportunities: Opportunity[] = [];
  const filteredOutOpportunities: Opportunity[] = [];
  const decisions: FilterDecision[] = [];

  for (const opp of opportunities) {
    const decision = evaluateHardFilters(opp, request, options);
    decisions.push(decision);

    if (decision.passed) {
      passedOpportunities.push(opp);
    } else {
      filteredOutOpportunities.push(opp);
    }
  }

  return {
    passedOpportunities,
    filteredOutOpportunities,
    decisions,
  };
}
