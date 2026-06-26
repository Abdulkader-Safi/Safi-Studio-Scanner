import type { Rule } from "../types.js";

export const contentRules: Rule[] = [
  {
    id: "content/heading-hierarchy",
    category: "content",
    title: "Heading hierarchy",
    severity: "warning",
    run({ page }) {
      const levels: number[] = [];
      page.$("h1,h2,h3,h4,h5,h6").each((_, el) => {
        levels.push(Number((el as { tagName: string }).tagName[1]));
      });
      let prev = 0;
      for (const l of levels) {
        if (prev && l > prev + 1)
          return [{ status: "warn", message: `Heading jumps from H${prev} to H${l}` }];
        prev = l;
      }
      return [{ status: "pass", message: "No skipped heading levels" }];
    },
  },
  {
    id: "content/word-count",
    category: "content",
    title: "Word count",
    severity: "info",
    run({ page }) {
      const text = page.$("body").text().replace(/\s+/g, " ").trim();
      const words = text ? text.split(" ").length : 0;
      return [
        words < 300
          ? { status: "warn", message: `Thin content (${words} words)` }
          : { status: "pass", message: `${words} words` },
      ];
    },
  },
  {
    id: "content/no-empty-headings",
    category: "content",
    title: "No empty headings",
    severity: "warning",
    run({ page }) {
      let empty = 0;
      page.$("h1,h2,h3,h4,h5,h6").each((_, el) => {
        if (!page.$(el).text().trim()) empty++;
      });
      return [
        empty === 0
          ? { status: "pass", message: "No empty headings" }
          : { status: "warn", message: `${empty} empty heading(s)` },
      ];
    },
  },
  {
    id: "content/keyword-stuffing",
    category: "content",
    title: "Keyword stuffing",
    severity: "info",
    run({ page }) {
      const words = page.$("body").text().toLowerCase().match(/[a-z']{4,}/g) || [];
      if (words.length < 100)
        return [{ status: "pass", message: "Not enough text to flag stuffing" }];
      const counts = new Map<string, number>();
      for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
      let top = "",
        topN = 0;
      for (const [w, n] of counts) if (n > topN) { top = w; topN = n; }
      const density = topN / words.length;
      return [
        density > 0.05
          ? { status: "warn", message: `"${top}" is ${(density * 100).toFixed(1)}% of words` }
          : { status: "pass", message: "No keyword over-repetition" },
      ];
    },
  },
  {
    id: "content/text-html-ratio",
    category: "content",
    title: "Text to HTML ratio",
    severity: "info",
    run({ page }) {
      const text = page.$("body").text().replace(/\s+/g, " ").trim().length;
      const html = page.html.length || 1;
      const ratio = text / html;
      return [
        ratio < 0.1
          ? { status: "warn", message: `Low text ratio (${(ratio * 100).toFixed(1)}%)` }
          : { status: "pass", message: `Text ratio ${(ratio * 100).toFixed(1)}%` },
      ];
    },
  },
  {
    id: "content/html-lang",
    category: "content",
    title: "HTML lang attribute",
    severity: "warning",
    run({ page }) {
      const lang = page.$("html").attr("lang");
      return [
        lang
          ? { status: "pass", message: `lang="${lang}"` }
          : { status: "warn", message: "Missing lang on <html>" },
      ];
    },
  },
];
