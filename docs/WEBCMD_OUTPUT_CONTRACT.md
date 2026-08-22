# NextStep WebCMD Raw Output Contract (Person 2)

This document specifies the exact contract for raw structured data retrieved by the WebCMD retrieval layer. Downstream services (Person 3 backend) must consume this data and perform necessary normalization, deduplication, eligibility validation, scoring, and ranking.

---

## 1. Devfolio Hackathons Contract

### Command
```bash
webcmd nextstep-sources devfolio-hackathons
```

### Inputs
* **`--page`** *(int, default: `1`)*: Page number (1-indexed). Each page returns up to 1000 records.

### Output JSON Shape
Returns a JSON array of objects representing raw hackathon event data.

### Fields Specification
| Field Name | JSON Type | Description | Source Mapping |
| :--- | :--- | :--- | :--- |
| **`source`** | `string` | Static value `"devfolio"` to indicate source origin | Internal |
| **`name`** | `string` | The official name of the hackathon | `name` |
| **`slug`** | `string` | The URL-safe subdomain identifier | `slug` |
| **`url`** | `string` | Derived canonical website link of the hackathon | Derived (`https://${slug}.devfolio.co`) |
| **`tagline`** | `string \| null` | A brief tagline or motto for the event | `tagline` |
| **`desc`** | `string \| null` | The markdown/HTML formatted description of the event | `desc` |
| **`starts_at`** | `string` | ISO 8601 UTC start datetime of the event | `starts_at` |
| **`ends_at`** | `string` | ISO 8601 UTC end datetime of the event | `ends_at` |
| **`reg_starts_at`** | `string \| null` | ISO 8601 registration start date | `hackathon_setting.reg_starts_at` |
| **`reg_ends_at`** | `string \| null` | ISO 8601 registration end date | `hackathon_setting.reg_ends_at` |
| **`is_online`** | `boolean` | Flag indicating if event is fully virtual/online | `is_online` |
| **`location`** | `string \| null` | Physical venue address (null if virtual/online) | `location` |
| **`city`** | `string \| null` | City name of the venue | `city` |
| **`country`** | `string \| null` | Country name of the venue | `country` |
| **`themes`** | `string[]` | Array of theme/topic tags | Map of `themes[].name` |
| **`type`** | `string` | Event category type (usually `"HACKATHON"`) | `type` |
| **`verified`** | `boolean` | Flag indicating if Devfolio verified this event | `verified` |

### Example Output Snippet
```json
[
  {
    "source": "devfolio",
    "name": "Hacknauts 2.0",
    "slug": "hacknauts26",
    "url": "https://hacknauts26.devfolio.co",
    "tagline": null,
    "desc": "🚀 **Hacknauts 2.0**\n\n### 🌌 WHERE DATA MEETS GRAVITY...",
    "starts_at": "2026-11-14T07:30:00.000Z",
    "ends_at": "2026-11-15T07:30:00.000Z",
    "reg_starts_at": "2026-08-20T18:30:00.000Z",
    "reg_ends_at": "2026-11-03T18:00:00.000Z",
    "is_online": false,
    "location": "Guru Nanak Dev Engineering College, Gill Road, Gill Park, Ludhiana, Punjab, India",
    "city": "Ludhiana",
    "country": "India",
    "themes": [
      "No Restrictions"
    ],
    "type": "HACKATHON",
    "verified": true
  }
]
```

### Failure Behavior & Fallbacks
* **Invalid page values**: The command validates input page parameters. Passing non-integers or page values `< 1` throws an argument validation error and exits with code 1.
* **HTTP Errors**: If the Devfolio API responds with a non-200 status code, the command throws an error with the HTTP status and exits with code 1.
* **Truncation**: Because page payloads can exceed 100,000 characters, WebCMD execution commands should specify `--max-chars 0` to prevent truncation by the CLI runner.

### Limitations
* Devfolio API pagination is 1-indexed. The API does not provide a separate count endpoint; retrieval relies on testing whether the `result` array is empty.

---

## 2. Arbeitnow Jobs Contract

### Command
```bash
webcmd nextstep-sources arbeitnow-jobs
```

### Inputs
* **`--search`** *(string, default: `"intern"`)*: Search term keyword used to filter listings.
* **`--page`** *(int, default: `1`)*: Page number (1-indexed). Returns up to 175 jobs per page.

### Output JSON Shape
Returns a JSON array of objects representing raw job/internship listing data.

### Fields Specification
| Field Name | JSON Type | Description | Source Mapping |
| :--- | :--- | :--- | :--- |
| **`source`** | `string` | Static value `"arbeitnow"` to indicate source origin | Internal |
| **`title`** | `string` | The official job posting title | `title` |
| **`company_name`** | `string` | Employer name | `company_name` |
| **`location`** | `string` | Physical location or region name | `location` |
| **`remote`** | `boolean` | Flag indicating if position is fully remote | `remote` |
| **`tags`** | `string[]` | Array of skill/topic keywords | `tags` |
| **`job_types`** | `string[]` | Array of contract kinds (e.g. `["Student", "Working student"]`) | `job_types` |
| **`url`** | `string` | Direct apply or details link | `url` |
| **`created_at`** | `number` | Epoch timestamp of job creation | `created_at` |
| **`slug`** | `string` | URL-safe identifier of the listing | `slug` |
| **`description`** | `string` | Full HTML job description content | `description` |

### Example Output Snippet
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

### Failure Behavior & Fallbacks
* **API Fallback (CRITICAL)**: If a search keyword matches no jobs (e.g., `xyz123nonexistent`), the Arbeitnow API does **not** return an empty list. Instead, it falls back to returning the full list of latest general jobs (175 records per page). Downstream systems must inspect fields to confirm suitability.
* **HTTP Errors**: Non-200 responses from the public endpoint throw an error and exit with code 1.

### Limitations
* High concentration of European and remote European positions.
