# Safi Studio Scanner: PRD

## Overview

Scanner is a Node.js command-line tool, written in TypeScript, that audits a web page against a large set of quality rules and exports a single report as HTML, Markdown, or JSON. It is an open-source take on the closed-source squirrelscan.com, which checks a site across 245 rules in 22 categories.

The audit logic lives in a library. The CLI is a thin wrapper over it, so the same engine can later ship as an SDK or power a hosted service without a rewrite.

## Goals

- Run a full page audit from the terminal with one command.
- Export one report in the format the user asks for: HTML, Markdown, or JSON.
- Make rules pluggable so the catalog can grow from a starter set toward full squirrelscan parity, one category at a time.
- Keep the first version dependency-light and runnable with Node today.

## Non-goals (for the first version)

- No site-wide crawl. One URL per run.
- No headless browser yet. The interface leaves room for it, but no rule in the starter set needs Chromium.
- No hosted web UI or API server. That is a later wrapper around the same library.
- No multi-page sitemap walk, no historical tracking, no database.

## Target users

- Developers and SEO-minded builders who want a quick, scriptable page audit.
- Agencies and freelancers running checks across client sites from the terminal or CI.
- Anyone who wants squirrelscan-style coverage without a paid, closed tool.

## How it works

The tool runs a simple pipeline. Each stage is one focused module.

1. **Fetch.** Node's built-in `fetch()` pulls the page HTML, response headers, status code, and timing. The same stage grabs `robots.txt` and `sitemap.xml` for the host.
2. **Context.** A `PageContext` object is built from the response: URL, status, headers, raw HTML, a parsed DOM (via cheerio), response time, and the robots/sitemap data. Every rule reads from this one object.
3. **Run rules.** The runner executes each registered rule against the context and collects findings. Rules marked `requiresBrowser` are skipped unless a future `--browser` flag is set.
4. **Score.** Findings are weighted by severity to produce a 0-100 health score per category and overall.
5. **Report.** The report object is rendered to JSON, Markdown, or a single self-contained HTML file with inline CSS.

## CLI

```
scanner audit <url> [options]

Options:
  --format <json|md|html>   Output format. Default: html.
  --out <path>              Write report to a file. Default: stdout.
  --only <categories>       Comma-separated category filter (e.g. core-seo,security).
  --skip <categories>       Comma-separated categories to skip.
  --timeout <ms>            Per-request timeout. Default: 15000.
  --user-agent <string>     Override the request user agent.
```

Examples:

```
scanner audit https://example.com --format html --out report.html
scanner audit https://example.com --format json
scanner audit https://example.com --only core-seo,security --format md
```

Run now during development with `tsx src/cli.ts audit <url>`. The published binary points to the compiled `dist/cli.js`.

## Rule model

Every rule is a small module that exports one object:

```ts
interface Rule {
  id: string;            // "core-seo/title-present"
  category: string;      // "core-seo"
  title: string;         // human-readable name
  severity: "error" | "warning" | "info";
  requiresBrowser?: boolean;
  run(ctx: PageContext): Finding[];
}
```

A finding is the result of one rule against one page:

```ts
interface Finding {
  ruleId: string;
  category: string;
  status: "pass" | "fail" | "warn" | "info";
  severity: "error" | "warning" | "info";
  message: string;
  details?: string;
  evidence?: string;     // the offending markup, header, or value
}
```

A `registry.ts` collects all rules into one array. Adding a rule means dropping a file and adding one import. This is the path from the starter set to the full catalog.

## Scoring

Each rule carries a severity weight (error > warning > info). For each category, the score is the share of weighted points that passed. The overall score is the weighted average across categories. The report shows a score and a pass/fail/warn count per category, plus an overall health score out of 100.

## Output formats

- **JSON.** The full report object. For pipelines, CI, and further processing.
- **Markdown.** Headings per category, a findings table, the score summary. Good for pasting into issues or docs.
- **HTML.** One self-contained file: inline CSS, an overall score badge, per-category sections, color-coded findings. No external assets, no template engine.

## Tech stack

- TypeScript, ESM, Node 18 or newer.
- One runtime dependency: `cheerio` for HTML parsing.
- CLI arguments via Node's built-in `util.parseArgs`. No commander.
- HTTP via the global `fetch`. No undici, no axios.
- Tests with the built-in `node:test` runner and `assert`, against local HTML fixtures. No Jest.
- Dev runner: `tsx`. Build: `tsc` to `dist/`.

## Project structure

```
src/
  cli.ts              # parse args, run audit, write output
  index.ts            # library entry: audit(url, options)
  types.ts            # Rule, Finding, PageContext, AuditReport
  engine/
    fetch.ts          # fetch page, robots.txt, sitemap.xml
    context.ts        # build PageContext
    runner.ts         # run rules, collect findings
    score.ts          # scoring
  rules/
    registry.ts       # array of all rules
    core-seo/
    content/
    links/
    images/
    structured-data/
    security/
    crawlability/
  report/
    json.ts
    markdown.ts
    html.ts
test/
  fixtures/           # sample HTML pages
  rules.test.ts
```

## Success criteria

- `scanner audit <url>` returns a scored report for a real page in one run.
- All three output formats produce valid, readable output.
- The starter set of roughly 45 rules runs and reports correctly.
- A new rule can be added by creating one file and one import, with no other changes.
- Tests cover representative rules against fixtures and pass with `node --test`.

## Roadmap

1. **v0.1 (this build).** CLI, pipeline, starter rules (~45 static rules), three output formats, scoring, tests.
2. **v0.2.** SDK packaging and a stable library API.
3. **v0.3.** Headless browser rules (Core Web Vitals, color contrast, focus and ARIA checks, tap targets, render-blocking) behind `--browser`.
4. **v0.4.** Multi-page crawl driven by sitemap and internal links.
5. **Later.** Remaining squirrelscan categories toward full 245-rule parity: accessibility, performance, E-E-A-T, internationalization, agent experience, legal, local SEO, video, analytics, and the rest.
