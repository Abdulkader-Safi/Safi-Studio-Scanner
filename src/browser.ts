import { chromium, type Browser } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { createPool } from "./http.js";
import type { AuditOptions, BrowserData, AxeViolation, PerfMetrics } from "./types.js";

// Records Core Web Vitals before navigation so buffered entries are captured.
const CWV_INIT = `
window.__cwv = { lcp: 0, cls: 0 };
try {
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__cwv.lcp = e.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cwv.cls += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
} catch (e) {}
`;

async function analyzePage(browser: Browser, url: string, opts: AuditOptions): Promise<BrowserData> {
  const context = await browser.newContext({ userAgent: opts.userAgent });
  const page = await context.newPage();
  try {
    await page.addInitScript(CWV_INIT);
    await page.goto(url, { waitUntil: "load", timeout: opts.timeout });
    await page.waitForTimeout(1200); // let LCP and layout shifts settle

    const metrics = (await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const transfer =
        res.reduce((s, r) => s + (r.transferSize || 0), 0) + (nav?.transferSize || 0);
      const cwv = (window as unknown as { __cwv: { lcp: number; cls: number } }).__cwv;
      return {
        ttfbMs: nav ? Math.round(nav.responseStart) : 0,
        loadMs: nav ? Math.round(nav.duration) : 0,
        lcpMs: Math.round(cwv?.lcp || 0),
        cls: Number((cwv?.cls || 0).toFixed(3)),
        domNodes: document.querySelectorAll("*").length,
        requests: res.length + 1,
        transferBytes: transfer,
      };
    })) as PerfMetrics;

    let axe: AxeViolation[] = [];
    let axePasses: { id: string; help: string }[] = [];
    try {
      const results = await new AxeBuilder({ page }).analyze();
      axe = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? null,
        help: v.help,
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
        sample: v.nodes[0]?.html,
      }));
      axePasses = results.passes.map((p) => ({ id: p.id, help: p.help }));
    } catch {
      /* axe injection can fail on unusual pages; metrics still useful */
    }

    return { ok: true, axe, axePasses, metrics };
  } catch (err) {
    return { ok: false, error: (err as Error).message, axe: [], axePasses: [], metrics: null };
  } finally {
    await context.close();
  }
}

export async function renderPages(
  urls: string[],
  opts: AuditOptions,
): Promise<Map<string, BrowserData>> {
  const out = new Map<string, BrowserData>();
  let browser: Browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    const msg = (err as Error).message;
    throw new Error(
      `Could not launch Chromium for --browser mode. Run "npx playwright install chromium" first.\n${msg}`,
    );
  }
  try {
    const pool = createPool(opts.concurrency);
    await Promise.all(
      urls.map((url) =>
        pool(async () => {
          out.set(url, await analyzePage(browser, url, opts));
        }),
      ),
    );
  } finally {
    await browser.close();
  }
  return out;
}
