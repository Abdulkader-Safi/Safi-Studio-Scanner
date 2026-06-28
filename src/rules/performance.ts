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
    id: "performance/render-blocking-scripts",
    category: "performance",
    title: "Render-blocking scripts",
    severity: "warning",
    fix: "Add defer or async to scripts in <head>, or move them before </body>, so they do not block rendering.",
    run({ page }) {
      let blocking = 0;
      page.$("head script[src]").each((_, el) => {
        const s = page.$(el);
        if (!s.attr("defer") && !s.attr("async") && (s.attr("type") || "") !== "module") blocking++;
      });
      return [
        blocking === 0
          ? { status: "pass", message: "No render-blocking scripts in head" }
          : { status: "warn", message: `${blocking} render-blocking script(s) in head` },
      ];
    },
  },
  {
    id: "performance/stylesheet-count",
    category: "performance",
    title: "Stylesheet count",
    severity: "info",
    fix: "Combine stylesheets. Many separate CSS files add round trips. Aim for a handful.",
    run({ page }) {
      const n = page.$('link[rel="stylesheet"]').length;
      return [
        n <= 5
          ? { status: "pass", message: `${n} stylesheet(s)` }
          : { status: "warn", message: `${n} stylesheets` },
      ];
    },
  },
  {
    id: "performance/inline-script-size",
    category: "performance",
    title: "Inline script size",
    severity: "info",
    fix: "Move large inline scripts to cacheable external files.",
    run({ page }) {
      let bytes = 0;
      page.$("script:not([src])").each((_, el) => {
        bytes += page.$(el).text().length;
      });
      return [
        bytes <= 30000
          ? { status: "pass", message: `${(bytes / 1000).toFixed(1)}KB inline JS` }
          : { status: "warn", message: `${(bytes / 1000).toFixed(1)}KB of inline JavaScript` },
      ];
    },
  },
  {
    id: "performance/text-compression",
    category: "performance",
    title: "Text compression",
    severity: "warning",
    fix: "Enable gzip or Brotli compression on HTML, CSS, and JS responses to cut transfer size.",
    run({ page }) {
      const enc = (page.headers["content-encoding"] || "").toLowerCase();
      return [
        /gzip|br|deflate|zstd/.test(enc)
          ? { status: "pass", message: `Compressed (${enc})` }
          : { status: "warn", message: "HTML response is not compressed" },
      ];
    },
  },
  {
    id: "performance/cache-control",
    category: "performance",
    title: "Cache headers",
    severity: "info",
    fix: "Send a Cache-Control header so browsers and CDNs can cache responses.",
    run({ page }) {
      return [
        page.headers["cache-control"]
          ? { status: "pass", message: `Cache-Control: ${page.headers["cache-control"]}` }
          : { status: "warn", message: "No Cache-Control header" },
      ];
    },
  },
  {
    id: "performance/html-weight",
    category: "performance",
    title: "HTML document size",
    severity: "info",
    fix: "Reduce the raw HTML size. Large documents are slow to parse. Aim under 100KB.",
    run({ page }) {
      const kb = page.html.length / 1000;
      if (kb <= 100) return [{ status: "pass", message: `${kb.toFixed(0)}KB HTML` }];
      if (kb <= 200) return [{ status: "warn", message: `Large HTML (${kb.toFixed(0)}KB)` }];
      return [{ status: "fail", message: `Very large HTML (${kb.toFixed(0)}KB)` }];
    },
  },
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
