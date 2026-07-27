import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { audit, auditToHtml, auditScore } from "../src/index.js";

function serve(html: string) {
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "text/html");
    res.end(html);
  });
  return server;
}

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>SDK smoke test page title here</title>
<meta name="description" content="A description long enough to satisfy the meta description length rule for the SDK smoke test run.">
</head><body><h1>Hello</h1><p>Some words on the page for the SDK test.</p></body></html>`;

test("audit() returns a structured report through the SDK", async () => {
  const server = serve(PAGE);
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  try {
    const report = await audit(`http://127.0.0.1:${port}/`, { maxPages: 1 });
    assert.equal(typeof report.score, "number");
    assert.equal(report.pagesScanned, 1);
    assert.ok(report.categories.length > 0);
    assert.ok(report.pages[0].findings.length > 0);
    assert.ok(report.pages[0].metrics.length > 0, "measurements ship with every page");
  } finally {
    server.close();
  }
});

test("audit() accepts custom rule and collector registries", async () => {
  const server = serve(PAGE);
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  try {
    const report = await audit(`http://127.0.0.1:${port}/`, {
      maxPages: 1,
      rules: [
        {
          id: "brand/favicon",
          category: "brand",
          title: "Favicon declared",
          severity: "warning",
          run: () => [{ status: "fail" as const, message: "No favicon link in the head." }],
        },
      ],
      collectors: [
        {
          id: "brand/counts",
          category: "brand",
          collect: ({ page }) => [
            { kind: "value" as const, id: "brand/links", label: "Links", value: page.links.length },
          ],
        },
      ],
    });
    assert.deepEqual(
      report.pages[0].findings.map((f) => f.ruleId),
      ["brand/favicon"],
    );
    assert.deepEqual(
      report.pages[0].metrics.map((m) => m.id),
      ["brand/links"],
    );
  } finally {
    server.close();
  }
});

test("auditToHtml() and auditScore() convenience helpers work", async () => {
  const server = serve(PAGE);
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}/`;
  try {
    const html = await auditToHtml(url, { maxPages: 1 });
    assert.match(html, /<!doctype html>/i);
    const score = await auditScore(url, { maxPages: 1 });
    assert.ok(score >= 0 && score <= 100);
  } finally {
    server.close();
  }
});
