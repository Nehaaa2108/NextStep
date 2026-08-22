# NextStep WebCMD Layer Handoff to Person 3 (Backend)

This document provides instructions for integrating the WebCMD retrieval layer with the Person 3 Backend services (Normalization, Deduplication, Eligibility, and Ranking).

---

## 1. Overview of Retrieval Capabilities
The retrieval layer consists of a custom WebCMD plugin exposing two distinct commands to extract raw, structured opportunities from public web sources without authentication:
1. **Devfolio Hackathons**: Retrieve hackathon events, virtual competitions, and coding challenges.
2. **Arbeitnow Jobs**: Retrieve tech job listings, internships, and working student roles.

---

## 2. Devfolio Hackathons Handoff

### Command
```bash
webcmd nextstep-sources devfolio-hackathons
```

### Inputs
* `--page` (integer, default: `1`): paginated page retrieval (up to 1,000 records per page).

### Example Invocation
```bash
webcmd nextstep-sources devfolio-hackathons --page 1 -f json
```

### Example JSON Payload Structure
```json
[
  {
    "source": "devfolio",
    "name": "Hacknauts 2.0",
    "slug": "hacknauts26",
    "url": "https://hacknauts26.devfolio.co",
    "tagline": null,
    "desc": "🚀 **Hacknauts 2.0**...",
    "starts_at": "2026-11-14T07:30:00.000Z",
    "ends_at": "2026-11-15T07:30:00.000Z",
    "reg_starts_at": "2026-08-20T18:30:00.000Z",
    "reg_ends_at": "2026-11-03T18:00:00.000Z",
    "is_online": false,
    "location": "Guru Nanak Dev Engineering College, Gill Road, Gill Park, Ludhiana, Punjab, India",
    "city": "Ludhiana",
    "country": "India",
    "themes": ["No Restrictions"],
    "type": "HACKATHON",
    "verified": true
  }
]
```

### Failure Behavior & Limitations
* **Scale**: Page payloads are massive (often exceeding 50,000 characters). You must run the retrieval command using WebCMD's `--max-chars 0` flag to prevent truncated JSON.
* **HTTP Errors**: The command exits with code `1` and outputs error text if the underlying endpoint fails.

---

## 3. Arbeitnow Jobs Handoff

### Command
```bash
webcmd nextstep-sources arbeitnow-jobs
```

### Inputs
* `--search` (string, default: `"intern"`): Search keyword.
* `--page` (integer, default: `1`): Pagination page (up to 175 listings per page).

### Example Invocation
```bash
webcmd nextstep-sources arbeitnow-jobs --search intern --page 1 -f json
```

### Example JSON Payload Structure
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
    "url": "https://www.arbeitnow.com/jobs/companies/atolls/senior-java-backend-engineer-berlin-362583",
    "created_at": 1787381127,
    "slug": "senior-java-backend-engineer-berlin-362583",
    "description": "<div class=\"content-intro\"><p>Atolls is the world's largest community-driven...</p></div>"
  }
]
```

### Failure Behavior & Fallbacks (CRITICAL FOR PERSON 3)
* **Search Fallback**: When the requested search query matches zero job listings, the Arbeitnow public API does **not** return an empty list or an error. Instead, it falls back to returning the full list of latest general jobs (e.g. 175 records of general software engineer roles).
* **Downstream Relevance/Eligibility Filtering**: Because of this API fallback behavior, **Person 3 must validate all incoming Arbeitnow job records** to verify that they actually match student internship criteria (e.g. by filtering titles for "intern", "working student", or examining the `job_types` tag array) rather than blindly registering the fallback records.

---

## 4. Summary of Integration Responsibilities

| Action Item | Person 2 (WebCMD Layer) | Person 3 (Backend Layer) |
| :--- | :--- | :--- |
| **Retrieval** | Executes public API calls and returns structured JSON arrays | Initiates command wrappers and reads output payloads |
| **Normalization** | *None* | Converts raw fields (`starts_at`, `job_types`) into canonical `Opportunity[]` |
| **Deduplication** | *None* | Uses slug/uri values to prevent double-indexing |
| **Validation / Eligibility** | *None* | Filters out non-intern fallback listings and ranks suitable student events |
