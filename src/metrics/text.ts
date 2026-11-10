// Text statistics, readability, and keyword tables. All of it reads the one
// analysis in ../text.ts, so a word counted here is the same word the
// keyword-stuffing rule counts.

import type { Collector, MetricInput, PageContext, ValueStatus } from "../types.js";
import { analyzeText, keysIn, keywordSpans, readability, round, type Phrase } from "../text.js";
import { clip, table, upTo, value } from "./kit.js";

const TOP_KEYWORDS = 10;
const ENGLISH_ONLY = "Needs a stop word list, English only for now";

function percentOf(part: number, whole: number): number {
  return whole ? round((part * 100) / whole) : 0;
}

function phraseRows(phrases: Phrase[]): (string | number)[][] {
  return phrases.map((p) => [p.phrase, p.count, p.percent]);
}

function fleschStatus(ease: number): ValueStatus {
  if (ease >= 60) return "ok";
  return ease >= 30 ? "warn" : "bad";
}

function yesNo(present: boolean): string {
  return present ? "yes" : "no";
}

function headingTexts(page: PageContext): { element: string; text: string }[] {
  const out = [
    { element: "Title", text: page.$("title").first().text() },
    { element: "Description", text: page.$('meta[name="description"]').attr("content") || "" },
  ];
  page.$("h1,h2,h3,h4,h5,h6").each((_, el) => {
    out.push({ element: (el as { tagName: string }).tagName.toUpperCase(), text: page.$(el).text() });
  });
  return out
    .map((e) => ({ ...e, text: e.text.replace(/\s+/g, " ").trim() }))
    .filter((e) => e.text);
}

export const textCollectors: Collector[] = [
  {
    id: "content/text-statistics",
    category: "content",
    collect({ page }) {
      const a = analyzeText(page);
      const total = a.words.length;
      const avgSentence = a.sentences.length ? round(total / a.sentences.length) : null;
      return [
        value("content/main-words", "Main content words", total, {
          note: `Read from <${a.source}>, nav, footer and hidden elements excluded`,
        }),
        value("content/unique-words", "Unique words", a.uniqueWords, {
          note: `${percentOf(a.uniqueWords, total)}% of words`,
        }),
        value("content/unique-words-percent", "Unique words share", percentOf(a.uniqueWords, total), {
          unit: "%",
        }),
        value("content/stop-words", "Stop words", a.stopWords, {
          note: a.stopWords === null ? ENGLISH_ONLY : `${percentOf(a.stopWords, total)}% of words`,
        }),
        value(
          "content/stop-words-percent",
          "Stop words share",
          a.stopWords === null ? null : percentOf(a.stopWords, total),
          { unit: "%" },
        ),
        value(
          "content/water-percent",
          "Water",
          a.waterWords === null ? null : percentOf(a.waterWords, total),
          {
            unit: "%",
            status: a.waterWords === null ? undefined : upTo(percentOf(a.waterWords, total), 60, 75),
            note: "Stop words and filler, the share of words carrying no meaning",
          },
        ),
        value("content/avg-sentence-length", "Average sentence length", avgSentence, {
          unit: "words",
          status: avgSentence === null ? "missing" : upTo(avgSentence, 20, 25),
          note: "Up to 20 reads comfortably",
        }),
        value("content/chars-no-spaces", "Characters", a.chars, { note: "Main content, spaces excluded" }),
      ];
    },
  },
  {
    id: "content/readability",
    category: "content",
    collect({ page }) {
      const r = readability(analyzeText(page));
      const note = r ? undefined : "English text only";
      return [
        value("content/flesch-reading-ease", "Flesch reading ease", r?.fleschEase ?? null, {
          status: r ? fleschStatus(r.fleschEase) : undefined,
          note: r ? r.fleschLabel : note,
        }),
        value("content/flesch-kincaid-grade", "Flesch-Kincaid grade", r?.fleschKincaidGrade ?? null, {
          status: r ? upTo(r.fleschKincaidGrade, 9, 12) : undefined,
          note: r ? "US school grade, 9 or lower suits a general audience" : note,
        }),
        value("content/gunning-fog", "Gunning Fog index", r?.gunningFog ?? null, {
          status: r ? upTo(r.gunningFog, 12, 16) : undefined,
          note: r ? "Years of schooling to read it first time, 12 or lower" : note,
        }),
      ];
    },
  },
  {
    id: "content/keywords",
    category: "content",
    collect({ page }) {
      const a = analyzeText(page);
      const out: MetricInput[] = [];
      const columns = ["Phrase", "Count", "%"];
      for (const n of [1, 2, 3] as const) {
        if (a.ngrams[n].length)
          out.push(table(`content/top-words-${n}`, `Top ${n}-word phrases`, columns, phraseRows(a.ngrams[n])));
      }
      if (a.stopWordTable.length)
        out.push(table("content/stop-word-table", "Stop words", ["Word", "Count", "%"], phraseRows(a.stopWordTable)));

      const keywords = a.ngrams[1].slice(0, TOP_KEYWORDS);
      if (!keywords.length) return out;

      const title = keysIn(page.$("title").first().text(), a.lang);
      const desc = keysIn(page.$('meta[name="description"]').attr("content") || "", a.lang);
      const h1 = keysIn(page.$("h1").first().text(), a.lang);
      out.push(
        table(
          "content/keyword-relevance",
          "Keyword relevance",
          ["Keyword", "Count", "Title", "Description", "H1"],
          keywords.map((k) => [k.phrase, k.count, yesNo(title.has(k.key)), yesNo(desc.has(k.key)), yesNo(h1.has(k.key))]),
          { note: "Top keywords and whether each appears in the title, description, and H1" },
        ),
      );

      const keys = keywords.map((k) => k.key);
      const highlights = headingTexts(page).map(({ element, text }) => {
        const spans = keywordSpans(text, keys, a.lang);
        const matched = [...new Set(spans.map(([s, e]) => text.slice(s, e).toLowerCase()))];
        return [element, clip(text, 70), matched.join(", ") || "—", spans.map(([s, e]) => `${s}-${e}`).join(" ")];
      });
      out.push(
        table("content/keyword-highlights", "Keywords in headings", ["Element", "Text", "Keywords", "Spans"], highlights, {
          cap: 40,
          note: "Spans are start-end character offsets into the full text, end exclusive",
        }),
      );
      return out;
    },
  },
];
