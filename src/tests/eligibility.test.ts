import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Opportunity,
  UserRequest,
  evaluateEligibility,
} from '../index.js';

function createSampleOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-elig-1',
    source: 'webcmd',
    title: 'Quantum Fellowship',
    organization: 'Quantum Institute',
    url: 'https://example.com/fellowship',
    opportunity_type: 'fellowship',
    location: 'Remote',
    remote: true,
    description: 'Quantum simulation fellowship for college students.',
    skills: ['Qiskit', 'Python'],
    eligibility: 'Open to all undergraduate students',
    deadline: '2026-11-30T23:59:59Z',
    posted_date: '2026-08-01T00:00:00Z',
    stipend_or_salary: '$5,000',
    duration: '3 months',
    raw_source_data: {},
    retrieved_at: '2026-08-22T10:00:00Z',
    ...overrides,
  };
}

describe('Phase 6 — Student Eligibility Evaluation', () => {
  it('1. Explicitly eligible when broad student inclusion matches', () => {
    const opp = createSampleOpportunity({ eligibility: 'Open to university students worldwide' });
    const request: UserRequest = {
      query: 'fellowships',
      eligibilityYear: 'Sophomore',
    };

    const evalResult = evaluateEligibility(opp, request, '2026-08-22T00:00:00Z');
    assert.equal(evalResult.status, 'eligible');
    assert.equal(evalResult.confidence, 'high');
    assert.ok(evalResult.reasons.length > 0);
    assert.equal(evalResult.mismatches.length, 0);
  });

  it('2. Explicitly eligible when specific academic standing matches', () => {
    const opp = createSampleOpportunity({
      eligibility: 'Open to second-year (sophomore) and junior undergraduate students',
    });
    const request: UserRequest = {
      query: 'fellowships',
      eligibilityYear: '2nd year',
    };

    const evalResult = evaluateEligibility(opp, request, '2026-08-22T00:00:00Z');
    assert.equal(evalResult.status, 'eligible');
    assert.ok(evalResult.reasons.some((r) => r.includes('matches listing criteria')));
  });

  it('3. Explicitly ineligible when listing requires final-year and user is sophomore', () => {
    const opp = createSampleOpportunity({
      eligibility: 'Final-year students only graduating in 2026',
    });
    const request: UserRequest = {
      query: 'grad roles',
      eligibilityYear: 'Sophomore',
    };

    const evalResult = evaluateEligibility(opp, request, '2026-08-22T00:00:00Z');
    assert.equal(evalResult.status, 'not_eligible');
    assert.ok(evalResult.mismatches.some((m) => m.includes('requires final-year')));
  });

  it('4. Explicitly ineligible when deadline has expired', () => {
    const opp = createSampleOpportunity({
      deadline: '2026-05-01T00:00:00Z',
    });
    const request: UserRequest = {
      query: 'fellowships',
      eligibilityYear: 'Junior',
    };

    const evalResult = evaluateEligibility(opp, request, '2026-08-22T00:00:00Z');
    assert.equal(evalResult.status, 'not_eligible');
    assert.ok(evalResult.mismatches.some((m) => m.includes('deadline')));
  });

  it('5. Unknown eligibility when metadata is absent and no student mention exists', () => {
    const opp = createSampleOpportunity({
      eligibility: null,
      description: 'Research position working on GPU kernels.',
    });
    const request: UserRequest = {
      query: 'gpu research',
      eligibilityYear: 'Sophomore',
    };

    const evalResult = evaluateEligibility(opp, request, '2026-08-22T00:00:00Z');
    assert.equal(evalResult.status, 'unknown');
    assert.equal(evalResult.confidence, 'low');
    assert.ok(evalResult.reasons[0].includes('No formal eligibility criteria'));
  });

  it('6. Possibly eligible when description suggests broad student openness', () => {
    const opp = createSampleOpportunity({
      eligibility: null,
      description: 'Exciting virtual hackathon open to all students across the globe.',
    });
    const request: UserRequest = {
      query: 'hackathons',
    };

    const evalResult = evaluateEligibility(opp, request, '2026-08-22T00:00:00Z');
    assert.equal(evalResult.status, 'possibly_eligible');
    assert.equal(evalResult.confidence, 'medium');
  });
});
