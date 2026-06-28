import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createPool } from "../src/http.js";
import { crawl } from "../src/crawl.js";
import type { AuditOptions } from "../src/types.js";

const OPTS: AuditOptions = {
  format: "json",
  timeout: 5000,
  userAgent: "test",
  maxPages: 10,
  concurrency: 5,
  maxDepth: 2,
  psiMaxPages: 5,
  browser: false,
};

function pageHtml(body: string) {
  return `<!doctype html><html><body>${body}</body></html>`;
}

test("crawl follows same-origin links and respects maxPages", async () => {
  const server = createServer((req, res) => {
    res.setHeader("content-type", "text/html");
    if (req.url === "/")
      return res.end(
        pageHtml(
          '<a href="/a">a</a><a href="/b">b</a><a href="https://external.invalid/x">ext</a>',
        ),
      );
    if (req.url === "/a") return res.end(pageHtml('<a href="/c">c</a>'));
    return res.end(pageHtml("leaf"));
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  const pages = await crawl(`${base}/`, { ...OPTS, maxPages: 3 }, createPool(5));
  server.close();

  assert.equal(pages.length, 3);
  assert.equal(pages[0].url, `${base}/`);
  assert.ok(!pages.some((p) => p.url.includes("external.invalid")));
});
