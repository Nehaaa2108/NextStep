import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Opportunity,
  deduplicateOpportunities,
  deduplicate,
  normalizeUrlForDedupe,
  normalizeTextForMatching,
} from '../index.js';

function createSampleOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-sample-1',
    source: 'webcmd',
    title: 'AI Systems Engineer Intern',
    organization: 'Neural Systems Corp',
    url: 'https://example.com/careers/ai-intern',
    opportunity_type: 'internship',
    location: 'San Francisco, CA',
    remote: true,
    description: '12-week summer internship working on generative AI pipelines.',
    skills: ['Python', 'TypeScript', 'PyTorch'],
    eligibility: 'Undergraduate student graduating 2027',
    deadline: '2026-11-30T23:59:59Z',
    posted_date: '2026-08-15T00:00:00Z',
    stipend_or_salary: '$50/hr',
    duration: '12 weeks',
    raw_source_data: { test: true },
    retrieved_at: '2026-08-22T10:00:00Z',
    ...overrides,
  };
}

describe('Phase 5 — Opportunity Deduplication', () => {
  it('1. Exact duplicate URL -> one opportunity remains', () => {
    const opp1 = createSampleOpportunity({ id: 'opp-1', url: 'https://example.com/jobs/ai-intern' });
    const opp2 = createSampleOpportunity({ id: 'opp-2', url: 'https://example.com/jobs/ai-intern' });

    const result = deduplicateOpportunities([opp1, opp2]);

    assert.equal(result.opportunities.length, 1);
    assert.equal(result.summary.duplicatesRemoved, 1);
    assert.equal(result.summary.uniqueCount, 1);
    assert.equal(result.summary.duplicateGroups[0].matchReason, 'CANONICAL_URL');
  });

  it('2. Same URL with harmless formatting difference (trailing slash, uppercase host, UTM tracking) -> one opportunity remains', () => {
    const opp1 = createSampleOpportunity({
      id: 'opp-1',
      url: 'https://EXAMPLE.COM/jobs/ai-intern/?utm_source=linkedin&utm_medium=cpc',
    });
    const opp2 = createSampleOpportunity({
      id: 'opp-2',
      url: 'https://example.com/jobs/ai-intern',
    });

    const result = deduplicateOpportunities([opp1, opp2]);

    assert.equal(result.opportunities.length, 1);
    assert.equal(result.summary.duplicatesRemoved, 1);
  });

  it('3. Same title + organization with no URL -> duplicate when safely identifiable', () => {
    const opp1 = createSampleOpportunity({
      id: 'opp-1',
      title: 'Quantum Fellowship 2026',
      organization: 'Quantum Institute',
      url: null,
    });
    const opp2 = createSampleOpportunity({
      id: 'opp-2',
      title: '  Quantum   Fellowship 2026  ',
      organization: 'Quantum Institute',
      url: null,
    });

    const result = deduplicateOpportunities([opp1, opp2]);

    assert.equal(result.opportunities.length, 1);
    assert.equal(result.summary.duplicatesRemoved, 1);
    assert.equal(result.summary.duplicateGroups[0].matchReason, 'TITLE_ORGANIZATION_MATCH');
  });

  it('4. Different organizations -> must NOT be merged', () => {
    const opp1 = createSampleOpportunity({
      id: 'opp-1',
      title: 'Software Engineer Intern',
      organization: 'Acme Corp',
      url: 'https://acme.example/intern',
    });
    const opp2 = createSampleOpportunity({
      id: 'opp-2',
      title: 'Software Engineer Intern',
      organization: 'Globex Corp',
      url: 'https://globex.example/intern',
    });

    const result = deduplicateOpportunities([opp1, opp2]);

    assert.equal(result.opportunities.length, 2);
    assert.equal(result.summary.duplicatesRemoved, 0);
  });

  it('5. Different titles -> must NOT be merged merely because organization matches', () => {
    const opp1 = createSampleOpportunity({
      id: 'opp-1',
      title: 'Frontend Engineer Intern',
      organization: 'Acme Corp',
      url: 'https://acme.example/frontend',
    });
    const opp2 = createSampleOpportunity({
      id: 'opp-2',
      title: 'Backend Engineer Intern',
      organization: 'Acme Corp',
      url: 'https://acme.example/backend',
    });

    const result = deduplicateOpportunities([opp1, opp2]);

    assert.equal(result.opportunities.length, 2);
    assert.equal(result.summary.duplicatesRemoved, 0);
  });

  it('6. Two similar but genuinely different opportunities -> both remain', () => {
    const opp1 = createSampleOpportunity({
      id: 'opp-1',
      title: 'Machine Learning Intern - Fall 2026',
      organization: 'Neural Systems Corp',
      url: 'https://example.com/jobs/ml-fall-2026',
    });
    const opp2 = createSampleOpportunity({
      id: 'opp-2',
      title: 'Machine Learning Intern - Summer 2026',
      organization: 'Neural Systems Corp',
      url: 'https://example.com/jobs/ml-summer-2026',
    });

    const result = deduplicateOpportunities([opp1, opp2]);

    assert.equal(result.opportunities.length, 2);
    assert.equal(result.summary.duplicatesRemoved, 0);
  });

  it('7. More complete duplicate record is preferred and enriches missing fields from less complete record', () => {
    // Record A has full description, deadline, salary, skills: [Python, PyTorch]
    const oppA = createSampleOpportunity({
      id: 'opp-rich',
      title: 'Agent Hackathon 2026',
      organization: 'Hackathon League',
      url: 'https://example.com/hackathons/agent-2026',
      description: 'Comprehensive 48h virtual hackathon description.',
      deadline: '2026-10-31T23:59:59Z',
      stipend_or_salary: '$20,000 in prizes',
      duration: null, // missing duration
      skills: ['Python', 'PyTorch'],
    });

    // Record B is less complete but has duration: '48 hours' and skills: [TypeScript]
    const oppB = createSampleOpportunity({
      id: 'opp-sparse',
      title: 'Agent Hackathon 2026',
      organization: 'Hackathon League',
      url: 'https://example.com/hackathons/agent-2026',
      description: null,
      deadline: null,
      stipend_or_salary: null,
      duration: '48 hours',
      skills: ['TypeScript', 'Python'],
    });

    const result = deduplicateOpportunities([oppB, oppA]); // Test with sparse first in array

    assert.equal(result.opportunities.length, 1);
    const canonical = result.opportunities[0];

    // Canonical should be based on opp-rich
    assert.equal(canonical.id, 'opp-rich');
    assert.equal(canonical.description, 'Comprehensive 48h virtual hackathon description.');
    assert.equal(canonical.deadline, '2026-10-31T23:59:59Z');
    assert.equal(canonical.stipend_or_salary, '$20,000 in prizes');
    // Enriched with duration from oppB
    assert.equal(canonical.duration, '48 hours');
    // Skills union: Python, PyTorch, TypeScript
    assert.deepEqual(canonical.skills, ['Python', 'PyTorch', 'TypeScript']);
  });

  it('8. Deduplication is strictly deterministic', () => {
    const opp1 = createSampleOpportunity({ id: 'opp-1', url: 'https://example.com/jobs/1' });
    const opp2 = createSampleOpportunity({ id: 'opp-2', url: 'https://example.com/jobs/1' });
    const opp3 = createSampleOpportunity({ id: 'opp-3', url: 'https://example.com/jobs/2' });

    const run1 = deduplicateOpportunities([opp1, opp2, opp3]);
    const run2 = deduplicateOpportunities([opp1, opp2, opp3]);

    assert.deepEqual(run1, run2);
  });

  it('9. Empty Opportunity[] -> returns []', () => {
    const result = deduplicateOpportunities([]);
    assert.equal(result.opportunities.length, 0);
    assert.equal(result.summary.totalInput, 0);
    assert.equal(result.summary.uniqueCount, 0);
  });

  it('10. Single Opportunity -> unchanged', () => {
    const opp = createSampleOpportunity({ id: 'single-opp' });
    const result = deduplicateOpportunities([opp]);

    assert.equal(result.opportunities.length, 1);
    assert.equal(result.opportunities[0].id, 'single-opp');
    assert.equal(result.summary.duplicatesRemoved, 0);
  });

  it('11. Direct helper deduplicate() returns array directly', () => {
    const opp1 = createSampleOpportunity({ id: 'opp-1', url: 'https://example.com/jobs/1' });
    const opp2 = createSampleOpportunity({ id: 'opp-2', url: 'https://example.com/jobs/1' });

    const array = deduplicate([opp1, opp2]);
    assert.equal(array.length, 1);
  });

  it('12. normalizeUrlForDedupe and normalizeTextForMatching helper tests', () => {
    assert.equal(
      normalizeUrlForDedupe('  https://EXAMPLE.COM/path/to/job/?utm_source=twitter&foo=bar#section  '),
      'https://example.com/path/to/job?foo=bar'
    );
    assert.equal(normalizeUrlForDedupe('not-a-url'), null);
    assert.equal(normalizeUrlForDedupe(null), null);

    assert.equal(normalizeTextForMatching('  AI-Powered   Research_Grant! '), 'ai powered research grant');
    assert.equal(normalizeTextForMatching(null), null);
    assert.equal(normalizeTextForMatching('   '), null);
  });
});
