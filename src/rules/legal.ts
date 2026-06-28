import type { Rule, PageLink } from "../types.js";

function linkMatches(links: PageLink[], re: RegExp): boolean {
  return links.some((l) => re.test(l.text) || re.test(l.href));
}

export const legalRules: Rule[] = [
  {
    id: "legal/privacy-policy",
    category: "legal",
    title: "Privacy policy link",
    severity: "warning",
    fix: "Link to a privacy policy. Most jurisdictions require one if you collect any personal data.",
    run({ page }) {
      return [
        linkMatches(page.links, /privacy/i)
          ? { status: "pass", message: "Privacy policy link found" }
          : { status: "warn", message: "No privacy policy link found" },
      ];
    },
  },
  {
    id: "legal/terms",
    category: "legal",
    title: "Terms of service link",
    severity: "info",
    fix: "Link to terms of service or terms and conditions to set the rules for using your site.",
    run({ page }) {
      return [
        linkMatches(page.links, /terms|conditions/i)
          ? { status: "pass", message: "Terms link found" }
          : { status: "info", message: "No terms of service link found" },
      ];
    },
  },
  {
    id: "legal/cookie-consent",
    category: "legal",
    title: "Cookie consent",
    severity: "info",
    fix: "If you set non-essential cookies, show a consent banner (a CMP) to comply with privacy law.",
    run({ page }) {
      const hint =
        /cookieconsent|cookiebot|onetrust|osano|termly|usercentrics|cookie-?banner|cookie consent/i.test(
          page.html,
        );
      return [
        hint
          ? { status: "pass", message: "Cookie consent mechanism detected" }
          : { status: "info", message: "No cookie consent banner detected" },
      ];
    },
  },
  {
    id: "legal/contact",
    category: "legal",
    title: "Contact information",
    severity: "info",
    fix: "Provide a contact link or page. It builds trust and is a positive E-E-A-T signal.",
    run({ page }) {
      return [
        linkMatches(page.links, /contact|mailto:/i)
          ? { status: "pass", message: "Contact link found" }
          : { status: "info", message: "No contact link found" },
      ];
    },
  },
];
