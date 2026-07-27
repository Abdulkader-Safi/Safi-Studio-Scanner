// Markup hygiene. Counters that say what the document is made of, none of them
// a verdict on their own: two inline styles is housekeeping, four hundred is a
// story about how the page is built.

import type { Collector, PageContext } from "../types.js";
import { upTo, value } from "./kit.js";

/** Comment nodes anywhere in the document, including inside <head>. */
function commentCount(page: PageContext): number {
  let n = 0;
  const walk = (nodes: { type: string; children?: unknown[] }[]): void => {
    for (const node of nodes) {
      if (node.type === "comment") n++;
      if (node.children) walk(node.children as { type: string; children?: unknown[] }[]);
    }
  };
  walk(page.$.root().toArray() as unknown as { type: string; children?: unknown[] }[]);
  return n;
}

export const markupCollectors: Collector[] = [
  {
    id: "content/markup-hygiene",
    category: "content",
    collect({ page }) {
      const inlineStyles = page.$("[style]").length;
      const bodyStyleBlocks = page.$("body style").length;
      const comments = commentCount(page);
      const placeholders = page.links.filter((l) => {
        const h = l.href.trim();
        return h === "" || h === "#" || h.toLowerCase().startsWith("javascript:void");
      }).length;
      return [
        value("content/inline-styles", "Inline style attributes", inlineStyles, {
          status: upTo(inlineStyles, 20, 100),
          note: "Style belongs in a stylesheet",
        }),
        value("content/body-style-blocks", "Style blocks in body", bodyStyleBlocks, {
          status: bodyStyleBlocks === 0 ? "ok" : "warn",
          note: "CSS after <body> opens can restyle painted content",
        }),
        value("content/html-comments", "HTML comments", comments, {
          status: upTo(comments, 30, 150),
          note: "Comments ship to every visitor",
        }),
        value("content/placeholder-links", "Placeholder links", placeholders, {
          status: placeholders === 0 ? "ok" : "warn",
          note: 'href="#" or empty',
        }),
      ];
    },
  },
  {
    id: "performance/script-count",
    category: "performance",
    collect({ page }) {
      const scripts = page.$("script");
      const external = page.$("script[src]").length;
      return [
        value("performance/script-tags", "Script tags", scripts.length, {
          status: upTo(scripts.length, 15, 40),
          note: `${external} external, ${scripts.length - external} inline`,
        }),
      ];
    },
  },
];
