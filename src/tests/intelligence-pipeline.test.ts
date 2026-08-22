import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MockWebEvidenceProvider,
  WebEvidenceProvider,
  WebTask,
  UserRequest,
  normalizeEvidence,
  validateOpportunities,
  deduplicateOpportunities,
  rankOpportunities,
} from '../index.js';

describe('Part 10 — Complete End-to-End Mock Intelligence Pipeline Check', () => {
  it('should flow: Fixture -> MockProvider -> WebEvidence -> Normalizer -> Validator -> Deduplicator -> Filter -> Score -> Rank', async () => {
    // 1. Mock WebCMD Provider loads realistic multi-opportunity fixture
    const provider: WebEvidenceProvider = new MockWebEvidenceProvider('success');
    const task: WebTask = {
      taskId: 'intel-pipeline-task-1',
      query: 'student ai opportunities',
    };

    const evidence = await provider.run(task);
    assert.equal(evidence.source, 'webcmd');
    assert.equal(evidence.results.length, 3);

    // 2. Normalization
    const normResult = normalizeEvidence(evidence);
    assert.equal(normResult.opportunities.length, 3);

    // 3. Validation
    const valResult = validateOpportunities(normResult.opportunities);
    assert.equal(valResult.opportunities.length, 3);

    // 4. Deduplication
    const dedupeResult = deduplicateOpportunities(valResult.opportunities);
    assert.equal(dedupeResult.opportunities.length, 3);

    // 5. User Search Criteria
    const userRequest: UserRequest = {
      query: 'AI agent hackathon remote',
      opportunityTypes: ['hackathon', 'internship', 'fellowship'],
      skills: ['Python', 'TypeScript', 'Browser Automation'],
      remote: true,
      eligibilityYear: 'Sophomore',
      preferences: {
        preferPaid: true,
      },
    };

    // 6. Ranking (Hard Filter -> Eligibility -> 100pt Scoring -> Deterministic Rank)
    const rankingResult = rankOpportunities(dedupeResult.opportunities, userRequest, {
      referenceDate: '2026-08-22T00:00:00Z',
    });

    assert.equal(rankingResult.totalRanked, 3);
    const ranked = rankingResult.rankedOpportunities;

    // Highest rank must be the Autonomous Agent Sprint Hackathon (matches skills, remote, hackathon, and prize)
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[0].opportunity.title, 'Autonomous Agent Sprint 2026');
    assert.ok(ranked[0].score > 80);
    assert.ok(ranked[0].reasons.length >= 3);
    assert.equal(ranked[0].eligibility.status, 'eligible');

    // Second rank should be the AI Summer Intern or Quantum Fellowship
    assert.equal(ranked[1].rank, 2);
    assert.ok(ranked[1].score >= ranked[2].score);

    // All results must have valid scores and structured explanations
    for (const item of ranked) {
      assert.ok(item.score >= 0 && item.score <= 100);
      assert.ok(item.reasons.length > 0);
      assert.ok(item.breakdown.totalScore === item.score);
    }
  });
});
