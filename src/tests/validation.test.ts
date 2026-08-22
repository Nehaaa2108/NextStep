import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Opportunity,
  validateOpportunity,
  validateOpportunities,
  isValidHttpUrl,
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

describe('Phase 4 — Canonical Opportunity Validation', () => {
  it('1. Fully valid opportunity -> valid', () => {
    const opp = createSampleOpportunity();
    const result = validateOpportunity(opp);

    assert.equal(result.valid, true);
    assert.equal(result.issues.length, 0);
  });

  it('2. Missing title -> invalid', () => {
    const opp = createSampleOpportunity({ title: '' });
    const result = validateOpportunity(opp);

    assert.equal(result.valid, false);
    assert.ok(result.issues.some((i) => i.code === 'MISSING_TITLE' && i.severity === 'error'));
  });

  it('3. Missing organization -> invalid', () => {
    const opp = createSampleOpportunity({ organization: null });
    const result = validateOpportunity(opp);

    assert.equal(result.valid, false);
    assert.ok(result.issues.some((i) => i.code === 'MISSING_ORGANIZATION' && i.severity === 'error'));
  });

  it('4. Missing URL -> invalid', () => {
    const opp = createSampleOpportunity({ url: null });
    const result = validateOpportunity(opp);

    assert.equal(result.valid, false);
    assert.ok(result.issues.some((i) => i.code === 'MISSING_URL' && i.severity === 'error'));
  });

  it('5. Invalid URL format -> invalid', () => {
    const opp = createSampleOpportunity({ url: 'htp:/not-a-valid-url-address' });
    const result = validateOpportunity(opp);

    assert.equal(result.valid, false);
    assert.ok(result.issues.some((i) => i.code === 'INVALID_URL_FORMAT' && i.severity === 'error'));
  });

  it('6. Missing optional fields -> still usable/valid', () => {
    const opp = createSampleOpportunity({
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
    });
    const result = validateOpportunity(opp);

    assert.equal(result.valid, true);
    assert.equal(result.issues.filter((i) => i.severity === 'error').length, 0);
  });

  it('7. Whitespace-only critical field -> invalid', () => {
    const oppTitleWhitespace = createSampleOpportunity({ title: '   ' });
    const resultTitle = validateOpportunity(oppTitleWhitespace);
    assert.equal(resultTitle.valid, false);
    assert.ok(resultTitle.issues.some((i) => i.code === 'MISSING_TITLE'));

    const oppOrgWhitespace = createSampleOpportunity({ organization: ' \t\n ' });
    const resultOrg = validateOpportunity(oppOrgWhitespace);
    assert.equal(resultOrg.valid, false);
    assert.ok(resultOrg.issues.some((i) => i.code === 'MISSING_ORGANIZATION'));

    const oppUrlWhitespace = createSampleOpportunity({ url: '   ' });
    const resultUrl = validateOpportunity(oppUrlWhitespace);
    assert.equal(resultUrl.valid, false);
    assert.ok(resultUrl.issues.some((i) => i.code === 'MISSING_URL'));
  });

  it('8. Multiple validation issues -> all relevant issues reported', () => {
    const opp = createSampleOpportunity({
      id: '',
      title: '',
      organization: '   ',
      url: 'invalid-url',
    });
    const result = validateOpportunity(opp);

    assert.equal(result.valid, false);
    const codes = result.issues.map((i) => i.code);
    assert.ok(codes.includes('MISSING_ID'));
    assert.ok(codes.includes('MISSING_TITLE'));
    assert.ok(codes.includes('MISSING_ORGANIZATION'));
    assert.ok(codes.includes('INVALID_URL_FORMAT'));
  });

  it('9. Batch validation segregates valid opportunities from invalid opportunities', () => {
    const valid1 = createSampleOpportunity({ id: 'valid-1' });
    const valid2 = createSampleOpportunity({ id: 'valid-2', deadline: null });
    const invalid1 = createSampleOpportunity({ id: 'invalid-1', title: '' });
    const invalid2 = createSampleOpportunity({ id: 'invalid-2', url: 'invalid-link' });

    const batchResult = validateOpportunities([valid1, invalid1, valid2, invalid2]);

    assert.equal(batchResult.total, 4);
    assert.equal(batchResult.opportunities.length, 2);
    assert.equal(batchResult.invalidOpportunities.length, 2);
    assert.equal(batchResult.valid, false); // Not all were valid
    assert.deepEqual(
      batchResult.opportunities.map((o) => o.id),
      ['valid-1', 'valid-2']
    );
  });

  it('10. URL validator helper tests', () => {
    assert.equal(isValidHttpUrl('https://example.com/jobs/1'), true);
    assert.equal(isValidHttpUrl('http://localhost:3000/apply'), true);
    assert.equal(isValidHttpUrl('ftp://example.com/file'), false);
    assert.equal(isValidHttpUrl('not-a-url'), false);
    assert.equal(isValidHttpUrl(''), false);
    assert.equal(isValidHttpUrl(null), false);
  });
});
