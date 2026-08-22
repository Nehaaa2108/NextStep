import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Opportunity,
  UserRequest,
  rankOpportunities,
  compareRankedOpportunities,
  OpportunityScoreResult,
} from '../index.js';

function createSampleOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-rank-1',
    source: 'webcmd',
    title: 'Software Engineer Intern',
    organization: 'Acme AI',
    url: 'https://example.com/jobs/1',
    opportunity_type: 'internship',
    location: 'Remote',
    remote: true,
    description: 'Software development internship with Python.',
    skills: ['Python'],
    eligibility: 'Open to college students',
    deadline: '2026-12-31T23:59:59Z',
    posted_date: '2026-08-15T00:00:00Z',
    stipend_or_salary: '$45/hr',
    duration: '12 weeks',
    raw_source_data: {},
    retrieved_at: '2026-08-22T10:00:00Z',
    ...overrides,
  };
}

describe('Phase 6 — Deterministic Ranking Engine', () => {
  it('1. Higher scored opportunity ranks first (rank = 1)', () => {
    const strongMatch = createSampleOpportunity({
      id: 'opp-strong',
      skills: ['Python', 'TypeScript', 'PyTorch'],
      remote: true,
      stipend_or_salary: '$60/hr',
    });
    const weakMatch = createSampleOpportunity({
      id: 'opp-weak',
      skills: ['Rust'],
      remote: false,
      stipend_or_salary: null,
    });

    const request: UserRequest = {
      query: 'python intern',
      skills: ['Python', 'PyTorch'],
      remote: true,
    };

    const result = rankOpportunities([weakMatch, strongMatch], request);

    assert.equal(result.rankedOpportunities.length, 2);
    assert.equal(result.rankedOpportunities[0].opportunity.id, 'opp-strong');
    assert.equal(result.rankedOpportunities[0].rank, 1);
    assert.equal(result.rankedOpportunities[1].opportunity.id, 'opp-weak');
    assert.equal(result.rankedOpportunities[1].rank, 2);
    assert.ok(result.rankedOpportunities[0].score > result.rankedOpportunities[1].score);
  });

  it('2. Deterministic tie-breaking on equal scores: eligibility -> deadline -> ID', () => {
    // Both oppA and oppB have equal score base, but oppA is explicitly eligible, oppB has unknown eligibility
    const oppA: OpportunityScoreResult = {
      opportunity: createSampleOpportunity({ id: 'opp-a', deadline: '2026-10-01T00:00:00Z' }),
      score: 80,
      eligibility: { status: 'eligible', reasons: [], mismatches: [], confidence: 'high' },
      reasons: [],
      breakdown: {
        skillScore: 30,
        eligibilityScore: 20,
        locationRemoteScore: 15,
        typeScore: 15,
        preferenceScore: 0,
        deadlineScore: 0,
        qualityScore: 0,
        totalScore: 80,
      },
    };

    const oppB: OpportunityScoreResult = {
      opportunity: createSampleOpportunity({ id: 'opp-b', deadline: '2026-10-01T00:00:00Z' }),
      score: 80,
      eligibility: { status: 'unknown', reasons: [], mismatches: [], confidence: 'low' },
      reasons: [],
      breakdown: {
        skillScore: 30,
        eligibilityScore: 20,
        locationRemoteScore: 15,
        typeScore: 15,
        preferenceScore: 0,
        deadlineScore: 0,
        qualityScore: 0,
        totalScore: 80,
      },
    };

    // oppA should sort before oppB due to higher eligibility priority
    const cmp = compareRankedOpportunities(oppA, oppB);
    assert.ok(cmp < 0);
  });

  it('3. Repeated ranking runs produce strictly identical ordering (determinism)', () => {
    const opp1 = createSampleOpportunity({ id: 'opp-1', skills: ['Python'] });
    const opp2 = createSampleOpportunity({ id: 'opp-2', skills: ['TypeScript'] });
    const opp3 = createSampleOpportunity({ id: 'opp-3', skills: ['Python', 'TypeScript'] });

    const request: UserRequest = { query: 'dev', skills: ['Python', 'TypeScript'] };

    const run1 = rankOpportunities([opp1, opp2, opp3], request);
    const run2 = rankOpportunities([opp1, opp2, opp3], request);

    assert.deepEqual(run1, run2);
  });

  it('4. Every ranked result contains non-empty explanation reasons', () => {
    const opp = createSampleOpportunity();
    const result = rankOpportunities([opp], { query: 'software', skills: ['Python'] });

    assert.equal(result.rankedOpportunities.length, 1);
    const ranked = result.rankedOpportunities[0];
    assert.ok(ranked.reasons.length > 0);
    assert.ok(ranked.breakdown.totalScore > 0);
  });
});
