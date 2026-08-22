import { cli, Strategy } from "@agentrhq/webcmd/registry";
cli({
  site: "nextstep-sources",
  name: "devfolio-hackathons",
  description: "Retrieve hackathons from the Devfolio public API",
  access: "read",
  strategy: Strategy.PUBLIC,
  browser: false,
  args: [
    {
      name: "page",
      type: "int",
      required: false,
      help: "Page number (1-indexed). Each page returns up to 1000 results.",
      default: 1
    }
  ],
  columns: ["name", "starts_at", "ends_at", "is_online", "location", "url"],
  func: async (kwargs) => {
    const page = Number(kwargs.page ?? 1);
    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`Invalid page "${kwargs.page}": must be a positive integer.`);
    }
    const url = `https://api.devfolio.co/api/hackathons?page=${page}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Devfolio API error: HTTP ${response.status} ${response.statusText}`);
    }
    const body = await response.json();
    if (!Array.isArray(body.result)) {
      throw new Error('Unexpected Devfolio API response: "result" array missing.');
    }
    return body.result.map((h) => ({
      source: "devfolio",
      name: h.name,
      slug: h.slug,
      url: `https://${h.slug}.devfolio.co`,
      tagline: h.tagline ?? null,
      desc: h.desc ?? null,
      starts_at: h.starts_at,
      ends_at: h.ends_at,
      reg_starts_at: h.hackathon_setting?.reg_starts_at ?? null,
      reg_ends_at: h.hackathon_setting?.reg_ends_at ?? null,
      is_online: h.is_online,
      location: h.location ?? null,
      city: h.city ?? null,
      country: h.country ?? null,
      themes: (h.themes ?? []).map((t) => t.name),
      type: h.type,
      verified: h.verified
    }));
  }
});
