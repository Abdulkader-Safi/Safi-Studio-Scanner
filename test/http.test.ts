import { test } from "node:test";
import assert from "node:assert/strict";
import { createPool, fetchPage } from "../src/http.js";
import type { AuditOptions } from "../src/types.js";

const OPTS: AuditOptions = {
  format: "json",
  timeout: 15000,
  userAgent: "test",
  maxPages: 5,
  concurrency: 5,
  maxDepth: 2,
};

test("pool never runs more than the limit at once", async () => {
  const run = createPool(2);
  let active = 0,
    peak = 0;
  const job = () =>
    run(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 10));
      active--;
    });
  await Promise.all(Array.from({ length: 8 }, job));
  assert.ok(peak <= 2, `peak was ${peak}`);
});

test("fetchPage returns html and never throws on a bad host", async () => {
  const res = await fetchPage("http://does-not-exist.invalid", OPTS);
  assert.equal(res.ok, false);
  assert.ok(res.error);
});
