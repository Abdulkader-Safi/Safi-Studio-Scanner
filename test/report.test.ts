import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "../src/report.js";
import type { AuditReport } from "../src/types.js";

const report: AuditReport = {
  startUrl: "https://example.com/",
  generatedAt: "2026-06-26T00:00:00.000Z",
  pagesScanned: 1,
  score: 82,
  categories: [{ category: "security", score: 75, pass: 6, fail: 1, warn: 1 }],
  pages: [
    {
      url: "https://example.com/",
      status: 200,
      score: 82,
      findings: [
        {
          ruleId: "security/https",
          category: "security",
          title: "Served over HTTPS",
          severity: "error",
          status: "pass",
          message: "HTTPS",
        },
        {
          ruleId: "security/hsts",
          category: "security",
          title: "HSTS header",
          severity: "warning",
          status: "warn",
          message: "Missing Strict-Transport-Security",
          fix: "Add the Strict-Transport-Security header to enforce HTTPS.",
        },
      ],
      metrics: [
        {
          kind: "value",
          id: "core-seo/title-chars",
          category: "core-seo",
          label: "Title length",
          value: 49,
          unit: "chars",
          status: "ok",
          note: "Recommended 30 to 60",
        },
        {
          kind: "table",
          id: "links/duplicate",
          category: "links",
          label: "Duplicate link targets",
          columns: ["URL", "Anchors", "Count"],
          rows: [["https://example.com/a", "About, About us", 2]],
          total: 9,
        },
      ],
    },
  ],
};

test("json render is valid json with the score", () => {
  const out = JSON.parse(render(report, "json"));
  assert.equal(out.score, 82);
});

test("markdown render includes score and a category heading", () => {
  const out = render(report, "md");
  assert.match(out, /82\/100/);
  assert.match(out, /security/);
});

test("html render is a self-contained themed document", () => {
  const out = render(report, "html");
  assert.match(out, /<!doctype html>/i);
  assert.match(out, /82/);
  assert.ok(!out.includes("<link "), "html should not pull external stylesheet files");
  assert.ok(!out.includes("@import"), "html should not fetch webfonts either");
  assert.match(out, /#fcd535/, "the accent is the brand yellow, as in the docs theme");
  assert.match(out, /#0b0e11/, "on the brand canvas");
  assert.match(out, /<details class="row/, "issues should render as expandable rows");
  assert.match(out, /How to fix/, "failing rules should show remediation text");
});

test("metrics render in every format", () => {
  const json = JSON.parse(render(report, "json"));
  assert.equal(json.pages[0].metrics.length, 2);

  const md = render(report, "md");
  assert.match(md, /## Measurements for https:\/\/example\.com\//);
  assert.match(md, /\| Title length \| 49 chars \| ok \|/);
  assert.match(md, /showing 1 of 9/, "a capped table declares how much it dropped");

  const html = render(report, "html");
  assert.match(html, /Measurements/);
  assert.match(html, /Title length/);
  assert.match(html, /mdot v-ok/, "a value carries its status as a colour");
  assert.match(html, /showing 1 of 9/);
});

test("html centres its column and closes on a credited footer", () => {
  const out = render(report, "html");
  assert.match(out, /margin:0 auto/, "the measure sits centred at any viewport width");
  assert.match(out, /MIT licensed\. Built by <a href="https:\/\/abdulkadersafi\.com\/\?[^"]*" rel="noopener">Abdulkader Safi<\/a>\./);
  assert.ok(!out.includes("safi-studio.com"), "the studio site is no longer credited");
  for (const label of ["GitHub", "npm"])
    assert.ok(out.includes(`>${label}</a>`), `footer is missing the ${label} link`);
  assert.equal(
    (out.match(/utm_source=safi-studio-scanner/g) ?? []).length,
    3,
    "every footer link carries attribution",
  );
});
