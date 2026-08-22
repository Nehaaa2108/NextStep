import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { UserRequest } from "../../core/types/request.js";
import { WebEvidence, WebEvidenceItem } from "../../core/types/evidence.js";
import { runWebcmd, parseWebcmdJson } from "../webcmd-runner.js";
import { SourceAdapter, SourceAdapterOptions, SourceResult } from "./types.js";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Raw shape of a Devfolio hackathon item as returned by
 * `webcmd web fetch --url https://devfolio.co/api/hackathons/`
 * or the nextstep-sources devfolio-hackathons command when it becomes available.
 */
interface RawDevfolioHackathon {
  id?: string;
  name?: string;
  slug?: string;
  url?: string;
  tagline?: string;
  desc?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  reg_starts_at?: string | null;
  reg_ends_at?: string | null;
  is_online?: boolean | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  themes?: string[];
  type?: string | null;
  verified?: boolean;
  prize_pool?: string | null;
  team_size?: string | null;
  [key: string]: unknown;
}

interface DevfolioApiResponse {
  results?: RawDevfolioHackathon[];
  count?: number;
}

/**
 * Devfolio Hackathons source adapter.
 *
 * Live path:
 *   webcmd web fetch --url https://devfolio.co/api/hackathons/?page=<N>&count=20 -f json
 *   (or `webcmd nextstep-sources devfolio-hackathons --page <N> -f json` when available)
 *
 * Offline path:
 *   Loads src/fixtures/devfolio.json deterministically.
 *
 * Field mappings (Devfolio → canonical WebEvidenceItem.raw):
 *   name           → title
 *   url            → url
 *   desc / tagline → description (desc preferred, tagline as fallback)
 *   city + country / location → location
 *   is_online      → remote
 *   themes[]       → skills
 *   reg_ends_at    → deadline (registration deadline, preferred over ends_at)
 *   type           → opportunity_type
 *   prize_pool     → stipend_or_salary (prize info)
 */
export class DevfolioAdapter implements SourceAdapter {
  readonly sourceId = "devfolio" as const;

  /**
   * Devfolio API base URL.
   * When nextstep-sources plugin becomes available, this can be replaced
   * with: `webcmd nextstep-sources devfolio-hackathons --page 1 -f json`
   */
  private readonly apiBase = "https://devfolio.co/api/hackathons/";

  async fetch(
    _request: UserRequest,
    options: SourceAdapterOptions = {}
  ): Promise<SourceResult> {
    const retrievedAt = options.referenceDate ?? new Date().toISOString();
    const timeoutMs = options.timeoutMs ?? 15_000;

    // ── Offline fixture path ─────────────────────────────────────────────
    if (options.useFixture) {
      return this.loadFromFixture(retrievedAt);
    }

    // ── Live path: webcmd web fetch ──────────────────────────────────────
    // Construct URL. We use page=1 and count=20 for the initial MVP call.
    // Person 2 can extend this to pagination when the nextstep-sources
    // plugin becomes available.
    const url = `${this.apiBase}?page=1&count=20`;

    const result = await runWebcmd(
      ["web", "fetch", "--url", url, "-f", "json"],
      timeoutMs
    );

    if (result.exitCode !== 0) {
      return {
        ok: false,
        sourceId: this.sourceId,
        code: "DEVFOLIO_FETCH_FAILED",
        error: `webcmd web fetch failed (exit ${result.exitCode}): ${result.stderr.slice(0, 500)}`,
      };
    }

    const parsed = parseWebcmdJson<{ content?: string } | DevfolioApiResponse>(result.stdout);
    if (!parsed) {
      return {
        ok: false,
        sourceId: this.sourceId,
        code: "DEVFOLIO_PARSE_FAILED",
        error: "Failed to parse webcmd output as JSON",
      };
    }

    // webcmd web fetch returns { content: "<raw html/text>" } or raw JSON
    // Try to extract JSON from content field if present
    let apiData: DevfolioApiResponse;
    if ("content" in parsed && typeof parsed.content === "string") {
      const inner = parseWebcmdJson<DevfolioApiResponse>(parsed.content);
      if (!inner || !inner.results) {
        return {
          ok: false,
          sourceId: this.sourceId,
          code: "DEVFOLIO_CONTENT_UNPARSEABLE",
          error: "webcmd web fetch returned content that could not be parsed as Devfolio API response",
        };
      }
      apiData = inner;
    } else {
      apiData = parsed as DevfolioApiResponse;
    }

    return this.buildEvidence(apiData.results ?? [], retrievedAt);
  }

  private loadFromFixture(retrievedAt: string): SourceResult {
    try {
      const fixturePath = path.resolve(
        __dirname,
        "../../../src/fixtures/devfolio.json"
      );
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const raw = require(fixturePath) as DevfolioApiResponse;
      return this.buildEvidence(raw.results ?? [], retrievedAt);
    } catch (err) {
      return {
        ok: false,
        sourceId: this.sourceId,
        code: "DEVFOLIO_FIXTURE_LOAD_FAILED",
        error: `Failed to load devfolio fixture: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private buildEvidence(
    hackathons: RawDevfolioHackathon[],
    retrievedAt: string
  ): SourceResult {
    const items: WebEvidenceItem[] = hackathons.map((h) => {
      const location = [h.city, h.country].filter(Boolean).join(", ") || h.location || null;

      return {
        id: h.id ?? h.slug,
        title: h.name ?? undefined,
        url: h.url ?? undefined,
        snippet: h.desc ?? h.tagline ?? undefined,
        raw: {
          // Preserve all source fields verbatim for normalization
          ...h,
          // Add pre-computed helpers to guide normalizer without fabricating
          _computed_location: location,
          _computed_deadline: h.reg_ends_at ?? h.ends_at ?? null,
          _computed_description: h.desc ?? h.tagline ?? null,
          _computed_type: "hackathon",
        },
      };
    });

    const evidence: WebEvidence = {
      source: this.sourceId,
      command: "devfolio-hackathons",
      strategy: "api-fetch",
      retrievedAt,
      results: items,
      warnings: [],
    };

    return { ok: true, evidence };
  }
}
