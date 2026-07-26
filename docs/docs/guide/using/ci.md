---
title: Running in CI
description: Gate a deploy on the score, publish the report as an artifact, and keep the run fast.
---

# Running in CI

There is no built-in threshold flag yet, but the report object gives you everything to write the gate yourself in a few lines.

## A minimal gate

```ts
// scripts/audit.ts
import { writeFile } from "node:fs/promises";
import { audit, render } from "safi-studio-scanner";

const url = process.env.AUDIT_URL ?? "https://example.com";
const floor = Number(process.env.AUDIT_FLOOR ?? 80);

const report = await audit(url, { maxPages: 25, concurrency: 5 });

await writeFile("audit.html", render(report, "html"));
await writeFile("audit.json", render(report, "json"));

const failures = report.pages.flatMap((p) =>
  p.findings.filter((f) => f.status === "fail" && f.severity === "error"),
);

console.log(`${report.score}/100 across ${report.pagesScanned} pages`);
for (const c of report.categories) console.log(`  ${c.category}: ${c.score}`);

if (report.score < floor) {
  console.error(`Score ${report.score} is below the floor of ${floor}.`);
  process.exit(1);
}
if (failures.length > 0) {
  console.error(`${failures.length} error-severity failures.`);
  process.exit(1);
}
```

```bash
node --import tsx scripts/audit.ts
```

## GitHub Actions

```yaml
name: Audit
on:
  workflow_dispatch:
  schedule:
    - cron: "0 6 * * 1"

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: node --import tsx scripts/audit.ts
        env:
          AUDIT_URL: https://example.com
          AUDIT_FLOOR: "80"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: audit-report
          path: audit.html
```

`if: always()` matters. A failing gate is exactly when you want to read the report.

## Gate on a category instead of the headline

The overall score is harsh by design, so gating on it can be noisy while a site is being brought up to standard. Gate on the categories you have actually fixed:

```ts
const watched = ["security", "core-seo", "crawlability"];
const failing = report.categories.filter(
  (c) => watched.includes(c.category) && c.score < 90,
);

if (failing.length) {
  for (const c of failing) console.error(`${c.category}: ${c.score}/100`);
  process.exit(1);
}
```

## Keeping the run fast

- **Skip the network-heavy categories** on every commit and run them nightly: `{ skip: ["links", "images"] }`. The link rules fetch every unique outbound URL once, which dominates the wall clock on a link-dense site.
- **Cap the crawl.** `maxPages: 10` on a pull request, the full crawl on a schedule.
- **Choose the render path deliberately.** Local Chromium is faster per page but needs the install step. PageSpeed Insights needs no install but is rate limited, so keep `psiMaxPages` small.
- **Audit the preview deployment, not production.** Point `AUDIT_URL` at the preview URL and you catch problems before they ship.

## Tracking the score over time

`render(report, "json")` gives you the whole object. Commit it, push it to a database, or diff it against the previous run:

```ts
const previous = JSON.parse(await readFile("audit.json", "utf8"));
const delta = report.score - previous.score;
console.log(delta >= 0 ? `+${delta}` : `${delta}`);
```

A per-rule diff, so a run can report exactly which checks changed since the last one, is roadmap work rather than something the package does for you today.
