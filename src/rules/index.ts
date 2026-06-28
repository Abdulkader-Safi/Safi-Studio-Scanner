import type { Rule } from "../types.js";
import { coreSeoRules } from "./core-seo.js";
import { contentRules } from "./content.js";
import { linksRules } from "./links.js";
import { imagesRules } from "./images.js";
import { structuredDataRules } from "./structured-data.js";
import { securityRules } from "./security.js";
import { crawlabilityRules } from "./crawlability.js";
import { urlStructureRules } from "./url-structure.js";
import { socialMediaRules } from "./social-media.js";
import { internationalizationRules } from "./internationalization.js";
import { legalRules } from "./legal.js";
import { analyticsRules } from "./analytics.js";
import { eeatRules } from "./eeat.js";
import { accessibilityRules } from "./accessibility.js";
import { performanceRules } from "./performance.js";

export const allRules: Rule[] = [
  ...coreSeoRules,
  ...contentRules,
  ...linksRules,
  ...imagesRules,
  ...structuredDataRules,
  ...securityRules,
  ...crawlabilityRules,
  ...urlStructureRules,
  ...socialMediaRules,
  ...internationalizationRules,
  ...legalRules,
  ...analyticsRules,
  ...eeatRules,
  ...accessibilityRules,
  ...performanceRules,
];

export function selectRules(rules: Rule[], only?: string[], skip?: string[]): Rule[] {
  let out = rules;
  if (only?.length) out = out.filter((r) => only.includes(r.category));
  if (skip?.length) out = out.filter((r) => !skip.includes(r.category));
  return out;
}
