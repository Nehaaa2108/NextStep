import { WebCmdProvider } from "../webcmd/webcmd-provider.js";
import { runOpportunitySearch } from "../orchestrator/orchestrate.js";

async function runSmokeTest() {
  console.log("=== LIVE SMOKE TEST: WEBCMD INTEGRATION ===");
  console.log("Note: This requires webcmd to be installed and network access to devfolio/arbeitnow.\n");

  const provider = new WebCmdProvider({ useFixture: false, timeoutMs: 15_000 });
  
  console.log("1. Running full pipeline search for 'machine learning intern'...");
  const result = await runOpportunitySearch(
    { query: "machine learning intern", skills: ["Python"], remote: true },
    { provider }
  );

  console.log("\nPipeline Metadata:");
  console.log(JSON.stringify(result.pipeline, null, 2));

  console.log("\nWarnings:");
  if (result.warnings.length === 0) console.log("  None");
  result.warnings.forEach((w) => console.log(`  - ${w}`));

  console.log(`\nFound ${result.results.length} ranked results.`);
  
  if (result.results.length > 0) {
    console.log("\nTop 3 results:");
    result.results.slice(0, 3).forEach((r, i) => {
      console.log(`\n${i + 1}. [${r.score}] ${r.title}`);
      console.log(`    Organization: ${r.opportunity?.organization ?? "N/A"}`);
      console.log(`    Source:       ${r.opportunity?.source}`);
      console.log(`    Reason:       ${r.reason}`);
    });
  }
}

runSmokeTest().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
