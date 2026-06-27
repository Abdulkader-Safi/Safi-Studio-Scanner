import type { Rule } from "../types.js";

export const securityRules: Rule[] = [
  {
    id: "security/https",
    category: "security",
    title: "Served over HTTPS",
    severity: "error",
    fix: "Serve the site over HTTPS and redirect all HTTP traffic to HTTPS.",
    run({ page }) {
      return [
        page.finalUrl.startsWith("https://")
          ? { status: "pass", message: "HTTPS" }
          : { status: "fail", message: "Not served over HTTPS" },
      ];
    },
  },
  {
    id: "security/hsts",
    category: "security",
    title: "HSTS header",
    severity: "warning",
    fix: "Add the Strict-Transport-Security header to enforce HTTPS on future visits.",
    run({ page }) {
      return [
        page.headers["strict-transport-security"]
          ? { status: "pass", message: "HSTS set" }
          : { status: "warn", message: "Missing Strict-Transport-Security" },
      ];
    },
  },
  {
    id: "security/csp",
    category: "security",
    title: "Content-Security-Policy",
    severity: "warning",
    fix: "Add a Content-Security-Policy header to limit what scripts and resources can load.",
    run({ page }) {
      return [
        page.headers["content-security-policy"]
          ? { status: "pass", message: "CSP set" }
          : { status: "warn", message: "Missing Content-Security-Policy" },
      ];
    },
  },
  {
    id: "security/x-frame-options",
    category: "security",
    title: "Clickjacking protection",
    severity: "warning",
    fix: "Set X-Frame-Options: DENY or a CSP frame-ancestors directive to block clickjacking.",
    run({ page }) {
      const csp = page.headers["content-security-policy"] || "";
      const ok = page.headers["x-frame-options"] || csp.includes("frame-ancestors");
      return [
        ok
          ? { status: "pass", message: "Clickjacking protection set" }
          : { status: "warn", message: "No X-Frame-Options or frame-ancestors" },
      ];
    },
  },
  {
    id: "security/x-content-type-options",
    category: "security",
    title: "X-Content-Type-Options",
    severity: "warning",
    fix: "Add X-Content-Type-Options: nosniff to stop MIME-type sniffing.",
    run({ page }) {
      return [
        (page.headers["x-content-type-options"] || "").toLowerCase() === "nosniff"
          ? { status: "pass", message: "nosniff set" }
          : { status: "warn", message: "Missing X-Content-Type-Options: nosniff" },
      ];
    },
  },
  {
    id: "security/referrer-policy",
    category: "security",
    title: "Referrer-Policy",
    severity: "info",
    fix: "Add a Referrer-Policy header, e.g. strict-origin-when-cross-origin.",
    run({ page }) {
      return [
        page.headers["referrer-policy"]
          ? { status: "pass", message: "Referrer-Policy set" }
          : { status: "warn", message: "Missing Referrer-Policy" },
      ];
    },
  },
  {
    id: "security/mixed-content",
    category: "security",
    title: "Mixed content",
    severity: "error",
    fix: "Load every resource over HTTPS. Replace any http:// references with https://.",
    run({ page }) {
      if (!page.finalUrl.startsWith("https://"))
        return [{ status: "pass", message: "Not HTTPS, mixed content N/A" }];
      const urls = [...page.links.map((l) => l.absUrl), ...page.images.map((i) => i.absUrl)];
      const insecure = urls.filter((u) => u.startsWith("http://"));
      return [
        insecure.length === 0
          ? { status: "pass", message: "No mixed content" }
          : { status: "fail", message: `${insecure.length} insecure http resource(s) on HTTPS page` },
      ];
    },
  },
  {
    id: "security/permissions-policy",
    category: "security",
    title: "Permissions-Policy",
    severity: "info",
    fix: "Add a Permissions-Policy header to restrict powerful browser features the site does not use.",
    run({ page }) {
      return [
        page.headers["permissions-policy"]
          ? { status: "pass", message: "Permissions-Policy set" }
          : { status: "info", message: "No Permissions-Policy header" },
      ];
    },
  },
];
