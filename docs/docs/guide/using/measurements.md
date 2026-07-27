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
