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

test("aggregate groups categories and applies a harsh overall penalty", () => {
  const pages: PageReport[] = [
    { url: "a", status: 200, score: 100, findings: [f("pass", "error", "core-seo")] },
    { url: "b", status: 200, score: 0, findings: [f("fail", "error", "security")] },
  ];
  const report = aggregate("a", "2026-06-26", pages);
  // One error-severity rule fails on 1 of 2 pages: penalty = 22 * 0.5 = 11.
  assert.equal(report.score, 89);
  assert.equal(report.pagesScanned, 2);
  assert.equal(report.categories.length, 2);
});

test("overall drops sharply when an error fails on every page", () => {
  const pages: PageReport[] = Array.from({ length: 10 }, (_, i) => ({
    url: `p${i}`,
    status: 200,
    score: 0,
    findings: [f("fail", "error", "security")],
  }));
  // 22 * (10/10) = 22 penalty.
  assert.equal(aggregate("a", "t", pages).score, 78);
});
