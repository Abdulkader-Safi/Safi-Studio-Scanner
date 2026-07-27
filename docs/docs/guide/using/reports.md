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

A page entry carries two channels:

```ts
interface PageReport {
  url: string;
  status: number;     // HTTP status
  score: number;      // 0-100 for this page
  findings: Finding[];
  metrics: Metric[];
}
```

## Findings and measurements

A finding is a verdict: the check ran, and the page passed or it did not. A measurement is a number: the title is 82 characters, the page is 340KB, these 14 URLs are linked more than once.

They are separate because they answer different questions, and because forcing a number through a finding means inventing a rule to hang it on. A measurement carries its own verdict instead:

```ts
type ValueStatus = "ok" | "warn" | "bad" | "missing";
```

`ValueStatus` never touches the score. Nothing in `metrics` can move the number, so a report can carry as much detail as it likes without diluting what a failing rule means.

Measurements come in two shapes.

```ts
// A value.
{
  kind: "value",
  id: "core-seo/title-chars",
  category: "core-seo",
  label: "Title length",
  value: 82,
  unit: "chars",
  status: "warn",
  note: "Recommended 30 to 60",
}

// A table.
{
  kind: "table",
  id: "links/duplicate",
  category: "links",
  label: "Duplicate link targets",
  columns: ["URL", "Anchors", "Count"],
  rows: [["https://example.com/pricing", "Pricing, See pricing", 4]],
  total: 340,
}
```

Tables are capped at 25 rows so a report stays readable. `total` is the count before the cap, and every format prints "showing 25 of 340" rather than quietly truncating.

Reading them back:

```ts
const titles = report.pages.map((p) => ({
  url: p.url,
  chars: p.metrics.find((m) => m.id === "core-seo/title-chars"),
}));
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

**HTML** is one self-contained file. Inline styles, no external requests, no fonts to load. It is the format to hand to someone who will not read JSON. Findings are grouped by category and rule; measurements sit under their own section, one block per page.

**Markdown** is per-category headings with a findings table and the score summary, then a measurements section per page. Good for pasting into an issue or a pull request comment.

**JSON** is the report object, stringified, findings and measurements both. For pipelines, dashboards, and diffing one run against the next.

The 25-row cap is applied when the measurement is collected, not when it is rendered, so it holds in JSON too. It keeps a twenty-page crawl from turning into a report nobody can open.

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
