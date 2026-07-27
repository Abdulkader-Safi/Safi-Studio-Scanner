# Safi Studio Scanner

A Node.js website audit package, written in TypeScript. Point it at a URL from your own code, and it crawls the site, audits each page against a large set of quality rules, and returns a report you can render as HTML, Markdown, or JSON.

It runs 94 checks across 15 categories. The audit engine is a library: import it, call `audit()`, and get back a scored report.

## Install

```bash
npm install safi-studio-scanner
```

Node 18 or newer is required. The core install has one dependency (cheerio), so it stays small. Accessibility and Core Web Vitals are optional and come two ways:

- **Local browser** (`browser: true`): install Playwright and Chromium.

  ```bash
  npm i playwright @axe-core/playwright
  npx playwright install chromium
  ```

- **No browser** (`psiKey`): use Google PageSpeed Insights. No install, just an API key from the Google Cloud console. It runs Lighthouse on Google's side and returns Core Web Vitals and accessibility over HTTPS. It is rate-limited, so it only runs on the first `psiMaxPages` pages.

`playwright` and `@axe-core/playwright` are optional and lazy-loaded, so a project that never sets `browser: true` never pays for Chromium.

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

Exported functions: `audit`, `auditToHtml`, `auditToMarkdown`, `auditScore`, and `render` (for turning a report into any format). `allRules`, `allCollectors`, `selectRules`, and the collector helpers `value` and `table` are exported too, and every type (`AuditReport`, `Finding`, `Rule`, `Metric`, ...). The package is ESM.

### Options

| Option        | Description                                                                   | Default          |
| ------------- | ---------------------------------------------------------------------------- | ---------------- |
| `only`        | Array of categories to include                                                | all              |
| `skip`        | Array of categories to skip                                                   | none             |
| `maxPages`    | Max pages to crawl                                                            | `20`             |
| `concurrency` | Pages fetched at once                                                         | `5`              |
| `maxDepth`    | Max crawl depth                                                               | `3`              |
| `browser`     | Render pages in headless Chromium to run accessibility and performance rules  | `false`          |
| `psiKey`      | Use Google PageSpeed Insights for CWV and accessibility (no local browser)    | off              |
| `psiMaxPages` | How many pages to send to PageSpeed Insights                                  | `5`              |
| `timeout`     | Per-request timeout in ms                                                     | `15000`          |
| `userAgent`   | Override the request user agent                                               | default          |
| `rules`       | Replace the rule registry. Spread `allRules` in to keep the built-in set      | `allRules`       |
| `collectors`  | Replace the measurement registry, same way                                    | `allCollectors`  |

## What it checks

It ships 94 rules across 15 categories. The static categories run by default:

- **Core SEO**: title, meta description, single H1, H1 length, canonical, charset, viewport, robots meta, Open Graph
- **Content**: heading hierarchy, word count, empty headings, keyword stuffing, text-to-HTML ratio, language
- **Links**: broken internal and external links, redirect chains, weak anchor text, missing rel attributes
- **Images**: missing alt, missing dimensions, non-modern formats, lazy loading, filename quality, empty src
- **Structured data**: JSON-LD presence and validity, recognized types, Organization/WebSite, breadcrumb, duplicates
- **Security**: HTTPS, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, cookies, header disclosure, mixed content
- **Crawlability**: robots.txt, sitemap, noindex conflicts, canonical sanity, X-Robots-Tag
- **URL structure**: lowercase, hyphens not underscores, length, depth, parameters, readable slugs (per Google guidance)
- **Social media**: Twitter Card, absolute og:image, og:url vs canonical, profile links
- **Internationalization**: hreflang presence and validity
- **Legal**: privacy policy, terms, cookie consent, contact
- **Analytics**: analytics tag present, Google consent mode
- **E-E-A-T**: author attribution, dates, outbound citations, about page
- **Performance**: render-blocking scripts, stylesheet count, inline script size, HTML weight

With `browser: true`, it also renders each page in headless Chromium and adds:

- **Accessibility**: full axe-core WCAG audit, one row per check
- **Performance**: Core Web Vitals (LCP, CLS, TTFB), DOM size, page weight, request count

See [`features.md`](./features.md) for the full rule list and the roadmap.

## Output

Every run produces a health score out of 100, overall and per category, plus two channels per page.

**Findings** are verdicts. Each has a status (pass, fail, warn, info), a severity, a message, and the offending markup or header as evidence. They move the score.

**Measurements** are numbers. Title length, HTML size, the heading outline, the full Open Graph table, every URL linked more than once with each anchor used for it. Each carries its own `ok | warn | bad | missing` status and never touches the score, so a report can be detailed without diluting what a failing rule means.

```ts
const report = await audit("https://example.com");
report.pages[0].findings; // verdicts
report.pages[0].metrics; // values and tables
```

- **JSON** for pipelines and CI
- **Markdown** for pasting into issues and docs
- **HTML** as one self-contained file, styled in the Scanner brand, with no external requests

## How it works

A short pipeline, one focused module per stage:

1. **Crawl** up to `maxPages` same-origin pages from the start URL, `concurrency` at a time, plus `robots.txt` and `sitemap.xml` once.
2. **Build a context** object per page that every rule reads from, including a parsed DOM.
3. **Run the rules and collectors** against each page, collecting findings and measurements.
4. **Score** the findings by severity, per page and overall.
5. **Render** the report in the requested format.

Each rule is a small module exporting one object with an `id`, `category`, `severity`, and a `run(context)` function. A collector is the same shape with a `collect(context)` that returns measurements instead. Both are collected into a registry, so adding either means dropping a file and adding one import.

## Project status

Early development. See [`PRD.md`](./PRD.md) for the product spec and [`features.md`](./features.md) for the backlog.

## License

[MIT](./LICENSE). Copyright Abdulkader Safi ([safi-studio.com](https://safi-studio.com)).
