---
title: Rendered checks
description: Accessibility and Core Web Vitals, through a local Chromium or the PageSpeed Insights API.
---

# Rendered checks

Most rules read the HTML the server sent. Two things cannot be judged that way: whether the page is accessible once it renders, and how fast it actually paints. Both need a real browser.

The engine supports two ways to get one, and both feed the same rules. Neither is installed by default, so a project that never asks for them stays at one dependency.

| | Local browser | PageSpeed Insights |
| --- | --- | --- |
| Set with | `browser: true` | `psiKey: "..."` |
| Extra install | Playwright + Chromium | none |
| Needs a key | no | yes |
| Runs on | every crawled page | the first `psiMaxPages` pages |
| Network | your machine to the site | Google to the site |
| Speed | fast after the first launch | slower, rate limited |
| Accessibility source | axe-core, full ruleset | Lighthouse, which runs axe-core |

If both are set, `browser` wins.

## Local browser

```bash
npm install playwright @axe-core/playwright
npx playwright install chromium
```

```ts
const report = await audit("https://example.com", {
  browser: true,
  maxPages: 20,
});
```

Each crawled page is opened in headless Chromium, given time to settle, then measured. The packages are optional dependencies and are imported lazily, so nothing loads until you pass `browser: true`.

This is the option to use when you control the machine, want every page covered, and want the complete axe-core ruleset including colour contrast.

## PageSpeed Insights

```ts
const report = await audit("https://example.com", {
  psiKey: process.env.PSI_KEY,
  psiMaxPages: 5,
});
```

One HTTPS call per URL returns a full Lighthouse run: Core Web Vitals as lab metrics, plus the accessibility audits, which Lighthouse produces by running axe-core on Google's side.

Get a key from the Google Cloud console. The API is rate limited and slower than local rendering, which is why `psiMaxPages` defaults to 5. Raising it past a couple of dozen will start returning errors.

This is the option for CI runners where installing Chromium is a nuisance, and for auditing a site you cannot reach from the machine running the audit.

:::warning The site must be publicly reachable
PageSpeed Insights fetches the page from Google's infrastructure. A staging site behind a VPN, basic auth, or an IP allowlist will fail. Use the local browser for those.
:::

## What the rendered stage adds

**Accessibility.** `accessibility/axe` emits one finding per violation, each carrying the axe rule id, its impact, the number of matching nodes, a sample of the offending markup, and a link to the rule's documentation.

**Core Web Vitals.** Six performance rules light up: `lcp`, `cls`, `ttfb`, `dom-size`, `page-weight`, and `request-count`. Without a rendered page they are skipped, not failed, so their absence never costs you points.

## Reading the raw measurements

Whichever provider ran, the numbers land on the page context in one shape:

```ts
interface PerfMetrics {
  ttfbMs: number;
  loadMs: number;
  lcpMs: number;
  cls: number;
  domNodes: number;
  requests: number;
  transferBytes: number;
}
```

The rules read that object and turn it into findings. Today the raw values are not carried through to the report; surfacing them, along with the rest of the navigation timing entry, is [phase 6 of the roadmap](/roadmap/#phase-6-performance-and-speed-depth).
