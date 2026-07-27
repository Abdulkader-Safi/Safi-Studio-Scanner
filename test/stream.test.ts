import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { audit, auditStream } from "../src/index.js";
import type { AuditEvent, AuditEventType } from "../src/types.js";

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>A streaming smoke test page title</title>
<meta name="description" content="A description long enough to satisfy the meta description length rule for the streaming test run.">
</head><body><h1>Streaming test page</h1><p>Some words on the page.</p>
<a href="/other">Another page</a></body></html>`;

function serve() {
  const server = createServer((_req, res) => {
    res.setHeader("content-type", "text/html");
    res.end(PAGE);
  });
  return server;
}

async function withServer<T>(fn: (url: string) => Promise<T>): Promise<T> {
  const server = serve();
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  try {
    return await fn(`http://127.0.0.1:${port}/`);
  } finally {
    server.close();
  }
}

test("the stream yields typed events and ends with the report", async () => {
  await withServer(async (url) => {
    const stream = auditStream(url, { maxPages: 2 });
    const seen: AuditEventType[] = [];
    let last: AuditEvent | undefined;
    for await (const event of stream) {
      seen.push(event.type);
      last = event;
    }

    assert.equal(seen[0], "audit_start", "the run announces itself first");
    assert.equal(last?.type, "audit_complete", "and the report arrives last");
    assert.ok(seen.includes("page_fetched"));
    assert.ok(seen.includes("crawl_complete"));
    assert.ok(seen.includes("check_complete"));
    assert.ok(seen.includes("page_complete"));

    const report = await stream.finalReport();
    assert.equal(typeof report.score, "number");
    assert.ok(report.pages[0].metrics.length > 0);
  });
});

test("page_complete counts up to a known total", async () => {
  await withServer(async (url) => {
    const stream = auditStream(url, { maxPages: 2 });
    const pages: number[] = [];
    let total = 0;
    for await (const event of stream) {
      if (event.type === "page_complete") {
        pages.push(event.index);
        total = event.pagesTotal;
      }
    }
    assert.deepEqual(pages, [1, 2], "indexes are 1-based and sequential");
    assert.equal(total, 2);
  });
});

test("check_complete reports a running count against a fixed denominator", async () => {
  await withServer(async (url) => {
    const stream = auditStream(url, { maxPages: 1, only: ["core-seo"] });
    let declaredTotal = -1;
    const done: number[] = [];
    const totals = new Set<number>();
    for await (const event of stream) {
      if (event.type === "crawl_complete") declaredTotal = event.checksTotal;
      if (event.type === "check_complete") {
        done.push(event.checksDone);
        totals.add(event.checksTotal);
      }
    }
    assert.equal(totals.size, 1, "the denominator never moves mid-run");
    assert.equal([...totals][0], declaredTotal, "and matches what crawl_complete promised");
    assert.deepEqual(
      done,
      done.map((_, i) => i + 1),
      "the counter increments by one per check",
    );
    assert.equal(done.at(-1), declaredTotal, "and finishes on the total");
  });
});

test("browser-only rules are left out of the total when nothing was rendered", async () => {
  await withServer(async (url) => {
    const stream = auditStream(url, { maxPages: 1, only: ["performance"] });
    let total = 0;
    let counted = 0;
    for await (const event of stream) {
      if (event.type === "crawl_complete") total = event.checksTotal;
      if (event.type === "check_complete") counted++;
    }
    // 12 performance rules, 6 of which need a rendered page.
    assert.equal(total, 6);
    assert.equal(counted, 6, "a progress bar would reach 100%, not stall at half");
  });
});

test("on() subscribes to a single event type", async () => {
  await withServer(async (url) => {
    const urls: string[] = [];
    let completed = 0;
    const stream = auditStream(url, { maxPages: 2 })
      .on("page_complete", (e) => urls.push(e.url))
      .on("audit_complete", () => completed++);

    const report = await stream.finalReport();
    assert.equal(urls.length, 2);
    assert.equal(completed, 1);
    assert.equal(report.pagesScanned, 2);
  });
});

test("finalReport() alone runs the audit without iterating", async () => {
  await withServer(async (url) => {
    const report = await auditStream(url, { maxPages: 1 }).finalReport();
    assert.equal(report.pagesScanned, 1);
  });
});

test("the audit_complete event carries the same report finalReport() returns", async () => {
  await withServer(async (url) => {
    const stream = auditStream(url, { maxPages: 1 });
    let fromEvent = null;
    for await (const event of stream) {
      if (event.type === "audit_complete") fromEvent = event.report;
    }
    assert.equal(fromEvent, await stream.finalReport());
  });
});

test("onProgress works on plain audit() too", async () => {
  await withServer(async (url) => {
    const types: string[] = [];
    await audit(url, { maxPages: 1, onProgress: (e) => types.push(e.type) });
    assert.equal(types[0], "audit_start");
    assert.equal(types.at(-1), "audit_complete");
  });
});

test("a throwing progress handler cannot take the audit down", async () => {
  await withServer(async (url) => {
    const report = await audit(url, {
      maxPages: 1,
      onProgress: () => {
        throw new Error("listener blew up");
      },
    });
    assert.equal(report.pagesScanned, 1);
  });
});

test("a failed audit rejects the iterator rather than ending silently", async () => {
  const stream = auditStream("not-a-url");
  await assert.rejects(async () => {
    for await (const _ of stream) {
      /* should throw before yielding anything */
    }
  });
  await assert.rejects(() => stream.finalReport());
});
