import type { Rule } from "../types.js";

// All rules read the page URL. Thresholds follow Google's URL structure
// best practices: https://developers.google.com/search/docs/crawling-indexing/url-structure

function parts(rawUrl: string): { url: URL | null; path: string; segments: string[] } {
  try {
    const url = new URL(rawUrl);
    const path = decodeURI(url.pathname);
    const segments = url.pathname.split("/").filter(Boolean);
    return { url, path, segments };
  } catch {
    return { url: null, path: "", segments: [] };
  }
}

export const urlStructureRules: Rule[] = [
  {
    id: "url-structure/lowercase",
    category: "url-structure",
    title: "Lowercase URL",
    severity: "warning",
    fix: "Use lowercase URLs. Mixed case creates duplicate-URL issues because servers often treat cases differently.",
    run({ page }) {
      const { url } = parts(page.url);
      if (!url) return [{ status: "warn", message: "Could not parse URL" }];
      return [
        /[A-Z]/.test(url.pathname)
          ? { status: "warn", message: "URL path contains uppercase letters", evidence: url.pathname }
          : { status: "pass", message: "URL is lowercase" },
      ];
    },
  },
  {
    id: "url-structure/hyphens",
    category: "url-structure",
    title: "Hyphens not underscores",
    severity: "warning",
    fix: "Separate words with hyphens, not underscores. Google treats hyphens as word separators and underscores as joiners.",
    run({ page }) {
      const { path } = parts(page.url);
      return [
        path.includes("_")
          ? { status: "warn", message: "URL uses underscores between words", evidence: path }
          : { status: "pass", message: "No underscores in URL" },
      ];
    },
  },
  {
    id: "url-structure/no-spaces",
    category: "url-structure",
    title: "No spaces in URL",
    severity: "warning",
    fix: "Remove spaces from URLs. Replace them with hyphens. Encoded spaces (%20) are hard to read and share.",
    run({ page }) {
      return [
        /%20|\s/.test(page.url.split("#")[0])
          ? { status: "warn", message: "URL contains spaces or %20", evidence: page.url }
          : { status: "pass", message: "No spaces in URL" },
      ];
    },
  },
  {
    id: "url-structure/ascii",
    category: "url-structure",
    title: "ASCII or encoded characters",
    severity: "info",
    fix: "Percent-encode non-ASCII characters in URLs so every client handles them the same way.",
    run({ page }) {
      const { url } = parts(page.url);
      if (!url) return [{ status: "warn", message: "Could not parse URL" }];
      const raw = decodeURI(url.pathname);
      return [
        // eslint-disable-next-line no-control-regex
        /[^\u0000-\u007F]/.test(raw)
          ? { status: "warn", message: "URL contains raw non-ASCII characters", evidence: raw }
          : { status: "pass", message: "URL uses ASCII or encoded characters" },
      ];
    },
  },
  {
    id: "url-structure/param-count",
    category: "url-structure",
    title: "Few query parameters",
    severity: "info",
    fix: "Minimise query parameters. Many parameters multiply crawlable URLs and dilute ranking signals. Aim for two or fewer.",
    run({ page }) {
      const { url } = parts(page.url);
      if (!url) return [{ status: "warn", message: "Could not parse URL" }];
      const n = [...url.searchParams.keys()].length;
      if (n <= 2) return [{ status: "pass", message: `${n} query parameter(s)` }];
      return [{ status: "warn", message: `${n} query parameters`, evidence: url.search }];
    },
  },
  {
    id: "url-structure/readable",
    category: "url-structure",
    title: "Readable, word-based path",
    severity: "info",
    fix: "Use descriptive words in URLs instead of bare IDs. /products/leather-wallet beats /p?id=42.",
    run({ page }) {
      const { segments, url } = parts(page.url);
      if (!url) return [{ status: "warn", message: "Could not parse URL" }];
      const last = segments[segments.length - 1] || "";
      const idLike = /^\d+$/.test(last) || url.searchParams.has("id") || url.searchParams.has("p");
      if (segments.length === 0) return [{ status: "pass", message: "Home URL" }];
      return [
        idLike
          ? { status: "warn", message: "URL relies on a numeric ID rather than words", evidence: url.pathname + url.search }
          : { status: "pass", message: "URL uses readable words" },
      ];
    },
  },
  {
    id: "url-structure/length",
    category: "url-structure",
    title: "URL length",
    severity: "info",
    fix: "Keep URLs short. Long URLs are harder to share and can be truncated in search results. Aim under 100 characters.",
    run({ page }) {
      const len = page.url.length;
      if (len <= 100) return [{ status: "pass", message: `URL is ${len} characters` }];
      if (len <= 115) return [{ status: "warn", message: `Long URL (${len} characters)` }];
      return [{ status: "fail", message: `Very long URL (${len} characters)`, evidence: page.url }];
    },
  },
  {
    id: "url-structure/depth",
    category: "url-structure",
    title: "Shallow path depth",
    severity: "info",
    fix: "Avoid deep nesting. Keep important pages within a few clicks of the root. Aim for four path segments or fewer.",
    run({ page }) {
      const { segments } = parts(page.url);
      if (segments.length <= 4) return [{ status: "pass", message: `${segments.length} path segment(s)` }];
      return [{ status: "warn", message: `Deep path (${segments.length} segments)`, evidence: "/" + segments.join("/") }];
    },
  },
];
