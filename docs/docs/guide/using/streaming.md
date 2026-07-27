---
title: Streaming progress
description: Watch an audit as it runs. Typed events, an async iterator, and the finished report at the end.
---

# Streaming progress

A twenty-page crawl takes half a minute or more. `audit()` returns nothing until all of it is done, so from the outside a working audit and a hung one look identical.

`auditStream()` fixes that. Same audit, same report, but you can watch it happen.

```ts
import { auditStream } from "safi-studio-scanner";

const stream = auditStream("https://example.com", { maxPages: 20 });

for await (const event of stream) {
  if (event.type === "page_complete") {
    console.log(`${event.index}/${event.pagesTotal}  ${event.url}  ${event.score}/100`);
  }
}

const report = await stream.finalReport();
```

```
1/20  https://example.com/           95/100
2/20  https://example.com/pricing    88/100
3/20  https://example.com/about      92/100
...
```

The audit starts the moment you call `auditStream()`. Every event carries a `type`, so you switch on it and handle only the ones you want.

## The events

| Event | Fires | Carries |
| --- | --- | --- |
| `audit_start` | Once, immediately | `url`, `maxPages` |
| `page_fetched` | As each page is crawled | `url`, `status`, `depth`, `index`, `ms` |
| `crawl_complete` | Once the crawl finishes | `pages`, `checksTotal`, `ms` |
| `render_complete` | Only with `browser` or `psiKey` | `provider`, `rendered`, `pages`, `ms` |
| `check_complete` | Once per rule, per page | `url`, `ruleId`, `status`, `checksDone`, `checksTotal` |
| `page_complete` | As each page finishes scoring | `url`, `index`, `pagesTotal`, `score`, `findings`, `metrics`, `ms` |
| `audit_complete` | Once, last | `score`, `pages`, `checks`, `ms`, `report` |

Two of these give you a progress fraction directly: `page_complete` has `index` out of `pagesTotal`, and `check_complete` has `checksDone` out of `checksTotal`.

`checksTotal` is fixed the moment `crawl_complete` fires and never moves after that. Browser-only rules are excluded when nothing was rendered, so the counter always reaches its total instead of stalling at half.

`check_complete` is the chatty one: 94 rules times every page, so a twenty-page crawl fires it about 1,900 times. That is what you want for a smooth progress bar and wrong for anything that re-renders per event. It is also the only heavy event; ignore it and a twenty-page crawl emits about 45 in total.

## Choosing which events you get

You do not configure a filter. You subscribe to what you want, either by checking `type` in the loop above, or with `.on()`:

```ts
const stream = auditStream("https://example.com", { maxPages: 20 })
  .on("page_complete", (e) => console.log(`done: ${e.url}`))
  .on("check_complete", (e) => bar.update(e.checksDone / e.checksTotal))
  .on("audit_complete", (e) => console.log(`${e.score}/100`));

const report = await stream.finalReport();
```

Handlers are typed to the event they subscribe to, so `e.score` is available on `audit_complete` and a type error on `page_fetched`. Use `.on("event", …)` to receive all of them, and `.off(type, handler)` to unsubscribe.

You can iterate *and* subscribe on the same stream. Both see every event.

## Getting the report

Three ways, all the same object:

```ts
// 1. Await it after the loop. The work is already done, so this is free.
const report = await stream.finalReport();

// 2. Take it off the last event.
for await (const event of stream) {
  if (event.type === "audit_complete") use(event.report);
}

// 3. Skip the events entirely. This runs the audit like `audit()` would.
const report = await auditStream(url).finalReport();
```

If the audit fails, the iterator throws and `finalReport()` rejects. Wrap whichever one you use.

## A progress bar in the terminal

Copy-paste, no dependencies. Redraw one line rather than printing a row per check.

```ts
import { auditStream } from "safi-studio-scanner";

const stream = auditStream(process.argv[2], { maxPages: 20 });

for await (const event of stream) {
  switch (event.type) {
    case "crawl_complete":
      console.log(`${event.pages} pages, ${event.checksTotal} checks`);
      break;
    case "check_complete": {
      const pct = Math.round((event.checksDone / event.checksTotal) * 100);
      const filled = Math.round(pct / 4);
      process.stdout.write(
        `\r\x1b[K  ${"█".repeat(filled)}${"░".repeat(25 - filled)} ${pct}%`,
      );
      break;
    }
    case "page_complete":
      process.stdout.write(`\r\x1b[K  ${event.index}/${event.pagesTotal} ${event.url}\n`);
      break;
  }
}
```

`\r` returns to the start of the line and `\x1b[K` clears it, so the bar overwrites itself instead of scrolling. Print a `\n` before any line that should stay on screen. Guard on `process.stdout.isTTY` if the output might be piped to a file, where escape codes are just noise.

`npm run example` in the repository is exactly this, if you want to see it run before wiring it up.

## Driving a UI

The stream is an ordinary async iterable, so a React component reads it in an effect:

```tsx
function AuditProgress({ url }: { url: string }) {
  const [pages, setPages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<AuditReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for await (const event of auditStream(url, { maxPages: 20 })) {
        if (cancelled) return;
        if (event.type === "check_complete") {
          setProgress(event.checksDone / event.checksTotal);
        }
        if (event.type === "page_complete") {
          setPages((p) => [...p, event.url]);
        }
        if (event.type === "audit_complete") {
          setReport(event.report);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return report ? <Report data={report} /> : <Bar value={progress} pages={pages} />;
}
```

`check_complete` fires often enough to make React re-render on every one of ~1,900 events. Either throttle it, or drop it and drive the bar off `page_complete` instead, which fires once per page.

To send progress to a browser over HTTP, the events map onto server-sent events with no translation:

```ts
for await (const event of auditStream(url)) {
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}
res.end();
```

## The callback form

`onProgress` is the primitive `auditStream()` is built on, and it works on plain `audit()`:

```ts
const report = await audit("https://example.com", {
  maxPages: 20,
  onProgress(event) {
    if (event.type === "page_complete") console.log(event.url);
  },
});
```

Use it when a callback fits your code better than a loop. It is the same events in the same order. A handler that throws is caught and ignored, so a broken listener cannot take the audit down with it.
