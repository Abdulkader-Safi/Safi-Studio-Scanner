import { createPool } from "../http.js";
import type { AuditOptions, BrowserData, AxeViolation, PerfMetrics } from "../types.js";

// Google PageSpeed Insights provider. One HTTPS call per URL returns a full
// Lighthouse run: Core Web Vitals (lab metrics) plus the accessibility audits
// (Lighthouse runs axe-core on Google's side). No local browser, no heavy deps.
//
// Trade-offs: needs an API key, is rate-limited, and is slower than local
// rendering, so it runs on a capped number of pages, not a whole crawl.

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

interface LighthouseAudit {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  numericValue?: number;
  scoreDisplayMode?: string;
}

interface PsiResponse {
  lighthouseResult?: {
    audits?: Record<string, LighthouseAudit>;
    categories?: { accessibility?: { auditRefs?: Array<{ id: string }> } };
  };
}

function metricsFrom(audits: Record<string, LighthouseAudit>): PerfMetrics {
  const num = (id: string) => Math.round(audits[id]?.numericValue ?? 0);
  return {
    ttfbMs: num("server-response-time"),
    loadMs: num("interactive"),
    lcpMs: num("largest-contentful-paint"),
    cls: Number((audits["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3)),
    domNodes: num("dom-size"),
    requests: num("network-requests"),
    transferBytes: num("total-byte-weight"),
  };
}

function accessibilityFrom(res: PsiResponse): {
  axe: AxeViolation[];
  axePasses: { id: string; help: string }[];
} {
  const audits = res.lighthouseResult?.audits ?? {};
  const refs = res.lighthouseResult?.categories?.accessibility?.auditRefs ?? [];
  const axe: AxeViolation[] = [];
  const axePasses: { id: string; help: string }[] = [];
  for (const ref of refs) {
    const a = audits[ref.id];
    if (!a || a.scoreDisplayMode === "notApplicable" || a.scoreDisplayMode === "manual") continue;
    const help = a.title ?? ref.id;
    if (a.score === 1) {
      axePasses.push({ id: `accessibility/${ref.id}`, help });
    } else if (a.score === 0) {
      axe.push({
        id: ref.id,
        impact: "serious",
        help,
        description: a.description ?? help,
        helpUrl: "",
        nodes: 1,
      });
    }
  }
  return { axe, axePasses };
}

async function analyze(url: string, opts: AuditOptions): Promise<BrowserData> {
  const params = new URLSearchParams({ url, category: "performance", strategy: "mobile" });
  params.append("category", "accessibility");
  if (opts.psiKey) params.set("key", opts.psiKey);
  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: AbortSignal.timeout(Math.max(opts.timeout, 60000)),
    });
    if (!res.ok) {
      return { ok: false, error: `PSI HTTP ${res.status}`, axe: [], axePasses: [], metrics: null };
    }
    const data = (await res.json()) as PsiResponse;
    const audits = data.lighthouseResult?.audits ?? {};
    const { axe, axePasses } = accessibilityFrom(data);
    return { ok: true, axe, axePasses, metrics: metricsFrom(audits) };
  } catch (err) {
    return { ok: false, error: (err as Error).message, axe: [], axePasses: [], metrics: null };
  }
}

export async function pageSpeedInsights(
  urls: string[],
  opts: AuditOptions,
): Promise<Map<string, BrowserData>> {
  const targets = urls.slice(0, opts.psiMaxPages);
  const out = new Map<string, BrowserData>();
  // PSI is rate-limited; keep concurrency low regardless of crawl concurrency.
  const pool = createPool(Math.min(opts.concurrency, 4));
  await Promise.all(
    targets.map((url) =>
      pool(async () => {
        out.set(url, await analyze(url, opts));
      }),
    ),
  );
  return out;
}
