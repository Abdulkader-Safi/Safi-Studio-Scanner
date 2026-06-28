import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPageContext } from "../src/context.js";
import { runPage } from "../src/runner.js";
import { allRules, selectRules } from "../src/rules/index.js";
import type { RawResponse, SiteContext, LinkStatus } from "../src/types.js";

const site: SiteContext = {
  origin: "https://example.com",
  startUrl: "https://example.com/",
  robots: {
    exists: true,
    status: 200,
    content: "User-agent: *\nSitemap: https://example.com/sitemap.xml",
    sitemaps: ["https://example.com/sitemap.xml"],
  },
  sitemap: { exists: true, status: 200, urls: ["https://example.com/"] },
};
const okCheck = async (): Promise<LinkStatus> => ({ ok: true, status: 200, redirected: false, chain: 0 });
const badCheck = async (): Promise<LinkStatus> => ({ ok: false, status: 404, redirected: false, chain: 0 });

function ctxFor(file: string, finalUrl: string, headers: Record<string, string> = {}) {
  const raw: RawResponse = {
    url: finalUrl,
    finalUrl,
    status: 200,
    ok: true,
    headers,
    html: readFileSync(new URL(`./fixtures/${file}`, import.meta.url), "utf8"),
    redirectChain: 0,
    responseTimeMs: 1,
  };
  return buildPageContext(raw, "https://example.com", 0);
}

test("registry has the expected rule count and unique ids", () => {
  assert.equal(allRules.length, 93);
  assert.equal(new Set(allRules.map((r) => r.id)).size, 93);
});

test("static run skips browser-only rules when no rendered data is attached", async () => {
  const report = await runPage(ctxFor("good.html", "https://example.com/good"), site, allRules, okCheck);
  assert.ok(!report.findings.some((f) => f.category === "accessibility"));
  // Browser-only performance rules (CWV) are skipped; static perf rules still run.
  assert.ok(!report.findings.some((f) => f.ruleId === "performance/lcp"));
});

test("well-formed HTML passes the core static categories", async () => {
  const core = selectRules(allRules, [
    "core-seo",
    "content",
    "images",
    "structured-data",
    "url-structure",
  ]);
  const report = await runPage(ctxFor("good.html", "https://example.com/good"), site, core, okCheck);
  assert.ok(report.score >= 90, `score was ${report.score}`);
  const fails = report.findings.filter((f) => f.status === "fail");
  assert.equal(fails.length, 0, `unexpected fails: ${fails.map((f) => f.ruleId).join(", ")}`);
});

test("bad fixture trips known rules", async () => {
  const report = await runPage(ctxFor("bad.html", "http://example.com/bad"), site, allRules, badCheck);
  const failed = new Set(report.findings.filter((f) => f.status === "fail").map((f) => f.ruleId));
  assert.ok(failed.has("core-seo/meta-description-present"));
  assert.ok(failed.has("core-seo/single-h1"));
  assert.ok(failed.has("core-seo/robots-meta-indexable"));
  assert.ok(failed.has("images/img-alt"));
  assert.ok(failed.has("images/img-empty-src"));
  assert.ok(failed.has("security/https"));
  assert.ok(failed.has("crawlability/page-indexable"));
  assert.ok(report.score < 60, `score was ${report.score}`);
});

test("selectRules filters by category", () => {
  assert.ok(selectRules(allRules, ["security"]).every((r) => r.category === "security"));
  assert.ok(selectRules(allRules, undefined, ["security"]).every((r) => r.category !== "security"));
});
