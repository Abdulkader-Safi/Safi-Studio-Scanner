import type { Rule, RuleResult, Severity } from "../types.js";

const IMPACT_SEVERITY: Record<string, Severity> = {
  critical: "error",
  serious: "error",
  moderate: "warning",
  minor: "info",
};

export const accessibilityRules: Rule[] = [
  {
    id: "accessibility/axe",
    category: "accessibility",
    title: "Accessibility (axe-core)",
    severity: "warning",
    requiresBrowser: true,
    fix: "Resolve the WCAG issues flagged by axe-core. Each issue links to detailed guidance.",
    run({ page }) {
      const data = page.browser;
      if (!data || !data.ok) {
        return [{ status: "warn", message: "Page could not be rendered for accessibility checks" }];
      }
      const violations = data.axe.map((v): RuleResult => {
        const severity = IMPACT_SEVERITY[v.impact ?? "moderate"] ?? "warning";
        return {
          status: severity === "info" ? "warn" : "fail",
          ruleId: `accessibility/${v.id}`,
          title: v.help,
          severity,
          message: `${v.description} (${v.nodes} element${v.nodes === 1 ? "" : "s"}, impact: ${v.impact ?? "unknown"})`,
          evidence: v.sample,
          fix: `See ${v.helpUrl}`,
        };
      });
      // Each axe check that passed becomes its own pass finding so the
      // category score reflects the real pass/fail ratio, not just failures.
      const passes = data.axePasses.map((p): RuleResult => ({
        status: "pass",
        ruleId: `accessibility/${p.id}`,
        title: p.help,
        severity: "warning",
        message: "Passed",
      }));
      if (violations.length === 0 && passes.length === 0) {
        return [{ status: "pass", message: "No accessibility violations found by axe-core" }];
      }
      return [...violations, ...passes];
    },
  },
];
