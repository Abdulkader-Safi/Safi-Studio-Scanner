---
title: Getting started
description: Install the package, run your first audit, and write a report to disk.
---

# Getting started

## Install

```bash
npm install safi-studio-scanner
```

Node 18 or newer. The package is ESM only, so your project needs `"type": "module"` in `package.json`, or you import it dynamically from CommonJS.

The core install pulls in one dependency, cheerio. Nothing else.

## Your first audit

```ts
import { audit } from "safi-studio-scanner";

const report = await audit("https://example.com");

console.log(report.score);        // overall 0-100
console.log(report.pagesScanned); // how many pages were crawled
console.log(report.categories);   // score, pass, fail, warn per category
```

By default it crawls up to 20 pages, 5 at a time, 3 levels deep from the start URL, and runs every static rule. Nothing is written to disk unless you write it.

## Write a report to disk

The one-line helpers render the report for you.

```ts
import { writeFile } from "node:fs/promises";
import { auditToHtml, auditToMarkdown } from "safi-studio-scanner";

await writeFile("report.html", await auditToHtml("https://example.com"));
await writeFile("report.md", await auditToMarkdown("https://example.com"));
```

The HTML is one self-contained file: inline styles, no external assets, no build step. Open it in a browser or email it.

## Just the number

```ts
import { auditScore } from "safi-studio-scanner";

const score = await auditScore("https://example.com");
if (score < 80) process.exit(1);
```

## Audit a single page

Set `maxPages` to 1 and the crawl stops at the URL you gave it.

```ts
const report = await audit("https://example.com/pricing", { maxPages: 1 });
```

## Pick your categories

```ts
// Only these two.
await audit("https://example.com", { only: ["core-seo", "security"] });

// Everything except the two that make extra network requests.
await audit("https://example.com", { skip: ["links", "images"] });
```

Category names are the first half of a rule id. The full list is in the [rule catalog](/guide/using/rules).

## Add the rendered checks

Accessibility and Core Web Vitals need a rendered page. Either install a local browser:

```bash
npm install playwright @axe-core/playwright
npx playwright install chromium
```

```ts
const report = await audit("https://example.com", { browser: true });
```

Or use Google PageSpeed Insights and install nothing:

```ts
const report = await audit("https://example.com", {
  psiKey: process.env.PSI_KEY,
  psiMaxPages: 5,
});
```

Both paths are covered in [rendered checks](/guide/using/rendered-checks).

## Read the findings

```ts
const report = await audit("https://example.com");

for (const page of report.pages) {
  const problems = page.findings.filter((f) => f.status === "fail");
  console.log(`${page.url}: ${page.score}/100, ${problems.length} failures`);

  for (const f of problems) {
    console.log(`  [${f.severity}] ${f.title}: ${f.message}`);
    if (f.fix) console.log(`    fix: ${f.fix}`);
  }
}
```

## Next

- [Configuration](/guide/start/configuration): every option and its default.
- [Reports and scoring](/guide/using/reports): how the score is calculated and what the report object holds.
