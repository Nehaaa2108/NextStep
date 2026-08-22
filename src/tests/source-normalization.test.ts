import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeEvidence } from "../normalize/index.js";
import { WebCmdProvider } from "../webcmd/webcmd-provider.js";

describe("Phase 8 — Source Normalization (Offline)", () => {
  it("1. maps devfolio fixture fields to canonical Opportunity", async () => {
    const provider = new WebCmdProvider({ useFixture: true });
    const evidence = await provider.run({
      taskId: "test-req",
      query: "hackathon",
    });

    const normResult = normalizeEvidence(evidence);
    assert.equal(normResult.issues.length, 0);

    const devfolioOpps = normResult.opportunities.filter((o) => o.id.includes("df-hack"));
    assert.equal(devfolioOpps.length, 3);

    const opp = devfolioOpps[0];
    assert.equal(opp.title, "AI Build Week 2026");
    assert.equal(opp.url, "https://devfolio.co/hackathons/ai-build-week-2026");
    assert.ok(opp.description && opp.description.includes("72-hour virtual hackathon"));
    assert.equal(opp.remote, true);
    assert.equal(opp.opportunity_type, "hackathon");
    assert.ok(opp.skills && opp.skills.includes("AI"));
    assert.equal(opp.deadline, "2026-09-28T00:00:00Z"); // reg_ends_at
    assert.equal(opp.stipend_or_salary, "$50,000 in prizes");
  });

  it("2. maps arbeitnow fixture fields to canonical Opportunity", async () => {
    const provider = new WebCmdProvider({ useFixture: true });
    const evidence = await provider.run({
      taskId: "test-req",
      query: "intern",
    });

    const normResult = normalizeEvidence(evidence);
    
    const arbeitnowOpps = normResult.opportunities.filter((o) => o.id.includes("arbn-"));
    assert.equal(arbeitnowOpps.length, 4);

    const opp = arbeitnowOpps[0];
    assert.equal(opp.title, "Software Engineering Intern");
    assert.equal(opp.organization, "Brightpath Technologies");
    assert.equal(opp.location, "Berlin, Germany");
    assert.equal(opp.remote, true);
    assert.ok(opp.skills && opp.skills.includes("Python"));
    assert.equal(opp.opportunity_type, "internship"); // mapped from job_types
    assert.ok(opp.posted_date && opp.posted_date.startsWith("2024")); // from Unix timestamp
  });
});
