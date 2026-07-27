// The header structure, in document order. The hierarchy rule says whether a
// level was skipped; this says what the outline actually is, which is the thing
// you read to understand how a page is organised.

import type { Collector } from "../types.js";
import { clip, table, value } from "./kit.js";

const LEVELS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

// Elements worth naming under a heading. A section carrying an image and a list
// reads differently from one carrying four hundred words of prose.
const NOTABLE = ["img", "ul", "ol", "table", "video", "iframe", "form", "pre", "blockquote"];

export const headingCollectors: Collector[] = [
  {
    id: "content/headings",
    category: "content",
    collect({ page }) {
      const counts = LEVELS.map((l) => page.$(l).length);
      const total = counts.reduce((a, b) => a + b, 0);

      const outline: (string | number)[][] = [];
      page.$(LEVELS.join(",")).each((_, el) => {
        const tag = (el as { tagName: string }).tagName.toLowerCase();
        const level = Number(tag[1]);
        const $el = page.$(el);
        const text = $el.text().replace(/\s+/g, " ").trim();

        // Everything between this heading and the next one at any level, which
        // is the section it opens.
        const section = $el.nextUntil(LEVELS.join(","));
        const children = NOTABLE.map((sel) => {
          const n = section.find(sel).length + section.filter(sel).length;
          return n ? `${sel.toUpperCase()}: ${n}` : "";
        })
          .filter(Boolean)
          .join(", ");

        outline.push([
          tag.toUpperCase(),
          // Indent by level so the outline reads as a tree in a flat table.
          `${"— ".repeat(level - 1)}${text ? clip(text, 70) : "(empty)"}`,
          children || "—",
        ]);
      });

      const out = [
        value("content/heading-count", "Headings", total, {
          status: total === 0 ? "missing" : "ok",
          note: LEVELS.map((l, i) => `${l.toUpperCase()} ${counts[i]}`).join(" · "),
        }),
        // The same counts in a shape a consumer can read, since the note above
        // is written for a person.
        table(
          "content/heading-levels",
          "Headings per level",
          ["Level", "Count"],
          LEVELS.map((l, i) => [l.toUpperCase(), counts[i]]),
        ),
      ];
      if (outline.length)
        out.push(
          table("content/heading-outline", "Heading outline", ["Level", "Heading", "Contains"], outline, {
            cap: 40,
          }),
        );
      return out;
    },
  },
];
