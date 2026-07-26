---
title: Types
description: Every exported TypeScript type in the package.
---

# Types

All of these are exported from the package root and are safe to import in a type-only import.

```ts
import type { AuditReport, Finding, Rule } from "safi-studio-scanner";
```

## Unions

```ts
type Format = "json" | "md" | "html";
type Status = "pass" | "fail" | "warn" | "info";
type Severity = "error" | "warning" | "info";
```

`Status` is the outcome of one check. `Severity` is how much that outcome counts. A rule declares its severity once; each finding reports its own status.

## AuditOptions

```ts
interface AuditOptions {
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
  psiKey?: string;
  psiMaxPages: number;
}
```

`audit()` takes a `Partial<AuditOptions>` and fills the gaps from `DEFAULTS`. See [configuration](/guide/start/configuration) for what each one does.

## AuditReport

```ts
interface AuditReport {
  startUrl: string;
  generatedAt: string;
  pagesScanned: number;
  score: number;
  categories: CategoryScore[];
  pages: PageReport[];
}
```

`generatedAt` is an ISO string. `score` is the harsh overall number, not the average of `categories`.

## CategoryScore

```ts
interface CategoryScore {
  category: string;
  score: number;
  pass: number;
  fail: number;
  warn: number;
}
```

Counts are findings, not rules, so a rule that emits one finding per image contributes many.

## PageReport

```ts
interface PageReport {
  url: string;
  status: number;
  score: number;
  findings: Finding[];
}
```

## Finding

```ts
interface Finding extends RuleResult {
  ruleId: string;
  category: string;
  severity: Severity;
  title: string;
  fix?: string;
}
```

## RuleResult

```ts
interface RuleResult {
  status: Status;
  message: string;
  details?: string;
  evidence?: string;
  // Per-result overrides, for a rule that emits several distinct issues.
  ruleId?: string;
  title?: string;
  fix?: string;
  severity?: Severity;
}
```

What a rule returns. The runner fills in the rule's own `ruleId`, `category`, `title`, `severity`, and `fix` unless the result overrides them.

## Rule

```ts
interface Rule {
  id: string;
  category: string;
  title: string;
  severity: Severity;
  requiresBrowser?: boolean;
  fix?: string;
  run(ctx: RuleContext): RuleResult[] | Promise<RuleResult[]>;
}
```

See [writing a rule](/guide/using/custom-rules).

## RuleContext

```ts
interface RuleContext {
  page: PageContext;
  site: SiteContext;
  checkUrl(url: string): Promise<LinkStatus>;
}
```

## PageContext

```ts
interface PageContext {
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
```

`url` is what was requested, `finalUrl` is where it landed after redirects. `headers` keys are lowercased.

## SiteContext

```ts
interface SiteContext {
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
```

Built once per run and shared by every page.

## PageLink and PageImage

```ts
interface PageLink {
  href: string;      // as written in the markup
  absUrl: string;    // resolved against the page URL
  text: string;      // anchor text, trimmed
  rel: string;
  internal: boolean; // same origin as the site
}

interface PageImage {
  src: string;
  absUrl: string;
  alt: string | null;   // null means the attribute is absent
  width: string | null;
  height: string | null;
  loading: string | null;
}
```

`alt: null` and `alt: ""` mean different things. An empty string is a deliberate decorative image; null is a missing attribute.

## LinkStatus

```ts
interface LinkStatus {
  ok: boolean;
  status: number;
  redirected: boolean;
  chain: number;      // number of redirect hops
  error?: string;
}
```

## BrowserData

```ts
interface BrowserData {
  ok: boolean;
  error?: string;
  axe: AxeViolation[];
  axePasses: { id: string; help: string }[];
  metrics: PerfMetrics | null;
}

interface AxeViolation {
  id: string;
  impact: "minor" | "moderate" | "serious" | "critical" | null;
  help: string;
  description: string;
  helpUrl: string;
  nodes: number;
  sample?: string;
}

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

Present only when the page was rendered. Both providers, local Chromium and PageSpeed Insights, produce this same shape.
