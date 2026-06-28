import type { Rule } from "../types.js";

// E-E-A-T: experience, expertise, authoritativeness, trust. A static subset of
// checkable signals. Deeper signals (author bios, credentials) need richer parsing.
export const eeatRules: Rule[] = [
  {
    id: "eeat/author",
    category: "eeat",
    title: "Author attribution",
    severity: "info",
    fix: "Attribute content to a named author via a byline, rel=author, or schema author property.",
    run({ page }) {
      const has =
        page.$('meta[name="author"]').attr("content") ||
        page.$('[rel="author"]').length > 0 ||
        /"author"\s*:/.test(page.html);
      return [
        has
          ? { status: "pass", message: "Author attribution present" }
          : { status: "warn", message: "No author attribution found" },
      ];
    },
  },
  {
    id: "eeat/date",
    category: "eeat",
    title: "Published or updated date",
    severity: "info",
    fix: "Show a published or last-updated date. Freshness and transparency are trust signals.",
    run({ page }) {
      const has =
        page.$('meta[property="article:published_time"]').length > 0 ||
        page.$('meta[property="article:modified_time"]').length > 0 ||
        page.$("time[datetime]").length > 0 ||
        /"date(Published|Modified)"\s*:/.test(page.html);
      return [
        has
          ? { status: "pass", message: "Date information present" }
          : { status: "info", message: "No published or updated date found" },
      ];
    },
  },
  {
    id: "eeat/outbound-citations",
    category: "eeat",
    title: "Outbound citations",
    severity: "info",
    fix: "Cite authoritative external sources. Outbound links to reputable sites support your claims.",
    run({ page }) {
      const external = page.links.filter((l) => !l.internal && l.absUrl.startsWith("http")).length;
      return [
        external > 0
          ? { status: "pass", message: `${external} outbound link(s)` }
          : { status: "info", message: "No outbound citations" },
      ];
    },
  },
  {
    id: "eeat/about-page",
    category: "eeat",
    title: "About page",
    severity: "info",
    fix: "Link to an about page that explains who is behind the site. It is a core trust signal.",
    run({ page }) {
      const has = page.links.some((l) => /about/i.test(l.text) || /\/about/i.test(l.href));
      return [
        has
          ? { status: "pass", message: "About page link found" }
          : { status: "info", message: "No about page link found" },
      ];
    },
  },
];
