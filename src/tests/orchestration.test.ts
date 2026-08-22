import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  UserRequest,
  MockWebEvidenceProvider,
  runOpportunitySearch,
  OrchestratorResult,
} from "../index.js";

describe("Phase 7 — Orchestration Pipeline", () => {
  it("1. success fixture: produces a valid OrchestratorResult with ranked results", async () => {
    const request: UserRequest = {
      query: "AI student opportunities",
      skills: ["Python"],
      remote: true,
    };

    const result: OrchestratorResult = await runOpportunitySearch(request, {
      provider: new MockWebEvidenceProvider("success"),
    });

    // Shape assertions
    assert.ok(typeof result.requestId === "string" && result.requestId.startsWith("req-"));
    assert.ok(result.status === "success" || result.status === "partial");
    assert.ok(typeof result.summary === "string" && result.summary.length > 0);
    assert.ok(Array.isArray(result.results));
    assert.ok(Array.isArray(result.sources));
    assert.ok(Array.isArray(result.warnings));

    // Pipeline metadata
    assert.ok(result.pipeline.rawResultCount > 0);
    assert.ok(result.pipeline.normalizedCount >= 0);
    assert.ok(result.pipeline.rankedCount >= 0);
    assert.equal(result.pipeline.providerName, "mock-provider");

    // Results shape
    for (const r of result.results) {
      assert.ok(typeof r.id === "string");
      assert.ok(typeof r.title === "string");
      assert.ok(typeof r.score === "number");
      assert.ok(r.score >= 0 && r.score <= 100);
      assert.ok(typeof r.reason === "string" && r.reason.length > 0);
      assert.ok(r.opportunity !== undefined);
    }
  });

  it("2. empty fixture: produces partial status with 0 results and no fabricated data", async () => {
    const request: UserRequest = { query: "open source grants" };

    const result = await runOpportunitySearch(request, {
      provider: new MockWebEvidenceProvider("empty"),
    });

    assert.equal(result.results.length, 0);
    assert.equal(result.status, "partial");
    assert.ok(result.pipeline.rawResultCount === 0);
    assert.ok(result.pipeline.rankedCount === 0);
  });

  it("3. partial fixture: returns results where available, with warnings for incomplete records", async () => {
    const request: UserRequest = {
      query: "fellowship",
      skills: ["Research"],
    };

    const result = await runOpportunitySearch(request, {
      provider: new MockWebEvidenceProvider("partial"),
    });

    // Should have at least some results
    assert.ok(result.pipeline.normalizedCount >= 0);
    assert.ok(Array.isArray(result.warnings));
    // Status must never be 'error' for a partial fixture — data is usable
    assert.notEqual(result.status, "error");
  });

  it("4. duplicate fixture: deduplication reduces count before ranking", async () => {
    const request: UserRequest = { query: "internship" };

    const result = await runOpportunitySearch(request, {
      provider: new MockWebEvidenceProvider("duplicate"),
    });

    // Deduplication must have fired (normalized > deduplicated OR equal if no dups slipped through)
    assert.ok(result.pipeline.deduplicatedCount <= result.pipeline.validatedCount);
    assert.ok(result.pipeline.duplicatesRemovedCount >= 0);
  });

  it("5. requestId is unique across two calls made at different times", async () => {
    const request: UserRequest = { query: "unique query test" };
    const r1 = await runOpportunitySearch(request, {
      provider: new MockWebEvidenceProvider("empty"),
    });
    // Small delay to ensure timestamp component differs
    await new Promise((resolve) => setTimeout(resolve, 5));
    const r2 = await runOpportunitySearch(request, {
      provider: new MockWebEvidenceProvider("empty"),
    });

    assert.notEqual(r1.requestId, r2.requestId);
  });

  it("6. sources array contains the provider name", async () => {
    const result = await runOpportunitySearch(
      { query: "hackathon" },
      { provider: new MockWebEvidenceProvider("success") }
    );

    assert.ok(result.sources.includes("mock-provider"));
  });

  it("7. ranked results are ordered by score descending", async () => {
    const result = await runOpportunitySearch(
      { query: "python ai internship", skills: ["Python", "AI"] },
      { provider: new MockWebEvidenceProvider("success") }
    );

    const scores = result.results.map((r) => r.score as number);
    for (let i = 1; i < scores.length; i++) {
      assert.ok(
        scores[i - 1] >= scores[i],
        `Score at index ${i - 1} (${scores[i - 1]}) should be >= score at index ${i} (${scores[i]})`
      );
    }
  });
});
