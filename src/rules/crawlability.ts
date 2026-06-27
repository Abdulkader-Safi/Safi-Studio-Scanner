import type { Rule } from "../types.js";

export const crawlabilityRules: Rule[] = [
  {
    id: "crawlability/robots-exists",
    category: "crawlability",
    title: "robots.txt exists",
    severity: "warning",
    fix: "Add a robots.txt at the site root to guide crawlers.",
    run({ site }) {
      return [
        site.robots.exists
          ? { status: "pass", message: "robots.txt found" }
          : { status: "warn", message: "No robots.txt" },
      ];
    },
  },
  {
    id: "crawlability/robots-valid",
    category: "crawlability",
    title: "robots.txt valid",
    severity: "info",
    fix: "Add valid directives (User-agent, Disallow, Allow, Sitemap) to robots.txt.",
    run({ site }) {
      if (!site.robots.exists) return [{ status: "pass", message: "No robots.txt to validate" }];
      const ok = /(user-agent:|disallow:|allow:|sitemap:)/i.test(site.robots.content);
      return [
        ok
          ? { status: "pass", message: "robots.txt has valid directives" }
          : { status: "warn", message: "robots.txt has no recognizable directives" },
      ];
    },
  },
  {
    id: "crawlability/sitemap-present",
    category: "crawlability",
    title: "Sitemap present",
    severity: "warning",
    fix: "Publish an XML sitemap and reference it from robots.txt.",
    run({ site }) {
      return [
        site.sitemap.exists
          ? { status: "pass", message: `Sitemap with ${site.sitemap.urls.length} URLs` }
          : { status: "warn", message: "No sitemap found" },
      ];
    },
  },
  {
    id: "crawlability/page-indexable",
    category: "crawlability",
    title: "Page indexable",
    severity: "error",
    fix: "Remove noindex from the page meta or its X-Robots-Tag header if it should be indexed.",
    run({ page }) {
      const robotsMeta = (page.$('meta[name="robots"]').attr("content") || "").toLowerCase();
      const xRobots = (page.headers["x-robots-tag"] || "").toLowerCase();
      const blocked = robotsMeta.includes("noindex") || xRobots.includes("noindex");
      return [
        blocked
          ? { status: "fail", message: "Page is set to noindex" }
          : { status: "pass", message: "Page is indexable" },
      ];
    },
  },
  {
    id: "crawlability/canonical-valid",
    category: "crawlability",
    title: "Canonical valid",
    severity: "warning",
    fix: "Use an absolute, valid URL in the canonical link.",
    run({ page }) {
      const c = page.$('link[rel="canonical"]').attr("href")?.trim();
      if (!c) return [{ status: "warn", message: "No canonical to validate" }];
      try {
        const u = new URL(c, page.finalUrl);
        return [{ status: "pass", message: "Canonical is absolute and valid", evidence: u.toString() }];
      } catch {
        return [{ status: "fail", message: "Canonical is invalid", evidence: c }];
      }
    },
  },
  {
    id: "crawlability/x-robots-tag",
    category: "crawlability",
    title: "X-Robots-Tag header",
    severity: "info",
    fix: "Remove noindex or nofollow from the X-Robots-Tag header if the page should rank.",
    run({ page }) {
      const x = (page.headers["x-robots-tag"] || "").toLowerCase();
      if (!x) return [{ status: "pass", message: "No restrictive X-Robots-Tag" }];
      return [
        x.includes("noindex") || x.includes("nofollow")
          ? { status: "warn", message: `X-Robots-Tag: ${x}` }
          : { status: "pass", message: `X-Robots-Tag: ${x}` },
      ];
    },
  },
];
