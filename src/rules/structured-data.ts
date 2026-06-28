import type { Rule } from "../types.js";

export const structuredDataRules: Rule[] = [
  {
    id: "structured-data/org-or-website",
    category: "structured-data",
    title: "Organization or WebSite schema",
    severity: "warning",
    fix: "Add Organization or WebSite JSON-LD so search engines understand the site entity and can show a knowledge panel.",
    run({ page }) {
      const has = /"@type"\s*:\s*"(Organization|WebSite|LocalBusiness)"/.test(page.html);
      return [
        has
          ? { status: "pass", message: "Organization or WebSite schema present" }
          : { status: "warn", message: "No Organization or WebSite schema" },
      ];
    },
  },
  {
    id: "structured-data/context-declared",
    category: "structured-data",
    title: "JSON-LD @context",
    severity: "info",
    fix: 'Each JSON-LD block should declare "@context": "https://schema.org".',
    run({ page }) {
      const blocks = page.$('script[type="application/ld+json"]');
      if (blocks.length === 0) return [{ status: "pass", message: "No JSON-LD" }];
      let missing = 0;
      blocks.each((_, el) => {
        try {
          const d = JSON.parse(page.$(el).contents().text());
          if (!JSON.stringify(d).includes('"@context"')) missing++;
        } catch {
          /* parse handled by jsonld-valid */
        }
      });
      return [
        missing === 0
          ? { status: "pass", message: "All JSON-LD blocks declare @context" }
          : { status: "warn", message: `${missing} JSON-LD block(s) missing @context` },
      ];
    },
  },
  {
    id: "structured-data/org-sameas",
    category: "structured-data",
    title: "Organization sameAs links",
    severity: "info",
    fix: "Add a sameAs array to your Organization schema linking to your official social and profile URLs. It strengthens entity recognition.",
    run({ page }) {
      if (!/"@type"\s*:\s*"(Organization|LocalBusiness)"/.test(page.html))
        return [{ status: "pass", message: "No Organization schema" }];
      return [
        /"sameAs"\s*:/.test(page.html)
          ? { status: "pass", message: "Organization declares sameAs" }
          : { status: "warn", message: "Organization schema has no sameAs links" },
      ];
    },
  },
  {
    id: "structured-data/org-logo",
    category: "structured-data",
    title: "Organization logo",
    severity: "info",
    fix: "Add a logo property to your Organization schema so Google can use it in search features.",
    run({ page }) {
      if (!/"@type"\s*:\s*"(Organization|LocalBusiness)"/.test(page.html))
        return [{ status: "pass", message: "No Organization schema" }];
      return [
        /"logo"\s*:/.test(page.html)
          ? { status: "pass", message: "Organization declares a logo" }
          : { status: "warn", message: "Organization schema has no logo" },
      ];
    },
  },
  {
    id: "structured-data/article-required",
    category: "structured-data",
    title: "Article required fields",
    severity: "warning",
    fix: "Article schema needs headline, image, datePublished, and author for rich results. Add the missing fields.",
    run({ page }) {
      if (!/"@type"\s*:\s*"(Article|NewsArticle|BlogPosting)"/.test(page.html))
        return [{ status: "pass", message: "No article schema" }];
      const missing = ["headline", "image", "datePublished", "author"].filter(
        (k) => !new RegExp(`"${k}"\\s*:`).test(page.html),
      );
      return [
        missing.length === 0
          ? { status: "pass", message: "Article schema has the required fields" }
          : { status: "warn", message: `Article schema missing: ${missing.join(", ")}` },
      ];
    },
  },
  {
    id: "structured-data/article-image",
    category: "structured-data",
    title: "Article schema has image",
    severity: "info",
    fix: "Article and NewsArticle schema should include an image property for rich results.",
    run({ page }) {
      if (!/"@type"\s*:\s*"(Article|NewsArticle|BlogPosting)"/.test(page.html))
        return [{ status: "pass", message: "No article schema" }];
      return [
        /"image"\s*:/.test(page.html)
          ? { status: "pass", message: "Article schema includes image" }
          : { status: "warn", message: "Article schema missing image" },
      ];
    },
  },
  {
    id: "structured-data/jsonld-present",
    category: "structured-data",
    title: "JSON-LD present",
    severity: "info",
    fix: "Add JSON-LD structured data describing the page, e.g. Article, Product, or Organization.",
    run({ page }) {
      const n = page.$('script[type="application/ld+json"]').length;
      return [
        n > 0
          ? { status: "pass", message: `${n} JSON-LD block(s)` }
          : { status: "warn", message: "No JSON-LD structured data" },
      ];
    },
  },
  {
    id: "structured-data/jsonld-valid",
    category: "structured-data",
    title: "JSON-LD parses",
    severity: "warning",
    fix: "Fix the JSON syntax in the flagged ld+json blocks so they parse cleanly.",
    run({ page }) {
      const blocks = page.$('script[type="application/ld+json"]');
      if (blocks.length === 0) return [{ status: "pass", message: "No JSON-LD to validate" }];
      let bad = 0;
      blocks.each((_, el) => {
        try {
          JSON.parse(page.$(el).contents().text());
        } catch {
          bad++;
        }
      });
      return [
        bad === 0
          ? { status: "pass", message: "All JSON-LD blocks parse" }
          : { status: "fail", message: `${bad} JSON-LD block(s) invalid` },
      ];
    },
  },
  {
    id: "structured-data/jsonld-type",
    category: "structured-data",
    title: "JSON-LD has @type",
    severity: "info",
    fix: "Include an @type in each JSON-LD block so search engines know what it describes.",
    run({ page }) {
      const blocks = page.$('script[type="application/ld+json"]');
      if (blocks.length === 0) return [{ status: "pass", message: "No JSON-LD" }];
      let typed = 0;
      blocks.each((_, el) => {
        try {
          const d = JSON.parse(page.$(el).contents().text());
          if (JSON.stringify(d).includes('"@type"')) typed++;
        } catch {
          /* ignore */
        }
      });
      return [
        typed > 0
          ? { status: "pass", message: "JSON-LD declares @type" }
          : { status: "warn", message: "No @type in JSON-LD" },
      ];
    },
  },
  {
    id: "structured-data/breadcrumb-valid",
    category: "structured-data",
    title: "Breadcrumb schema",
    severity: "info",
    fix: "Add BreadcrumbList structured data to show the page's position in the site.",
    run({ page }) {
      return [
        page.html.includes("BreadcrumbList")
          ? { status: "pass", message: "BreadcrumbList present" }
          : { status: "info", message: "No breadcrumb schema" },
      ];
    },
  },
  {
    id: "structured-data/duplicate-jsonld",
    category: "structured-data",
    title: "Duplicate JSON-LD types",
    severity: "info",
    fix: "Merge or remove duplicate schema blocks of the same @type.",
    run({ page }) {
      const types: string[] = [];
      page.$('script[type="application/ld+json"]').each((_, el) => {
        try {
          const d = JSON.parse(page.$(el).contents().text());
          const t = Array.isArray(d)
            ? d.map((x: { "@type"?: string }) => x["@type"])
            : [d["@type"]];
          types.push(...t.filter(Boolean));
        } catch {
          /* ignore */
        }
      });
      const dup = types.filter((t, i) => types.indexOf(t) !== i);
      return [
        dup.length === 0
          ? { status: "pass", message: "No duplicate schema types" }
          : { status: "info", message: `Duplicate schema type(s): ${[...new Set(dup)].join(", ")}` },
      ];
    },
  },
];
