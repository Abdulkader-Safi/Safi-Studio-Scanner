import { load } from "cheerio";
import type { RawResponse, PageContext, PageLink, PageImage } from "./types.js";

export function buildPageContext(
  raw: RawResponse,
  origin: string,
  depth: number,
): PageContext {
  const $ = load(raw.html || "");
  const base = raw.finalUrl;

  const links: PageLink[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    let absUrl = "";
    try {
      absUrl = new URL(href, base).toString();
    } catch {
      absUrl = "";
    }
    let internal = false;
    try {
      internal = absUrl !== "" && new URL(absUrl).origin === origin;
    } catch {
      /* ignore */
    }
    links.push({
      href,
      absUrl,
      text: $(el).text().trim(),
      rel: ($(el).attr("rel") || "").toLowerCase(),
      internal,
    });
  });

  const images: PageImage[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    let absUrl = "";
    try {
      absUrl = src ? new URL(src, base).toString() : "";
    } catch {
      absUrl = "";
    }
    images.push({
      src,
      absUrl,
      alt: $(el).attr("alt") ?? null,
      width: $(el).attr("width") ?? null,
      height: $(el).attr("height") ?? null,
      loading: $(el).attr("loading") ?? null,
    });
  });

  return {
    url: raw.url,
    finalUrl: raw.finalUrl,
    status: raw.status,
    ok: raw.ok,
    headers: raw.headers,
    html: raw.html,
    $,
    responseTimeMs: raw.responseTimeMs,
    redirectChain: raw.redirectChain,
    depth,
    links,
    images,
    error: raw.error,
  };
}
