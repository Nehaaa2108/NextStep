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
 * Raw shape of an Arbeitnow job item.
 * Source: https://www.arbeitnow.com/api/job-board-api
 * (also matches nextstep-sources arbeitnow-jobs output when available)
 */
interface RawArbeitnowJob {
  slug?: string;
  title?: string;
  company_name?: string;
  location?: string | null;
  remote?: boolean | null;
  tags?: string[];
  job_types?: string[];
  url?: string;
  created_at?: number; // Unix timestamp
  description?: string | null;
  visa_sponsorship?: boolean;
  language?: string;
  [key: string]: unknown;
}

interface ArbeitnowApiResponse {
  data?: RawArbeitnowJob[];
}

/**
 * Arbeitnow Jobs/Internships source adapter.
 *
 * Live path:
 *   webcmd web fetch --url "https://www.arbeitnow.com/api/job-board-api?search=<term>&page=1" -f json
 *   (or `webcmd nextstep-sources arbeitnow-jobs --search <term> --page 1 -f json` when available)
 *
 * Offline path:
 *   Loads src/fixtures/arbeitnow.json deterministically.
 *
 * IMPORTANT — Arbeitnow search safety:
 *   Arbeitnow search is non-exact. Even with search=intern, unrelated senior jobs
 *   may be returned. This adapter does NOT filter source results.
 *   All returned records are passed to the normalization + filtering pipeline.
 *
 * Field mappings (Arbeitnow → canonical via WebEvidenceItem.raw):
 *   title        → title
 *   company_name → organization
 *   url          → url
 *   location     → location
 *   remote       → remote
 *   description  → description
 *   tags[]       → skills
 *   job_types[]  → opportunity_type (first entry: "internship" → "internship")
 *   created_at   → posted_date (Unix → ISO)
 */
export class ArbeitnowAdapter implements SourceAdapter {
  readonly sourceId = "arbeitnow" as const;

  private readonly apiBase = "https://www.arbeitnow.com/api/job-board-api";

  async fetch(
    request: UserRequest,
    options: SourceAdapterOptions = {}
  ): Promise<SourceResult> {
    const retrievedAt = options.referenceDate ?? new Date().toISOString();
    const timeoutMs = options.timeoutMs ?? 15_000;

    // ── Offline fixture path ─────────────────────────────────────────────
    if (options.useFixture) {
      return this.loadFromFixture(retrievedAt);
    }

    // ── Live path: build search term from UserRequest ────────────────────
    // We derive a search term from available request context.
    // The source's search result is NEVER treated as the final filter —
    // all results pass through the downstream normalization + relevance pipeline.
    const searchTerm = this.deriveSearchTerm(request);
    const url = `${this.apiBase}?search=${encodeURIComponent(searchTerm)}&page=1`;

    const result = await runWebcmd(
      ["web", "fetch", "--url", url, "-f", "json"],
      timeoutMs
    );

    if (result.exitCode !== 0) {
      return {
        ok: false,
        sourceId: this.sourceId,
        code: "ARBEITNOW_FETCH_FAILED",
        error: `webcmd web fetch failed (exit ${result.exitCode}): ${result.stderr.slice(0, 500)}`,
      };
    }

    const parsed = parseWebcmdJson<{ content?: string } | ArbeitnowApiResponse>(result.stdout);
    if (!parsed) {
      return {
        ok: false,
        sourceId: this.sourceId,
        code: "ARBEITNOW_PARSE_FAILED",
        error: "Failed to parse webcmd output as JSON",
      };
    }

    let apiData: ArbeitnowApiResponse;
    if ("content" in parsed && typeof parsed.content === "string") {
      const inner = parseWebcmdJson<ArbeitnowApiResponse>(parsed.content);
      if (!inner || !inner.data) {
        return {
          ok: false,
          sourceId: this.sourceId,
          code: "ARBEITNOW_CONTENT_UNPARSEABLE",
          error: "webcmd web fetch returned content that could not be parsed as Arbeitnow API response",
        };
      }
      apiData = inner;
    } else {
      apiData = parsed as ArbeitnowApiResponse;
    }

    return this.buildEvidence(apiData.data ?? [], retrievedAt);
  }

  /**
   * Derives a search term from the UserRequest.
   * Priority: opportunityTypes → skills → query keywords.
   *
   * The term is a best-effort hint to the source — downstream filtering
   * handles the real relevance enforcement.
   */
  private deriveSearchTerm(request: UserRequest): string {
    // Check if user is looking for internships explicitly
    const wantsInternship =
      request.opportunityTypes?.includes("internship") ||
      request.query.toLowerCase().includes("intern");

    if (wantsInternship) {
      // Combine "intern" with the first skill if available
      const skill = request.skills?.[0];
      return skill ? `${skill} intern` : "intern";
    }

    // For jobs, use query keywords
    const queryWords = request.query
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3)
      .join(" ");

    return queryWords || "intern";
  }

  private loadFromFixture(retrievedAt: string): SourceResult {
    try {
      const fixturePath = path.resolve(
        __dirname,
        "../../../src/fixtures/arbeitnow.json"
      );
      const raw = require(fixturePath) as ArbeitnowApiResponse;
      return this.buildEvidence(raw.data ?? [], retrievedAt);
    } catch (err) {
      return {
        ok: false,
        sourceId: this.sourceId,
        code: "ARBEITNOW_FIXTURE_LOAD_FAILED",
        error: `Failed to load arbeitnow fixture: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private buildEvidence(jobs: RawArbeitnowJob[], retrievedAt: string): SourceResult {
    const items: WebEvidenceItem[] = jobs.map((j) => {
      // Convert Unix timestamp to ISO string
      const postedDate =
        typeof j.created_at === "number"
          ? new Date(j.created_at * 1000).toISOString()
          : null;

      // Derive opportunity_type from job_types array
      const rawType = j.job_types?.[0]?.toLowerCase() ?? null;
      const opportunityType =
        rawType === "internship" || rawType === "intern" ? "internship" : rawType ?? "job";

      return {
        id: j.slug,
        title: j.title ?? undefined,
        url: j.url ?? undefined,
        snippet: j.description?.slice(0, 300) ?? undefined,
        raw: {
          ...j,
          // Pre-computed helpers for normalizer
          _computed_type: opportunityType,
          _computed_posted_date: postedDate,
        },
      };
    });

    const evidence: WebEvidence = {
      source: this.sourceId,
      command: "arbeitnow-jobs",
      strategy: "api-fetch",
      retrievedAt,
      results: items,
      warnings: [],
    };

    return { ok: true, evidence };
  }
}
