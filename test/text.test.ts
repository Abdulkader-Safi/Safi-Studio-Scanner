import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPageContext } from "../src/context.js";
import { runPage } from "../src/runner.js";
import { allCollectors } from "../src/metrics/index.js";
import { analyzeText, keywordSpans, lemma, readability, syllables, tokenize } from "../src/text.js";
import type { LinkStatus, MetricTable, MetricValue, RawResponse, SiteContext } from "../src/types.js";

const site: SiteContext = {
  origin: "https://example.com",
  startUrl: "https://example.com/",
  robots: { exists: true, status: 200, content: "", sitemaps: [] },
  sitemap: { exists: false, status: 404, urls: [] },
};
const okCheck = async (): Promise<LinkStatus> => ({ ok: true, status: 200, redirected: false, chain: 0 });

function pageFrom(html: string) {
  const raw: RawResponse = {
    url: "https://example.com/a",
    finalUrl: "https://example.com/a",
    status: 200,
    ok: true,
    headers: {},
    html,
    redirectChain: 0,
    responseTimeMs: 5,
  };
  return buildPageContext(raw, "https://example.com", 0);
}

const article = () => pageFrom(readFileSync(new URL("./fixtures/article.html", import.meta.url), "utf8"));

async function metrics() {
  const report = await runPage(article(), site, [], okCheck, allCollectors);
  return new Map(report.metrics.map((m) => [m.id, m]));
}

test("lemmas merge plurals and possessives, and leave other words alone", () => {
  assert.equal(lemma("developments"), "development");
  assert.equal(lemma("stories"), "story");
  assert.equal(lemma("boxes"), "box");
  assert.equal(lemma("garden's"), "garden");
  assert.equal(lemma("glass"), "glass");
  assert.equal(lemma("status"), "status");
  assert.equal(lemma("bus"), "bus");
  assert.equal(lemma("gardens", "fr"), "gardens", "no English rules on other languages");
});

test("tokenize drops numbers and punctuation and splits languages without spaces", () => {
  assert.deepEqual(tokenize("It's 2026, OK?"), ["it's", "ok"]);
  assert.ok(tokenize("東京都に住んでいます", "ja").length > 1);
});

test("syllables are close enough for the formulas", () => {
  assert.equal(syllables("the"), 1);
  assert.equal(syllables("garden"), 2);
  assert.equal(syllables("composting"), 3);
});

test("main content skips nav, footer, and hidden text", () => {
  const a = analyzeText(article());
  assert.equal(a.source, "main");
  assert.ok(!a.words.includes("deals"), "nav, footer, and display:none text never count");
  assert.ok(!a.words.includes("shop"));
});

test("list items and headings are their own sentences", () => {
  const a = analyzeText(article());
  assert.ok(a.sentences.some((s) => s.join(" ") === "fruit peels"));
  assert.ok(a.sentences.some((s) => s.join(" ") === "coffee grounds"));
});

test("the analysis is cached per page", () => {
  const page = article();
  assert.equal(analyzeText(page), analyzeText(page));
});

test("n-grams group by lemma and skip phrases that open or close on a stop word", () => {
  const a = analyzeText(article());
  const garden = a.ngrams[1].find((p) => p.key === "garden");
  assert.equal(garden?.count, 2, "gardens and garden are one row");
  assert.equal(garden?.phrase, "garden", "a tie goes to the shorter form");
  assert.ok(a.ngrams[1].every((p) => p.count > 1), "words written once are not keywords");
  assert.equal(a.ngrams[2][0].phrase, "compost bin");
  assert.equal(a.ngrams[2][0].count, 3);
  assert.ok(!a.ngrams[2].some((p) => p.phrase.startsWith("the ")));
});

test("readability is computed for English and null otherwise", () => {
  const r = readability(analyzeText(article()));
  assert.ok(r && r.fleschEase > 0);
  const fr = pageFrom('<html lang="fr"><body><p>Le jardin est beau.</p></body></html>');
  assert.equal(readability(analyzeText(fr)), null);
});

test("keyword spans point at the matched words", () => {
  const text = "Compost bins for gardens";
  const spans = keywordSpans(text, ["compost", "garden"]);
  assert.deepEqual(spans.map(([s, e]) => text.slice(s, e)), ["Compost", "gardens"]);
});

test("text statistics come out as values", async () => {
  const m = await metrics();
  const words = (m.get("content/main-words") as MetricValue).value as number;
  assert.ok(words > 20);
  assert.equal((m.get("content/flesch-reading-ease") as MetricValue).note, "Easy");
  assert.ok(((m.get("content/stop-words-percent") as MetricValue).value as number) > 0);
  assert.ok(((m.get("content/chars-no-spaces") as MetricValue).value as number) > words);
});

test("keyword relevance marks where each top keyword appears", async () => {
  const m = await metrics();
  const t = m.get("content/keyword-relevance") as MetricTable;
  const compost = t.rows.find((r) => r[0] === "compost")!;
  assert.deepEqual(compost.slice(2), ["no", "no", "no"], "only composting appears there, a different lemma");
  const garden = t.rows.find((r) => r[0] === "garden")!;
  assert.deepEqual(garden.slice(2), ["yes", "yes", "no"]);
});

test("heading highlights list matched keywords with their spans", async () => {
  const m = await metrics();
  const t = m.get("content/keyword-highlights") as MetricTable;
  const h2 = t.rows.find((r) => r[0] === "H2")!;
  assert.equal(h2[1], "What goes in a compost bin");
  assert.equal(h2[3], "15-22 23-26");
});

test("keyword stuffing reads the n-gram output", async () => {
  const filler = "Plain prose about many distinct topics in a varied voice. ".repeat(4);
  const stuffed = pageFrom(`<html lang="en"><body><p>${filler}${"cheap shoes ".repeat(30)}</p></body></html>`);
  const { contentRules } = await import("../src/rules/content.js");
  const rule = contentRules.find((r) => r.id === "content/keyword-stuffing")!;
  const [result] = await rule.run({ page: stuffed, site, checkUrl: okCheck });
  assert.equal(result.status, "warn");
  assert.match(result.message, /cheap shoes/);
});
