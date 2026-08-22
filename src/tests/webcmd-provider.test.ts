import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { WebCmdProvider } from "../webcmd/webcmd-provider.js";
import { WebTask } from "../core/types/webtask.js";

describe("Phase 8 — WebCmdProvider (Offline)", () => {
  it("1. fetches from all configured sources using fixtures", async () => {
    // Enable useFixture to prevent real webcmd execution
    const provider = new WebCmdProvider({ useFixture: true });

    const task: WebTask = {
      taskId: "test-req-1",
      query: "software intern",
    };

    const evidence = await provider.run(task);

    assert.equal(evidence.source, "webcmd");
    assert.equal(evidence.strategy, "parallel-source-fetch");
    // devfolio fixture has 3, arbeitnow has 4 -> total 7
    assert.equal(evidence.results.length, 7);
    
    const hasDevfolio = evidence.results.some((r) => r.id && String(r.id).includes("df-hack"));
    const hasArbeitnow = evidence.results.some((r) => r.id && String(r.id).includes("arbn-"));

    assert.ok(hasDevfolio, "Missing devfolio results");
    assert.ok(hasArbeitnow, "Missing arbeitnow results");
  });
});
