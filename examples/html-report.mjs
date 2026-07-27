// Audit a URL, watch it work, and write the report to a file.
//
//   npm run example                                  # example.com, HTML
//   npm run example -- https://abdulkadersafi.com
//   npm run example -- https://abdulkadersafi.com 10 md
//
// The point of this file is the live progress. A crawl of twenty pages takes a
// while, and without a stream you are staring at a blank terminal wondering
// whether it hung. Every line below the "Auditing" header is a real event.
//
// Plain JavaScript, because that is what most projects using this package will
// write. Nothing here is TypeScript-only.

import { writeFileSync } from "node:fs";
import { auditStream, render } from "../dist/index.js";

// In your own project this is the import. Here it reads from ../dist so the
// example runs against the local build:
//
//   import { auditStream, render } from "safi-studio-scanner";

const [url = "https://example.com", pages = "1", format = "html"] = process.argv.slice(2);

const live = process.stdout.isTTY; // don't draw a progress bar into a pipe
const write = (s) => process.stdout.write(s);
const clear = () => live && write("\r[K");

console.log(`Auditing ${url}, up to ${pages} page(s)\n`);

// ---- The stream ----
//
// auditStream() starts the audit immediately and hands back something you can
// iterate. Every event has a `type`, so you switch on it and handle only what
// you care about. This loop is the whole integration.

const stream = auditStream(url, {
  maxPages: Number(pages),
  concurrency: 5,
  // Both of these are optional and off by default. Either one adds
  // accessibility and Core Web Vitals.
  // browser: true,                 // needs playwright + @axe-core/playwright
  // psiKey: process.env.PSI_KEY,   // or PageSpeed Insights, no local browser
});

let bar = "";

for await (const event of stream) {
  switch (event.type) {
    case "page_fetched":
      clear();
      console.log(`  fetched   ${String(event.index).padStart(3)}  ${event.url}  ${event.ms}ms`);
      write(bar);
      break;

    case "crawl_complete":
      clear();
      console.log(
        `\n  ${event.pages} page(s) crawled in ${event.ms}ms, ${event.checksTotal} checks to run\n`,
      );
      break;

    case "check_complete": {
      // The chatty one: 94 rules on every page. Redraw one line rather than
      // printing a row per check.
      if (!live) break;
      const pct = Math.round((event.checksDone / event.checksTotal) * 100);
      const filled = Math.round(pct / 4);
      bar = `  ${"█".repeat(filled)}${"░".repeat(25 - filled)} ${String(pct).padStart(3)}%  ${event.checksDone}/${event.checksTotal} checks`;
      write(`\r[K${bar}`);
      break;
    }

    case "page_complete":
      clear();
      console.log(
        `  scored    ${String(event.index).padStart(3)}/${event.pagesTotal}  ${event.url}  ${event.score}/100  ${event.findings} findings, ${event.metrics} measurements  ${event.ms}ms`,
      );
      write(bar);
      break;

    case "audit_complete":
      clear();
      console.log(
        `\n  ${event.score}/100 overall · ${event.pages} page(s) · ${event.checks} checks · ${event.ms}ms`,
      );
      break;
  }
}

// ---- The report ----
//
// finalReport() resolves with the same object the audit_complete event carried.
// Awaiting it after the loop costs nothing; the work is already done.

const report = await stream.finalReport();

const out = `report.${format === "md" ? "md" : format}`;
writeFileSync(out, render(report, format));

console.log("\nCategories");
for (const c of report.categories) {
  console.log(
    `  ${String(c.score).padStart(3)}  ${c.category.padEnd(20)} ${c.fail} fail, ${c.warn} warn`,
  );
}

// Findings are verdicts and they move the score.
const failing = report.pages.flatMap((p) => p.findings).filter((f) => f.status === "fail");
if (failing.length) {
  const byRule = new Map();
  for (const f of failing) byRule.set(f.ruleId, (byRule.get(f.ruleId) ?? 0) + 1);
  console.log("\nFailing rules, most widespread first");
  for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`  ${String(count).padStart(3)}x  ${rule}`);
  }
}

// Measurements are numbers and they never move the score.
const first = report.pages[0];
console.log(`\nMeasurements on ${first.url}`);
for (const m of first.metrics.filter((m) => m.kind === "value").slice(0, 10)) {
  const shown = m.value === null ? "—" : `${m.value}${m.unit ? ` ${m.unit}` : ""}`;
  console.log(`  ${(m.status ?? "").padEnd(8)} ${m.label.padEnd(26)} ${shown}`);
}

const tables = first.metrics.filter((m) => m.kind === "table");
if (tables.length) {
  console.log("\nTables");
  for (const t of tables) {
    const capped = t.rows.length < t.total ? ` (showing ${t.rows.length} of ${t.total})` : "";
    console.log(`  ${t.label}: ${t.total} row(s)${capped}`);
  }
}

console.log(`\nWrote ${out}`);
