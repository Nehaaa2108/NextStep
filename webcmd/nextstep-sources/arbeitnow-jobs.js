import { cli, Strategy } from "@agentrhq/webcmd/registry";
cli({
  site: "nextstep-sources",
  name: "arbeitnow-jobs",
  description: "Retrieve job postings from the Arbeitnow public API",
  access: "read",
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    {
      name: "search",
      type: "string",
      required: false,
      help: 'Search keyword (e.g., "intern", "working student")',
      default: "intern"
    },
    {
      name: "page",
      type: "int",
      required: false,
      help: "Page number (1-indexed)",
      default: 1
    }
  ],
  columns: ["title", "company_name", "location", "remote", "url"],
  func: async (kwargs) => {
    const search = String(kwargs.search ?? "intern");
    const page = Number(kwargs.page ?? 1);
    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`Invalid page "${kwargs.page}": must be a positive integer.`);
    }
    const queryParams = new URLSearchParams({
      search,
      page: String(page)
    });
    const url = `https://www.arbeitnow.com/api/job-board-api?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Arbeitnow API error: HTTP ${response.status} ${response.statusText}`);
    }
    const body = await response.json();
    if (!Array.isArray(body.data)) {
      throw new Error('Unexpected Arbeitnow API response: "data" array missing.');
    }
    return body.data.map((j) => ({
      source: "arbeitnow",
      title: j.title,
      company_name: j.company_name,
      location: j.location ?? "",
      remote: !!j.remote,
      tags: Array.isArray(j.tags) ? j.tags : [],
      job_types: Array.isArray(j.job_types) ? j.job_types : [],
      url: j.url,
      created_at: Number(j.created_at),
      slug: j.slug,
      description: j.description ?? ""
    }));
  }
});
