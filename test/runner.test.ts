import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreFindings, aggregate } from "../src/runner.js";
import type { Finding, PageReport, Status, Severity } from "../src/types.js";

const f = (status: Status, severity: Severity, category = "core-seo"): Finding => ({
  status,
  severity,
  category,
  message: "",
  ruleId: "x",
  title: "x",
});

test("scoreFindings: all error passes is 100, all error fails is 0", () => {
  assert.equal(scoreFindings([f("pass", "error"), f("pass", "error")]), 100);
  assert.equal(scoreFindings([f("fail", "error"), f("fail", "error")]), 0);
});

test("scoreFindings: warn counts as quarter credit", () => {
  assert.equal(scoreFindings([f("warn", "error")]), 25);
});

test("aggregate averages page scores and groups categories", () => {
  const pages: PageReport[] = [
    { url: "a", status: 200, score: 100, findings: [f("pass", "error", "core-seo")] },
    { url: "b", status: 200, score: 0, findings: [f("fail", "error", "security")] },
  ];
  const report = aggregate("a", "2026-06-26", pages);
  assert.equal(report.score, 50);
  assert.equal(report.pagesScanned, 2);
  assert.equal(report.categories.length, 2);
});
