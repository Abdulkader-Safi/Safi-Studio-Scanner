import type { Rule } from "../types.js";

const SOCIAL_HOSTS =
  /(linkedin\.com|twitter\.com|x\.com|instagram\.com|facebook\.com|youtube\.com|github\.com|tiktok\.com)/i;

export const socialMediaRules: Rule[] = [
  {
    id: "social-media/twitter-card",
    category: "social-media",
    title: "Twitter Card",
    severity: "info",
    fix: 'Add <meta name="twitter:card" content="summary_large_image"> so links preview well on X/Twitter.',
    run({ page }) {
      return [
        page.$('meta[name="twitter:card"]').attr("content")
          ? { status: "pass", message: "Twitter Card present" }
          : { status: "warn", message: "No twitter:card meta" },
      ];
    },
  },
  {
    id: "social-media/og-image-absolute",
    category: "social-media",
    title: "Open Graph image is absolute",
    severity: "warning",
    fix: "og:image must be an absolute https URL. Social platforms cannot resolve relative paths.",
    run({ page }) {
      const img = page.$('meta[property="og:image"]').attr("content")?.trim();
      if (!img) return [{ status: "warn", message: "No og:image to validate" }];
      return [
        /^https?:\/\//i.test(img)
          ? { status: "pass", message: "og:image is an absolute URL" }
          : { status: "fail", message: "og:image is not an absolute URL", evidence: img },
      ];
    },
  },
  {
    id: "social-media/og-url-canonical",
    category: "social-media",
    title: "og:url matches canonical",
    severity: "info",
    fix: "Set og:url to the page's canonical URL so shares consolidate to one address.",
    run({ page }) {
      const og = page.$('meta[property="og:url"]').attr("content")?.trim();
      const canon = page.$('link[rel="canonical"]').attr("href")?.trim();
      if (!og || !canon) return [{ status: "pass", message: "og:url or canonical absent, nothing to compare" }];
      return [
        og.replace(/\/$/, "") === canon.replace(/\/$/, "")
          ? { status: "pass", message: "og:url matches canonical" }
          : { status: "warn", message: "og:url does not match canonical", evidence: `${og} vs ${canon}` },
      ];
    },
  },
  {
    id: "social-media/profile-links",
    category: "social-media",
    title: "Social profile links",
    severity: "info",
    fix: "Link to your social profiles so visitors and search engines can connect your brand accounts.",
    run({ page }) {
      const has = page.links.some((l) => SOCIAL_HOSTS.test(l.absUrl));
      return [
        has
          ? { status: "pass", message: "Links to social profiles found" }
          : { status: "info", message: "No social profile links found" },
      ];
    },
  },
];
