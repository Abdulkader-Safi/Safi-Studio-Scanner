import type { AuditReport, Format } from "./types.js";

export function render(report: AuditReport, format: Format): string {
  if (format === "json") return JSON.stringify(report, null, 2);
  if (format === "md") return renderMarkdown(report);
  return renderHtml(report);
}

function renderMarkdown(r: AuditReport): string {
  const lines: string[] = [];
  lines.push(`# Audit report for ${r.startUrl}`, "");
  lines.push(`Overall score: ${r.score}/100`, "");
  lines.push(`Pages scanned: ${r.pagesScanned}`, `Generated: ${r.generatedAt}`, "");
  lines.push(
    "## Category scores",
    "",
    "| Category | Score | Pass | Fail | Warn |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const c of r.categories)
    lines.push(`| ${c.category} | ${c.score} | ${c.pass} | ${c.fail} | ${c.warn} |`);
  lines.push("");
  for (const p of r.pages) {
    lines.push(`## ${p.url} (score ${p.score}/100)`, "");
    const notable = p.findings.filter((f) => f.status !== "pass");
    if (notable.length === 0) {
      lines.push("No issues found.", "");
      continue;
    }
    lines.push("| Status | Rule | Message |", "| --- | --- | --- |");
    for (const f of notable)
      lines.push(`| ${f.status} | ${f.ruleId} | ${escapePipe(f.message)} |`);
    lines.push("");
  }
  return lines.join("\n");
}

function escapePipe(s: string): string {
  return s.replace(/\|/g, "\\|");
}

const COLORS: Record<string, string> = {
  pass: "#1a7f37",
  fail: "#cf222e",
  warn: "#9a6700",
  info: "#57606a",
};

function renderHtml(r: AuditReport): string {
  const cats = r.categories
    .map(
      (c) =>
        `<tr><td>${c.category}</td><td>${c.score}</td><td>${c.pass}</td><td>${c.fail}</td><td>${c.warn}</td></tr>`,
    )
    .join("");
  const pages = r.pages
    .map((p) => {
      const rows = p.findings
        .map(
          (f) =>
            `<tr><td><span class="dot" style="background:${COLORS[f.status]}"></span>${f.status}</td><td>${esc(f.ruleId)}</td><td>${esc(f.message)}</td><td>${esc(f.evidence || "")}</td></tr>`,
        )
        .join("");
      return `<section><h2>${esc(p.url)} <small>score ${p.score}/100</small></h2>
<table><thead><tr><th>Status</th><th>Rule</th><th>Message</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audit report for ${esc(r.startUrl)}</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; margin: 0; padding: 2rem; color: #1f2328; background: #fff; }
  h1 { margin: 0 0 .25rem; } small { color: #57606a; font-weight: 400; }
  .score { font-size: 3rem; font-weight: 700; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0 2rem; }
  th, td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #d0d7de; vertical-align: top; }
  th { background: #f6f8fa; }
  .dot { display: inline-block; width: .6rem; height: .6rem; border-radius: 50%; margin-right: .4rem; }
  section { margin-top: 2rem; }
</style></head>
<body>
  <h1>Audit report</h1>
  <p><a href="${esc(r.startUrl)}">${esc(r.startUrl)}</a></p>
  <p class="score">${r.score}<small>/100</small></p>
  <p>${r.pagesScanned} page(s) scanned. Generated ${esc(r.generatedAt)}.</p>
  <h2>Category scores</h2>
  <table><thead><tr><th>Category</th><th>Score</th><th>Pass</th><th>Fail</th><th>Warn</th></tr></thead><tbody>${cats}</tbody></table>
  ${pages}
</body></html>`;
}

function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}
