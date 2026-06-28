import type { Rule } from "../types.js";

const ANALYTICS_HINTS =
  /(googletagmanager\.com|gtag\(|google-analytics\.com|ga\.js|analytics\.js|plausible\.io|cdn\.usefathom|matomo|segment\.com\/analytics|posthog|mixpanel|hotjar|clarity\.ms)/i;

export const analyticsRules: Rule[] = [
  {
    id: "analytics/tag-present",
    category: "analytics",
    title: "Analytics installed",
    severity: "info",
    fix: "Install an analytics tag (GA4, Plausible, Fathom, etc.) so you can measure traffic and behaviour.",
    run({ page }) {
      return [
        ANALYTICS_HINTS.test(page.html)
          ? { status: "pass", message: "Analytics tag detected" }
          : { status: "warn", message: "No analytics tag detected" },
      ];
    },
  },
  {
    id: "analytics/consent-mode",
    category: "analytics",
    title: "Consent mode",
    severity: "info",
    fix: "If you use Google tags in regulated regions, configure Consent Mode so tracking respects user consent.",
    run({ page }) {
      const usesGoogle = /googletagmanager\.com|gtag\(/i.test(page.html);
      if (!usesGoogle) return [{ status: "pass", message: "No Google tag, consent mode not required" }];
      return [
        /consent['"\s,]+(default|update)/i.test(page.html)
          ? { status: "pass", message: "Google Consent Mode configured" }
          : { status: "info", message: "Google tag present without visible Consent Mode" },
      ];
    },
  },
];
