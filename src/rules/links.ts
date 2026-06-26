import type { Rule } from "../types.js";

export const linksRules: Rule[] = [
  {
    id: "links/broken-internal",
    category: "links",
    title: "Broken internal links",
    severity: "error",
    async run({ page, checkUrl }) {
      const targets = [
        ...new Set(page.links.filter((l) => l.internal && l.absUrl).map((l) => l.absUrl)),
      ];
      const checked = await Promise.all(targets.map(async (u) => ({ u, s: await checkUrl(u) })));
      const broken = checked.filter((r) => r.s.status >= 400 || r.s.status === 0);
      if (broken.length === 0)
        return [{ status: "pass", message: `All ${targets.length} internal links OK` }];
      return broken.map((b) => ({
        status: "fail" as const,
        message: `Broken internal link (${b.s.status || "no response"})`,
        evidence: b.u,
      }));
    },
  },
  {
    id: "links/broken-external",
    category: "links",
    title: "Broken external links",
    severity: "warning",
    async run({ page, checkUrl }) {
      const targets = [
        ...new Set(
          page.links.filter((l) => !l.internal && l.absUrl.startsWith("http")).map((l) => l.absUrl),
        ),
      ];
      const checked = await Promise.all(targets.map(async (u) => ({ u, s: await checkUrl(u) })));
      const broken = checked.filter((r) => r.s.status >= 400 || r.s.status === 0);
      if (broken.length === 0)
        return [{ status: "pass", message: `All ${targets.length} external links OK` }];
      return broken.map((b) => ({
        status: "warn" as const,
        message: `Broken external link (${b.s.status || "no response"})`,
        evidence: b.u,
      }));
    },
  },
  {
    id: "links/redirect-chains",
    category: "links",
    title: "Redirect chains",
    severity: "warning",
    run({ page }) {
      return [
        page.redirectChain > 1
          ? { status: "warn", message: `Page redirected ${page.redirectChain} times before loading` }
          : { status: "pass", message: "No redirect chain" },
      ];
    },
  },
  {
    id: "links/weak-anchor-text",
    category: "links",
    title: "Weak anchor text",
    severity: "info",
    run({ page }) {
      const weak = /^(click here|read more|here|learn more|more|link|this)$/i;
      const bad = page.links.filter((l) => weak.test(l.text.trim()));
      return [
        bad.length === 0
          ? { status: "pass", message: "No generic anchor text" }
          : {
              status: "warn",
              message: `${bad.length} link(s) with generic anchor text`,
              evidence: bad.slice(0, 3).map((b) => b.text).join(", "),
            },
      ];
    },
  },
  {
    id: "links/external-rel",
    category: "links",
    title: "External link rel",
    severity: "info",
    run({ page }) {
      const missing = page.links.filter(
        (l) =>
          !l.internal &&
          l.absUrl.startsWith("http") &&
          !l.rel.includes("noopener") &&
          !l.rel.includes("noreferrer"),
      );
      return [
        missing.length === 0
          ? { status: "pass", message: "External links have safe rel attributes" }
          : { status: "warn", message: `${missing.length} external link(s) missing rel=noopener` },
      ];
    },
  },
];
