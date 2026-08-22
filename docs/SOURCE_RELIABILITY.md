# Source Reliability & Discovery Report — NextStep (Person 2)

## Overview
This document records the empirical evaluation of candidate opportunity web sources for NextStep's WebCMD retrieval layer. All candidates were tested using live `webcmd web fetch` executions in accordance with the project constraints:
- Public read-only access (no credentials, no tokens, no session hijacking).
- Cheapest reliable verified strategy (prefer direct structured HTTP requests over heavy browser/UI automation).
- No CAPTCHA or access control bypass.
- Real opportunities for students across **Internships** and **Hackathons**.

---

## Comparison Table

| Source | Category | Access | Search | Useful fields | Auth | Stability | Decision | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Devfolio Hackathons API** | Hackathons | HTTP (JSON) | Pagination (`?page=1`) | `name`, `slug`, `starts_at`, `ends_at`, `location`, `is_online`, `themes`, `url`, `desc` | None | High | **SELECT (Source 1)** | **IMPLEMENTED / VERIFIED** |
| **Arbeitnow Job Board API** | Internships | HTTP (JSON) | Keyword (`?search=intern`), Page | `title`, `company_name`, `location`, `remote`, `tags`, `job_types`, `url`, `created_at` | None | High | **SELECT (Source 2)** | **IMPLEMENTED / VERIFIED** |
| **SimplifyJobs Curated Lists** | Internships | HTTP (Markdown/HTML) | Category sections / Table | `Company`, `Role`, `Location`, `Application Link`, `Age` | None | Medium-High | **BACKUP (Internships)** | Unimplemented |
| **Unstop Opportunity API** | Hackathons / Competitions | HTTP (JSON) | Query params | `title`, `organisation`, `regn_end_date`, `url` | None | Medium | **BACKUP (Competitions)** | Unimplemented |
| **Devpost Hackathons** | Hackathons | HTTP (HTML) | Web UI | None without JS rendering | None | Low (SPA) | **REJECT** | N/A |
| **Major League Hacking (MLH)** | Hackathons | HTTP (HTML) | Web UI | Blocked by Cloudflare (302) | Anti-bot | Blocked | **REJECT** | N/A |
| **HackerEarth Challenges** | Hackathons | HTTP (HTML) | Web UI | None without JS rendering | None | Low (SPA) | **REJECT** | N/A |
| **Remotive API** | Remote Jobs | HTTP (JSON) | Query param | `title`, `company_name`, `url` (Low intern volume) | None | High | **REJECT** | N/A |

---

## Detailed Candidate Evaluations

### 1. Devfolio Hackathons API (SELECTED & VERIFIED — Source 1: Hackathons)
- **Source Name & URL**: Devfolio Public Hackathons API (`https://api.devfolio.co/api/hackathons?page=1`)
- **Opportunity Category**: Hackathons & Student Competitions
- **Can `web/fetch` access it?**: Yes (`status: 200`, content-type: `application/json; charset=utf-8`).
- **Requires Browser Interaction?**: No (pure direct JSON endpoint).
- **Requires Authentication?**: No (public endpoint).
- **Can opportunities be searched/discovered?**: Yes, paginated retrieval returning up to 1,000 live and upcoming hackathons per page.
- **Can useful fields be extracted?**: Yes, rich opportunity metadata.
- **Available Fields**: `uuid`, `name`, `slug`, `tagline`, `desc`, `starts_at`, `ends_at`, `timezone`, `is_online`, `city`, `state`, `country`, `location`, `themes`, `team_min`, `team_size`, `hackathon_setting.reg_starts_at`, `hackathon_setting.reg_ends_at`, `hackathon_setting.site`, cover/logo images, and canonical URL (`https://${slug}.devfolio.co`).
- **Data Structure**: Clean, highly structured JSON.
- **Repeatability**: 100% deterministic and repeatable.
- **Stability Concerns**: Minimal; standard public API contract.
- **Timeout / Rate-limit Concerns**: Very low latency (<1s response time).
- **Demo Reliability**: Exceptional.
- **Recommendation**: **SELECT**
- **Reason**: Provides high volume of real student hackathons with complete location, date, and registration metadata in structured JSON format without needing browser emulation.

---

### 2. Arbeitnow Job Board API (SELECTED & VERIFIED — Source 2: Internships)
- **Source Name & URL**: Arbeitnow Public Job & Internship API (`https://www.arbeitnow.com/api/job-board-api?search=intern`)
- **Opportunity Category**: Internships, Student & Working Student Positions
- **Can `web/fetch` access it?**: Yes (`status: 200`, content-type: `application/json`).
- **Requires Browser Interaction?**: No (REST API).
- **Requires Authentication?**: No.
- **Can opportunities be searched/discovered?**: Yes, supports search query parameters (`?search=intern`, `?search=internship`) and pagination (`?page=N`).
- **Can useful fields be extracted?**: Yes.
- **Available Fields**: `slug`, `company_name`, `title`, `description` (HTML/text), `remote` (boolean), `url` (direct application URL), `tags`, `job_types` (e.g. `Working student`, `Student`, `Entry`), `location`, `created_at` (epoch timestamp).
- **Data Structure**: Structured JSON (`{"data": [...]}`).
- **Repeatability**: High.
- **Stability Concerns**: Very stable open developer API.
- **Timeout / Rate-limit Concerns**: Fast and reliable.
- **Demo Reliability**: High.
- **Recommendation**: **SELECT**
- **Reason**: Dedicated public API with direct filtering for internships and student jobs, complete with company names, locations, tags, and apply links.

---

### 3. SimplifyJobs GitHub Curated Repos (BACKUP — Internships)
- **Source Name & URL**: SimplifyJobs Summer Internships (`https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md`)
- **Opportunity Category**: Tech Internships (SWE, PM, Data Science, AI/ML, Hardware)
- **Can `web/fetch` access it?**: Yes (`status: 200`, content-type: `text/plain`).
- **Requires Browser Interaction?**: No.
- **Requires Authentication?**: No.
- **Can opportunities be searched/discovered?**: Yes, contains 500+ curated opportunities categorized by discipline.
- **Can useful fields be extracted?**: Yes (`Company`, `Role`, `Location`, `Application Link`, `Age`).
- **Available Fields**: Company name, role title, location/sponsorship notes, direct apply link, post age.
- **Data Structure**: HTML/Markdown tables requiring regex or HTML table parsing.
- **Repeatability**: Moderate-High.
- **Stability Concerns**: Repository schema or branch names may shift across seasons (`Summer2025` -> `Summer2026`).
- **Timeout / Rate-limit Concerns**: GitHub raw CDN is reliable but subject to IP rate-limits under heavy scraping.
- **Demo Reliability**: High as a backup source.
- **Recommendation**: **BACKUP (Internships)**
- **Reason**: Excellent student curation, but markdown/HTML table formatting is less resilient than a formal JSON REST API.

---

## Final Source Selection & Contract Preview

| Role | Selected Source | Endpoint / Access Method | Category | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Source 1** | **Devfolio Hackathons** | `https://api.devfolio.co/api/hackathons?page=1` | Hackathons & Competitions | **IMPLEMENTED / VERIFIED** |
| **Source 2** | **Arbeitnow Job Board** | `https://www.arbeitnow.com/api/job-board-api?search=intern` | Internships & Working Student Roles | **IMPLEMENTED / VERIFIED** |
| **Backup** | **SimplifyJobs GitHub** | `https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md` | Tech Internships | Unimplemented |

---

### Custom WebCMD Retrieval Capabilities (Outputs for Person 3)

#### Devfolio Command
- **Command Name**: `nextstep-sources/devfolio-hackathons`
- **Arguments**: `--page <number>` (default: 1)
- **Output JSON Shape**:
  ```json
  [
    {
      "source": "devfolio",
      "name": "Hacknauts 2.0",
      "slug": "hacknauts26",
      "url": "https://hacknauts26.devfolio.co",
      "tagline": "Where data meets gravity",
      "desc": "24-hour space-themed hackathon...",
      "starts_at": "2026-11-14T07:30:00.000Z",
      "ends_at": "2026-11-15T07:30:00.000Z",
      "reg_starts_at": "2026-08-20T18:30:00.000Z",
      "reg_ends_at": "2026-11-03T18:00:00.000Z",
      "is_online": false,
      "location": "Guru Nanak Dev Engineering College...",
      "city": "Ludhiana",
      "country": "India",
      "themes": ["No Restrictions"],
      "type": "HACKATHON",
      "verified": true
    }
  ]
  ```

#### Arbeitnow Command
- **Command Name**: `nextstep-sources/arbeitnow-jobs`
- **Arguments**: `--search <keyword>` (default: `"intern"`), `--page <number>` (default: 1)
- **Output JSON Shape**:
  ```json
  [
    {
      "source": "arbeitnow",
      "title": "Senior Java Backend Engineer (m/f/x)",
      "company_name": "Atolls",
      "location": "Berlin, Berlin, Germany",
      "remote": false,
      "tags": [],
      "job_types": [],
      "url": "https://www.arbeitnow.com/jobs/companies/atolls/...",
      "created_at": 1787381127,
      "slug": "senior-java-backend-engineer-berlin-362583",
      "description": "<div class=\"content-intro\">...</div>"
    }
  ]
  ```

---

### Important Limitations
1. **Devfolio**:
   - The hackathon endpoint returns a large list (~1,000 items on page 1). WebCMD retrieval must use `--max-chars 0` to prevent truncation of full JSON envelopes.
2. **Arbeitnow**:
   - The Arbeitnow API behaves as a loose fallback: if a search keyword has zero matches, the API returns a general list of all jobs. Downstream logic must verify and filter these cases.
3. **No Auth / No Secrets**:
   - Both endpoints require zero authentication credentials, cookies, or headers.
