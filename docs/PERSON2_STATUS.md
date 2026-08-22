# Person 2 — WebCMD Layer Status & Reconnaissance

## Role & Scope
- **Role**: Person 2 — WebCMD / browser automation / web source retrieval layer.
- **Responsibility**: Discover reliable opportunity web sources, explore via WebCMD, author reusable commands/adapters, retrieve real opportunity data, return raw machine-readable output, and provide robust test/run verification.
- **Boundaries**:
  - Person 1 Frontend owns `searchOpportunities(criteria)`: Must NOT be modified or coupled with WebCMD internals.
  - Person 3 Backend owns normalization, deduplication, eligibility, scoring, ranking, and canonical `Opportunity[]` types: Person 2 will NOT implement these backend concerns.

---

## Phase Status
- **Current Phase**: Phase 5 — Output Contract & Integration Verification
- **Status**: VERIFIED
- **Next Phase**: Phase 6 — Reliability & Final Handoff

---

## Completed Implementations
- **Devfolio**: IMPLEMENTED / VERIFIED
- **Arbeitnow**: IMPLEMENTED / VERIFIED

---

## Working Commands
1. **Devfolio Hackathons Retrieval**:
   - Command: `webcmd nextstep-sources devfolio-hackathons`
   - Example Invocation: `webcmd nextstep-sources devfolio-hackathons --page 1 -f json`
2. **Arbeitnow Jobs Retrieval**:
   - Command: `webcmd nextstep-sources arbeitnow-jobs`
   - Example Invocation: `webcmd nextstep-sources arbeitnow-jobs --search intern --page 1 -f json`

---

## Verified Environment Facts

| Component / Tool | Verified Version / State | Notes |
| :--- | :--- | :--- |
| **Node.js** | `v22.21.1` | Local Node runtime |
| **npm** | `10.9.4` | Package manager |
| **WebCMD** | `0.7.4` | CLI runtime |
| **Built-in Command** | `web/fetch` | HTTP fetch baseline verified with `-f json` |
| **Adapter Registry** | `~/.webcmd/clis/` | Local adapter target directory (currently clean) |
| **Validation Tools** | `webcmd validate`, `webcmd verify`, `webcmd convention-audit` | Available for adapter schema checking, smoke testing, and convention audits |

---

## Selected & Implemented Opportunity Sources

1. **Source 1 (Hackathons)**: **Devfolio Hackathons API**
   - URL: `https://api.devfolio.co/api/hackathons?page=1`
   - Status: **IMPLEMENTED / VERIFIED** (Rich metadata: names, dates, themes, registration links, locations, online/offline flags).

2. **Source 2 (Internships)**: **Arbeitnow Job Board API**
   - URL: `https://www.arbeitnow.com/api/job-board-api?search=intern`
   - Status: **IMPLEMENTED / VERIFIED** (Rich metadata: job titles, company names, tags, locations, remote flags, apply URLs).

3. **Backup Source (Internships)**: **SimplifyJobs GitHub Curated Internships**
   - URL: `https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md`
   - Status: Validated backup source (unimplemented as per MVP design).

---

## Known Limitations
* **Devfolio**:
  * High Volume: The API returns ~1,000 items per page. Downstream execution must use `--max-chars 0` to prevent truncation.
* **Arbeitnow**:
  * API Fallback: If a search keyword matches no jobs, the Arbeitnow public API returns all latest jobs (e.g. general non-intern roles) rather than an empty list. Downstream processing (Person 3) must filter/deduplicate these cases.
  * Geographical concentration: Primarily European listings.

---

## Workspace Structure (Person 2 Scope)
```
NextStep/
├── docs/
│   ├── PERSON2_STATUS.md       # Person 2 status, verified facts, and phase tracking
│   ├── SOURCE_RELIABILITY.md   # Empirical source evaluation, comparison table, and selections
│   ├── WEBCMD_OUTPUT_CONTRACT.md # Exact fields, types, and schema payload definition for Person 3
│   └── PERSON3_HANDOFF.md      # Backend handoff instructions, validation scope, and examples
└── webcmd/
    └── nextstep-sources/       # Reusable WebCMD custom source plugin
        ├── package.json
        ├── webcmd-plugin.json
        ├── devfolio-hackathons.ts
        ├── devfolio-hackathons.js
        ├── arbeitnow-jobs.ts
        └── arbeitnow-jobs.js
```
