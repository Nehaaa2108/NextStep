import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MockWebEvidenceProvider,
  WebEvidenceProvider,
  WebTask,
  normalizeEvidence,
  validateOpportunities,
  deduplicateOpportunities,
} from '../index.js';

describe('Part 7 — Complete Backend Mock Pipeline Check', () => {
  it('should run full pipeline with duplicate fixture: Provider -> Evidence -> Normalizer -> Validator -> Deduplicator -> Clean Opportunities', async () => {
    // 1. Provider executes WebTask (MockWebEvidenceProvider)
    const provider: WebEvidenceProvider = new MockWebEvidenceProvider('duplicate');
    const task: WebTask = {
      taskId: 'pipeline-dup-test',
      query: 'autonomous agents hackathon',
    };

    const evidence = await provider.run(task);
    assert.equal(evidence.source, 'webcmd');
    assert.equal(evidence.results.length, 2);

    // 2. Normalization: WebEvidence -> Opportunity[]
    const normResult = normalizeEvidence(evidence);
    assert.equal(normResult.opportunities.length, 2);

    // 3. Validation: Opportunity[] -> Valid / Invalid
    const valResult = validateOpportunities(normResult.opportunities);
    assert.equal(valResult.total, 2);
    assert.equal(valResult.opportunities.length, 2);
    assert.equal(valResult.invalidOpportunities.length, 0);

    // 4. Deduplication: Valid Opportunity[] -> Deduplicated clean Opportunity[]
    const dedupeResult = deduplicateOpportunities(valResult.opportunities);
    assert.equal(dedupeResult.summary.totalInput, 2);
    assert.equal(dedupeResult.summary.uniqueCount, 1);
    assert.equal(dedupeResult.summary.duplicatesRemoved, 1);
    assert.equal(dedupeResult.opportunities.length, 1);

    const cleanOpp = dedupeResult.opportunities[0];
    assert.equal(cleanOpp.title, 'Autonomous Agent Sprint 2026');
    assert.equal(cleanOpp.organization, 'Open Robotics Consortium');
    assert.equal(cleanOpp.url, 'https://fictional-radar.example/hackathons/agent-sprint');
    assert.equal(cleanOpp.opportunity_type, 'hackathon');
    assert.equal(cleanOpp.remote, true);
    assert.deepEqual(cleanOpp.skills, ['Python', 'TypeScript']);
  });

  it('should run full pipeline with success fixture', async () => {
    const provider: WebEvidenceProvider = new MockWebEvidenceProvider('success');
    const task: WebTask = { taskId: 'pipeline-succ-test', query: 'all' };

    const evidence = await provider.run(task);
    const normResult = normalizeEvidence(evidence);
    const valResult = validateOpportunities(normResult.opportunities);
    const dedupeResult = deduplicateOpportunities(valResult.opportunities);

    assert.equal(dedupeResult.opportunities.length, 3);
    assert.equal(dedupeResult.summary.duplicatesRemoved, 0);
  });

  it('should run full pipeline with partial fixture', async () => {
    const provider: WebEvidenceProvider = new MockWebEvidenceProvider('partial');
    const task: WebTask = { taskId: 'pipeline-part-test', query: 'internships' };

    const evidence = await provider.run(task);
    const normResult = normalizeEvidence(evidence);
    assert.equal(normResult.opportunities.length, 2);

    const valResult = validateOpportunities(normResult.opportunities);
    // Item 1 has organization & valid URL -> valid
    // Item 2 has null organization -> invalid
    assert.equal(valResult.opportunities.length, 1);
    assert.equal(valResult.invalidOpportunities.length, 1);

    const dedupeResult = deduplicateOpportunities(valResult.opportunities);
    assert.equal(dedupeResult.opportunities.length, 1);
  });

  it('should run full pipeline with empty fixture', async () => {
    const provider: WebEvidenceProvider = new MockWebEvidenceProvider('empty');
    const task: WebTask = { taskId: 'pipeline-empty-test', query: 'none' };

    const evidence = await provider.run(task);
    const normResult = normalizeEvidence(evidence);
    const valResult = validateOpportunities(normResult.opportunities);
    const dedupeResult = deduplicateOpportunities(valResult.opportunities);

    assert.equal(dedupeResult.opportunities.length, 0);
    assert.equal(dedupeResult.summary.totalInput, 0);
  });
});
