import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  loadFixture,
  MockWebEvidenceProvider,
  WebEvidenceProvider,
  WebTask,
  normalizeEvidence,
  normalizeRawItem,
  NormalizationIssue,
} from '../index.js';

describe('Phase 2 — Fixtures and Mock Provider', () => {
  it('should load all five deterministic fixtures without errors', () => {
    const successFixture = loadFixture('success');
    const partialFixture = loadFixture('partial');
    const emptyFixture = loadFixture('empty');
    const duplicateFixture = loadFixture('duplicate');
    const malformedFixture = loadFixture('malformed');

    assert.equal(successFixture.source, 'webcmd');
    assert.equal(successFixture.results.length, 3);

    assert.equal(partialFixture.source, 'webcmd');
    assert.equal(partialFixture.results.length, 2);
    assert.ok(partialFixture.warnings && partialFixture.warnings.length > 0);

    assert.equal(emptyFixture.source, 'webcmd');
    assert.equal(emptyFixture.results.length, 0);

    assert.equal(duplicateFixture.source, 'webcmd');
    assert.equal(duplicateFixture.results.length, 2);

    assert.equal(malformedFixture.source, 'webcmd');
    assert.equal(malformedFixture.results.length, 3);
  });

  it('should allow MockWebEvidenceProvider to load specific fixtures deterministically', async () => {
    const provider: WebEvidenceProvider = new MockWebEvidenceProvider();

    // 1. Load default fixture (success)
    const defaultEvidence = await provider.run({ taskId: 'task-1', query: 'all' });
    assert.equal(defaultEvidence.results.length, 3);

    // 2. Load via targetScope
    const emptyEvidence = await provider.run({ taskId: 'task-2', query: 'none', targetScope: 'empty' });
    assert.equal(emptyEvidence.results.length, 0);

    // 3. Load via options.metadata
    const partialEvidence = await provider.run({
      taskId: 'task-3',
      query: 'partial',
      options: { metadata: { fixture: 'partial' } },
    });
    assert.equal(partialEvidence.results.length, 2);

    // 4. Instantiate provider with explicit default fixture
    const dupProvider = new MockWebEvidenceProvider('duplicate');
    const dupEvidence = await dupProvider.run({ taskId: 'task-4', query: 'dup' });
    assert.equal(dupEvidence.results.length, 2);
  });
});

describe('Phase 3 — Raw Evidence Normalization', () => {
  it('1. SUCCESS FIXTURE: should normalize varied raw fields into canonical Opportunity objects', () => {
    const fixture = loadFixture('success');
    const result = normalizeEvidence(fixture);

    assert.equal(result.opportunities.length, 3);
    assert.equal(result.issues.length, 0);
    assert.equal(result.evidenceSource, 'webcmd');

    const [opp1, opp2, opp3] = result.opportunities;

    // Check item 1 (job_title -> title, apply_url -> url, stipend -> stipend_or_salary, etc.)
    assert.equal(opp1.title, 'Autonomous Agent Sprint 2026');
    assert.equal(opp1.organization, 'Open Robotics Consortium');
    assert.equal(opp1.url, 'https://fictional-radar.example/hackathons/agent-sprint');
    assert.equal(opp1.opportunity_type, 'hackathon');
    assert.equal(opp1.location, 'Remote');
    assert.equal(opp1.remote, true);
    assert.deepEqual(opp1.skills, ['Python', 'TypeScript', 'Browser Automation']);
    assert.equal(opp1.stipend_or_salary, '$25,000 in total prizes');
    assert.equal(opp1.duration, '48 hours');
    assert.equal(opp1.deadline, '2026-10-15T23:59:59Z');
    assert.ok(opp1.raw_source_data !== null);

    // Check item 2 (company -> organization, is_remote: "false" -> false, technologies -> skills)
    assert.equal(opp2.title, 'AI Engineering Summer Intern');
    assert.equal(opp2.organization, 'Apex Neural Labs');
    assert.equal(opp2.remote, false);
    assert.deepEqual(opp2.skills, ['PyTorch', 'CUDA', 'Python']);
    assert.equal(opp2.stipend_or_salary, '$52/hour + housing stipend');
    assert.equal(opp2.duration, '12 weeks');

    // Check item 3 (opportunity_title -> title, host -> organization, link -> url, tags -> skills)
    assert.equal(opp3.title, 'Undergraduate Quantum Computing Fellowship');
    assert.equal(opp3.organization, 'Quantum Research Initiative');
    assert.equal(opp3.url, 'https://fictional-radar.example/fellowships/quantum-2026');
    assert.equal(opp3.opportunity_type, 'fellowship');
    assert.equal(opp3.remote, null); // "hybrid" correctly maps to null without guessing
    assert.deepEqual(opp3.skills, ['Quantum Algorithms', 'Linear Algebra', 'Qiskit']);
    assert.equal(opp3.stipend_or_salary, '$8,000 research stipend');
  });

  it('2. PARTIAL FIXTURE: should produce usable canonical records and preserve warnings without inventing missing values', () => {
    const fixture = loadFixture('partial');
    const result = normalizeEvidence(fixture);

    assert.equal(result.opportunities.length, 2);
    // Envelope warnings must be preserved
    assert.ok(result.warnings.some((w) => w.includes('Search pagination limit reached')));

    const [opp1, opp2] = result.opportunities;

    // Item 1: organization exists, but deadline and stipend are missing -> must be null
    assert.equal(opp1.title, 'Frontend Software Engineering Intern');
    assert.equal(opp1.organization, 'CloudScale Web Systems');
    assert.equal(opp1.deadline, null);
    assert.equal(opp1.stipend_or_salary, null);
    assert.equal(opp1.eligibility, null);

    // Item 2: organization is null, location is null -> preserved as null
    assert.equal(opp2.title, 'Open Source Tooling Grant');
    assert.equal(opp2.organization, null);
    assert.equal(opp2.location, null);
    assert.equal(opp2.deadline, null);
    assert.equal(opp2.stipend_or_salary, '$5,000 one-time grant');
  });

  it('3. EMPTY FIXTURE: should return 0 opportunities without inventing fake records', () => {
    const fixture = loadFixture('empty');
    const result = normalizeEvidence(fixture);

    assert.equal(result.opportunities.length, 0);
    assert.equal(result.issues.length, 0);
    assert.ok(result.warnings.some((w) => w.includes('Zero results matched')));
  });

  it('4. DUPLICATE FIXTURE: should normalize all duplicate raw records into canonical records without dropping them', () => {
    const fixture = loadFixture('duplicate');
    const result = normalizeEvidence(fixture);

    // Both records must be normalized. Deduplication is strictly deferred to future phase.
    assert.equal(result.opportunities.length, 2);

    const [opp1, opp2] = result.opportunities;
    assert.equal(opp1.title, 'Autonomous Agent Sprint 2026');
    assert.equal(opp2.title, 'Autonomous Agent Sprint 2026');
    assert.equal(opp1.organization, 'Open Robotics Consortium');
    assert.equal(opp2.organization, 'Open Robotics Consortium');
    assert.equal(opp1.url, 'https://fictional-radar.example/hackathons/agent-sprint');
    assert.equal(opp2.url, 'https://fictional-radar.example/hackathons/agent-sprint');
  });

  it('5. MALFORMED FIXTURE: should not invent fake values and record structured issues/warnings', () => {
    const fixture = loadFixture('malformed');
    const result = normalizeEvidence(fixture);

    // 1 corrupted item + 1 whitespace-only title item + 1 valid item
    assert.equal(result.opportunities.length, 1);
    assert.equal(result.opportunities[0].title, 'Verified Student Research Grant');
    assert.equal(result.opportunities[0].organization, 'Future Tech Institute');

    // Issues must capture malformed records
    assert.ok(result.issues.length >= 2);
    assert.ok(result.issues.some((i) => i.code === 'MISSING_TITLE'));
    assert.ok(result.warnings.some((w) => w.includes('could not be normalized')));
  });

  it('6. DETERMINISM: running normalization twice on identical evidence produces deep equal outputs', () => {
    const fixture = loadFixture('success');
    const run1 = normalizeEvidence(fixture);
    const run2 = normalizeEvidence(fixture);

    assert.deepEqual(run1, run2);
  });

  it('7. INDIVIDUAL ITEM NORMALIZATION: should handle edge cases safely', () => {
    const issues: NormalizationIssue[] = [];

    // Non-object item
    const nullItem = normalizeRawItem(null as unknown as Record<string, unknown>, 0, 'test', '2026-08-22T00:00:00Z', issues);
    assert.equal(nullItem, null);
    assert.equal(issues[0].code, 'MALFORMED_ITEM');

    // Comma-separated skills string
    const stringSkillsItem = normalizeRawItem(
      {
        title: 'Backend Dev',
        skills: 'Node.js, Express; TypeScript, PostgreSQL',
      },
      1,
      'test',
      '2026-08-22T00:00:00Z',
      issues
    );
    assert.ok(stringSkillsItem !== null);
    assert.deepEqual(stringSkillsItem.skills, ['Node.js', 'Express', 'TypeScript', 'PostgreSQL']);
  });
});

describe('Part 6 — End-to-End Mock Check', () => {
  it('should flow seamlessly: fixture -> MockWebEvidenceProvider -> WebEvidence -> Normalizer -> Opportunity[]', async () => {
    // 1. Initialize Mock Provider (no network / no browser / no live WebCMD)
    const provider: WebEvidenceProvider = new MockWebEvidenceProvider();

    // 2. Define WebTask
    const task: WebTask = {
      taskId: 'e2e-task-001',
      query: 'tech student opportunities 2026',
      options: {
        metadata: { fixture: 'success' },
      },
    };

    // 3. Provider executes and returns WebEvidence
    const evidence = await provider.run(task);
    assert.equal(evidence.source, 'webcmd');
    assert.equal(evidence.results.length, 3);

    // 4. Normalizer processes WebEvidence
    const normalizationResult = normalizeEvidence(evidence);

    // 5. Output canonical opportunities
    const opportunities = normalizationResult.opportunities;
    assert.equal(opportunities.length, 3);

    for (const opp of opportunities) {
      assert.ok(typeof opp.id === 'string' && opp.id.length > 0);
      assert.ok(typeof opp.title === 'string' && opp.title.length > 0);
      assert.equal(opp.source, 'webcmd');
      assert.ok(opp.retrieved_at.length > 0);
    }
  });
});
