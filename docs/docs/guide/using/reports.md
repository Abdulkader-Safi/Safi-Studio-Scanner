---
title: Reports and scoring
description: The shape of the report object, the three output formats, and exactly how the score is calculated.
---

# Reports and scoring

## The report object

`audit()` always resolves to the same structure, whatever options you passed.

```ts
interface AuditReport {
  startUrl: string;
  generatedAt: string;      // ISO timestamp
  pagesScanned: number;
  score: number;            // overall 0-100
  categories: CategoryScore[];
  pages: PageReport[];
}
```

A category entry carries its own score and its finding counts:

```ts
interface CategoryScore {
  category: string;   // "core-seo"
  score: number;      // 0-100 for this category across every page
  pass: number;
  fail: number;
  warn: number;
}
```

A page entry carries its findings:

```ts
interface PageReport {
  url: string;
  status: number;     // HTTP status
  score: number;      // 0-100 for this page
  findings: Finding[];
}
```

## Rendering

```ts
import { audit, render } from "safi-studio-scanner";

const report = await audit("https://example.com");

const html = render(report, "html");
const md = render(report, "md");
const json = render(report, "json");
```

`render` is synchronous and takes a report you already have, so you can audit once and emit all three.

**HTML** is one self-contained file. Inline styles, no external requests, no fonts to load. It is the format to hand to someone who will not read JSON.

**Markdown** is per-category headings with a findings table and the score summary. Good for pasting into an issue or a pull request comment.

**JSON** is the report object, stringified. For pipelines, dashboards, and diffing one run against the next.

## How the score is calculated

Two different formulas run, and the difference is deliberate.

### Page and category scores

Findings are weighted by severity:

| Severity | Weight |
| --- | --- |
| `error` | 10 |
| `warning` | 4 |
| `info` | 1 |

A `pass` earns full weight. A `warn` earns a quarter of it. A `fail` earns nothing. Findings with status `info` are excluded from scoring entirely, since they report a value rather than a verdict.

```
score = round(earned / possible * 100)
```

A page with no scoreable findings scores 100.

### The overall score

The headline number does not average the categories, because an average buries a handful of real errors under a pile of passing checks. Instead it starts at 100 and deducts.

For each rule, the worst status it reached on each page is counted, then:

```
penalty += weight * (pages_failed / pages_total)
         + weight * 0.55 * (pages_warned / pages_total)

overall = max(0, round(100 - penalty))
```

with these weights:

| Severity | Weight |
| --- | --- |
| `error` | 22 |
| `warning` | 11 |
| `info` | 1 |

So one error rule failing on every page costs 22 points on its own. The same rule failing on a quarter of the site costs 5.5. This is why the overall score sits lower than the category scores, and why it moves when you fix something real.

## Reading findings

```ts
const failures = report.pages.flatMap((p) =>
  p.findings
    .filter((f) => f.status === "fail")
    .map((f) => ({ url: p.url, ...f })),
);

// Group by rule to see what is systemic rather than one-off.
const byRule = new Map<string, number>();
for (const f of failures) byRule.set(f.ruleId, (byRule.get(f.ruleId) ?? 0) + 1);

[...byRule.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([rule, count]) => console.log(`${count}x ${rule}`));
```

A rule that fails on every page is a template problem and one fix clears it. A rule that fails on three pages is content work. Sorting by count tells you which is which.

## Statuses

| Status | Meaning |
| --- | --- |
| `pass` | The check ran and the page satisfied it. |
| `fail` | The check ran and the page did not satisfy it. Costs full weight. |
| `warn` | Borderline, or a problem the rule cannot fully confirm. Costs three quarters of its weight. |
| `info` | Reported for context, never scored. Used where a value matters but there is no right answer. |
