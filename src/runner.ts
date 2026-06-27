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
} from "./types.js";

const SEVERITY_WEIGHT = { error: 5, warning: 3, info: 1 } as const;

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
    else if (f.status === "warn") earned += w * 0.5;
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
  const score = pages.length
    ? Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length)
    : 100;
  return { startUrl, generatedAt, pagesScanned: pages.length, score, categories, pages };
}
