---
title: Configuration
description: Every audit option, its default, and when to change it.
---

# Configuration

Every call takes an optional second argument. Anything you leave out falls back to the exported `DEFAULTS`.

```ts
import { audit, DEFAULTS } from "safi-studio-scanner";

console.log(DEFAULTS);

const report = await audit("https://example.com", {
  maxPages: 50,
  concurrency: 8,
  browser: true,
});
```

## Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `maxPages` | `number` | `20` | Hard cap on pages crawled. The crawl stops at this count even if more are linked. |
| `concurrency` | `number` | `5` | Pages fetched at the same time. Also caps the link checker's request pool. |
| `maxDepth` | `number` | `3` | How many link hops from the start URL to follow. Depth 0 is the start page. |
| `only` | `string[]` | all | Categories to run. Everything else is skipped. |
| `skip` | `string[]` | none | Categories to leave out. Applied after `only`. |
| `timeout` | `number` | `15000` | Per-request timeout in milliseconds, for pages and link checks alike. |
| `userAgent` | `string` | `SafiStudioScanner/0.1 (+https://safi-studio.com)` | Sent on every request. Change it if a host blocks the default. |
| `browser` | `boolean` | `false` | Render each page in local Chromium to collect axe-core results and Core Web Vitals. |
| `psiKey` | `string` | unset | Use the PageSpeed Insights API instead of a local browser. Ignored when `browser` is `true`. |
| `psiMaxPages` | `number` | `5` | How many pages to send to PageSpeed Insights. The API is rate limited, so this stays low. |
| `format` | `"json" \| "md" \| "html"` | `"html"` | Only read by `render()` and the `auditTo*` helpers. `audit()` always returns the object. |

## Tuning the crawl

**One page.** `{ maxPages: 1 }`. The fastest useful run, and the right choice when you audit a specific URL rather than a site.

**A section.** Point the start URL at the section and keep `maxDepth` low. The crawler stays on the same origin, so a link to another domain is checked for reachability but never crawled.

**A whole small site.** Raise `maxPages` to the page count you expect and `maxDepth` to 5 or more. Watch `report.pagesScanned` to confirm the crawl reached everything.

**A large site.** Raise `concurrency` before you raise `maxPages`. Be careful: the link rules also fetch every unique outbound URL once, so a page with 200 links generates 200 requests regardless of the crawl settings.

:::warning Be polite
Concurrency applies to a single host. A high value on a small server is a load test nobody asked for. Start at 5 and raise it only against infrastructure you own or have permission to hit.
:::

## Choosing categories

Categories map to rule id prefixes:

`core-seo` · `content` · `links` · `images` · `structured-data` · `security` · `crawlability` · `url-structure` · `social-media` · `internationalization` · `legal` · `analytics` · `eeat` · `performance` · `accessibility`

```ts
// A fast pass with no extra network requests: skip the two that fetch other URLs.
await audit(url, { skip: ["links", "images"] });

// A security review only.
await audit(url, { only: ["security", "crawlability"] });
```

`only` runs first, then `skip` removes from what is left. Passing both is allowed but rarely what you want.

## Defaults, verbatim

```ts
export const DEFAULTS: AuditOptions = {
  format: "html",
  timeout: 15000,
  userAgent: "SafiStudioScanner/0.1 (+https://safi-studio.com)",
  maxPages: 20,
  concurrency: 5,
  maxDepth: 3,
  browser: false,
  psiMaxPages: 5,
};
```
