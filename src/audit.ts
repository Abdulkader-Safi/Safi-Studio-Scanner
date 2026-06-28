import { createPool, createLinkChecker, fetchRobots, fetchSitemap } from "./http.js";
import { crawl } from "./crawl.js";
import { renderPages } from "./providers/playwright.js";
import { pageSpeedInsights } from "./providers/psi.js";
import { runPage, aggregate } from "./runner.js";
import { allRules, selectRules } from "./rules/index.js";
import type { AuditOptions, AuditReport, SiteContext } from "./types.js";

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

  const robots = await fetchRobots(origin, opts);
  const sitemap = await fetchSitemap(origin, robots.sitemaps, opts);
  const site: SiteContext = { origin, startUrl, robots, sitemap };

  const pages = await crawl(startUrl, opts, pool);

  if (opts.browser) {
    // Full local browser: accessibility with contrast plus real Core Web Vitals.
    const rendered = await renderPages(
      pages.map((p) => p.finalUrl),
      opts,
    );
    for (const p of pages) p.browser = rendered.get(p.finalUrl);
  } else if (opts.psiKey) {
    // Chromium-free path: Google PageSpeed Insights for CWV and accessibility on
    // the first psiMaxPages pages.
    const psi = await pageSpeedInsights(
      pages.map((p) => p.finalUrl),
      opts,
    );
    for (const p of pages) p.browser = psi.get(p.finalUrl);
  }

  const rules = selectRules(allRules, opts.only, opts.skip);
  const reports = await Promise.all(pages.map((p) => runPage(p, site, rules, checkUrl)));
  return aggregate(startUrl, new Date().toISOString(), reports);
}
