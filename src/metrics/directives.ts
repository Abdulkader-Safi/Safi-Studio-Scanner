// What the page actually told crawlers. The rules already judge these; this
// reports the resolved values, because "canonical is valid" and "canonical
// points at a different URL than the one audited" are different sentences.

import type { Collector, PageContext } from "../types.js";
import { clip, table, value } from "./kit.js";

/** Same page, ignoring the noise: case in the host, a trailing slash, a hash. */
function sameUrl(a: string, b: string): boolean {
  const norm = (u: string) => {
    try {
      const p = new URL(u);
      return `${p.protocol}//${p.host.toLowerCase()}${p.pathname.replace(/\/$/, "")}${p.search}`;
    } catch {
      return u;
    }
  };
  return norm(a) === norm(b);
}

function resolvedCanonical(page: PageContext): string | null {
  const raw = page.$('link[rel="canonical"]').attr("href")?.trim();
  if (!raw) return null;
  try {
    return new URL(raw, page.finalUrl).toString();
  } catch {
    return raw;
  }
}

export const directiveCollectors: Collector[] = [
  {
    id: "crawlability/directives",
    category: "crawlability",
    collect({ page, site }) {
      const robotsMeta = page.$('meta[name="robots"]').attr("content")?.trim() || null;
      const xRobots = page.headers["x-robots-tag"]?.trim() || null;
      const canonical = resolvedCanonical(page);
      const blocked = /noindex/i.test(`${robotsMeta ?? ""} ${xRobots ?? ""}`);
      const directives = site.robots.exists
        ? site.robots.content.split("\n").filter((l) => /^\s*[a-z-]+\s*:/i.test(l)).length
        : 0;

      return [
        value("crawlability/robots-meta", "Robots meta", robotsMeta, {
          status: robotsMeta ? (blocked ? "bad" : "ok") : "missing",
          note: "Absent means index, follow",
        }),
        value("crawlability/x-robots-tag", "X-Robots-Tag", xRobots, {
          status: xRobots ? (/noindex/i.test(xRobots) ? "bad" : "ok") : "missing",
          note: "The header form of the same directive",
        }),
        value("crawlability/canonical-url", "Canonical URL", canonical, {
          status: canonical ? "ok" : "missing",
        }),
        value(
          "crawlability/canonical-match",
          "Canonical matches this URL",
          canonical ? (sameUrl(canonical, page.finalUrl) ? "yes" : "no") : null,
          {
            status: canonical ? (sameUrl(canonical, page.finalUrl) ? "ok" : "warn") : "missing",
            note: canonical && !sameUrl(canonical, page.finalUrl) ? page.finalUrl : "",
          },
        ),
        value(
          "crawlability/robots-txt",
          "robots.txt",
          site.robots.exists ? `${directives} directives` : null,
          {
            status: site.robots.exists ? "ok" : "missing",
            note: site.robots.sitemaps.length
              ? `Declares ${site.robots.sitemaps.length} sitemap(s)`
              : "No Sitemap line",
          },
        ),
        value(
          "crawlability/sitemap-urls",
          "Sitemap URLs",
          site.sitemap.exists ? site.sitemap.urls.length : null,
          { status: site.sitemap.exists ? "ok" : "missing" },
        ),
      ];
    },
  },
  {
    id: "internationalization/hreflang",
    category: "internationalization",
    collect({ page }) {
      const rows: (string | number)[][] = [];
      let selfRef = false;
      page.$('link[rel="alternate"][hreflang]').each((_, el) => {
        const lang = page.$(el).attr("hreflang")?.trim() || "";
        const href = page.$(el).attr("href")?.trim() || "";
        let resolved = href;
        try {
          resolved = new URL(href, page.finalUrl).toString();
        } catch {
          /* keep the raw value, the rule flags it */
        }
        if (sameUrl(resolved, page.finalUrl)) selfRef = true;
        rows.push([lang, clip(resolved, 90)]);
      });

      const count = value("internationalization/hreflang-count", "hreflang alternates", rows.length, {
        status: rows.length === 0 ? "missing" : selfRef ? "ok" : "warn",
        note: rows.length === 0 ? "" : selfRef ? "Includes a self-reference" : "No self-reference",
      });
      // No alternates means no table. An empty grid is noise, and the count
      // already says everything there is to say.
      if (rows.length === 0) return [count];
      return [
        count,
        table("internationalization/hreflang-table", "hreflang alternates", ["hreflang", "URL"], rows),
      ];
    },
  },
];
