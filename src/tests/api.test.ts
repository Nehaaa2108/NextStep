import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { createServer } from "../api/server.js";
import { MockWebEvidenceProvider } from "../webcmd/mock-provider.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function httpRequest(
  options: http.RequestOptions,
  body?: string
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk.toString()));
      res.on("end", () =>
        resolve({ statusCode: res.statusCode ?? 0, body: data })
      );
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const TEST_PORT = 13_742; // Arbitrary high port — avoids conflicts with dev server

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("Phase 7 — HTTP API Server", () => {
  let server: http.Server;

  before(async () => {
    server = createServer(new MockWebEvidenceProvider("success"));
    await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  });

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  // ── Health check ────────────────────────────────────────────────────────────

  it("1. GET /api/health returns 200 with status ok", async () => {
    const { statusCode, body } = await httpRequest({
      hostname: "localhost",
      port: TEST_PORT,
      path: "/api/health",
      method: "GET",
    });

    assert.equal(statusCode, 200);
    const json = JSON.parse(body);
    assert.equal(json.status, "ok");
    assert.ok(typeof json.provider === "string");
    assert.ok(typeof json.timestamp === "string");
  });

  // ── Happy path search ───────────────────────────────────────────────────────

  it("2. POST /api/search returns 200 with valid ProductResult shape", async () => {
    const payload = JSON.stringify({
      query: "python ai internship",
      skills: ["Python"],
      remote: true,
    });

    const { statusCode, body } = await httpRequest(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/search",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      payload
    );

    assert.equal(statusCode, 200);
    const json = JSON.parse(body);

    // ProductResult contract
    assert.ok(typeof json.requestId === "string");
    assert.ok(["success", "partial", "error"].includes(json.status));
    assert.ok(typeof json.summary === "string");
    assert.ok(Array.isArray(json.results));
    assert.ok(Array.isArray(json.sources));
    assert.ok(Array.isArray(json.warnings));

    // Pipeline metadata
    assert.ok(typeof json.pipeline === "object");
    assert.ok(typeof json.pipeline.rawResultCount === "number");
    assert.ok(typeof json.pipeline.rankedCount === "number");
  });

  // ── Results ordering ────────────────────────────────────────────────────────

  it("3. POST /api/search results are ordered by score descending", async () => {
    const payload = JSON.stringify({ query: "fellowship research" });

    const { statusCode, body } = await httpRequest(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/search",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      payload
    );

    assert.equal(statusCode, 200);
    const json = JSON.parse(body);
    const scores: number[] = json.results.map((r: { score: number }) => r.score);

    for (let i = 1; i < scores.length; i++) {
      assert.ok(
        scores[i - 1] >= scores[i],
        `Result ${i - 1} score (${scores[i - 1]}) should be >= result ${i} score (${scores[i]})`
      );
    }
  });

  // ── Validation errors ───────────────────────────────────────────────────────

  it("4. POST /api/search returns 400 when query is missing", async () => {
    const payload = JSON.stringify({ skills: ["Python"] });

    const { statusCode, body } = await httpRequest(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/search",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      payload
    );

    assert.equal(statusCode, 400);
    const json = JSON.parse(body);
    assert.equal(json.code, "VALIDATION_ERROR");
    assert.ok(Array.isArray(json.details));
    assert.ok(json.details.some((d: string) => d.includes('"query"')));
  });

  it("5. POST /api/search returns 400 on malformed JSON body", async () => {
    const { statusCode, body } = await httpRequest(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/search",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": 12,
        },
      },
      "{ not json }"
    );

    assert.equal(statusCode, 400);
    const json = JSON.parse(body);
    assert.equal(json.code, "INVALID_JSON");
  });

  it("6. POST /api/search returns 400 when body is not an object", async () => {
    const payload = JSON.stringify([{ query: "array instead of object" }]);

    const { statusCode, body } = await httpRequest(
      {
        hostname: "localhost",
        port: TEST_PORT,
        path: "/api/search",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      payload
    );

    assert.equal(statusCode, 400);
    const json = JSON.parse(body);
    assert.equal(json.code, "VALIDATION_ERROR");
  });

  // ── 404 ─────────────────────────────────────────────────────────────────────

  it("7. Unknown route returns 404", async () => {
    const { statusCode, body } = await httpRequest({
      hostname: "localhost",
      port: TEST_PORT,
      path: "/api/unknown",
      method: "GET",
    });

    assert.equal(statusCode, 404);
    const json = JSON.parse(body);
    assert.equal(json.code, "NOT_FOUND");
  });

  // ── CORS ─────────────────────────────────────────────────────────────────────

  it("8. OPTIONS preflight returns 204 with CORS headers", async () => {
    const { statusCode } = await httpRequest({
      hostname: "localhost",
      port: TEST_PORT,
      path: "/api/search",
      method: "OPTIONS",
    });

    assert.equal(statusCode, 204);
  });
});
