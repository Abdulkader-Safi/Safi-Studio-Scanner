import type { Collector } from "../types.js";
import { pageCollectors } from "./page.js";
import { markupCollectors } from "./markup.js";
import { directiveCollectors } from "./directives.js";
import { linkCollectors } from "./links.js";
import { headingCollectors } from "./headings.js";
import { metaCollectors } from "./meta.js";

export const allCollectors: Collector[] = [
  ...pageCollectors,
  ...markupCollectors,
  ...directiveCollectors,
  ...linkCollectors,
  ...headingCollectors,
  ...metaCollectors,
];

export { value, table, inRange, upTo, clip, ROW_CAP } from "./kit.js";
