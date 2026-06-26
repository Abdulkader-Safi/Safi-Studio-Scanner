import type { Rule } from "../types.js";
import { coreSeoRules } from "./core-seo.js";
import { contentRules } from "./content.js";
import { linksRules } from "./links.js";
import { imagesRules } from "./images.js";
import { structuredDataRules } from "./structured-data.js";
import { securityRules } from "./security.js";
import { crawlabilityRules } from "./crawlability.js";

export const allRules: Rule[] = [
  ...coreSeoRules,
  ...contentRules,
  ...linksRules,
  ...imagesRules,
  ...structuredDataRules,
  ...securityRules,
  ...crawlabilityRules,
];

export function selectRules(rules: Rule[], only?: string[], skip?: string[]): Rule[] {
  let out = rules;
  if (only?.length) out = out.filter((r) => only.includes(r.category));
  if (skip?.length) out = out.filter((r) => !skip.includes(r.category));
  return out;
}
