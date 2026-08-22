import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Opportunity,
  UserRequest,
  scoreOpportunity,
  DEFAULT_SCORING_WEIGHTS,
} from '../index.js';

function createSampleOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-score-1',
    source: 'webcmd',
    title: 'AI Systems Engineer Intern',
    organization: 'Neural Systems Corp',
    url: 'https://example.com/jobs/ai-intern',
    opportunity_type: 'internship',
    location: 'San Francisco, CA',
    remote: true,
    description: '12-week summer internship working on generative AI pipelines with Python and PyTorch.',
    skills: ['Python', 'TypeScript', 'PyTorch'],
    eligibility: 'Open to university students worldwide',
    deadline: '2026-11-30T23:59:59Z',
    posted_date: '2026-08-15T00:00:00Z',
    stipend_or_salary: '$50/hr',
    duration: '12 weeks',
    raw_source_data: { test: true },
    retrieved_at: '2026-08-22T10:00:00Z',
    ...overrides,
  };
}

describe('Phase 6 — Transparent 100-Point Relevance Scoring', () => {
  it('1. Skill match proportionally affects score', () => {
    const opp = createSampleOpportunity({ skills: ['Python', 'PyTorch'] });

    // 100% skill match (2/2)
    const fullMatchReq: UserRequest = { query: 'ai', skills: ['Python', 'PyTorch'] };
    const fullScore = scoreOpportunity(opp, fullMatchReq, DEFAULT_SCORING_WEIGHTS, '2026-08-22T00:00:00Z');

    // 50% skill match (1/2)
    const partialMatchReq: UserRequest = { query: 'ai', skills: ['Python', 'Rust'] };
    const partialScore = scoreOpportunity(opp, partialMatchReq, DEFAULT_SCORING_WEIGHTS, '2026-08-22T00:00:00Z');

    // 0% skill match (0/2)
    const noMatchReq: UserRequest = { query: 'ai', skills: ['Rust', 'Golang'] };
    const noMatchScore = scoreOpportunity(opp, noMatchReq, DEFAULT_SCORING_WEIGHTS, '2026-08-22T00:00:00Z');

    assert.equal(fullScore.breakdown.skillScore, 30);
    assert.equal(partialScore.breakdown.skillScore, 15);
    assert.equal(noMatchScore.breakdown.skillScore, 0);
    assert.ok(fullScore.score > partialScore.score);
    assert.ok(partialScore.score > noMatchScore.score);
  });

  it('2. Eligibility status alters score contribution', () => {
    const oppEligible = createSampleOpportunity({ eligibility: 'Open to all university students' });
    const oppUnknown = createSampleOpportunity({ eligibility: null, description: 'Short desc.' });
    const oppIneligible = createSampleOpportunity({ deadline: '2026-01-01T00:00:00Z' }); // past deadline

    const request: UserRequest = { query: 'ai', eligibilityYear: 'Sophomore' };

    const scoreElig = scoreOpportunity(oppEligible, request, DEFAULT_SCORING_WEIGHTS, '2026-08-22T00:00:00Z');
    const scoreUnk = scoreOpportunity(oppUnknown, request, DEFAULT_SCORING_WEIGHTS, '2026-08-22T00:00:00Z');
    const scoreInelig = scoreOpportunity(oppIneligible, request, DEFAULT_SCORING_WEIGHTS, '2026-08-22T00:00:00Z');

    assert.equal(scoreElig.breakdown.eligibilityScore, 20);
    assert.equal(scoreUnk.breakdown.eligibilityScore, 8);
    assert.equal(scoreInelig.breakdown.eligibilityScore, 0);
  });

  it('3. Location & remote match rewards matching preferences', () => {
    const oppRemote = createSampleOpportunity({ remote: true, location: null });
    const oppOnsiteSF = createSampleOpportunity({ remote: false, location: 'San Francisco, CA' });
    const oppOnsiteTokyo = createSampleOpportunity({ remote: false, location: 'Tokyo, Japan' });

    // User wants Remote
    const reqRemote: UserRequest = { query: 'internship', remote: true };
    const scoreRemoteOnRemote = scoreOpportunity(oppRemote, reqRemote);
    const scoreRemoteOnOnsite = scoreOpportunity(oppOnsiteTokyo, reqRemote);

    assert.equal(scoreRemoteOnRemote.breakdown.locationRemoteScore, 15);
    assert.equal(scoreRemoteOnOnsite.breakdown.locationRemoteScore, 0);

    // User wants San Francisco
    const reqSF: UserRequest = { query: 'internship', location: 'San Francisco' };
    const scoreSFOnSF = scoreOpportunity(oppOnsiteSF, reqSF);
    const scoreSFOnTokyo = scoreOpportunity(oppOnsiteTokyo, reqSF);

    assert.equal(scoreSFOnSF.breakdown.locationRemoteScore, 15);
    assert.ok(scoreSFOnTokyo.breakdown.locationRemoteScore < scoreSFOnSF.breakdown.locationRemoteScore);
  });

  it('4. Opportunity type match awards full points on exact match', () => {
    const oppIntern = createSampleOpportunity({ opportunity_type: 'internship' });

    const reqIntern: UserRequest = { query: 'jobs', opportunityTypes: ['internship'] };
    const reqHackathon: UserRequest = { query: 'events', opportunityTypes: ['hackathon'] };

    const scoreMatch = scoreOpportunity(oppIntern, reqIntern);
    const scoreMismatch = scoreOpportunity(oppIntern, reqHackathon);

    assert.equal(scoreMatch.breakdown.typeScore, 15);
    assert.equal(scoreMismatch.breakdown.typeScore, 0);
  });

  it('5. User preferences contribute to total score', () => {
    const oppPaid = createSampleOpportunity({ stipend_or_salary: '$40/hour', duration: '12 weeks' });
    const oppUnpaid = createSampleOpportunity({ stipend_or_salary: 'unpaid', duration: '3 days' });

    const reqPref: UserRequest = {
      query: 'internship',
      preferences: { preferPaid: true, preferredDuration: '12 weeks' },
    };

    const scorePaid = scoreOpportunity(oppPaid, reqPref);
    const scoreUnpaid = scoreOpportunity(oppUnpaid, reqPref);

    assert.equal(scorePaid.breakdown.preferenceScore, 10);
    assert.equal(scoreUnpaid.breakdown.preferenceScore, 0);
  });

  it('6. Custom weights can be passed to adjust priorities', () => {
    const opp = createSampleOpportunity({ skills: ['Python', 'PyTorch'] });
    const request: UserRequest = { query: 'test', skills: ['Python', 'PyTorch'] };

    const customWeights = {
      ...DEFAULT_SCORING_WEIGHTS,
      skillMatch: 50, // Increase skill weight to 50
    };

    const result = scoreOpportunity(opp, request, customWeights);
    assert.equal(result.breakdown.skillScore, 50);
  });

  it('7. Explanations are non-empty and reflect actual signals', () => {
    const opp = createSampleOpportunity({
      skills: ['Python', 'PyTorch'],
      remote: true,
      stipend_or_salary: '$50/hr',
    });
    const request: UserRequest = {
      query: 'ai intern',
      skills: ['Python'],
      remote: true,
      preferences: { preferPaid: true },
    };

    const result = scoreOpportunity(opp, request);

    assert.ok(result.reasons.length >= 3);
    assert.ok(result.reasons.some((r) => r.includes('skills')));
    assert.ok(result.reasons.some((r) => r.includes('Remote')));
    assert.ok(result.reasons.some((r) => r.includes('Compensation')));
  });
});
