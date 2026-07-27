import { createPool, createLinkChecker, fetchRobots, fetchSitemap } from "./http.js";
import { crawl } from "./crawl.js";
import { renderPages } from "./providers/playwright.js";
import { pageSpeedInsights } from "./providers/psi.js";
import { runPage, aggregate } from "./runner.js";
import { allRules, selectRules } from "./rules/index.js";
import { allCollectors } from "./metrics/index.js";
import type { AuditEvent, AuditOptions, AuditReport, Rule, SiteContext } from "./types.js";

export const DEFAULTS: AuditOptions = {
  format: "html",
  timeout: 15000,
  userAgent: "SafiStudioScanner/0.1 (+https://safi-studio.com)",
  maxPages: 20,
  concurrency: 5,
  maxDepth: 3,
  browser: false,
  psiMaxPages: 5,
};

export async function audit(
  startUrl: string,
  options: Partial<AuditOptions> = {},
): Promise<AuditReport> {
  const opts: AuditOptions = { ...DEFAULTS, ...options };
  const origin = new URL(startUrl).origin;
  const pool = createPool(opts.concurrency);
  const checkUrl = createLinkChecker(opts, pool);
  const started = Date.now();

  // A progress handler must never take the audit down with it.
  const emit = (event: AuditEvent) => {
    try {
      opts.onProgress?.(event);
    } catch {
      /* a broken listener is the listener's problem */
    }
  };

  emit({ type: "audit_start", url: startUrl, maxPages: opts.maxPages });

  const robots = await fetchRobots(origin, opts);
  const sitemap = await fetchSitemap(origin, robots.sitemaps, opts);
  const site: SiteContext = { origin, startUrl, robots, sitemap };

  const crawlStarted = Date.now();
  const pages = await crawl(startUrl, opts, pool, (page, index, ms) => {
    emit({
      type: "page_fetched",
      url: page.url,
      status: page.status,
      depth: page.depth,
      index,
      ms,
    });
  });

  if (opts.browser) {
    // Full local browser: accessibility with contrast plus real Core Web Vitals.
    const renderStarted = Date.now();
    const rendered = await renderPages(
      pages.map((p) => p.finalUrl),
      opts,
    );
    for (const p of pages) p.browser = rendered.get(p.finalUrl);
    emit({
      type: "render_complete",
      provider: "browser",
      rendered: rendered.size,
      pages: pages.length,
      ms: Date.now() - renderStarted,
    });
  } else if (opts.psiKey) {
    // Chromium-free path: Google PageSpeed Insights for CWV and accessibility on
    // the first psiMaxPages pages.
    const renderStarted = Date.now();
    const psi = await pageSpeedInsights(
      pages.map((p) => p.finalUrl),
      opts,
    );
    for (const p of pages) p.browser = psi.get(p.finalUrl);
    emit({
      type: "render_complete",
      provider: "psi",
      rendered: psi.size,
      pages: pages.length,
      ms: Date.now() - renderStarted,
    });
  }

  const rules = selectRules(opts.rules ?? allRules, opts.only, opts.skip);
  const collectors = selectRules(opts.collectors ?? allCollectors, opts.only, opts.skip);

  // The denominator only exists once the crawl and the render stage are done:
  // browser rules are skipped on a page that was never rendered, so counting
  // them would leave a progress bar permanently short of its total.
  const willRun = (browser: boolean) =>
    browser ? rules.length : rules.filter((r: Rule) => !r.requiresBrowser).length;
  const checksTotal = pages.reduce((n, p) => n + willRun(Boolean(p.browser)), 0);
  emit({
    type: "crawl_complete",
    pages: pages.length,
    checksTotal,
    ms: Date.now() - crawlStarted,
  });

  let checksDone = 0;
  let pagesDone = 0;
  const reports = await Promise.all(
    pages.map(async (p) => {
      const pageStarted = Date.now();
      const report = await runPage(p, site, rules, checkUrl, collectors, (ruleId, status) => {
        checksDone++;
        emit({ type: "check_complete", url: p.url, ruleId, status, checksDone, checksTotal });
      });
      emit({
        type: "page_complete",
        url: report.url,
        index: ++pagesDone,
        pagesTotal: pages.length,
        score: report.score,
        findings: report.findings.length,
        metrics: report.metrics.length,
        ms: Date.now() - pageStarted,
      });
      return report;
    }),
  );

  const report = aggregate(startUrl, new Date().toISOString(), reports);
  emit({
    type: "audit_complete",
    score: report.score,
    pages: report.pagesScanned,
    checks: checksDone,
    ms: Date.now() - started,
    report,
  });
  return report;
}
