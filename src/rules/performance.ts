import type { Rule, PerfMetrics } from "../types.js";

function withMetrics(
  page: { browser?: { ok: boolean; metrics: PerfMetrics | null } },
  fn: (m: PerfMetrics) => { status: "pass" | "fail" | "warn" | "info"; message: string },
) {
  const m = page.browser?.metrics;
  if (!page.browser || !page.browser.ok || !m)
    return [{ status: "warn" as const, message: "Page could not be rendered for performance checks" }];
  return [fn(m)];
}

export const performanceRules: Rule[] = [
  {
    id: "performance/lcp",
    category: "performance",
    title: "Largest Contentful Paint",
    severity: "error",
    requiresBrowser: true,
    fix: "Optimise the largest above-the-fold element. Compress hero images, preload key assets, and cut render-blocking resources to get LCP under 2.5s.",
    run({ page }) {
      return withMetrics(page, (m) => {
        if (m.lcpMs === 0) return { status: "info", message: "LCP not measured" };
        if (m.lcpMs <= 2500) return { status: "pass", message: `LCP ${(m.lcpMs / 1000).toFixed(2)}s` };
        if (m.lcpMs <= 4000) return { status: "warn", message: `LCP needs work (${(m.lcpMs / 1000).toFixed(2)}s)` };
        return { status: "fail", message: `Poor LCP (${(m.lcpMs / 1000).toFixed(2)}s)` };
      });
    },
  },
  {
    id: "performance/cls",
    category: "performance",
    title: "Cumulative Layout Shift",
    severity: "warning",
    requiresBrowser: true,
    fix: "Set width and height on images and embeds, and reserve space for dynamic content to keep CLS under 0.1.",
    run({ page }) {
      return withMetrics(page, (m) => {
        if (m.cls <= 0.1) return { status: "pass", message: `CLS ${m.cls}` };
        if (m.cls <= 0.25) return { status: "warn", message: `CLS needs work (${m.cls})` };
        return { status: "fail", message: `Poor CLS (${m.cls})` };
      });
    },
  },
  {
    id: "performance/ttfb",
    category: "performance",
    title: "Time to First Byte",
    severity: "warning",
    requiresBrowser: true,
    fix: "Reduce server response time with caching, a CDN, or faster backend rendering to get TTFB under 800ms.",
    run({ page }) {
      return withMetrics(page, (m) => {
        if (m.ttfbMs <= 800) return { status: "pass", message: `TTFB ${m.ttfbMs}ms` };
        if (m.ttfbMs <= 1800) return { status: "warn", message: `Slow TTFB (${m.ttfbMs}ms)` };
        return { status: "fail", message: `Very slow TTFB (${m.ttfbMs}ms)` };
      });
    },
  },
  {
    id: "performance/dom-size",
    category: "performance",
    title: "DOM size",
    severity: "info",
    requiresBrowser: true,
    fix: "Reduce the number of DOM nodes. Large DOMs slow rendering and increase memory use. Aim for under 1500 elements.",
    run({ page }) {
      return withMetrics(page, (m) => {
        if (m.domNodes <= 1500) return { status: "pass", message: `${m.domNodes} DOM nodes` };
        if (m.domNodes <= 3000) return { status: "warn", message: `Large DOM (${m.domNodes} nodes)` };
        return { status: "fail", message: `Excessive DOM (${m.domNodes} nodes)` };
      });
    },
  },
  {
    id: "performance/page-weight",
    category: "performance",
    title: "Page weight",
    severity: "warning",
    requiresBrowser: true,
    fix: "Cut total transfer size. Compress images, minify assets, and remove unused code. Aim to stay under 3MB.",
    run({ page }) {
      return withMetrics(page, (m) => {
        const mb = m.transferBytes / 1_000_000;
        if (mb <= 3) return { status: "pass", message: `${mb.toFixed(2)}MB transferred` };
        if (mb <= 6) return { status: "warn", message: `Heavy page (${mb.toFixed(2)}MB)` };
        return { status: "fail", message: `Very heavy page (${mb.toFixed(2)}MB)` };
      });
    },
  },
  {
    id: "performance/request-count",
    category: "performance",
    title: "Request count",
    severity: "info",
    requiresBrowser: true,
    fix: "Reduce the number of requests by bundling assets, inlining small resources, and lazy-loading non-critical content.",
    run({ page }) {
      return withMetrics(page, (m) => {
        if (m.requests <= 80) return { status: "pass", message: `${m.requests} requests` };
        if (m.requests <= 150) return { status: "warn", message: `Many requests (${m.requests})` };
        return { status: "fail", message: `Excessive requests (${m.requests})` };
      });
    },
  },
];
