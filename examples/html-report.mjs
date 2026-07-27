// Audit a URL and write the report to a file.
//
//   npm run example                                  # example.com, HTML
//   npm run example -- https://abdulkadersafi.com
//   npm run example -- https://abdulkadersafi.com 10 md
//
// Plain JavaScript, because that is what most projects using this package will
// write. Nothing here is TypeScript-only.

import { writeFileSync } from "node:fs";
import { audit, render } from "../dist/index.js";

// In your own project this is the import. Here it reads from ../dist so the
// example runs against the local build:
//
//   import { audit, render } from "safi-studio-scanner";

const [url = "https://example.com", pages = "1", format = "html"] =
  process.argv.slice(2);

console.log(`Auditing ${url}, up to ${pages} page(s)...`);
const started = Date.now();

const report = await audit(url, {
  maxPages: Number(pages),
  concurrency: 5,
  // Both of these are optional and off by default. Either one adds
  // accessibility and Core Web Vitals.
  // browser: true,                 // needs playwright + @axe-core/playwright
  // psiKey: process.env.PSI_KEY,   // or PageSpeed Insights, no local browser
});

const out = `report.${format === "md" ? "md" : format}`;
writeFileSync(out, render(report, format));

// ---- What came back ----

console.log(
  `\n${report.score}/100 overall · ${report.pagesScanned} page(s) · ${Date.now() - started}ms`,
);

console.log("\nCategories");
for (const c of report.categories) {
  console.log(
    `  ${String(c.score).padStart(3)}  ${c.category.padEnd(20)} ${c.fail} fail, ${c.warn} warn`,
  );
}

// Findings are verdicts and they move the score.
const failing = report.pages
  .flatMap((p) => p.findings)
  .filter((f) => f.status === "fail");
if (failing.length) {
  const byRule = new Map();
  for (const f of failing)
    byRule.set(f.ruleId, (byRule.get(f.ruleId) ?? 0) + 1);
  console.log("\nFailing rules, most widespread first");
  for (const [rule, count] of [...byRule]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)) {
    console.log(`  ${String(count).padStart(3)}x  ${rule}`);
  }
}

// Measurements are numbers and they never move the score.
const first = report.pages[0];
console.log(`\nMeasurements on ${first.url}`);
for (const m of first.metrics.filter((m) => m.kind === "value").slice(0, 10)) {
  const shown =
    m.value === null ? "—" : `${m.value}${m.unit ? ` ${m.unit}` : ""}`;
  console.log(`  ${(m.status ?? "").padEnd(8)} ${m.label.padEnd(26)} ${shown}`);
}

const tables = first.metrics.filter((m) => m.kind === "table");
if (tables.length) {
  console.log("\nTables");
  for (const t of tables) {
    const capped =
      t.rows.length < t.total
        ? ` (showing ${t.rows.length} of ${t.total})`
        : "";
    console.log(`  ${t.label}: ${t.total} row(s)${capped}`);
  }
}

console.log(`\nWrote ${out}`);
