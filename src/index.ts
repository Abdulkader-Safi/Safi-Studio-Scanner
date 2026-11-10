// Public SDK entry point.
//
//   import { audit, auditToHtml } from "safi-studio-scanner";
//
//   const report = await audit("https://example.com", { maxPages: 20 });
//   console.log(report.score);                       // overall 0-100
//
//   const html = await auditToHtml("https://example.com");   // one-liner
//
// The core install depends only on cheerio. Browser-based rules (accessibility,
// Core Web Vitals) use optional providers: pass `browser: true` (needs the
// optional playwright packages) or `psiKey` (Google PageSpeed Insights).

import { audit, DEFAULTS } from "./audit.js";
import { render } from "./report.js";
import type { AuditOptions, AuditReport } from "./types.js";

export { audit, DEFAULTS, render };
export { auditStream, AuditStream } from "./stream.js";
export type { AuditEventOf } from "./stream.js";
export { allRules, selectRules } from "./rules/index.js";
export { analyzeText, readability, tokenize, lemma, keywordSpans } from "./text.js";
export type { TextAnalysis, Phrase, Readability } from "./text.js";
export { allCollectors, value, table, inRange, upTo, clip, ROW_CAP } from "./metrics/index.js";
export type {
  AuditOptions,
  AuditReport,
  PageReport,
  CategoryScore,
  Finding,
  Rule,
  RuleResult,
  RuleContext,
  PageContext,
  SiteContext,
  Collector,
  Metric,
  MetricValue,
  MetricTable,
  MetricInput,
  MetricCell,
  ValueStatus,
  AuditEvent,
  AuditEventType,
  AuditStartEvent,
  PageFetchedEvent,
  CrawlCompleteEvent,
  RenderCompleteEvent,
  CheckCompleteEvent,
  PageCompleteEvent,
  AuditCompleteEvent,
  Format,
  Status,
  Severity,
} from "./types.js";

/** Audit a URL and return the report rendered as a self-contained HTML page. */
export async function auditToHtml(
  url: string,
  options?: Partial<AuditOptions>,
): Promise<string> {
  return render(await audit(url, options), "html");
}

/** Audit a URL and return the report rendered as Markdown. */
export async function auditToMarkdown(
  url: string,
  options?: Partial<AuditOptions>,
): Promise<string> {
  return render(await audit(url, options), "md");
}

/** Audit a URL and return just the overall health score (0-100). */
export async function auditScore(
  url: string,
  options?: Partial<AuditOptions>,
): Promise<number> {
  return (await audit(url, options)).score;
}

export type { AuditReport as Report };
