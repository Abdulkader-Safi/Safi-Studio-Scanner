---
title: Measurement catalog
description: Every value and table a report carries, with the metric ids and what each one means.
---

# Measurement catalog

Rules return verdicts. Collectors return numbers. This is the catalog of the numbers.

Every metric id is `category/name`, using the same categories as the rules, so `only` and `skip` filter both at once. Nothing here touches the score.

```ts
import { allCollectors, selectRules } from "safi-studio-scanner";

const report = await audit("https://example.com");
const titleLength = report.pages[0].metrics.find((m) => m.id === "core-seo/title-chars");
```

## Status values

| Status | Meaning |
| --- | --- |
| `ok` | Inside the recommended band. |
| `warn` | Outside it, but not broken. A 22-character title is still a title. |
| `bad` | Actively wrong. A 404, a `noindex` on a page meant to rank. |
| `missing` | Not present at all. Different from zero: no published date is not a published date of nothing. |

A metric with no status is a plain count with no correct answer, like the number of hidden elements.

## Core SEO

| Metric | Shape | Reports |
| --- | --- | --- |
| `core-seo/title-chars` | value | Title length in characters. `ok` between 30 and 60. |
| `core-seo/description-chars` | value | Meta description length. `ok` between 70 and 160. |
| `core-seo/h1-count` | value | How many H1 elements. `ok` at exactly one. |
| `core-seo/h1-chars` | value | Length of the first H1. `ok` between 10 and 70. |
| `core-seo/og-coverage` | value | How many of the seven Open Graph tags are set. |
| `core-seo/og-table` | table | Every tag: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, `og:locale`, with its content and state. |

A tag's state is `present`, `missing` or `not set`. The difference matters: `missing` means a card will not render properly without it, `not set` means the card works and would be sharper with it. Only `og:title`, `og:description` and `og:image` can be `missing`.

## Content

| Metric | Shape | Reports |
| --- | --- | --- |
| `content/declared-language` | value | The `lang` attribute on `<html>`, resolved. |
| `content/hidden-elements` | value | Elements hidden by an inline `display:none` or the `hidden` attribute. |
| `content/inline-styles` | value | Elements carrying a `style` attribute. |
| `content/body-style-blocks` | value | `<style>` blocks inside `<body>`, which restyle content already being painted. |
| `content/html-comments` | value | Comment nodes anywhere in the document. They ship to every visitor. |
| `content/placeholder-links` | value | Anchors with `href="#"`, an empty `href`, or `javascript:void`. |
| `content/heading-count` | value | Total headings. The note carries the per-level split. |
| `content/heading-levels` | table | H1 through H6 with a count each, for reading in code. |
| `content/heading-outline` | table | Every heading in document order: level, text indented by depth, and what its section contains. |

The outline is the page's table of contents as the parser sees it. A heading's section is everything between it and the next heading at any level, and the third column names what that section carries: `IMG: 1, UL: 1` says the section has a picture and a list. An empty heading is listed as `(empty)` rather than vanishing into a blank row. Capped at 40 rows.

Hidden elements are counted from inline styles only. There is no CSS cascade in a static parse, so a class that hides an element in a stylesheet is invisible here.

## Text and keywords

These read the page's main content: `<main>` or `<article>` when there is exactly one, otherwise `<body>` without its top-level header and footer. Navigation, sidebars, forms and scripts are dropped first, along with anything hidden by an inline style or the `hidden` attribute. Words are split with `Intl.Segmenter` in the page's declared language, so Japanese or Thai text splits correctly.

| Metric | Shape | Reports |
| --- | --- | --- |
| `content/main-words` | value | Words in the main content. The note says which element it was read from. |
| `content/unique-words` | value | Distinct words, with plurals merged. |
| `content/unique-words-percent` | value | The same as a share of all words. |
| `content/stop-words` | value | Words such as "the" and "of". |
| `content/stop-words-percent` | value | The same as a share. |
| `content/water-percent` | value | Stop words plus filler such as "really" and "basically". `ok` up to 60%. |
| `content/avg-sentence-length` | value | Words per sentence. `ok` up to 20. |
| `content/chars-no-spaces` | value | Characters of main content, whitespace excluded. |
| `content/flesch-reading-ease` | value | 0 to 100, higher is easier. The note is `Easy` (60 and up), `Medium`, or `Difficult` (under 30). |
| `content/flesch-kincaid-grade` | value | US school grade. `ok` up to 9. |
| `content/gunning-fog` | value | Years of schooling to read it first time. `ok` up to 12. |
| `content/top-words-1` | table | Single keywords with count and share. |
| `content/top-words-2` | table | Two-word phrases. |
| `content/top-words-3` | table | Three-word phrases. |
| `content/stop-word-table` | table | Each stop word with count and share. |
| `content/keyword-relevance` | table | The top 10 keywords, each marked `yes` or `no` for the title, description, and H1. |
| `content/keyword-highlights` | table | Every heading plus the title and description, with the top keywords each contains and their character spans. |

A phrase only makes the tables if it appears at least twice, and it may not open or close on a stop word, so "of the" never ranks but "cost of living" can. A phrase's share counts every word in it: a two-word phrase used 3 times in 100 words is 6%.

Plurals and possessives are merged, so "garden", "gardens", and "garden's" are one row shown under its most common form. Other inflections are not: "compost" and "composting" stay apart.

Spans are `start-end` character offsets into the full, untrimmed text, end exclusive, separated by spaces. `0-6 7-17` on "Garden composting guide" marks "Garden" and "composting".

The stop word counts (water share included) and the readability scores need English. On a page declaring another language they come back `null` with a note saying so, and every other metric still works.

## Crawlability

| Metric | Shape | Reports |
| --- | --- | --- |
| `crawlability/http-status` | value | The status the page returned. |
| `crawlability/response-time` | value | Milliseconds to the response. `ok` under 800. |
| `crawlability/robots-meta` | value | The robots meta content verbatim. `bad` when it contains `noindex`. |
| `crawlability/x-robots-tag` | value | The header form of the same directive. |
| `crawlability/canonical-url` | value | The canonical, resolved to an absolute URL. |
| `crawlability/canonical-match` | value | Whether that canonical is this page. Trailing slashes and host case are ignored. |
| `crawlability/robots-txt` | value | Directive count, plus how many sitemaps it declares. |
| `crawlability/sitemap-urls` | value | URLs found in the sitemap. |

A canonical that points elsewhere is `warn`, not `bad`. It is the correct thing to do on a paginated or filtered page, and only you know which this is.

## Links

| Metric | Shape | Reports |
| --- | --- | --- |
| `links/total` | value | Every anchor on the page. The note splits internal, external, and any href that would not resolve. |
| `links/internal-count` | value | Same-origin links. |
| `links/external-count` | value | Links off the origin. |
| `links/dofollow-count` | value | Links without `rel="nofollow"`. |
| `links/nofollow-count` | value | Links with it. |
| `links/duplicate-count` | value | URLs linked more than once from this page. |
| `links/dofollow-table` | table | URL, anchor, scope. |
| `links/nofollow-table` | table | Same shape. |
| `links/duplicate-table` | table | One row per URL, with every distinct anchor used for it, the count, and the scope. |

The duplicate table is the one to read. It is sorted by count, and it answers a question no per-link list can: this page links `/pricing` three times, once as "Pricing", once as "pricing page", once as "the plans". That is either a deliberate spread of anchor text or an accident, and seeing them on one row is what tells you which.

All three tables are omitted when the page has no links of that kind.

## Images

| Metric | Shape | Reports |
| --- | --- | --- |
| `images/count` | value | Images on the page. |
| `images/with-alt` | value | Images carrying real alt text. |
| `images/without-alt` | value | Images with no `alt` attribute at all. `bad` above zero. |
| `images/http-count` | value | Images loaded over plain HTTP, which break the padlock on an HTTPS page. |

`alt=""` and a missing `alt` are counted separately. An empty alt is a decision, saying the image is decorative and screen readers should skip it. A missing attribute is an omission. The note on `images/with-alt` splits the two.

## Social media

| Metric | Shape | Reports |
| --- | --- | --- |
| `social-media/twitter-coverage` | value | How many of the six Twitter tags are set. |
| `social-media/twitter-table` | table | `twitter:card`, `title`, `description`, `image`, `site`, `creator`. |

Only `twitter:card` counts as required. Twitter falls back to Open Graph for the title, description and image, so an empty table next to a full Open Graph one is a working card, not a broken one.

## Internationalization

| Metric | Shape | Reports |
| --- | --- | --- |
| `internationalization/hreflang-count` | value | How many alternates are declared. `warn` when none of them is a self-reference. |
| `internationalization/hreflang-table` | table | Each alternate: `hreflang`, resolved URL. Omitted when there are none. |

## Performance

| Metric | Shape | Reports |
| --- | --- | --- |
| `performance/html-size` | value | Raw document size in KB, before assets. `ok` under 100. |
| `performance/script-tags` | value | Script tags, split into external and inline in the note. |

## Reading them

```ts
// One value across the whole crawl.
for (const page of report.pages) {
  const size = page.metrics.find((m) => m.id === "performance/html-size");
  if (size?.status !== "ok") console.log(page.url, size?.value, size?.unit);
}

// Every table on the start page.
const tables = report.pages[0].metrics.filter((m) => m.kind === "table");
```

To add your own, see [writing a collector](/guide/using/custom-rules#writing-a-collector).
