import type { Rule } from "../types.js";

export const coreSeoRules: Rule[] = [
  {
    id: "core-seo/title-present",
    category: "core-seo",
    title: "Title tag present",
    severity: "error",
    fix: "Add a unique <title> in <head> that summarises the page in 30 to 60 characters.",
    run({ page }) {
      const t = page.$("title").first().text().trim();
      return [
        t
          ? { status: "pass", message: "Title present" }
          : { status: "fail", message: "Missing <title>" },
      ];
    },
  },
  {
    id: "core-seo/title-length",
    category: "core-seo",
    title: "Title length",
    severity: "warning",
    fix: "Rewrite the title to sit between 30 and 60 characters so it is not truncated in search results.",
    run({ page }) {
      const t = page.$("title").first().text().trim();
      if (!t) return [{ status: "warn", message: "No title to measure" }];
      if (t.length < 30)
        return [{ status: "warn", message: `Title is short (${t.length} chars)`, evidence: t }];
      if (t.length > 60)
        return [{ status: "warn", message: `Title is long (${t.length} chars)`, evidence: t }];
      return [{ status: "pass", message: `Title length good (${t.length} chars)` }];
    },
  },
  {
    id: "core-seo/meta-description-present",
    category: "core-seo",
    title: "Meta description present",
    severity: "error",
    fix: 'Add a <meta name="description"> with a 70 to 160 character summary of the page.',
    run({ page }) {
      const d = page.$('meta[name="description"]').attr("content")?.trim();
      return [
        d
          ? { status: "pass", message: "Meta description present" }
          : { status: "fail", message: "Missing meta description" },
      ];
    },
  },
  {
    id: "core-seo/meta-description-length",
    category: "core-seo",
    title: "Meta description length",
    severity: "warning",
    fix: "Trim or expand the meta description to 70 to 160 characters.",
    run({ page }) {
      const d = page.$('meta[name="description"]').attr("content")?.trim() || "";
      if (!d) return [{ status: "warn", message: "No description to measure" }];
      if (d.length < 70) return [{ status: "warn", message: `Description short (${d.length} chars)` }];
      if (d.length > 160) return [{ status: "warn", message: `Description long (${d.length} chars)` }];
      return [{ status: "pass", message: `Description length good (${d.length} chars)` }];
    },
  },
  {
    id: "core-seo/single-h1",
    category: "core-seo",
    title: "Exactly one H1",
    severity: "warning",
    fix: "Use exactly one <h1> as the page's main heading. Demote the extras to <h2> or below.",
    run({ page }) {
      const n = page.$("h1").length;
      return [
        n === 1
          ? { status: "pass", message: "Exactly one H1" }
          : { status: "fail", message: `Found ${n} H1 tags` },
      ];
    },
  },
  {
    id: "core-seo/canonical-present",
    category: "core-seo",
    title: "Canonical URL present",
    severity: "warning",
    fix: 'Add <link rel="canonical" href="..."> pointing to the preferred absolute URL of this page.',
    run({ page }) {
      const c = page.$('link[rel="canonical"]').attr("href")?.trim();
      if (!c) return [{ status: "warn", message: "No canonical link" }];
      try {
        new URL(c, page.finalUrl);
        return [{ status: "pass", message: "Canonical present", evidence: c }];
      } catch {
        return [{ status: "fail", message: "Canonical is not a valid URL", evidence: c }];
      }
    },
  },
  {
    id: "core-seo/charset-declared",
    category: "core-seo",
    title: "Charset declared",
    severity: "warning",
    fix: 'Add <meta charset="utf-8"> as the first tag in <head>.',
    run({ page }) {
      const has =
        page.$("meta[charset]").length > 0 || /charset=/i.test(page.headers["content-type"] || "");
      return [
        has
          ? { status: "pass", message: "Charset declared" }
          : { status: "warn", message: "No charset declared" },
      ];
    },
  },
  {
    id: "core-seo/viewport-present",
    category: "core-seo",
    title: "Viewport meta present",
    severity: "warning",
    fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile rendering.',
    run({ page }) {
      const v = page.$('meta[name="viewport"]').attr("content");
      return [
        v
          ? { status: "pass", message: "Viewport present" }
          : { status: "fail", message: "Missing viewport meta" },
      ];
    },
  },
  {
    id: "core-seo/robots-meta-indexable",
    category: "core-seo",
    title: "Page is indexable",
    severity: "error",
    fix: "Remove noindex from the robots meta tag if this page should appear in search.",
    run({ page }) {
      const r = (page.$('meta[name="robots"]').attr("content") || "").toLowerCase();
      return [
        r.includes("noindex")
          ? { status: "fail", message: "Robots meta has noindex", evidence: r }
          : { status: "pass", message: "No noindex in robots meta" },
      ];
    },
  },
  {
    id: "core-seo/open-graph-basics",
    category: "core-seo",
    title: "Open Graph basics",
    severity: "info",
    fix: "Add og:title, og:description, and og:image meta tags so the page previews well when shared.",
    run({ page }) {
      const missing = ["og:title", "og:description", "og:image"].filter(
        (p) => !page.$(`meta[property="${p}"]`).attr("content"),
      );
      return [
        missing.length === 0
          ? { status: "pass", message: "og:title, og:description, og:image present" }
          : { status: "warn", message: `Missing Open Graph tags: ${missing.join(", ")}` },
      ];
    },
  },
];
