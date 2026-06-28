import type { Rule } from "../types.js";

export const internationalizationRules: Rule[] = [
  {
    id: "internationalization/hreflang-present",
    category: "internationalization",
    title: "hreflang annotations",
    severity: "info",
    fix: "If the site serves more than one language or region, add hreflang link alternates so Google serves the right version.",
    run({ page }) {
      const n = page.$('link[rel="alternate"][hreflang]').length;
      return [
        n > 0
          ? { status: "pass", message: `${n} hreflang alternate(s)` }
          : { status: "info", message: "No hreflang alternates (fine for a single-language site)" },
      ];
    },
  },
  {
    id: "internationalization/hreflang-valid",
    category: "internationalization",
    title: "hreflang values valid",
    severity: "warning",
    fix: "Use valid hreflang values: a language code, language-REGION (en-US), or x-default. Include a self-referencing and an x-default tag.",
    run({ page }) {
      const tags = page.$('link[rel="alternate"][hreflang]');
      if (tags.length === 0) return [{ status: "pass", message: "No hreflang to validate" }];
      const valid = /^([a-z]{2,3}(-[A-Za-z]{2,4})?|x-default)$/;
      const bad: string[] = [];
      let hasDefault = false;
      tags.each((_, el) => {
        const v = page.$(el).attr("hreflang") || "";
        if (v.toLowerCase() === "x-default") hasDefault = true;
        if (!valid.test(v)) bad.push(v);
      });
      if (bad.length) return [{ status: "warn", message: `Invalid hreflang value(s): ${bad.join(", ")}` }];
      if (!hasDefault) return [{ status: "warn", message: "hreflang set has no x-default" }];
      return [{ status: "pass", message: "hreflang values are valid and include x-default" }];
    },
  },
];
