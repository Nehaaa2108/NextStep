/**
 * arbeitnow-jobs
 *
 * Retrieves job postings from the Arbeitnow public API.
 * Source:  https://www.arbeitnow.com/api/job-board-api?search=<search>&page=<page>
 * Auth:    none (public API)
 * Strategy: public HTTP JSON
 *
 * Output per item (all fields verified against live API 2026-08-22):
 *   source       - always "arbeitnow"
 *   title        - job title
 *   company_name - company name
 *   location     - location string
 *   remote       - boolean
 *   tags         - array of tags/skills
 *   job_types    - array of job types (e.g. Student, Working student, Entry)
 *   url          - job post details/apply URL
 *   created_at   - epoch timestamp
 *   slug         - url-safe identifier
 *   description  - HTML job description string
 */

import { cli, Strategy } from '@agentrhq/webcmd/registry';

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

interface ArbeitnowApiResponse {
  data: ArbeitnowJob[];
  meta?: {
    current_page?: number;
    per_page?: number;
  };
}

interface NextStepJob {
  source: 'arbeitnow';
  title: string;
  company_name: string;
  location: string;
  remote: boolean;
  tags: string[];
  job_types: string[];
  url: string;
  created_at: number;
  slug: string;
  description: string;
}

cli({
  site: 'nextstep-sources',
  name: 'arbeitnow-jobs',
  description: 'Retrieve job postings from the Arbeitnow public API',
  access: 'read',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    {
      name: 'search',
      type: 'string',
      required: false,
      help: 'Search keyword (e.g., "intern", "working student")',
      default: 'intern',
    },
    {
      name: 'page',
      type: 'int',
      required: false,
      help: 'Page number (1-indexed)',
      default: 1,
    },
  ],
  columns: ['title', 'company_name', 'location', 'remote', 'url'],
  func: async (kwargs): Promise<NextStepJob[]> => {
    const search = String(kwargs.search ?? 'intern');
    const page = Number(kwargs.page ?? 1);

    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`Invalid page "${kwargs.page}": must be a positive integer.`);
    }

    const queryParams = new URLSearchParams({
      search,
      page: String(page),
    });

    const url = `https://www.arbeitnow.com/api/job-board-api?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Arbeitnow API error: HTTP ${response.status} ${response.statusText}`);
    }

    const body: ArbeitnowApiResponse = await response.json();

    if (!Array.isArray(body.data)) {
      throw new Error('Unexpected Arbeitnow API response: "data" array missing.');
    }

    return body.data.map((j: ArbeitnowJob): NextStepJob => ({
      source: 'arbeitnow',
      title: j.title,
      company_name: j.company_name,
      location: j.location ?? '',
      remote: !!j.remote,
      tags: Array.isArray(j.tags) ? j.tags : [],
      job_types: Array.isArray(j.job_types) ? j.job_types : [],
      url: j.url,
      created_at: Number(j.created_at),
      slug: j.slug,
      description: j.description ?? '',
    }));
  },
});
