# Safi Studio Scanner

A Node.js command-line tool, written in TypeScript, that crawls a site, audits each page against a large set of quality rules, and exports one report as HTML, Markdown, or JSON.

It is a private take on the closed-source [squirrelscan.com](https://squirrelscan.com), which checks a site across 245 rules in 22 categories. The audit logic lives in a library, so the same engine can later ship as an SDK or power a web service without a rewrite.

## What it checks

The first version ships 46 static rules across seven categories:

- **Core SEO** — title presence and length, meta description presence and length, single H1, canonical, charset, viewport, robots meta, Open Graph
- **Content** — heading hierarchy, word count, empty headings, keyword stuffing, text-to-HTML ratio, language attribute
- **Links** — broken internal and external links, redirect chains, weak anchor text, missing rel attributes
- **Images** — missing alt text, missing dimensions, non-modern formats, lazy loading, filename quality, empty src
- **Structured data** — JSON-LD presence, valid parse, recognized types, breadcrumb, duplicate types
- **Security** — HTTPS, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, mixed content
- **Crawlability** — robots.txt, sitemap, noindex conflicts, canonical sanity, X-Robots-Tag

With `--browser`, it also renders each page in headless Chromium and adds:

- **Accessibility** — full axe-core WCAG audit, one row per check
- **Performance** — Core Web Vitals (LCP, CLS, TTFB), DOM size, page weight, request count

See [`features.md`](./features.md) for the full rule list and the roadmap toward all 245 rules.

## Install

```bash
npm install
npm run build
```

Node 18 or newer is required. To use `--browser` mode, also download Chromium once:

```bash
npx playwright install chromium
```

## Usage

```bash
scanner audit <url> [options]
```

Options:

| Option | Description | Default |
| --- | --- | --- |
| `--format <json\|md\|html>` | Output format | `html` |
| `--out <path>` | Write the report to a file | stdout |
| `--only <categories>` | Comma-separated category filter | all |
| `--skip <categories>` | Categories to skip | none |
| `--max-pages <n>` | Max pages to crawl | `20` |
| `--concurrency <n>` | Pages fetched at once | `5` |
| `--depth <n>` | Max crawl depth | `3` |
| `--browser` | Render pages in headless Chromium to run accessibility and performance rules | off |
| `--timeout <ms>` | Per-request timeout | `15000` |
| `--user-agent <string>` | Override the request user agent | scanner default |

Examples:

```bash
scanner audit https://example.com --format html --out report.html
scanner audit https://example.com --max-pages 50 --concurrency 5 --format json
scanner audit https://example.com --max-pages 1 --only core-seo,security --format md
scanner audit https://example.com --browser --format html --out report.html
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
