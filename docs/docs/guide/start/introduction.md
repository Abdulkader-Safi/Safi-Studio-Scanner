---
title: Introduction
description: What Safi Studio Scanner is, what it checks, and how the audit pipeline works.
---

# Introduction

Safi Studio Scanner is a website audit engine for Node.js, written in TypeScript. You give it a URL. It crawls the site, runs 93 checks against every page it finds, scores the results, and returns one report.

It ships as a library, not a command line tool. There is no binary to install globally and no config file to maintain. You import a function, call it, and get an object back.

```ts
import { audit } from "safi-studio-scanner";

const report = await audit("https://example.com");
console.log(report.score); // 78
```

## What it is for

- A scriptable audit you can run in CI and fail a build on.
- A report you can hand to a client, rendered as one self-contained HTML file.
- A JSON feed for a dashboard, a database, or your own reporting layer.
- A base to extend, because a rule is one small module and the registry is exported.

## Design decisions

**The core install has one dependency.** Cheerio parses the HTML. Nothing else is required. A project that never renders a page never installs Chromium.

**Rendered checks are optional and come two ways.** Accessibility and Core Web Vitals need a real browser. You can supply one locally with Playwright, or skip the install entirely and use the Google PageSpeed Insights API. Both feed the same rules.

**Scoring is deliberately harsh.** The overall score starts at 100 and deducts for every rule that fails or warns, weighted by severity and scaled by how much of the site it affects. A handful of real errors visibly drops the headline, the way a strict commercial auditor scores. A category average would hide them.

**Rules are data, not framework.** Each rule is an object with an `id`, a `category`, a `severity`, and a `run(context)` function. Adding one means writing a file and adding one import.

## The pipeline

Five stages, one focused module each.

1. **Crawl.** Up to `maxPages` same-origin pages from the start URL, `concurrency` at a time, no deeper than `maxDepth`. `robots.txt` and `sitemap.xml` are fetched once for the site and shared with every rule.
2. **Context.** Each page becomes a `PageContext`: final URL, status, headers, raw HTML, a parsed DOM, response time, redirect count, and every link and image already extracted.
3. **Render, optional.** With `browser: true` or a `psiKey`, each page also carries axe-core violations and real Core Web Vitals.
4. **Run.** Every selected rule runs against every page and returns findings. A rule that throws is caught and downgraded to a warning, so one bad rule cannot take down a run.
5. **Score and render.** Findings are weighted by severity into a score per page, per category, and overall, then rendered as JSON, Markdown, or HTML.

## What a finding looks like

Every check returns one or more findings. A finding is small and flat on purpose.

```ts
{
  ruleId: "core-seo/title-length",
  category: "core-seo",
  title: "Title length",
  status: "warn",              // pass | fail | warn | info
  severity: "warning",         // error | warning | info
  message: "Title is 78 characters, longer than the 60 that usually survive truncation.",
  evidence: "<title>...</title>",
  fix: "Trim the title to 60 characters or fewer, keeping the primary term first."
}
```

## Where to go next

- [Getting started](/guide/start/getting-started) to install and run your first audit.
- [Configuration](/guide/start/configuration) for every option.
- [Rule catalog](/guide/using/rules) for all 93 checks.
- [Roadmap](/roadmap/) for what is in progress and what comes next.
