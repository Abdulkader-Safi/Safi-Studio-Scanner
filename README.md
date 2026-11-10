# Safi Studio Scanner

A website audit package for Node.js, written in TypeScript. Give it a URL and it crawls the site, checks each page against 94 rules in 15 categories, and returns a scored report you can render as HTML, Markdown or JSON.

It is a library. Import it, call `audit()`, get a report back.

## Install

```bash
npm install safi-studio-scanner
```

You need Node 18 or newer. The core install has one dependency, cheerio.

Accessibility and Core Web Vitals need a rendered page, and there are two ways to get one. With `browser: true` the scanner drives a local headless Chromium, which needs Playwright:

```bash
npm i playwright @axe-core/playwright
npx playwright install chromium
```

With `psiKey` it asks Google PageSpeed Insights instead. Nothing to install, only an API key from the Google Cloud console. Google runs Lighthouse and sends back Core Web Vitals and accessibility results. The API is rate-limited, so only the first `psiMaxPages` pages go to it.

Playwright is optional and loads lazily. A project that never sets `browser: true` never downloads Chromium.

## Usage

```ts
import { audit, auditToHtml, auditScore } from "safi-studio-scanner";

// Full report object: score, per-category scores, every finding.
const report = await audit("https://example.com", {
  maxPages: 20,
  concurrency: 5,
  // browser: true,               // local Chromium (needs the optional playwright packages)
  // psiKey: process.env.PSI_KEY, // or PageSpeed Insights, no local browser
});
console.log(report.score);

// One-line helpers.
const html = await auditToHtml("https://example.com"); // self-contained HTML string
const score = await auditScore("https://example.com"); // just the 0-100 number
```

### Watching it run

A twenty-page crawl takes about half a minute, and `audit()` is silent until it finishes. `auditStream()` runs the same audit and reports progress as it goes.

```ts
import { auditStream } from "safi-studio-scanner";

const stream = auditStream("https://example.com", { maxPages: 20 });

for await (const event of stream) {
  if (event.type === "page_complete") {
    console.log(`${event.index}/${event.pagesTotal}  ${event.url}  ${event.score}/100`);
  }
}

const report = await stream.finalReport();
```

```
1/20  https://example.com/           95/100
2/20  https://example.com/pricing    88/100
3/20  https://example.com/about      92/100
```

Every event has a `type`: `audit_start`, `page_fetched`, `crawl_complete`, `render_complete`, `check_complete`, `page_complete` or `audit_complete`. Switch on it in the loop, or subscribe with `.on("page_complete", handler)`. `check_complete` carries `checksDone` and `checksTotal` for a progress bar. The last event carries the report, and `finalReport()` returns the same object.

`npm run example` shows a working terminal progress bar. The [streaming guide](https://safi-studio-scanner.abdulkadersafi.com/guide/using/streaming) has the details.

### What it exports

- `audit`, `auditStream`, `auditToHtml`, `auditToMarkdown`, `auditScore`, and `render` for turning a report into any format.
- `allRules`, `allCollectors` and `selectRules`, plus `value` and `table` for writing collectors.
- The text module: `analyzeText`, `readability`, `tokenize`, `lemma` and `keywordSpans`. Custom rules can count words exactly as the built-in ones do.
- Every type: `AuditReport`, `Finding`, `Rule`, `Metric`, `TextAnalysis` and the rest.

The package is ESM only.

### Options

| Option        | Description                                                                  | Default         |
| ------------- | ---------------------------------------------------------------------------- | --------------- |
| `only`        | Array of categories to include                                               | all             |
| `skip`        | Array of categories to skip                                                  | none            |
| `maxPages`    | Max pages to crawl                                                           | `20`            |
| `concurrency` | Pages fetched at once                                                        | `5`             |
| `maxDepth`    | Max crawl depth                                                              | `3`             |
| `browser`     | Render pages in headless Chromium to run accessibility and performance rules | `false`         |
| `psiKey`      | Use Google PageSpeed Insights for CWV and accessibility (no local browser)   | off             |
| `psiMaxPages` | How many pages to send to PageSpeed Insights                                 | `5`             |
| `timeout`     | Per-request timeout in ms                                                    | `15000`         |
| `userAgent`   | Override the request user agent                                              | default         |
| `rules`       | Replace the rule registry. Spread `allRules` in to keep the built-in set     | `allRules`      |
| `collectors`  | Replace the measurement registry, same way                                   | `allCollectors` |

## What it checks

These categories run on the fetched HTML, with no browser:

| Category             | Checks                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Core SEO             | Title, meta description, single H1, H1 length, canonical, charset, viewport, robots meta, Open Graph     |
| Content              | Heading hierarchy, word count, empty headings, keyword stuffing, text-to-HTML ratio, language            |
| Links                | Broken internal and external links, redirect chains, weak anchor text, missing rel attributes            |
| Images               | Missing alt, missing dimensions, old formats, lazy loading, filename quality, empty src                   |
| Structured data      | JSON-LD presence and validity, recognised types, Organization and WebSite, breadcrumbs, duplicates        |
| Security             | HTTPS, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, cookies, mixed content        |
| Crawlability         | robots.txt, sitemap, noindex conflicts, canonical sanity, X-Robots-Tag                                   |
| URL structure        | Lowercase, hyphens over underscores, length, depth, parameters, readable slugs                           |
| Social media         | Twitter Card, absolute og:image, og:url against canonical, profile links                                 |
| Internationalization | hreflang presence and validity                                                                           |
| Legal                | Privacy policy, terms, cookie consent, contact                                                           |
| Analytics            | Analytics tag, Google consent mode                                                                       |
| E-E-A-T              | Author, dates, outbound citations, about page                                                            |
| Performance          | Render-blocking scripts, stylesheet count, inline script size, HTML weight                               |

With `browser: true` or `psiKey`, two more run on the rendered page. Accessibility is a full axe-core WCAG pass, one row per check. Performance adds Core Web Vitals (LCP, CLS, TTFB), DOM size, page weight and request count.

[`features.md`](./features.md) has the full rule list and the roadmap.

## Output

Every run scores the site out of 100, overall and per category. Each page then reports on two channels.

Findings are verdicts. Each one has a status (pass, fail, warn or info), a severity, a message, and the markup or header that caused it. Findings move the score.

Measurements are numbers and tables: title length, HTML size, the heading outline, the full Open Graph table, every URL linked more than once with each anchor used for it. Since 1.1.0 they also cover the text itself:

- unique words, stop word share and average sentence length
- Flesch reading ease, Flesch-Kincaid grade and Gunning Fog
- the top 1, 2 and 3-word phrases with counts and percentages
- whether each of the top 10 keywords appears in the title, description and H1

A measurement carries its own `ok`, `warn`, `bad` or `missing` status and never touches the score. A report can go into detail without changing what a failing rule means.

```ts
const report = await audit("https://example.com");
report.pages[0].findings; // verdicts
report.pages[0].metrics; // values and tables
```

JSON suits pipelines and CI. Markdown pastes into issues and docs. HTML comes out as one self-contained file with no external requests.

## How it works

1. Crawl up to `maxPages` same-origin pages from the start URL, `concurrency` at a time. Fetch `robots.txt` and `sitemap.xml` once.
2. Build a context object per page, including the parsed DOM, for every rule to read.
3. Run the rules and collectors against each page.
4. Score the findings by severity, per page and overall.
5. Render the report.

A rule is one file exporting an object with an `id`, `category`, `severity` and a `run(context)` function. A collector has the same shape with `collect(context)`, which returns measurements. Adding either means one new file and one import in the registry.

## Releases

Merging to `main` with a new `version` in `package.json` publishes that version to npm and creates a matching GitHub release. Merges that leave the version alone only run the tests.

## License

[MIT](./LICENSE). Copyright [Abdulkader Safi](https://abdulkadersafi.com).
