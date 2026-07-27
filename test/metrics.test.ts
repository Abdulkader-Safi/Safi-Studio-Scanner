import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPageContext } from "../src/context.js";
import { runPage } from "../src/runner.js";
import { allCollectors } from "../src/metrics/index.js";
import { table } from "../src/metrics/kit.js";
import type {
  Collector,
  Metric,
  MetricTable,
  MetricValue,
  RawResponse,
  SiteContext,
  LinkStatus,
} from "../src/types.js";

const site: SiteContext = {
  origin: "https://example.com",
  startUrl: "https://example.com/",
  robots: { exists: true, status: 200, content: "User-agent: *", sitemaps: [] },
  sitemap: { exists: false, status: 404, urls: [] },
};
const okCheck = async (): Promise<LinkStatus> => ({
  ok: true,
  status: 200,
  redirected: false,
  chain: 0,
});

function ctxFor(file: string, finalUrl: string, headers: Record<string, string> = {}) {
  const raw: RawResponse = {
    url: finalUrl,
    finalUrl,
    status: 200,
    ok: true,
    headers,
    html: readFileSync(new URL(`./fixtures/${file}`, import.meta.url), "utf8"),
    redirectChain: 0,
    responseTimeMs: 12,
  };
  return buildPageContext(raw, "https://example.com", 0);
}

async function metricsFor(file: string, url = "https://example.com/x") {
  const report = await runPage(ctxFor(file, url), site, [], okCheck, allCollectors);
  return new Map(report.metrics.map((m) => [m.id, m]));
}

function val(m: Metric | undefined): MetricValue {
  assert.ok(m && m.kind === "value", `expected a value metric, got ${m?.kind}`);
  return m as MetricValue;
}

test("collector ids are unique and every metric is stamped with its category", async () => {
  assert.equal(new Set(allCollectors.map((c) => c.id)).size, allCollectors.length);
  const report = await runPage(
    ctxFor("good.html", "https://example.com/good"),
    site,
    [],
    okCheck,
    allCollectors,
  );
  assert.ok(report.metrics.length > 0);
  for (const m of report.metrics) {
    assert.ok(m.category, `${m.id} has no category`);
    assert.ok(m.kind === "value" || m.kind === "table");
  }
});

test("good fixture measures clean", async () => {
  const m = await metricsFor("good.html", "https://example.com/good");
  assert.equal(val(m.get("core-seo/title-chars")).value, 42);
  assert.equal(val(m.get("core-seo/title-chars")).status, "ok");
  assert.equal(val(m.get("core-seo/h1-count")).value, 1);
  assert.equal(val(m.get("core-seo/h1-count")).status, "ok");
  assert.equal(val(m.get("content/declared-language")).value, "en");
  assert.equal(val(m.get("crawlability/http-status")).value, 200);
  assert.equal(val(m.get("performance/html-size")).status, "ok");
});

test("bad fixture reports missing values rather than inventing findings", async () => {
  const m = await metricsFor("bad.html", "http://example.com/bad");
  assert.equal(val(m.get("core-seo/title-chars")).status, "warn", "'Hi' is two characters");
  assert.equal(val(m.get("core-seo/description-chars")).value, null);
  assert.equal(val(m.get("core-seo/description-chars")).status, "missing");
  assert.equal(val(m.get("core-seo/h1-count")).value, 2);
  assert.equal(val(m.get("content/declared-language")).status, "missing");
  assert.equal(val(m.get("eeat/published-date")).status, "missing");
});

test("dates come from meta tags or JSON-LD", async () => {
  const m = await metricsFor("dated.html");
  assert.equal(val(m.get("eeat/published-date")).value, "2026-01-15T09:00:00Z");
  assert.equal(val(m.get("eeat/published-date")).status, "ok");
  assert.equal(val(m.get("eeat/updated-date")).value, "2026-03-02", "read out of JSON-LD");
});

test("hidden elements are counted from inline styles and the hidden attribute", async () => {
  const m = await metricsFor("dated.html");
  assert.equal(val(m.get("content/hidden-elements")).value, 2);
});

test("markup hygiene counts what the document is made of", async () => {
  const m = await metricsFor("directives.html", "https://example.com/directives");
  assert.equal(val(m.get("content/inline-styles")).value, 2);
  assert.equal(val(m.get("content/body-style-blocks")).value, 1);
  assert.equal(val(m.get("content/html-comments")).value, 2, "head and body comments both count");
  assert.equal(val(m.get("content/placeholder-links")).value, 2, '"#" and "" are both placeholders');
  assert.equal(val(m.get("performance/script-tags")).value, 2);
  assert.equal(val(m.get("performance/script-tags")).note, "1 external, 1 inline");
});

test("directives report their resolved values, not just a verdict", async () => {
  const m = await metricsFor("directives.html", "https://example.com/directives");
  assert.equal(val(m.get("crawlability/robots-meta")).value, "index, follow, max-snippet:-1");
  assert.equal(val(m.get("crawlability/robots-meta")).status, "ok");
  assert.equal(val(m.get("crawlability/x-robots-tag")).status, "missing");
  assert.equal(
    val(m.get("crawlability/canonical-url")).value,
    "https://example.com/canonical-target",
  );
  assert.equal(val(m.get("crawlability/canonical-match")).value, "no");
  assert.equal(val(m.get("crawlability/canonical-match")).status, "warn");
});

test("a canonical pointing at this page matches through trailing slashes", async () => {
  const m = await metricsFor("good.html", "https://example.com/good/");
  assert.equal(val(m.get("crawlability/canonical-match")).value, "yes");
  assert.equal(val(m.get("crawlability/canonical-match")).status, "ok");
});

test("hreflang alternates come back as a table, and only when there are any", async () => {
  const withAlts = await metricsFor("directives.html", "https://example.com/directives");
  assert.equal(val(withAlts.get("internationalization/hreflang-count")).value, 3);
  assert.equal(
    val(withAlts.get("internationalization/hreflang-count")).status,
    "ok",
    "the en alternate resolves to this page, so it self-references",
  );
  const t = withAlts.get("internationalization/hreflang-table") as MetricTable;
  assert.equal(t.kind, "table");
  assert.deepEqual(t.rows[1], ["fr", "https://example.com/fr/directives"]);

  const without = await metricsFor("good.html", "https://example.com/good");
  assert.equal(without.has("internationalization/hreflang-table"), false);
});

test("link counters split the page by scope and by rel", async () => {
  const m = await metricsFor("links.html", "https://example.com/links");
  assert.equal(val(m.get("links/total")).value, 8);
  assert.equal(val(m.get("links/internal-count")).value, 5);
  assert.equal(val(m.get("links/external-count")).value, 3);
  assert.equal(val(m.get("links/dofollow-count")).value, 6);
  assert.equal(val(m.get("links/nofollow-count")).value, 2);
  assert.equal(val(m.get("links/total")).note, "5 internal, 3 external");
});

test("the duplicate table groups every anchor used for one URL", async () => {
  const m = await metricsFor("links.html", "https://example.com/links");
  assert.equal(val(m.get("links/duplicate-count")).value, 3);
  const t = m.get("links/duplicate-table") as MetricTable;
  // Most-linked first: /pricing three times under three different anchors.
  assert.deepEqual(t.rows[0], [
    "https://example.com/pricing",
    "Pricing · pricing page · the plans",
    3,
    "internal",
  ]);
  assert.deepEqual(t.rows[1], ["https://example.com/about", "About", 2, "internal"]);
});

test("nofollow links are split out of the dofollow table", async () => {
  const m = await metricsFor("links.html", "https://example.com/links");
  const no = m.get("links/nofollow-table") as MetricTable;
  assert.equal(no.rows.length, 2);
  assert.ok(no.rows.every((r) => String(r[0]).includes("partner.example.org")));
  const yes = m.get("links/dofollow-table") as MetricTable;
  assert.ok(!yes.rows.some((r) => String(r[0]).includes("partner.example.org")));
});

test("link tables are omitted when a page has no links of that kind", async () => {
  const m = await metricsFor("good.html", "https://example.com/good");
  assert.equal(m.has("links/nofollow-table"), false);
  assert.equal(m.has("links/duplicate-table"), false);
  assert.equal(val(m.get("links/duplicate-count")).status, "ok");
});

test("headings are counted per level", async () => {
  const m = await metricsFor("outline.html", "https://example.com/outline");
  assert.equal(val(m.get("content/heading-count")).value, 5);
  assert.equal(val(m.get("content/heading-count")).note, "H1 1 · H2 3 · H3 1 · H4 0 · H5 0 · H6 0");
  const levels = m.get("content/heading-levels") as MetricTable;
  assert.deepEqual(levels.rows, [
    ["H1", 1],
    ["H2", 3],
    ["H3", 1],
    ["H4", 0],
    ["H5", 0],
    ["H6", 0],
  ]);
});

test("the outline reads in document order, indented by level", async () => {
  const m = await metricsFor("outline.html", "https://example.com/outline");
  const t = m.get("content/heading-outline") as MetricTable;
  assert.equal(t.rows.length, 5);
  assert.deepEqual(t.rows[0], ["H1", "How the engine works", "—"]);
  assert.equal(t.rows[1][1], "— Fetching", "an H2 sits one step in");
  assert.equal(t.rows[2][1], "— — Timeouts", "an H3 sits two steps in");
  assert.equal(t.rows[3][1], "— Scoring");
});

test("each heading reports what its section carries", async () => {
  const m = await metricsFor("outline.html", "https://example.com/outline");
  const t = m.get("content/heading-outline") as MetricTable;
  const fetching = t.rows.find((r) => String(r[1]).includes("Fetching"))!;
  assert.equal(fetching[2], "IMG: 1, UL: 1");
  const scoring = t.rows.find((r) => String(r[1]).includes("Scoring"))!;
  assert.equal(scoring[2], "TABLE: 1");
  const timeouts = t.rows.find((r) => String(r[1]).includes("Timeouts"))!;
  assert.equal(timeouts[2], "—");
});

test("an empty heading is named rather than left blank", async () => {
  const m = await metricsFor("outline.html", "https://example.com/outline");
  const t = m.get("content/heading-outline") as MetricTable;
  assert.ok(t.rows.some((r) => String(r[1]).includes("(empty)")));
});

test("a table caps its rows but keeps the true total", () => {
  const rows = Array.from({ length: 40 }, (_, i) => [`row ${i}`]);
  const t = table("x/y", "Many", ["Col"], rows) as MetricTable;
  assert.equal(t.rows.length, 25);
  assert.equal(t.total, 40);
});

test("a throwing collector degrades to a missing value instead of sinking the page", async () => {
  const boom: Collector = {
    id: "content/boom",
    category: "content",
    collect() {
      throw new Error("nope");
    },
  };
  const report = await runPage(ctxFor("good.html", "https://example.com/good"), site, [], okCheck, [
    boom,
  ]);
  assert.equal(report.metrics.length, 1);
  assert.equal(val(report.metrics[0]).status, "missing");
  assert.match(val(report.metrics[0]).note ?? "", /nope/);
});
