import type { CheerioAPI } from "cheerio";

export type Format = "json" | "md" | "html";
export type Status = "pass" | "fail" | "warn" | "info";
export type Severity = "error" | "warning" | "info";

export interface AuditOptions {
  format: Format;
  out?: string;
  only?: string[];
  skip?: string[];
  timeout: number;
  userAgent: string;
  maxPages: number;
  concurrency: number;
  maxDepth: number;
  browser: boolean;
  // Chromium-free provider: Google PageSpeed Insights API. Returns real Core Web
  // Vitals and accessibility audits over HTTPS, no local browser. Needs an API
  // key and is rate-limited, so it only runs on the first `psiMaxPages` pages.
  psiKey?: string;
  psiMaxPages: number;
}

export interface RawResponse {
  url: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  html: string;
  redirectChain: number;
  responseTimeMs: number;
  error?: string;
}

export interface PageLink {
  href: string;
  absUrl: string;
  text: string;
  rel: string;
  internal: boolean;
}
export interface PageImage {
  src: string;
  absUrl: string;
  alt: string | null;
  width: string | null;
  height: string | null;
  loading: string | null;
}

export interface AxeViolation {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical" | null;
  help: string;
  description: string;
  helpUrl: string;
  nodes: number;
  sample?: string;
}

export interface PerfMetrics {
  ttfbMs: number;
  loadMs: number;
  lcpMs: number;
  cls: number;
  domNodes: number;
  requests: number;
  transferBytes: number;
}

export interface BrowserData {
  ok: boolean;
  error?: string;
  axe: AxeViolation[];
  axePasses: { id: string; help: string }[];
  metrics: PerfMetrics | null;
}

export interface PageContext {
  url: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  html: string;
  $: CheerioAPI;
  responseTimeMs: number;
  redirectChain: number;
  depth: number;
  links: PageLink[];
  images: PageImage[];
  error?: string;
  browser?: BrowserData;
}

export interface SiteContext {
  origin: string;
  startUrl: string;
  robots: {
    exists: boolean;
    status: number;
    content: string;
    sitemaps: string[];
  };
  sitemap: { exists: boolean; status: number; urls: string[] };
}

export interface LinkStatus {
  ok: boolean;
  status: number;
  redirected: boolean;
  chain: number;
  error?: string;
}

export interface RuleContext {
  page: PageContext;
  site: SiteContext;
  checkUrl(url: string): Promise<LinkStatus>;
}

export interface RuleResult {
  status: Status;
  message: string;
  details?: string;
  evidence?: string;
  // Optional per-result overrides, used when one rule emits many distinct issues
  // (e.g. the accessibility rule maps each axe-core violation to its own finding).
  ruleId?: string;
  title?: string;
  fix?: string;
  severity?: Severity;
}

export interface Rule {
  id: string;
  category: string;
  title: string;
  severity: Severity;
  requiresBrowser?: boolean;
  fix?: string;
  run(ctx: RuleContext): RuleResult[] | Promise<RuleResult[]>;
}

export interface Finding extends RuleResult {
  ruleId: string;
  category: string;
  severity: Severity;
  title: string;
  fix?: string;
}

export interface PageReport {
  url: string;
  status: number;
  score: number;
  findings: Finding[];
}
export interface CategoryScore {
  category: string;
  score: number;
  pass: number;
  fail: number;
  warn: number;
}

export interface AuditReport {
  startUrl: string;
  generatedAt: string;
  pagesScanned: number;
  score: number;
  categories: CategoryScore[];
  pages: PageReport[];
}
