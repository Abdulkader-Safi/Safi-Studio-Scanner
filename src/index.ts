// Public SDK entry point.
//
//   import { audit, render } from "safi-studio-scanner";
//   const report = await audit("https://example.com", { maxPages: 20 });
//   console.log(report.score);
//   const html = render(report, "html");
//
// The core install depends only on cheerio. Browser-based rules (accessibility,
// Core Web Vitals) need optional providers; see audit() options `browser`,
// `accessibility`, and `psiKey`.

export { audit, DEFAULTS } from "./audit.js";
export { render } from "./report.js";
export { allRules, selectRules } from "./rules/index.js";
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
  Format,
  Status,
  Severity,
} from "./types.js";
