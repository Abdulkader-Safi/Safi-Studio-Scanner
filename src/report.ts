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

const FOOTER_LINKS = [
  { label: "abdulkadersafi.com", href: "https://abdulkadersafi.com" },
  { label: "safi-studio.com", href: "https://safi-studio.com" },
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
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audit report for ${esc(r.startUrl)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap');
:root {
  --bg:#0c0b0a; --surface:#16140f; --text:#f5f2ea; --muted:#8d887e;
  --line:rgba(245,242,234,0.12); --line-strong:rgba(245,242,234,0.22); --clay:#d97a4f;
  --pass:#7fa37a; --fail:#d0644e; --warn:#d97a4f; --info:#8d887e;
}
[data-theme="light"] {
  --bg:#f4f1ea; --surface:#fbf9f3; --text:#1a1611; --muted:#6b6358;
  --line:rgba(26,22,17,0.14); --line-strong:rgba(26,22,17,0.26); --clay:#c75c33;
  --pass:#4f7a4a; --fail:#b3472f; --warn:#c75c33; --info:#6b6358;
}
* { box-sizing:border-box; }
body {
  /* One measure, centred at every width. Without the auto margins the column
     hugs the left edge of a wide screen and the page reads as unplaced. */
  margin:0 auto; padding:56px clamp(20px,6vw,96px) 96px; background:var(--bg); color:var(--text);
  font-family:Inter,system-ui,sans-serif; line-height:1.5; max-width:980px;
}
h1,h2 { font-family:'Space Grotesk',system-ui,sans-serif; font-weight:700; letter-spacing:-0.02em; }
.mono { font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace; }
.kicker {
  font-family:'JetBrains Mono',ui-monospace,monospace; font-size:12px; font-weight:500;
  letter-spacing:0.3em; text-transform:uppercase; color:var(--clay);
}
.topbar { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; }
.toggle {
  font-family:'JetBrains Mono',ui-monospace,monospace; font-size:12px; letter-spacing:0.1em;
  text-transform:uppercase; color:var(--muted); background:transparent; cursor:pointer;
  border:1px solid var(--line-strong); border-radius:999px; padding:8px 16px;
}
.toggle:hover { color:var(--text); border-color:var(--clay); }
header h1 { font-size:clamp(40px,7vw,68px); line-height:0.95; margin:18px 0 14px; }
header a.url { color:var(--clay); text-decoration:none; word-break:break-all; }
header a.url:hover { text-decoration:underline; }
.score { font-family:'Space Grotesk',system-ui,sans-serif; font-weight:700; font-size:84px; line-height:1; margin:24px 0 6px; }
.score .slash { color:var(--muted); font-size:34px; }
.meta { color:var(--muted); font-family:'JetBrains Mono',ui-monospace,monospace; font-size:13px; }
.cat { margin-top:64px; }
.cat-score { font-family:'Space Grotesk',system-ui,sans-serif; font-weight:700; font-size:30px; margin:8px 0 18px; }
.cat-score .slash { color:var(--muted); font-size:16px; }
.rows { border-top:1px solid var(--line); }
details.row { border-bottom:1px solid var(--line); }
details.row > summary {
  list-style:none; cursor:pointer; display:flex; align-items:center; gap:16px;
  padding:16px 4px;
}
details.row > summary::-webkit-details-marker { display:none; }
.row .rn { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:13px; color:var(--muted); width:24px; flex:none; }
.row .dot { width:9px; height:9px; border-radius:50%; flex:none; }
.row.s-pass .dot { background:var(--pass); }
.row.s-fail .dot { background:var(--fail); }
.row.s-warn .dot { background:var(--warn); }
.row.s-info .dot { background:var(--info); }
.row .rt { font-family:'Space Grotesk',system-ui,sans-serif; font-weight:500; font-size:18px; flex:1; }
.row .rm { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:12px; color:var(--muted); flex:none; }
.row.s-fail .rm, .row.s-warn .rm { color:var(--clay); }
.row .chev { color:var(--muted); flex:none; transition:transform .15s ease; }
details.row[open] .chev { transform:rotate(90deg); }
.rb { padding:4px 4px 24px 40px; }
.rb .lbl { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); display:block; margin-bottom:6px; }
.rb .fix { border-left:2px solid var(--clay); padding:2px 0 2px 16px; margin:16px 0; }
.rb .pages { margin:16px 0 0; padding:0; list-style:none; }
.rb .pages li { padding:10px 0; border-top:1px solid var(--line); }
.rb .pages a { color:var(--text); text-decoration:none; word-break:break-all; }
.rb .pages a:hover { color:var(--clay); }
.rb .pages .msg { display:block; color:var(--muted); font-size:14px; margin-top:2px; }
.rb .pages code { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:12px; color:var(--muted); word-break:break-all; }
.rb .ok { color:var(--muted); }
.measure { margin-top:72px; }
details.mpage { border-bottom:1px solid var(--line); }
details.mpage:first-of-type { border-top:1px solid var(--line); }
details.mpage > summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:16px; padding:16px 4px; }
details.mpage > summary::-webkit-details-marker { display:none; }
details.mpage > summary .u { flex:1; word-break:break-all; }
details.mpage[open] .chev { transform:rotate(90deg); }
.mbody { padding:0 4px 28px; }
.msub { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px; font-weight:500; letter-spacing:0.2em; text-transform:uppercase; color:var(--clay); margin:28px 0 6px; }
.mcap { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:12px; color:var(--muted); margin:18px 0 6px; }
.mwrap { overflow-x:auto; }
table.m { width:100%; border-collapse:collapse; font-size:14px; }
table.m th { text-align:left; font-family:'JetBrains Mono',ui-monospace,monospace; font-size:11px; font-weight:500; letter-spacing:0.15em; text-transform:uppercase; color:var(--muted); padding:8px 16px 8px 0; border-bottom:1px solid var(--line); white-space:nowrap; }
table.m td { padding:10px 16px 10px 0; border-bottom:1px solid var(--line); vertical-align:top; word-break:break-word; }
table.m td:last-child, table.m th:last-child { padding-right:0; }
table.m td.val { font-family:'JetBrains Mono',ui-monospace,monospace; white-space:nowrap; }
table.m td.note { color:var(--muted); font-size:13px; }
/* Value tables share one grid across every category, so the columns read down
   the page instead of re-sizing themselves per section. */
table.mv { table-layout:fixed; min-width:520px; }
table.mv th:first-child, table.mv td:first-child { width:34%; }
table.mv th:nth-child(2), table.mv td.val { width:22%; }
.mdot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:9px; vertical-align:1px; background:var(--line-strong); }
.mdot.v-ok { background:var(--pass); }
.mdot.v-warn { background:var(--warn); }
.mdot.v-bad { background:var(--fail); }
.mdot.v-missing { background:var(--info); }
footer { margin-top:96px; padding-top:32px; border-top:1px solid var(--line); text-align:center; color:var(--muted); font-family:'JetBrains Mono',ui-monospace,monospace; font-size:12px; }
footer .colophon { margin:0 0 18px; }
footer .flinks { display:flex; flex-wrap:wrap; justify-content:center; gap:10px 28px; }
footer a { color:var(--muted); text-decoration:none; }
footer a:hover { color:var(--clay); }
</style>
</head>
<body>
<div class="topbar">
  <div class="kicker">Website audit</div>
  <button class="toggle" id="themeToggle" type="button">Light</button>
</div>
<header>
  <h1>Audit report</h1>
  <a class="url" href="${esc(r.startUrl)}">${esc(r.startUrl)}</a>
  <div class="score"><span>${r.score}</span><span class="slash">/100</span></div>
  <div class="meta">${r.pagesScanned} page(s) scanned &middot; ${esc(r.generatedAt)}</div>
</header>
${sections}
${measurements}
<footer>
  <p class="colophon">MIT licensed. Built by Abdulkader Safi.</p>
  <nav class="flinks">
${FOOTER_LINKS.map((l) => `    <a href="${esc(tagged(l.href))}" rel="noopener">${esc(l.label)}</a>`).join("\n")}
  </nav>
</footer>
<script>
(function () {
  var root = document.documentElement, btn = document.getElementById('themeToggle');
  var saved = null;
  try { saved = localStorage.getItem('scanner-theme'); } catch (e) {}
  if (saved) root.setAttribute('data-theme', saved);
  function sync() { btn.textContent = root.getAttribute('data-theme') === 'dark' ? 'Light' : 'Dark'; }
  sync();
  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('scanner-theme', next); } catch (e) {}
    sync();
  });
})();
</script>
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
