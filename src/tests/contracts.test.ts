import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  UserRequest,
  Opportunity,
  WebTask,
  WebEvidence,
  ProductResult,
  BackendError,
  MockWebEvidenceProvider,
  WebEvidenceProvider,
} from '../index.js';

describe('Person 3 Backend Foundation Contracts', () => {
  it('should instantiate and validate a UserRequest contract', () => {
    const request: UserRequest = {
      query: 'Machine Learning Hackathons for Undergrads',
      opportunityTypes: ['hackathon', 'internship'],
      location: 'Remote',
      remote: true,
      skills: ['Python', 'PyTorch'],
      eligibilityYear: 'Sophomore',
      deadlineConstraint: '2026-12-31',
      preferences: {
        minPrize: 1000,
      },
    };

    assert.equal(request.query, 'Machine Learning Hackathons for Undergrads');
    assert.deepEqual(request.opportunityTypes, ['hackathon', 'internship']);
    assert.equal(request.remote, true);
    assert.deepEqual(request.skills, ['Python', 'PyTorch']);
  });

  it('should instantiate a canonical Opportunity record without invented values', () => {
    const opp: Opportunity = {
      id: 'opp-101',
      source: 'webcmd',
      title: 'AI Global Hackathon 2026',
      organization: 'Tech Foundation',
      url: 'https://example.com/hackathon-2026',
      opportunity_type: 'hackathon',
      location: 'San Francisco, CA',
      remote: true,
      description: 'Annual global hackathon focusing on AI agents.',
      skills: ['TypeScript', 'Python'],
      eligibility: 'Open to college students',
      deadline: '2026-10-15T23:59:59Z',
      posted_date: '2026-08-01T00:00:00Z',
      stipend_or_salary: '$50,000 in prizes',
      duration: '48 hours',
      raw_source_data: { rawKey: 'rawValue' },
      retrieved_at: '2026-08-22T10:00:00Z',
    };

    assert.equal(opp.id, 'opp-101');
    assert.equal(opp.source, 'webcmd');
    assert.equal(opp.remote, true);
    assert.equal(opp.stipend_or_salary, '$50,000 in prizes');
  });

  it('should support null/undefined for unknown opportunity fields', () => {
    const minimalOpp: Opportunity = {
      id: 'opp-102',
      source: 'mock-source',
      title: 'Summer Internship',
      organization: null,
      url: null,
      opportunity_type: null,
      location: null,
      remote: null,
      description: null,
      skills: [],
      eligibility: null,
      deadline: null,
      posted_date: null,
      stipend_or_salary: null,
      duration: null,
      raw_source_data: null,
      retrieved_at: '2026-08-22T10:00:00Z',
    };

    assert.equal(minimalOpp.id, 'opp-102');
    assert.equal(minimalOpp.organization, null);
    assert.equal(minimalOpp.remote, null);
  });

  it('should instantiate a generic WebTask without hardcoded target websites', () => {
    const task: WebTask = {
      taskId: 'task-abc-123',
      query: 'summer 2026 software engineering internships',
      targetScope: 'student-tech-portals',
      options: {
        maxResults: 10,
        timeoutMs: 15000,
        categories: ['internship'],
      },
    };

    assert.equal(task.taskId, 'task-abc-123');
    assert.equal(task.options?.maxResults, 10);
  });

  it('should format a WebEvidence envelope with source items and metadata', () => {
    const evidence: WebEvidence = {
      source: 'mock-provider',
      command: 'search:hackathons',
      strategy: 'dom-extract',
      browser: null,
      retrievedAt: '2026-08-22T10:00:00Z',
      results: [
        {
          id: 'item-1',
          title: 'CAADS Hackathon',
          url: 'https://example.com/caads',
          snippet: 'Build the future of autonomous workflows',
          raw: { sourceScore: 98 },
        },
      ],
      warnings: [],
      rawRef: 'session-log-1',
    };

    assert.equal(evidence.source, 'mock-provider');
    assert.equal(evidence.results.length, 1);
    assert.equal(evidence.results[0].title, 'CAADS Hackathon');
  });

  it('should format a ProductResult contract for frontend synthesis', () => {
    const result: ProductResult = {
      requestId: 'req-001',
      status: 'success',
      summary: 'Found 1 high-matching opportunity.',
      results: [
        {
          id: 'opp-101',
          title: 'AI Global Hackathon 2026',
          score: 95,
          reason: 'Matches Python/TypeScript skill preferences and student eligibility',
          url: 'https://example.com/hackathon-2026',
        },
      ],
      sources: ['webcmd'],
      warnings: [],
    };

    assert.equal(result.requestId, 'req-001');
    assert.equal(result.status, 'success');
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].score, 95);
  });
});

describe('WebEvidenceProvider Abstraction and Placeholders', () => {
  it('should execute MockWebEvidenceProvider successfully', async () => {
    const provider: WebEvidenceProvider = new MockWebEvidenceProvider();
    assert.equal(provider.providerName, 'mock-provider');

    const task: WebTask = {
      taskId: 'task-test-01',
      query: 'research fellowships',
    };

    const evidence = await provider.run(task);
    assert.ok(evidence.source);
    assert.ok(evidence.rawRef);
    assert.ok(Array.isArray(evidence.results));
  });


});

describe('BackendError Contract and Serialization', () => {
  it('should correctly capture error stage, code, message and details', () => {
    const stages = ['discovery', 'execution', 'parse', 'validation', 'domain'] as const;

    for (const stage of stages) {
      const err = new BackendError({
        stage,
        code: `ERR_${stage.toUpperCase()}`,
        message: `Failed during ${stage}`,
        details: { step: 1 },
      });

      assert.equal(err.stage, stage);
      assert.equal(err.code, `ERR_${stage.toUpperCase()}`);
      assert.equal(err.message, `Failed during ${stage}`);

      const json = err.toJSON();
      assert.equal(json.stage, stage);
      assert.equal(json.code, `ERR_${stage.toUpperCase()}`);
    }
  });
});
