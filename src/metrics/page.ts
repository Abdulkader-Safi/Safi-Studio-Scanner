// Page basics as values. Everything here is already sitting in the parsed DOM or
// the response, so none of it costs a request.

import type { Collector, PageContext, ValueStatus } from "../types.js";
import { inRange, upTo, value } from "./kit.js";

function text(page: PageContext, sel: string): string {
  return page.$(sel).first().text().replace(/\s+/g, " ").trim();
}

/** Inline `display:none` and the `hidden` attribute. No cascade, so no CSS files. */
function hiddenCount(page: PageContext): number {
  let n = page.$("[hidden]").length;
  page.$("[style]").each((_, el) => {
    if (/display\s*:\s*none/i.test(page.$(el).attr("style") || "")) n++;
  });
  return n;
}

/** Walks every JSON-LD block and returns the first value found for `key`. */
function fromJsonLd(page: PageContext, key: string): string | null {
  let found: string | null = null;
  page.$('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    let data: unknown;
    try {
      data = JSON.parse(page.$(el).text());
    } catch {
      return;
    }
    const walk = (node: unknown): void => {
      if (found || !node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      const obj = node as Record<string, unknown>;
      if (typeof obj[key] === "string") {
        found = obj[key] as string;
        return;
      }
      Object.values(obj).forEach(walk);
    };
    walk(data);
  });
  return found;
}

function metaDate(page: PageContext, names: string[]): string | null {
  for (const n of names) {
    const v =
      page.$(`meta[property="${n}"]`).attr("content") ??
      page.$(`meta[name="${n}"]`).attr("content") ??
      page.$(`meta[itemprop="${n}"]`).attr("content");
    if (v?.trim()) return v.trim();
  }
  return null;
}

/** A date is only useful if it parses. An unparseable one is worse than absent. */
function dateStatus(raw: string | null): ValueStatus {
  if (!raw) return "missing";
  return Number.isNaN(Date.parse(raw)) ? "warn" : "ok";
}

export const pageCollectors: Collector[] = [
  {
    id: "core-seo/page-basics",
    category: "core-seo",
    collect({ page }) {
      const title = text(page, "title");
      const desc = (page.$('meta[name="description"]').attr("content") || "").trim();
      const h1s = page.$("h1");
      const h1 = text(page, "h1");
      return [
        value("core-seo/title-chars", "Title length", title ? title.length : null, {
          unit: "chars",
          status: title ? inRange(title.length, 30, 60) : "missing",
          note: "Recommended 30 to 60",
        }),
        value("core-seo/description-chars", "Description length", desc ? desc.length : null, {
          unit: "chars",
          status: desc ? inRange(desc.length, 70, 160) : "missing",
          note: "Recommended 70 to 160",
        }),
        value("core-seo/h1-count", "H1 count", h1s.length, {
          status: h1s.length === 1 ? "ok" : h1s.length === 0 ? "missing" : "warn",
          note: "Exactly one",
        }),
        value("core-seo/h1-chars", "H1 length", h1 ? h1.length : null, {
          unit: "chars",
          status: h1 ? inRange(h1.length, 10, 70) : "missing",
          note: "Recommended 10 to 70",
        }),
      ];
    },
  },
  {
    id: "content/page-basics",
    category: "content",
    collect({ page }) {
      const lang = page.$("html").attr("lang")?.trim() || null;
      const hidden = hiddenCount(page);
      return [
        value("content/declared-language", "Declared language", lang, {
          status: lang ? "ok" : "missing",
          note: "The lang attribute on <html>",
        }),
        value("content/hidden-elements", "Hidden elements", hidden, {
          note: "Inline display:none or the hidden attribute",
        }),
      ];
    },
  },
  {
    id: "crawlability/response",
    category: "crawlability",
    collect({ page }) {
      return [
        value("crawlability/http-status", "HTTP status", page.status, {
          status: page.status >= 200 && page.status < 300 ? "ok" : page.status < 400 ? "warn" : "bad",
        }),
        value("crawlability/response-time", "Response time", page.responseTimeMs, {
          unit: "ms",
          status: upTo(page.responseTimeMs, 800, 1800),
        }),
      ];
    },
  },
  {
    id: "performance/document",
    category: "performance",
    collect({ page }) {
      const kb = Math.round(page.html.length / 1000);
      return [
        value("performance/html-size", "HTML size", kb, {
          unit: "KB",
          status: upTo(kb, 100, 200),
          note: "Raw document, before assets",
        }),
      ];
    },
  },
  {
    id: "eeat/dates",
    category: "eeat",
    collect({ page }) {
      const published =
        metaDate(page, ["article:published_time", "datePublished", "date", "pubdate"]) ??
        fromJsonLd(page, "datePublished");
      const updated =
        metaDate(page, ["article:modified_time", "dateModified", "last-modified"]) ??
        fromJsonLd(page, "dateModified") ??
        page.headers["last-modified"] ??
        null;
      return [
        value("eeat/published-date", "Published", published, { status: dateStatus(published) }),
        value("eeat/updated-date", "Updated", updated, { status: dateStatus(updated) }),
      ];
    },
  },
];
