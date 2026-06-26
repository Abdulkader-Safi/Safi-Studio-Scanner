# Safi Studio Scanner

A Node.js command-line tool, written in TypeScript, that audits a web page against a large set of quality rules and exports one report as HTML, Markdown, or JSON.

It is an open-source take on the closed-source [squirrelscan.com](https://squirrelscan.com), which checks a site across 245 rules in 22 categories. The audit logic lives in a library, so the same engine can later ship as an SDK or power a web service without a rewrite.

## What it checks

The first version ships about 45 static rules across seven categories:

- **Core SEO** — title, meta description, canonical, single H1, charset, viewport, robots meta, Open Graph
- **Content** — heading hierarchy, word count, empty headings, keyword stuffing, language attribute
- **Links** — broken internal and external links, redirect chains, weak anchor text, missing rel attributes
- **Images** — missing alt text, missing dimensions, oversized files, non-modern formats, lazy loading
- **Structured data** — JSON-LD presence, valid parse, recognized types, breadcrumb validity
- **Security** — HTTPS, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, mixed content, leaked secrets
- **Crawlability** — robots.txt, sitemap, noindex conflicts, canonical sanity

See [`features.md`](./features.md) for the full rule list and the roadmap toward all 245 rules.

## Install

```bash
npm install
npm run build
```

Node 18 or newer is required.

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
| `--timeout <ms>` | Per-request timeout | `15000` |
| `--user-agent <string>` | Override the request user agent | scanner default |

Examples:

```bash
scanner audit https://example.com --format html --out report.html
scanner audit https://example.com --format json
scanner audit https://example.com --only core-seo,security --format md
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

1. **Fetch** the page HTML, headers, status, and timing, plus `robots.txt` and `sitemap.xml`.
2. **Build a context** object that every rule reads from, including a parsed DOM.
3. **Run the rules** and collect findings.
4. **Score** the findings by severity.
5. **Render** the report in the requested format.

Each rule is a small module exporting one object with an `id`, `category`, `severity`, and a `run(context)` function. A registry collects them into one array, so adding a rule means dropping a file and adding one import.

## Project status

Early development. See [`PRD.md`](./PRD.md) for the product spec and [`features.md`](./features.md) for the backlog.

## License

To be decided.
