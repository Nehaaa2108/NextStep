import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Opportunity,
  UserRequest,
  filterOpportunities,
  evaluateHardFilters,
} from '../index.js';

function createSampleOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-filt-1',
    source: 'webcmd',
    title: 'AI Engineering Summer Intern',
    organization: 'Apex Neural Labs',
    url: 'https://example.com/jobs/ai-intern',
    opportunity_type: 'internship',
    location: 'Boston, MA',
    remote: false,
    description: 'Summer internship developing AI systems.',
    skills: ['Python', 'PyTorch'],
    eligibility: 'Open to college students',
    deadline: '2026-11-01T17:00:00Z',
    posted_date: '2026-08-10T12:00:00Z',
    stipend_or_salary: '$52/hour',
    duration: '12 weeks',
    raw_source_data: { test: true },
    retrieved_at: '2026-08-22T10:00:00Z',
    ...overrides,
  };
}

describe('Phase 6 — Hard Filtering Engine', () => {
  it('1. Matching hard constraints remain in passedOpportunities', () => {
    const opp = createSampleOpportunity({ opportunity_type: 'internship', remote: true });
    const request: UserRequest = {
      query: 'AI internships',
      opportunityTypes: ['internship'],
      remote: true,
    };

    const result = filterOpportunities([opp], request);

    assert.equal(result.passedOpportunities.length, 1);
    assert.equal(result.filteredOutOpportunities.length, 0);
    assert.equal(result.decisions[0].passed, true);
  });

  it('2. Clear hard-constraint mismatch on opportunity type is removed', () => {
    const opp = createSampleOpportunity({ opportunity_type: 'hackathon' });
    const request: UserRequest = {
      query: 'internships only',
      opportunityTypes: ['internship'],
    };

    const result = filterOpportunities([opp], request);

    assert.equal(result.passedOpportunities.length, 0);
    assert.equal(result.filteredOutOpportunities.length, 1);
    assert.ok(result.decisions[0].reasons[0].includes('does not match requested types'));
  });

  it('3. Optional missing opportunity_type is NOT filtered out', () => {
    const opp = createSampleOpportunity({ opportunity_type: null });
    const request: UserRequest = {
      query: 'internships',
      opportunityTypes: ['internship'],
    };

    const result = filterOpportunities([opp], request);

    assert.equal(result.passedOpportunities.length, 1);
    assert.equal(result.filteredOutOpportunities.length, 0);
  });

  it('4. Strict remote requirement filters out strictly onsite listings', () => {
    const remoteOpp = createSampleOpportunity({ id: 'opp-remote', remote: true });
    const onsiteOpp = createSampleOpportunity({ id: 'opp-onsite', remote: false });
    const unknownOpp = createSampleOpportunity({ id: 'opp-unknown', remote: null });

    const request: UserRequest = {
      query: 'remote only',
      remote: true,
    };

    const result = filterOpportunities([remoteOpp, onsiteOpp, unknownOpp], request, { strictRemote: true });

    assert.equal(result.passedOpportunities.length, 2);
    assert.deepEqual(
      result.passedOpportunities.map((o) => o.id),
      ['opp-remote', 'opp-unknown']
    );
    assert.equal(result.filteredOutOpportunities.length, 1);
    assert.equal(result.filteredOutOpportunities[0].id, 'opp-onsite');
  });

  it('5. Deadline constraint filters out opportunities that expired in the past', () => {
    const activeOpp = createSampleOpportunity({ id: 'opp-active', deadline: '2026-12-01T00:00:00Z' });
    const expiredOpp = createSampleOpportunity({ id: 'opp-expired', deadline: '2026-06-01T00:00:00Z' });
    const unknownDeadlineOpp = createSampleOpportunity({ id: 'opp-no-deadline', deadline: null });

    const request: UserRequest = {
      query: 'active roles',
      deadlineConstraint: '2026-08-01T00:00:00Z',
    };

    const result = filterOpportunities([activeOpp, expiredOpp, unknownDeadlineOpp], request);

    assert.equal(result.passedOpportunities.length, 2);
    assert.deepEqual(
      result.passedOpportunities.map((o) => o.id),
      ['opp-active', 'opp-no-deadline']
    );
    assert.equal(result.filteredOutOpportunities.length, 1);
    assert.equal(result.filteredOutOpportunities[0].id, 'opp-expired');
  });

  it('6. Mandatory paid preference filters out explicitly unpaid listings', () => {
    const paidOpp = createSampleOpportunity({ id: 'opp-paid', stipend_or_salary: '$2,000' });
    const unpaidOpp = createSampleOpportunity({ id: 'opp-unpaid', stipend_or_salary: 'unpaid' });
    const nullStipendOpp = createSampleOpportunity({ id: 'opp-null-stipend', stipend_or_salary: null });

    const request: UserRequest = {
      query: 'paid only',
      preferences: { requirePaid: true },
    };

    const result = filterOpportunities([paidOpp, unpaidOpp, nullStipendOpp], request);

    assert.equal(result.passedOpportunities.length, 2);
    assert.deepEqual(
      result.passedOpportunities.map((o) => o.id),
      ['opp-paid', 'opp-null-stipend']
    );
    assert.equal(result.filteredOutOpportunities.length, 1);
    assert.equal(result.filteredOutOpportunities[0].id, 'opp-unpaid');
  });

  it('7. evaluateHardFilters single decision helper', () => {
    const opp = createSampleOpportunity();
    const decision = evaluateHardFilters(opp, { query: 'test' });
    assert.equal(decision.passed, true);
    assert.equal(decision.opportunityId, opp.id);
  });
});
