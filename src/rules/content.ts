import type { Rule } from "../types.js";
import { analyzeText } from "../text.js";

const MIN_WORDS_FOR_STUFFING = 100;
const STUFFING_PERCENT = 5;

export const contentRules: Rule[] = [
  {
    id: "content/heading-hierarchy",
    category: "content",
    title: "Heading hierarchy",
    severity: "warning",
    fix: "Order headings without skipping levels. Do not jump from H2 straight to H4.",
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
    fix: "Add more substantive content. Thin pages rank poorly. Aim for at least 300 meaningful words.",
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
    fix: "Remove empty heading tags or give them real text.",
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
    fix: "Reduce the repetition of the flagged word and write naturally.",
    run({ page }) {
      const a = analyzeText(page);
      if (a.words.length < MIN_WORDS_FOR_STUFFING)
        return [{ status: "pass", message: "Not enough text to flag stuffing" }];
      // The n-gram share already weights a phrase by its length, so one ceiling
      // works for single words and phrases alike.
      const top = ([1, 2, 3] as const)
        .map((n) => a.ngrams[n][0])
        .filter((p) => p !== undefined)
        .sort((x, y) => y.percent - x.percent)[0];
      return [
        top && top.percent > STUFFING_PERCENT
          ? { status: "warn", message: `"${top.phrase}" is ${top.percent}% of words` }
          : { status: "pass", message: "No keyword over-repetition" },
      ];
    },
  },
  {
    id: "content/text-html-ratio",
    category: "content",
    title: "Text to HTML ratio",
    severity: "info",
    fix: "Increase real text relative to markup, or trim bloated HTML.",
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
    fix: 'Set the language on the root element, e.g. <html lang="en">.',
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
