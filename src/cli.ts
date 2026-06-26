#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { audit, DEFAULTS } from "./audit.js";
import { render } from "./report.js";
import type { Format } from "./types.js";

const USAGE = `Usage: scanner audit <url> [options]

Options:
  --format <json|md|html>   Output format (default: html)
  --out <path>              Write report to a file (default: stdout)
  --only <categories>       Comma-separated categories to include
  --skip <categories>       Comma-separated categories to skip
  --max-pages <n>           Max pages to crawl (default: 20)
  --concurrency <n>         Pages fetched at once (default: 5)
  --depth <n>               Max crawl depth (default: 3)
  --timeout <ms>            Per-request timeout (default: 15000)
  --user-agent <string>     Override the request user agent
  --help                    Show this help`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      format: { type: "string" },
      out: { type: "string" },
      only: { type: "string" },
      skip: { type: "string" },
      "max-pages": { type: "string" },
      concurrency: { type: "string" },
      depth: { type: "string" },
      timeout: { type: "string" },
      "user-agent": { type: "string" },
      help: { type: "boolean" },
    },
  });

  const [command, url] = positionals;
  if (values.help || command !== "audit" || !url) {
    console.log(USAGE);
    process.exit(values.help ? 0 : 1);
  }

  const list = (s?: string) =>
    s ? s.split(",").map((x) => x.trim()).filter(Boolean) : undefined;
  const format = (values.format as Format) || DEFAULTS.format;

  const report = await audit(url, {
    format,
    only: list(values.only),
    skip: list(values.skip),
    timeout: values.timeout ? Number(values.timeout) : DEFAULTS.timeout,
    userAgent: values["user-agent"] || DEFAULTS.userAgent,
    maxPages: values["max-pages"] ? Number(values["max-pages"]) : DEFAULTS.maxPages,
    concurrency: values.concurrency ? Number(values.concurrency) : DEFAULTS.concurrency,
    maxDepth: values.depth ? Number(values.depth) : DEFAULTS.maxDepth,
  });

  const output = render(report, format);
  if (values.out) {
    await writeFile(values.out, output);
    console.log(
      `Report written to ${values.out} (${report.pagesScanned} pages, score ${report.score}/100)`,
    );
  } else {
    console.log(output);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
