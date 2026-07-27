// Social and image meta as full tables. The rules check the three tags that
// break a preview; these report every tag a preview can use, so the gap between
// "shares without falling over" and "shares well" is visible.

import type { Collector, PageContext, PageImage, ValueStatus } from "../types.js";
import { clip, table, value } from "./kit.js";

const OG_TAGS = [
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "og:type",
  "og:site_name",
  "og:locale",
];
const TWITTER_TAGS = [
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:site",
  "twitter:creator",
];
// The tags a card genuinely needs. The rest sharpen it.
const OG_REQUIRED = new Set(["og:title", "og:description", "og:image"]);
const TWITTER_REQUIRED = new Set(["twitter:card"]);

/** Open Graph uses `property`, Twitter uses `name`, and plenty of sites mix them. */
function metaContent(page: PageContext, key: string): string | null {
  const v =
    page.$(`meta[property="${key}"]`).attr("content") ?? page.$(`meta[name="${key}"]`).attr("content");
  return v?.trim() || null;
}

function tagRows(
  page: PageContext,
  keys: string[],
  required: Set<string>,
): { rows: (string | number)[][]; missingRequired: string[] } {
  const missingRequired: string[] = [];
  const rows = keys.map((key) => {
    const content = metaContent(page, key);
    if (!content && required.has(key)) missingRequired.push(key);
    return [key, content ? clip(content, 70) : "—", content ? "present" : required.has(key) ? "missing" : "not set"];
  });
  return { rows, missingRequired };
}

function coverageStatus(missing: number): ValueStatus {
  return missing === 0 ? "ok" : "warn";
}

function isHttp(img: PageImage): boolean {
  return img.absUrl.startsWith("http://");
}

export const metaCollectors: Collector[] = [
  {
    id: "core-seo/open-graph",
    category: "core-seo",
    collect({ page }) {
      const { rows, missingRequired } = tagRows(page, OG_TAGS, OG_REQUIRED);
      const present = rows.filter((r) => r[2] === "present").length;
      return [
        value("core-seo/og-coverage", "Open Graph tags", `${present} of ${OG_TAGS.length}`, {
          status: present === 0 ? "missing" : coverageStatus(missingRequired.length),
          note: missingRequired.length ? `Missing ${missingRequired.join(", ")}` : "",
        }),
        table("core-seo/og-table", "Open Graph", ["Property", "Content", "State"], rows),
      ];
    },
  },
  {
    id: "social-media/twitter",
    category: "social-media",
    collect({ page }) {
      const { rows, missingRequired } = tagRows(page, TWITTER_TAGS, TWITTER_REQUIRED);
      const present = rows.filter((r) => r[2] === "present").length;
      return [
        value("social-media/twitter-coverage", "Twitter tags", `${present} of ${TWITTER_TAGS.length}`, {
          status: present === 0 ? "missing" : coverageStatus(missingRequired.length),
          // Twitter falls back to Open Graph for everything but the card type,
          // so a thin table here is not automatically a problem.
          note: present === 0 ? "Falls back to Open Graph" : "",
        }),
        table("social-media/twitter-table", "Twitter card", ["Name", "Content", "State"], rows),
      ];
    },
  },
  {
    id: "images/coverage",
    category: "images",
    collect({ page }) {
      const images = page.images;
      const withAlt = images.filter((i) => i.alt !== null && i.alt.trim() !== "").length;
      const decorative = images.filter((i) => i.alt === "").length;
      const withoutAlt = images.filter((i) => i.alt === null).length;
      const http = images.filter(isHttp).length;
      return [
        value("images/count", "Images", images.length),
        value("images/with-alt", "With alt text", withAlt, {
          status: withoutAlt === 0 ? "ok" : "warn",
          note: `${decorative} marked decorative, ${withoutAlt} with no alt attribute`,
        }),
        value("images/without-alt", "Missing alt", withoutAlt, {
          status: withoutAlt === 0 ? "ok" : "bad",
        }),
        value("images/http-count", "Loaded over HTTP", http, {
          status: http === 0 ? "ok" : "bad",
          note: "Insecure images break the padlock on an HTTPS page",
        }),
      ];
    },
  },
];
