# Safi Studio Scanner

A Node.js command-line tool, written in TypeScript, that crawls a site, audits each page against a large set of quality rules, and exports one report as HTML, Markdown, or JSON.

It is a private take on the closed-source [squirrelscan.com](https://squirrelscan.com), which checks a site across 245 rules in 22 categories. The audit logic lives in a library, so the same engine can later ship as an SDK or power a web service without a rewrite.

## What it checks

It ships 93 rules across 15 categories. The static categories run by default:

- **Core SEO** — title, meta description, single H1, canonical, charset, viewport, robots meta, Open Graph
- **Content** — heading hierarchy, word count, empty headings, keyword stuffing, text-to-HTML ratio, language
- **Links** — broken internal and external links, redirect chains, weak anchor text, missing rel attributes
- **Images** — missing alt, missing dimensions, non-modern formats, lazy loading, filename quality, empty src
- **Structured data** — JSON-LD presence and validity, recognized types, Organization/WebSite, breadcrumb, duplicates
- **Security** — HTTPS, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, cookies, header disclosure, mixed content
- **Crawlability** — robots.txt, sitemap, noindex conflicts, canonical sanity, X-Robots-Tag
- **URL structure** — lowercase, hyphens not underscores, length, depth, parameters, readable slugs (per Google guidance)
- **Social media** — Twitter Card, absolute og:image, og:url vs canonical, profile links
- **Internationalization** — hreflang presence and validity
- **Legal** — privacy policy, terms, cookie consent, contact
- **Analytics** — analytics tag present, Google consent mode
- **E-E-A-T** — author attribution, dates, outbound citations, about page
- **Performance** — render-blocking scripts, stylesheet count, inline script size, HTML weight

With `--browser`, it also renders each page in headless Chromium and adds:

- **Accessibility** — full axe-core WCAG audit, one row per check
- **Performance** — Core Web Vitals (LCP, CLS, TTFB), DOM size, page weight, request count

See [`features.md`](./features.md) for the full rule list and the roadmap toward all 245 rules.

## Install

```bash
npm install
npm run build
```

Node 18 or newer is required. The core install has one dependency (cheerio), so it stays small. The two ways to get accessibility and Core Web Vitals are both optional:

- **Local browser** (`--browser`): install Playwright and Chromium.

  ```bash
  npm i playwright @axe-core/playwright
  npx playwright install chromium
  ```

- **No browser** (`--psi-key`): use Google PageSpeed Insights. No install, just an API key from the Google Cloud console. It runs Lighthouse on Google's side and returns Core Web Vitals and accessibility over HTTPS. It is rate-limited, so it only runs on the first `--psi-max-pages` pages.

## Usage

```bash
scanner audit <url> [options]
```

Options:

| Option                      | Description                                                                  | Default         |
| --------------------------- | ---------------------------------------------------------------------------- | --------------- |
| `--format <json\|md\|html>` | Output format                                                                | `html`          |
| `--out <path>`              | Write the report to a file                                                   | stdout          |
| `--only <categories>`       | Comma-separated category filter                                              | all             |
| `--skip <categories>`       | Categories to skip                                                           | none            |
| `--max-pages <n>`           | Max pages to crawl                                                           | `20`            |
| `--concurrency <n>`         | Pages fetched at once                                                        | `5`             |
| `--depth <n>`               | Max crawl depth                                                              | `3`             |
| `--browser`                 | Render pages in headless Chromium to run accessibility and performance rules | off             |
| `--psi-key <key>`           | Use Google PageSpeed Insights for CWV and accessibility (no local browser)   | off             |
| `--psi-max-pages <n>`       | How many pages to send to PageSpeed Insights                                 | `5`             |
| `--timeout <ms>`            | Per-request timeout                                                          | `15000`         |
| `--user-agent <string>`     | Override the request user agent                                              | scanner default |

Examples:

```bash
scanner audit https://example.com --format html --out report.html
scanner audit https://example.com --max-pages 50 --concurrency 5 --format json
scanner audit https://example.com --max-pages 1 --only core-seo,security --format md
scanner audit https://example.com --browser --format html --out report.html
```

Full browser-mode audit exported to each format (run with the built CLI):

```bash
# HTML
node dist/cli.js audit https://abdulkadersafi.com --max-pages 50 --concurrency 10 --browser --format html --out report.html

# JSON
node dist/cli.js audit https://abdulkadersafi.com --max-pages 50 --concurrency 10 --browser --format json --out report.json

# Markdown
node dist/cli.js audit https://abdulkadersafi.com --max-pages 50 --concurrency 10 --browser --format md --out report.md
```

Pipe JSON straight into another tool by leaving off `--out`:

```bash
node dist/cli.js audit https://abdulkadersafi.com --browser --format json | jq '.score'
```

During development you can run it without building:

```bash
tsx src/cli.ts audit https://example.com --format md
```

## Output

Every run produces a health score out of 100, overall and per category, plus a list of findings. Each finding has a status (pass, fail, warn, info), a severity, a message, and the offending markup or header as evidence.

- **JSON** for pipelines and CI
- **Markdown** for pasting into issues and docs
- **HTML** as one self-contained file with inline styling and color-coded findings

## Use as a library (SDK)

The engine is published as an SDK, so you can run audits from your own code without the CLI.

### Install it in another project

It is proprietary, so it is not on the public npm registry. Install it one of these ways:

```bash
# from a packed tarball (run `npm pack` in this repo first)
npm install /path/to/safi-studio-scanner-0.1.0.tgz

# or straight from git (npm builds it on install)
npm install git+ssh://git@your-host/safi-studio-scanner.git

# core only, skip the optional browser packages
npm install /path/to/safi-studio-scanner-0.1.0.tgz --omit=optional
```

### Use the functions

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

Exported functions: `audit`, `auditToHtml`, `auditToMarkdown`, `auditScore`, and `render` (for turning a report into any format). `allRules` and `selectRules` are exported too, and every type (`AuditReport`, `Finding`, `Rule`, ...). The package is ESM. The core install pulls only cheerio; `playwright` and `@axe-core/playwright` are optional and lazy-loaded, so a project that never sets `browser: true` never pays for Chromium.

## How it works

A short pipeline, one focused module per stage:

1. **Crawl** up to `--max-pages` same-origin pages from the start URL, `--concurrency` at a time, plus `robots.txt` and `sitemap.xml` once.
2. **Build a context** object per page that every rule reads from, including a parsed DOM.
3. **Run the rules** against each page and collect findings.
4. **Score** the findings by severity, per page and overall.
5. **Render** the report in the requested format.

Each rule is a small module exporting one object with an `id`, `category`, `severity`, and a `run(context)` function. A registry collects them into one array, so adding a rule means dropping a file and adding one import.

## Project status

Early development. See [`PRD.md`](./PRD.md) for the product spec and [`features.md`](./features.md) for the backlog.

## License

Proprietary. All rights reserved by Abdulkader Safi ([safi-studio.com](https://safi-studio.com)). Not licensed for use, copying, or distribution without written permission.
