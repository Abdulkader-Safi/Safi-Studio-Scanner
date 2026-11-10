import type {
  AuditReport,
  Format,
  Metric,
  MetricTable,
  MetricValue,
  Status,
} from "./types.js";

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
  for (const p of r.pages) {
    if (p.metrics?.length) renderMetricsMarkdown(p.url, p.metrics, lines);
  }
  return lines.join("\n");
}

function renderMetricsMarkdown(url: string, metrics: Metric[], lines: string[]): void {
  lines.push(`## Measurements for ${url}`, "");
  for (const [cat, ms] of groupMetrics(metrics)) {
    lines.push(`### ${CAT_NAMES[cat] || cat}`, "");
    const values = ms.filter(isValue);
    if (values.length) {
      lines.push("| Metric | Value | Status | Note |", "| --- | --- | --- | --- |");
      for (const v of values)
        lines.push(
          `| ${escapePipe(v.label)} | ${escapePipe(formatValue(v))} | ${v.status ?? "-"} | ${escapePipe(v.note ?? "")} |`,
        );
      lines.push("");
    }
    for (const t of ms.filter(isTable)) {
      lines.push(`**${escapePipe(t.label)}**${rowCaption(t)}`, "");
      if (t.rows.length === 0) {
        lines.push("None found.", "");
        continue;
      }
      lines.push(
        `| ${t.columns.map(escapePipe).join(" | ")} |`,
        `| ${t.columns.map(() => "---").join(" | ")} |`,
      );
      for (const row of t.rows)
        lines.push(`| ${row.map((c) => escapePipe(String(c))).join(" | ")} |`);
      lines.push("");
    }
  }
}

function isValue(m: Metric): m is MetricValue {
  return m.kind === "value";
}
function isTable(m: Metric): m is MetricTable {
  return m.kind === "table";
}

function formatValue(m: MetricValue): string {
  if (m.value === null || m.value === "") return "—";
  return m.unit ? `${m.value} ${m.unit}` : String(m.value);
}

function rowCaption(t: MetricTable): string {
  return t.rows.length < t.total ? ` (showing ${t.rows.length} of ${t.total})` : "";
}

/** Metrics in category order, matching the category sections above them. */
function groupMetrics(metrics: Metric[]): [string, Metric[]][] {
  const byCat = new Map<string, Metric[]>();
  for (const m of metrics) {
    if (!byCat.has(m.category)) byCat.set(m.category, []);
    byCat.get(m.category)!.push(m);
  }
  return [
    ...CAT_ORDER.filter((c) => byCat.has(c)),
    ...[...byCat.keys()].filter((c) => !CAT_ORDER.includes(c)).sort(),
  ].map((c) => [c, byCat.get(c)!]);
}

function escapePipe(s: string): string {
  return s.replace(/\|/g, "\\|");
}

// ---- HTML report (grouped by category, then by rule, with expandable rows) ----

const CAT_NAMES: Record<string, string> = {
  "core-seo": "Core SEO",
  content: "Content",
  links: "Links",
  images: "Images",
  "structured-data": "Structured data",
  security: "Security",
  crawlability: "Crawlability",
  "url-structure": "URL structure",
  "social-media": "Social media",
  internationalization: "Internationalization",
  legal: "Legal",
  analytics: "Analytics",
  eeat: "E-E-A-T",
  accessibility: "Accessibility",
  performance: "Performance",
};
const CAT_ORDER = [
  "core-seo",
  "content",
  "links",
  "images",
  "structured-data",
  "security",
  "crawlability",
  "url-structure",
  "social-media",
  "internationalization",
  "legal",
  "analytics",
  "eeat",
  "accessibility",
  "performance",
];
const STATUS_RANK: Record<Status, number> = { fail: 0, warn: 1, info: 2, pass: 3 };

const AUTHOR_URL = "https://abdulkadersafi.com";
const FOOTER_LINKS = [
  { label: "GitHub", href: "https://github.com/Abdulkader-Safi/Safi-Studio-Scanner" },
  { label: "npm", href: "https://www.npmjs.com/package/safi-studio-scanner" },
];

/** Attribution, so a report that gets forwarded is traceable back to the tool. */
function tagged(href: string): string {
  const u = new URL(href);
  u.searchParams.set("utm_source", "safi-studio-scanner");
  u.searchParams.set("utm_medium", "audit-report");
  u.searchParams.set("utm_campaign", "report-footer");
  return u.toString();
}

interface PageIssue {
  status: Status;
  message: string;
  evidence?: string;
}
interface RuleGroup {
  ruleId: string;
  title: string;
  category: string;
  fix?: string;
  status: Status;
  affected: { url: string; issues: PageIssue[] }[];
}

function buildGroups(r: AuditReport): Map<string, RuleGroup[]> {
  const byRule = new Map<
    string,
    { title: string; category: string; fix?: string; pages: Map<string, PageIssue[]> }
  >();
  for (const p of r.pages) {
    for (const f of p.findings) {
      let g = byRule.get(f.ruleId);
      if (!g) {
        g = { title: f.title, category: f.category, fix: f.fix, pages: new Map() };
        byRule.set(f.ruleId, g);
      }
      if (!g.pages.has(p.url)) g.pages.set(p.url, []);
      g.pages.get(p.url)!.push({ status: f.status, message: f.message, evidence: f.evidence });
    }
  }

  const byCat = new Map<string, RuleGroup[]>();
  for (const [ruleId, g] of byRule) {
    let worst: Status = "pass";
    for (const issues of g.pages.values())
      for (const f of issues) if (STATUS_RANK[f.status] < STATUS_RANK[worst]) worst = f.status;
    const affected = [...g.pages.entries()]
      .map(([url, issues]) => ({ url, issues: issues.filter((i) => i.status !== "pass") }))
      .filter((x) => x.issues.length > 0);
    const group: RuleGroup = {
      ruleId,
      title: g.title,
      category: g.category,
      fix: g.fix,
      status: worst,
      affected,
    };
    if (!byCat.has(g.category)) byCat.set(g.category, []);
    byCat.get(g.category)!.push(group);
  }
  for (const groups of byCat.values())
    groups.sort(
      (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.title.localeCompare(b.title),
    );
  return byCat;
}

function renderHtml(r: AuditReport): string {
  const byCat = buildGroups(r);
  const catOrder = [
    ...CAT_ORDER.filter((c) => byCat.has(c)),
    ...[...byCat.keys()].filter((c) => !CAT_ORDER.includes(c)).sort(),
  ];
  const scoreByCat = new Map(r.categories.map((c) => [c.category, c.score]));

  const measured = r.pages.filter((p) => p.metrics?.length);
  const measurements = measured.length
    ? `<section class="measure">
  <div class="kicker">Measurements</div>
${measured.map((p) => renderPageMetrics(p.url, p.metrics, measured.length === 1)).join("\n")}
</section>`
    : "";

  const sections = catOrder
    .map((cat) => {
      const groups = byCat.get(cat)!;
      const rows = groups.map((g, i) => renderRow(g, i + 1, r.pagesScanned)).join("\n");
      return `<section class="cat">
  <div class="kicker">${esc(CAT_NAMES[cat] || cat)}</div>
  <div class="cat-score"><span class="num">${scoreByCat.get(cat) ?? 100}</span><span class="slash">/100</span></div>
  <div class="rows">
${rows}
  </div>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audit report for ${esc(r.startUrl)}</title><style>
/* The brand layer, lifted from the documentation theme so an exported report
   and the docs read as one system.

   Near-black canvas, one accent, flat surfaces. Yellow carries the score and
   every section label; nothing else competes with it. Depth comes from a
   surface step (#0b0e11 -> #1e2329), never from a shadow or a gradient.

   Two type roles, and they do not swap:
     nova -> headings, prose, labels, everything read as language
     plex -> numbers only. Scores, counts, ids. Always tabular.

   Dark only, because the system has no light mode. The page closes on a light
   band the way the product does. */
:root {
  --nova: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --plex: ui-monospace, 'SF Mono', SFMono-Regular, 'JetBrains Mono', 'Cascadia Mono', Menlo, monospace;

  --primary:#fcd535; --primary-active:#f0b90b; --on-primary:#181a20;
  --canvas:#0b0e11; --card:#1e2329; --elevated:#2b3139; --line:#2b3139;
  --ink:#ffffff; --body:#eaecef; --muted-strong:#929aa5; --muted:#707a8a;
  --up:#0ecb81; --down:#f6465d; --info:#3b82f6;

  --soft-light:#fafafa; --line-light:#eaecef; --ink-dark:#181a20;
  --body-light:#474d57; --muted-light:#5e6673;
}
* { box-sizing:border-box; }
html { background:var(--canvas); }
body {
  margin:0; background:var(--canvas); color:var(--body);
  font-family:var(--nova); font-size:14px; line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
/* One measure, centred at every width. */
.page { max-width:1040px; margin:0 auto; padding:56px clamp(20px,5vw,48px) 96px; }
.num { font-family:var(--plex); font-variant-numeric:tabular-nums; }

/* Section labels. Accent, sentence case, no tracked-out caps: the label is
   read as language, so it is set in the text face like everything else. */
.kicker { font-size:13px; font-weight:500; color:var(--primary); }

header { padding-top:12px; }
header h1 {
  font-family:var(--nova); font-size:clamp(36px,5.4vw,64px); font-weight:700;
  line-height:1.1; letter-spacing:-1px; color:var(--ink); margin:14px 0 12px;
}
header a.url { color:var(--primary); text-decoration:none; word-break:break-all; font-size:15px; }
header a.url:hover { color:var(--primary-active); }
.score {
  font-family:var(--plex); font-variant-numeric:tabular-nums; font-weight:700;
  font-size:clamp(48px,7vw,72px); line-height:1; letter-spacing:-1px;
  color:var(--primary); margin:28px 0 8px;
}
.score .slash { color:var(--muted); font-size:0.4em; letter-spacing:0; }
.meta { color:var(--muted); font-size:13px; }

/* ---- category sections ---- */
.cat { margin-top:64px; padding-top:56px; border-top:1px solid var(--line); }
.cat-score {
  font-family:var(--plex); font-variant-numeric:tabular-nums; font-weight:700;
  font-size:40px; line-height:1.1; letter-spacing:-0.3px; color:var(--primary); margin:8px 0 0;
}
.cat-score .slash { color:var(--muted); font-size:0.4em; }
/* Flat surface, colour-block separation. No border, no shadow. */
.rows { background:var(--card); border-radius:12px; padding:2px 24px; margin-top:24px; }
details.row { border-bottom:1px solid var(--line); }
details.row:last-child { border-bottom:none; }
details.row > summary {
  list-style:none; cursor:pointer; display:flex; align-items:center; gap:16px; padding:14px 0;
}
details.row > summary::-webkit-details-marker { display:none; }
.row .rn { font-family:var(--plex); font-variant-numeric:tabular-nums; font-size:13px; color:var(--muted); width:26px; flex:none; }
.row .dot { width:8px; height:8px; border-radius:50%; flex:none; background:var(--muted); }
.row.s-pass .dot { background:var(--up); }
.row.s-fail .dot { background:var(--down); }
.row.s-warn .dot { background:var(--primary); }
.row.s-info .dot { background:var(--info); }
.row .rt { font-size:14px; font-weight:500; color:var(--ink); flex:1; }
.row .rm { font-size:12px; color:var(--muted); flex:none; }
.row.s-fail .rm { color:var(--down); }
.row.s-warn .rm { color:var(--primary); }
.row .chev { color:var(--muted); flex:none; transition:transform .15s ease; }
details.row[open] .chev { transform:rotate(90deg); }
.rb { padding:2px 0 22px 42px; }
.rb .lbl { font-size:12px; font-weight:500; color:var(--muted); display:block; margin-bottom:6px; }
.rb .fix { background:var(--elevated); border-radius:8px; padding:12px 16px; margin:18px 0; }
.rb .pages { margin:18px 0 0; padding:0; list-style:none; }
.rb .pages li { padding:10px 0; border-top:1px solid var(--line); }
.rb .pages a { color:var(--body); text-decoration:none; word-break:break-all; }
.rb .pages a:hover { color:var(--primary); }
.rb .pages .msg { display:block; color:var(--muted-strong); margin-top:2px; }
.rb .pages code { font-family:var(--plex); font-size:12px; color:var(--muted); word-break:break-all; }
.rb .ok { color:var(--muted-strong); margin:0; }

/* ---- measurements ---- */
.measure { margin-top:64px; padding-top:56px; border-top:1px solid var(--line); }
details.mpage { background:var(--card); border-radius:12px; padding:2px 24px; margin-top:24px; }
details.mpage > summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:16px; padding:14px 0; }
details.mpage > summary::-webkit-details-marker { display:none; }
details.mpage > summary .u { flex:1; word-break:break-all; color:var(--ink); font-weight:500; }
details.mpage[open] .chev { transform:rotate(90deg); }
details.mpage[open] > summary { border-bottom:1px solid var(--line); }
.mbody { padding:8px 0 24px; }
.msub { font-size:13px; font-weight:500; color:var(--primary); margin:26px 0 10px; }
.mcap { font-size:13px; color:var(--muted-strong); margin:20px 0 8px; }
/* The frame lives on the wrapper, not the table: a collapsed table cannot clip
   its own corners, so a radius set there is dead CSS and the corners stay square. */
.mwrap { overflow-x:auto; border:1px solid var(--line); border-radius:8px; }
/* A floor, so a narrow screen scrolls the table sideways instead of crushing
   "og:description" into three letters a line. */
table.m { width:100%; min-width:520px; border-collapse:collapse; }
table.m th {
  font-size:12px; font-weight:500; color:var(--muted); text-align:left;
  padding:12px 16px; background:var(--elevated); border-bottom:1px solid var(--line); white-space:nowrap;
}
table.m td { font-size:14px; color:var(--body); padding:12px 16px; border-bottom:1px solid var(--line); vertical-align:top; word-break:break-word; }
table.m tr:last-child td { border-bottom:none; }
table.m td.val { font-family:var(--plex); font-variant-numeric:tabular-nums; white-space:nowrap; color:var(--ink); }
table.m td.note { color:var(--muted); font-size:13px; }
/* Value tables share one grid across every category, so the columns read down
   the page instead of re-sizing themselves per section. */
table.mv { table-layout:fixed; min-width:560px; }
table.mv th:first-child, table.mv td:first-child { width:34%; }
table.mv th:nth-child(2), table.mv td.val { width:22%; }
.mdot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:10px; vertical-align:1px; background:var(--muted); }
.mdot.v-ok { background:var(--up); }
.mdot.v-warn { background:var(--primary); }
.mdot.v-bad { background:var(--down); }
.mdot.v-missing { background:var(--muted); }

/* ---- the closing band ---- */
footer { background:var(--soft-light); padding:64px clamp(20px,5vw,48px); }
.finner { max-width:1040px; margin:0 auto; text-align:center; }
footer .colophon { font-size:15px; font-weight:600; color:var(--ink-dark); margin:0 0 6px; }
footer .flead { font-size:13px; color:var(--muted-light); margin:0 0 26px; }
footer .flinks { display:flex; flex-wrap:wrap; justify-content:center; gap:12px 32px; }
footer a { font-size:13px; font-weight:500; color:var(--body-light); text-decoration:none; }
footer a:hover { color:var(--ink-dark); }
footer .colophon a { font-size:inherit; font-weight:inherit; color:inherit; text-decoration:underline; text-underline-offset:3px; }
</style>
</head>
<body>
<div class="page">
<div class="kicker">Website audit</div>
<header>
  <h1>Audit report</h1>
  <a class="url" href="${esc(r.startUrl)}">${esc(r.startUrl)}</a>
  <div class="score"><span>${r.score}</span><span class="slash">/100</span></div>
  <div class="meta">${r.pagesScanned} page(s) scanned &middot; ${esc(r.generatedAt)}</div>
</header>
${sections}
${measurements}
</div>
<footer>
  <div class="finner">
    <p class="colophon">MIT licensed. Built by <a href="${esc(tagged(AUTHOR_URL))}" rel="noopener">Abdulkader Safi</a>.</p>
    <p class="flead">Safi Studio Scanner, the website audit engine for Node.js.</p>
    <nav class="flinks">
${FOOTER_LINKS.map((l) => `      <a href="${esc(tagged(l.href))}" rel="noopener">${esc(l.label)}</a>`).join("\n")}
    </nav>
  </div>
</footer>
</body>
</html>`;
}

function renderRow(g: RuleGroup, n: number, totalPages: number): string {
  const num = String(n).padStart(2, "0");
  const cls = `s-${g.status}`;
  let meta: string;
  let body: string;

  if (g.status === "pass" || g.affected.length === 0) {
    meta = `all ${totalPages} page(s) pass`;
    body = `<div class="rb"><p class="ok">No issues found. All ${totalPages} scanned page(s) pass this check.</p></div>`;
  } else {
    meta = `${g.affected.length} of ${totalPages} page(s)`;
    const issueMessages = [
      ...new Set(g.affected.flatMap((p) => p.issues.map((i) => i.message))),
    ];
    const pages = g.affected
      .map((p) => {
        const msgs = p.issues
          .map(
            (i) =>
              `<span class="msg">${esc(i.message)}${i.evidence ? ` <code>${esc(i.evidence)}</code>` : ""}</span>`,
          )
          .join("");
        return `<li><a href="${esc(p.url)}">${esc(p.url)}</a>${msgs}</li>`;
      })
      .join("\n");
    body = `<div class="rb">
  <span class="lbl">The issue</span>
  <div>${issueMessages.map(esc).join("<br>")}</div>
  ${g.fix ? `<div class="fix"><span class="lbl">How to fix</span>${esc(g.fix)}</div>` : ""}
  <span class="lbl">Pages affected</span>
  <ul class="pages">
${pages}
  </ul>
</div>`;
  }

  return `    <details class="row ${cls}">
  <summary>
    <span class="rn">${num}</span>
    <span class="dot"></span>
    <span class="rt">${esc(g.title)}</span>
    <span class="rm">${meta}</span>
    <span class="chev">&rsaquo;</span>
  </summary>
  ${body}
    </details>`;
}

function renderPageMetrics(url: string, metrics: Metric[], open: boolean): string {
  const groups = groupMetrics(metrics)
    .map(([cat, ms]) => {
      const values = ms.filter(isValue);
      const valueTable = values.length
        ? `<div class="mwrap"><table class="m mv">
  <tr><th>Metric</th><th>Value</th><th>Note</th></tr>
${values.map(renderValueRow).join("\n")}
</table></div>`
        : "";
      const tables = ms.filter(isTable).map(renderMetricTable).join("\n");
      return `<div class="msub">${esc(CAT_NAMES[cat] || cat)}</div>
${valueTable}
${tables}`;
    })
    .join("\n");

  return `  <details class="mpage"${open ? " open" : ""}>
    <summary>
      <span class="mdot"></span>
      <span class="u">${esc(url)}</span>
      <span class="chev">&rsaquo;</span>
    </summary>
    <div class="mbody">
${groups}
    </div>
  </details>`;
}

function renderValueRow(m: MetricValue): string {
  const dot = m.status ? `mdot v-${m.status}` : "mdot";
  return `  <tr><td>${esc(m.label)}</td><td class="val"><span class="${dot}"></span>${esc(formatValue(m))}</td><td class="note">${esc(m.note ?? "")}</td></tr>`;
}

function renderMetricTable(t: MetricTable): string {
  const caption = `${esc(t.label)}${rowCaption(t)}`;
  if (t.rows.length === 0)
    return `<div class="mcap">${caption}</div><p class="ok">None found.</p>`;
  return `<div class="mcap">${caption}</div>
<div class="mwrap"><table class="m">
  <tr>${t.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>
${t.rows.map((row) => `  <tr>${row.map((c) => `<td>${esc(String(c))}</td>`).join("")}</tr>`).join("\n")}
</table></div>`;
}

function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}
