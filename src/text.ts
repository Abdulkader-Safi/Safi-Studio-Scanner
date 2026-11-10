// The text module. One pass over the page's main content gives every text
// statistic, the n-gram tables, readability, and the keyword-stuffing rule the
// same tokens, so they never disagree about what a "word" is.
//
// Tokenizing goes through Intl.Segmenter with the page's declared language, so
// languages without spaces between words still split correctly. Stop words,
// lemmas, and syllables are English only for now; other languages get counts
// and n-grams, and the English-only numbers come back null.

import { load, type CheerioAPI } from "cheerio";
import type { PageContext } from "./types.js";

// prettier-ignore
const EN_STOP = new Set(("a about above after again against all also am an and any are aren't as at be because been " +
  "before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down " +
  "during each even ever few for from further get gets got had hadn't has hasn't have haven't having he he'd he'll he's " +
  "her here here's hers herself him himself his how how's however i i'd i'll i'm i've if in into is isn't it it's its " +
  "itself just let's like may me might more most much must mustn't my myself no nor not now of off on once one only or " +
  "other ought our ours ourselves out over own per same shall shan't she she'd she'll she's should shouldn't so some " +
  "such than that that's the their theirs them themselves then there there's these they they'd they'll they're " +
  "they've this those through thus to too under until up upon us very via was wasn't we we'd we'll we're we've were " +
  "weren't what what's when when's where where's whether which while who who's whom why why's will with within without " +
  "won't would wouldn't yet you you'd you'll you're you've your yours yourself yourselves").split(" "));

// Words that pad a sentence without adding meaning. Together with stop words
// they make up the "water" share.
// prettier-ignore
const EN_FILLER = new Set(("actually absolutely basically certainly clearly completely definitely essentially " +
  "extremely generally highly honestly indeed just literally mostly obviously particularly quite rather really " +
  "simply somewhat totally truly usually various virtually").split(" "));

const STOP_WORDS: Record<string, Set<string>> = { en: EN_STOP };

// Removed before reading text. Script and style are not prose; nav, aside, and
// forms repeat on every page and would top every keyword table.
const NOISE = "script,style,noscript,template,svg,canvas,iframe,nav,aside,form,select,button,[hidden],[aria-hidden=true]";
// Removed only when falling back to <body>. Inside <main> or <article> a
// header is the article's own header and belongs to the content.
const CHROME = "body > header, body > footer, [role=banner], [role=contentinfo], [role=navigation]";
// Elements that end a run of text, so "<li>One</li><li>Two</li>" reads as two
// sentences instead of "OneTwo".
const BLOCKS =
  "address,article,blockquote,br,dd,div,dl,dt,figcaption,figure,h1,h2,h3,h4,h5,h6,header,footer,hr,li,main,ol,p,pre,section,table,td,th,tr,ul";

export interface Phrase {
  /** The most common surface form of the group, e.g. "developments" if that was written most. */
  phrase: string;
  /** Lemma key the group was merged on. */
  key: string;
  count: number;
  /** Share of all words the phrase accounts for, 0 to 100. */
  percent: number;
}

export interface TextAnalysis {
  /** Base language subtag the page declared, "en" when it declared none. */
  lang: string;
  /** Where the text came from: "main", "article", or "body". */
  source: string;
  words: string[];
  sentences: string[][];
  /** Characters of main content, whitespace excluded. */
  chars: number;
  uniqueWords: number;
  /** Null when there is no stop word list for the language. */
  stopWords: number | null;
  /** Stop words plus filler, as a count. Null without a stop word list. */
  waterWords: number | null;
  syllables: number | null;
  complexWords: number | null;
  /** Per-word stop word counts, most common first. */
  stopWordTable: Phrase[];
  /** 1, 2, and 3-word phrases used more than once, most common first, stop words excluded. */
  ngrams: Record<1 | 2 | 3, Phrase[]>;
}

const cache = new WeakMap<PageContext, TextAnalysis>();

/** Analyses the page once; every later call for the same page is free. */
export function analyzeText(page: PageContext): TextAnalysis {
  let a = cache.get(page);
  if (!a) cache.set(page, (a = analyze(page)));
  return a;
}

function baseLang(page: PageContext): string {
  return (page.$("html").attr("lang") || "en").trim().toLowerCase().split(/[-_]/)[0] || "en";
}

export function stopWordsFor(lang: string): Set<string> | null {
  return STOP_WORDS[lang] ?? null;
}

/** Picks the main content and returns it as text with block breaks as newlines. */
export function mainText(page: PageContext): { text: string; source: string } {
  const pick = (["main", "[role=main]", "article"] as const).find((s) => page.$(s).length === 1);
  const source = pick === "[role=main]" ? "main" : pick ?? "body";
  const $: CheerioAPI = load(page.$.html(page.$(pick ?? "body").first()) || "");
  $(NOISE).remove();
  $("[style]").each((_, el) => {
    if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test($(el).attr("style") || "")) $(el).remove();
  });
  if (source === "body") $(CHROME).remove();
  $(BLOCKS).after("\n");
  return { text: $.root().text(), source };
}

/** Word tokens of `text`, lowercased, in order. Numbers and punctuation are dropped. */
export function tokenize(text: string, lang = "en"): string[] {
  return tokenSpans(text, lang).map((t) => t.word);
}

function tokenSpans(text: string, lang: string): { word: string; start: number; end: number }[] {
  const seg = new Intl.Segmenter(lang, { granularity: "word" });
  const out: { word: string; start: number; end: number }[] = [];
  for (const s of seg.segment(text)) {
    if (!s.isWordLike || !/\p{L}/u.test(s.segment)) continue;
    out.push({
      word: s.segment.toLocaleLowerCase(lang).replace(/’/g, "'"),
      start: s.index,
      end: s.index + s.segment.length,
    });
  }
  return out;
}

/**
 * Groups inflections under one key, so "development" and "developments" are one
 * row. A light English suffix stripper, deliberately conservative: it only
 * merges plurals and possessives, which is where keyword tables split worst.
 */
// ponytail: plural/possessive stripping only. Swap for a real stemmer if verb forms need merging.
export function lemma(word: string, lang = "en"): string {
  if (lang !== "en") return word;
  let w = word.replace(/'s$/, "");
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/(ss|us|is)$/.test(w)) return w;
  if (/(ches|shes|sses|xes|zes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s")) w = w.slice(0, -1);
  return w;
}

/** English syllable estimate. Good to roughly one syllable per long word, which is what the formulas assume. */
export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, w.match(/[aeiouy]{1,2}/g)?.length ?? 1);
}

/** Counts items by key and keeps the most common surface form per key. */
function group(items: { key: string; surface: string }[], total: number, weight = 1): Phrase[] {
  const groups = new Map<string, { count: number; forms: Map<string, number> }>();
  for (const { key, surface } of items) {
    const g = groups.get(key) ?? { count: 0, forms: new Map() };
    g.count++;
    g.forms.set(surface, (g.forms.get(surface) ?? 0) + 1);
    groups.set(key, g);
  }
  return [...groups]
    .map(([key, g]) => ({
      key,
      // Most written form wins; on a tie the shorter one, which is usually the base form.
      phrase: [...g.forms].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0],
      count: g.count,
      percent: total ? round((g.count * weight * 100) / total) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase));
}

export function round(n: number, places = 1): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function analyze(page: PageContext): TextAnalysis {
  const lang = baseLang(page);
  const { text, source } = mainText(page);
  const stop = stopWordsFor(lang);

  const seg = new Intl.Segmenter(lang, { granularity: "sentence" });
  const sentences: string[][] = [];
  for (const block of text.split("\n")) {
    for (const s of seg.segment(block)) {
      const t = tokenize(s.segment, lang);
      if (t.length) sentences.push(t);
    }
  }
  const words = sentences.flat();
  const total = words.length;
  const isStop = (w: string) => stop?.has(w) ?? false;

  const ngrams = { 1: [], 2: [], 3: [] } as Record<1 | 2 | 3, Phrase[]>;
  for (const n of [1, 2, 3] as const) {
    const items: { key: string; surface: string }[] = [];
    for (const s of sentences) {
      for (let i = 0; i + n <= s.length; i++) {
        const gram = s.slice(i, i + n);
        // A phrase that opens or closes on a stop word ("of the", "the best")
        // is not a keyword. Stop words inside one ("cost of living") are fine.
        if (isStop(gram[0]) || isStop(gram[n - 1])) continue;
        if (n === 1 && gram[0].length < 2) continue;
        items.push({ key: gram.map((w) => lemma(w, lang)).join(" "), surface: gram.join(" ") });
      }
    }
    // A phrase written once is not a pattern.
    ngrams[n] = group(items, total, n).filter((p) => p.count > 1);
  }

  const english = lang === "en";
  const syl = english ? words.reduce((sum, w) => sum + syllables(w), 0) : null;
  const complex = english ? words.filter((w) => syllables(w) >= 3).length : null;
  const stopHits = stop ? words.filter((w) => stop.has(w)) : [];

  return {
    lang,
    source,
    words,
    sentences,
    chars: text.replace(/\s/g, "").length,
    uniqueWords: new Set(words.map((w) => lemma(w, lang))).size,
    stopWords: stop ? stopHits.length : null,
    waterWords: stop ? stopHits.length + (english ? words.filter((w) => EN_FILLER.has(w)).length : 0) : null,
    syllables: syl,
    complexWords: complex,
    stopWordTable: group(stopHits.map((w) => ({ key: w, surface: w })), total),
    ngrams,
  };
}

export interface Readability {
  fleschEase: number;
  fleschLabel: "Easy" | "Medium" | "Difficult";
  fleschKincaidGrade: number;
  gunningFog: number;
}

function fleschLabel(ease: number): Readability["fleschLabel"] {
  if (ease >= 60) return "Easy";
  if (ease >= 30) return "Medium";
  return "Difficult";
}

/** The three classic formulas. Null for non-English text or a page with no sentences. */
export function readability(a: TextAnalysis): Readability | null {
  if (a.syllables === null || a.complexWords === null || !a.words.length || !a.sentences.length) return null;
  const wps = a.words.length / a.sentences.length;
  const spw = a.syllables / a.words.length;
  const ease = round(206.835 - 1.015 * wps - 84.6 * spw);
  return {
    fleschEase: ease,
    fleschLabel: fleschLabel(ease),
    fleschKincaidGrade: round(0.39 * wps + 11.8 * spw - 15.59),
    gunningFog: round(0.4 * (wps + (100 * a.complexWords) / a.words.length)),
  };
}

/**
 * Character spans in `text` where any of `keys` (lemma keys) occurs, so a
 * renderer can wrap them. Ends are exclusive.
 */
export function keywordSpans(text: string, keys: Iterable<string>, lang = "en"): [number, number][] {
  const want = new Set(keys);
  return tokenSpans(text, lang)
    .filter((t) => want.has(lemma(t.word, lang)))
    .map((t) => [t.start, t.end]);
}

/** The lemma keys present in a short string such as a title. */
export function keysIn(text: string, lang = "en"): Set<string> {
  return new Set(tokenize(text, lang).map((w) => lemma(w, lang)));
}
