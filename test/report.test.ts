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
  assert.match(out, /data-theme/, "html should support theme switching");
  assert.match(out, /<details class="row/, "issues should render as expandable rows");
  assert.match(out, /How to fix/, "failing rules should show remediation text");
});
