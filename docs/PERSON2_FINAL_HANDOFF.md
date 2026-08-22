# Person 2 — WebCMD Retrieval Layer Final Handoff

## Metadata
* **Role**: Person 2 — WebCMD / Browser Automation / Web Source Retrieval
* **Status**: **COMPLETE**
* **Branch**: `webcmd`
* **Latest Commit**: `TBD`

---

## 1. What Was Built
A custom reusable WebCMD plugin (`nextstep-sources`) providing two high-performance public opportunity retrieval commands. The adapters pull structured data from verified REST API endpoints and return clean, machine-readable JSON payloads containing raw opportunity details for student hackathons and internships.

---

## 2. Important Files

### WebCMD Custom Plugin
* [`webcmd/nextstep-sources/devfolio-hackathons.ts`](file:///c:/Users/user/OneDrive/Desktop/NextStep/webcmd/nextstep-sources/devfolio-hackathons.ts) (TypeScript source for Devfolio API adapter)
* [`webcmd/nextstep-sources/devfolio-hackathons.js`](file:///c:/Users/user/OneDrive/Desktop/NextStep/webcmd/nextstep-sources/devfolio-hackathons.js) (Transpiled JavaScript bundle)
* [`webcmd/nextstep-sources/arbeitnow-jobs.ts`](file:///c:/Users/user/OneDrive/Desktop/NextStep/webcmd/nextstep-sources/arbeitnow-jobs.ts) (TypeScript source for Arbeitnow API adapter)
* [`webcmd/nextstep-sources/arbeitnow-jobs.js`](file:///c:/Users/user/OneDrive/Desktop/NextStep/webcmd/nextstep-sources/arbeitnow-jobs.js) (Transpiled JavaScript bundle)
* [`webcmd/nextstep-sources/package.json`](file:///c:/Users/user/OneDrive/Desktop/NextStep/webcmd/nextstep-sources/package.json) (Adapter package description)
* [`webcmd/nextstep-sources/webcmd-plugin.json`](file:///c:/Users/user/OneDrive/Desktop/NextStep/webcmd/nextstep-sources/webcmd-plugin.json) (Plugin metadata and manifest definition)

### Project Documentation
* [`docs/PERSON2_STATUS.md`](file:///c:/Users/user/OneDrive/Desktop/NextStep/docs/PERSON2_STATUS.md) (Status tracking and fact logs)
* [`docs/SOURCE_RELIABILITY.md`](file:///c:/Users/user/OneDrive/Desktop/NextStep/docs/SOURCE_RELIABILITY.md) (Source discovery matrices and evaluations)
* [`docs/WEBCMD_OUTPUT_CONTRACT.md`](file:///c:/Users/user/OneDrive/Desktop/NextStep/docs/WEBCMD_OUTPUT_CONTRACT.md) (Detailed specifications of inputs and output fields)
* [`docs/PERSON3_HANDOFF.md`](file:///c:/Users/user/OneDrive/Desktop/NextStep/docs/PERSON3_HANDOFF.md) (Downstream handoff instructions for Person 3)

---

## 3. Dependencies & Setup

### Requirements
* **Node.js**: `v22.21.1` (or higher)
* **npm**: `10.9.4` (or higher)
* **WebCMD CLI**: `0.7.4`
* **esbuild**: Installed globally or locally (used for compilation)

### Installation & Plugin Setup
To register the custom opportunity retrieval plugin in the WebCMD CLI toolchain, run the following:
```bash
# 1. Install esbuild globally to support TS transpilation
npm install -g esbuild

# 2. Register the local plugin in your WebCMD CLI
webcmd plugin install "file://C:\Users\user\OneDrive\Desktop\NextStep\webcmd\nextstep-sources"

# 3. Compile and update/sync adapter definitions
esbuild C:\Users\user\OneDrive\Desktop\NextStep\webcmd\nextstep-sources\devfolio-hackathons.ts --platform=node --format=esm --outfile=C:\Users\user\OneDrive\Desktop\NextStep\webcmd\nextstep-sources\devfolio-hackathons.js
esbuild C:\Users\user\OneDrive\Desktop\NextStep\webcmd\nextstep-sources\arbeitnow-jobs.ts --platform=node --format=esm --outfile=C:\Users\user\OneDrive\Desktop\NextStep\webcmd\nextstep-sources\arbeitnow-jobs.js

webcmd plugin update nextstep-sources
```

---

## 4. Retrieve Command Syntax & Inputs

### A. Devfolio Hackathons
Retrieves hackathon events, virtual competitions, and coding challenges.
```bash
webcmd nextstep-sources devfolio-hackathons [arguments]
```
* **Inputs**:
  * `--page` *(int, default: `1`)*: Paginated page to retrieve (up to 1000 items per page).

### B. Arbeitnow Jobs
Retrieves job listings, student internships, and working student roles.
```bash
webcmd nextstep-sources arbeitnow-jobs [arguments]
```
* **Inputs**:
  * `--search` *(string, default: `"intern"`)*: Filter search term keyword.
  * `--page` *(int, default: `1`)*: Paginated page to retrieve (up to 175 items per page).

---

## 5. Output Summary
Both commands output standard machine-readable JSON array results containing raw opportunity objects.
* **Devfolio fields**: `source`, `name`, `slug`, `url` (derived), `tagline`, `desc`, `starts_at`, `ends_at`, `reg_starts_at`, `reg_ends_at`, `is_online`, `location`, `city`, `country`, `themes`, `type`, `verified`.
* **Arbeitnow fields**: `source`, `title`, `company_name`, `location`, `remote`, `tags`, `job_types`, `url`, `created_at`, `slug`, `description`.

---

## 6. Smoke Tests Performed
* **Command Registry Discoverability**: Successfully verified with `webcmd list -f json`.
* **Query Consistency**: Ran keyword searches multiple times (`search=intern`, `search=developer`) and confirmed identical records, lengths, and integrity.
* **Pagination validation**: Paginated requests to page 2 successfully fetched new sets of entries.
* **Error handling**: Negative page parameters (`page <= 0`) exit cleanly with code `1` throwing expected exception JSON envelopes.

---

## 7. Configuration Details
* **Environment Variables**: None required.
* **Credentials / Sessions**: None. Fully open and public endpoints.
* **Browser/Session Settings**: None needed (uses direct fetch pipeline, bypassing Playwright browser overhead entirely).

---

## 8. Known Limitations (Handoff Guidelines)
* **Devfolio Payloads**:
  * Payload size is massive (often exceeding 50k characters). Downstream layers must execute the command using WebCMD's `--max-chars 0` flag to prevent command-line truncation.
* **Arbeitnow API Fallback**:
  * If a search query matches zero postings, the public Arbeitnow endpoint returns the latest list of general jobs instead of an empty dataset. **Person 3 must inspect and validate all incoming records** to ensure suitability for student internships.

---

## 9. Next Steps for Team Members

### Handoff to Person 3 (Backend & Normalization)
1. Invoke commands using standard subprocess execution.
2. Read the returned JSON arrays.
3. Transform raw mappings into the canonical `Opportunity[]` schema.
4. Perform deduplication and filter out non-internship fallback records from the Arbeitnow feed.

### Action for Person 1 (Frontend & Integration)
* Merge the `webcmd` branch after Person 3 has completed backend integration and validation. Do not alter `searchOpportunities(criteria)` in the frontend.
