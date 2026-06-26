import type { Rule } from "../types.js";

export const structuredDataRules: Rule[] = [
  {
    id: "structured-data/jsonld-present",
    category: "structured-data",
    title: "JSON-LD present",
    severity: "info",
    run({ page }) {
      const n = page.$('script[type="application/ld+json"]').length;
      return [
        n > 0
          ? { status: "pass", message: `${n} JSON-LD block(s)` }
          : { status: "warn", message: "No JSON-LD structured data" },
      ];
    },
  },
  {
    id: "structured-data/jsonld-valid",
    category: "structured-data",
    title: "JSON-LD parses",
    severity: "warning",
    run({ page }) {
      const blocks = page.$('script[type="application/ld+json"]');
      if (blocks.length === 0) return [{ status: "pass", message: "No JSON-LD to validate" }];
      let bad = 0;
      blocks.each((_, el) => {
        try {
          JSON.parse(page.$(el).contents().text());
        } catch {
          bad++;
        }
      });
      return [
        bad === 0
          ? { status: "pass", message: "All JSON-LD blocks parse" }
          : { status: "fail", message: `${bad} JSON-LD block(s) invalid` },
      ];
    },
  },
  {
    id: "structured-data/jsonld-type",
    category: "structured-data",
    title: "JSON-LD has @type",
    severity: "info",
    run({ page }) {
      const blocks = page.$('script[type="application/ld+json"]');
      if (blocks.length === 0) return [{ status: "pass", message: "No JSON-LD" }];
      let typed = 0;
      blocks.each((_, el) => {
        try {
          const d = JSON.parse(page.$(el).contents().text());
          if (JSON.stringify(d).includes('"@type"')) typed++;
        } catch {
          /* ignore */
        }
      });
      return [
        typed > 0
          ? { status: "pass", message: "JSON-LD declares @type" }
          : { status: "warn", message: "No @type in JSON-LD" },
      ];
    },
  },
  {
    id: "structured-data/breadcrumb-valid",
    category: "structured-data",
    title: "Breadcrumb schema",
    severity: "info",
    run({ page }) {
      return [
        page.html.includes("BreadcrumbList")
          ? { status: "pass", message: "BreadcrumbList present" }
          : { status: "info", message: "No breadcrumb schema" },
      ];
    },
  },
  {
    id: "structured-data/duplicate-jsonld",
    category: "structured-data",
    title: "Duplicate JSON-LD types",
    severity: "info",
    run({ page }) {
      const types: string[] = [];
      page.$('script[type="application/ld+json"]').each((_, el) => {
        try {
          const d = JSON.parse(page.$(el).contents().text());
          const t = Array.isArray(d)
            ? d.map((x: { "@type"?: string }) => x["@type"])
            : [d["@type"]];
          types.push(...t.filter(Boolean));
        } catch {
          /* ignore */
        }
      });
      const dup = types.filter((t, i) => types.indexOf(t) !== i);
      return [
        dup.length === 0
          ? { status: "pass", message: "No duplicate schema types" }
          : { status: "info", message: `Duplicate schema type(s): ${[...new Set(dup)].join(", ")}` },
      ];
    },
  },
];
