/**
 * devfolio-hackathons
 *
 * Retrieves hackathons from the Devfolio public API.
 * Source:  https://api.devfolio.co/api/hackathons?page=<page>
 * Auth:    none (public endpoint)
 * Strategy: public HTTP JSON
 *
 * Output per item (all fields verified against live API 2026-08-22):
 *   name          - hackathon display name
 *   slug          - url-safe identifier; canonical URL = https://<slug>.devfolio.co
 *   url           - canonical hackathon URL derived from slug
 *   tagline       - short tagline (nullable)
 *   desc          - longer description (nullable)
 *   starts_at     - ISO 8601 start datetime
 *   ends_at       - ISO 8601 end datetime
 *   reg_starts_at - registration open datetime (from hackathon_setting)
 *   reg_ends_at   - registration close datetime (from hackathon_setting)
 *   is_online     - boolean; true = online hackathon
 *   location      - full venue address string (null if online)
 *   city          - city (nullable)
 *   country       - country (nullable)
 *   themes        - array of { name: string } theme tags
 *   type          - always "HACKATHON" for this endpoint
 *   verified      - whether Devfolio has verified the event
 *   source        - always "devfolio" for downstream identification
 */

import { cli, Strategy } from '@agentrhq/webcmd/registry';

interface DevfolioTheme {
  uuid: string;
  name: string;
  verified: boolean;
}

interface DevfolioHackathonSetting {
  reg_starts_at: string | null;
  reg_ends_at: string | null;
  subdomain: string | null;
}

interface DevfolioHackathon {
  name: string;
  slug: string;
  tagline: string | null;
  desc: string | null;
  starts_at: string;
  ends_at: string;
  is_online: boolean;
  location: string | null;
  city: string | null;
  country: string | null;
  themes: DevfolioTheme[];
  type: string;
  verified: boolean;
  hackathon_setting: DevfolioHackathonSetting | null;
}

interface DevfolioApiResponse {
  result: DevfolioHackathon[];
}

interface NextStepHackathon {
  source: 'devfolio';
  name: string;
  slug: string;
  url: string;
  tagline: string | null;
  desc: string | null;
  starts_at: string;
  ends_at: string;
  reg_starts_at: string | null;
  reg_ends_at: string | null;
  is_online: boolean;
  location: string | null;
  city: string | null;
  country: string | null;
  themes: string[];
  type: string;
  verified: boolean;
}

cli({
  site: 'nextstep-sources',
  name: 'devfolio-hackathons',
  description: 'Retrieve hackathons from the Devfolio public API',
  access: 'read',
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    {
      name: 'page',
      type: 'int',
      required: false,
      help: 'Page number (1-indexed). Each page returns up to 1000 results.',
      default: 1,
    },
  ],
  columns: ['name', 'starts_at', 'ends_at', 'is_online', 'location', 'url'],
  func: async (kwargs): Promise<NextStepHackathon[]> => {
    const page = Number(kwargs.page ?? 1);
    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`Invalid page "${kwargs.page}": must be a positive integer.`);
    }

    const url = `https://api.devfolio.co/api/hackathons?page=${page}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Devfolio API error: HTTP ${response.status} ${response.statusText}`);
    }

    const body: DevfolioApiResponse = await response.json();

    if (!Array.isArray(body.result)) {
      throw new Error('Unexpected Devfolio API response: "result" array missing.');
    }

    return body.result.map((h: DevfolioHackathon): NextStepHackathon => ({
      source: 'devfolio',
      name: h.name,
      slug: h.slug,
      url: `https://${h.slug}.devfolio.co`,
      tagline: h.tagline ?? null,
      desc: h.desc ?? null,
      starts_at: h.starts_at,
      ends_at: h.ends_at,
      reg_starts_at: h.hackathon_setting?.reg_starts_at ?? null,
      reg_ends_at: h.hackathon_setting?.reg_ends_at ?? null,
      is_online: h.is_online,
      location: h.location ?? null,
      city: h.city ?? null,
      country: h.country ?? null,
      themes: (h.themes ?? []).map((t: DevfolioTheme) => t.name),
      type: h.type,
      verified: h.verified,
    }));
  },
});
