import type {
  Rule,
  RuleContext,
  PageContext,
  SiteContext,
  Finding,
  PageReport,
  AuditReport,
  CategoryScore,
  LinkStatus,
  Status,
  Severity,
} from "./types.js";

const SEVERITY_WEIGHT = { error: 10, warning: 4, info: 1 } as const;
const WARN_CREDIT = 0.25;

export async function runPage(
  page: PageContext,
  site: SiteContext,
  rules: Rule[],
  checkUrl: (url: string) => Promise<LinkStatus>,
): Promise<PageReport> {
  const ctx: RuleContext = { page, site, checkUrl };
  const findings: Finding[] = [];
  for (const rule of rules) {
    // Browser rules only run when this page has rendered browser data attached.
    if (rule.requiresBrowser && !page.browser) continue;
    let results;
    try {
      results = await rule.run(ctx);
    } catch (err) {
      results = [{ status: "warn" as const, message: `Rule errored: ${(err as Error).message}` }];
    }
    for (const r of results) {
      findings.push({
        ...r,
        ruleId: r.ruleId ?? rule.id,
        category: rule.category,
        severity: r.severity ?? rule.severity,
        title: r.title ?? rule.title,
        fix: r.fix ?? rule.fix,
      });
    }
  }
  return { url: page.url, status: page.status, score: scoreFindings(findings), findings };
}

export function scoreFindings(findings: Finding[]): number {
  let earned = 0,
    possible = 0;
  for (const f of findings) {
    if (f.status === "info") continue;
    const w = SEVERITY_WEIGHT[f.severity];
    possible += w;
    if (f.status === "pass") earned += w;
    else if (f.status === "warn") earned += w * WARN_CREDIT;
  }
  if (possible === 0) return 100;
  return Math.round((earned / possible) * 100);
}

export function aggregate(
  startUrl: string,
  generatedAt: string,
  pages: PageReport[],
): AuditReport {
  const all = pages.flatMap((p) => p.findings);
  const byCat = new Map<string, Finding[]>();
  for (const f of all) {
    if (!byCat.has(f.category)) byCat.set(f.category, []);
    byCat.get(f.category)!.push(f);
  }
  const categories: CategoryScore[] = [...byCat.entries()]
    .map(([category, fs]) => ({
      category,
      score: scoreFindings(fs),
      pass: fs.filter((f) => f.status === "pass").length,
      fail: fs.filter((f) => f.status === "fail").length,
      warn: fs.filter((f) => f.status === "warn").length,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
  return {
    startUrl,
    generatedAt,
    pagesScanned: pages.length,
    score: computeOverall(pages),
    categories,
    pages,
  };
}

// Harsh overall: start at 100 and deduct for every rule that fails or warns,
// weighted by severity and scaled by the share of pages it affects. Unlike a
// category average, a handful of real errors across the site visibly drops the
// headline, the way a strict commercial auditor scores.
const OVERALL_WEIGHT: Record<Severity, number> = { error: 22, warning: 11, info: 1 };
const WARN_FACTOR = 0.55;

export function computeOverall(pages: PageReport[]): number {
  const total = pages.length || 1;
  const byRule = new Map<string, { severity: Severity; fail: number; warn: number }>();
  for (const p of pages) {
    const worst = new Map<string, { status: Status; severity: Severity }>();
    for (const f of p.findings) {
      if (f.status === "pass" || f.status === "info") continue;
      const cur = worst.get(f.ruleId);
      if (!cur || (cur.status !== "fail" && f.status === "fail")) {
        worst.set(f.ruleId, { status: f.status, severity: f.severity });
      }
    }
    for (const [ruleId, { status, severity }] of worst) {
      let e = byRule.get(ruleId);
      if (!e) {
        e = { severity, fail: 0, warn: 0 };
        byRule.set(ruleId, e);
      }
      if (status === "fail") e.fail++;
      else e.warn++;
    }
  }
  let penalty = 0;
  for (const r of byRule.values()) {
    const w = OVERALL_WEIGHT[r.severity];
    penalty += w * (r.fail / total) + w * WARN_FACTOR * (r.warn / total);
  }
  return Math.max(0, Math.round(100 - penalty));
}
