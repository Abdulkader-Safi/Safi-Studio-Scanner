import type { Collector } from "../types.js";
import { pageCollectors } from "./page.js";
import { markupCollectors } from "./markup.js";
import { directiveCollectors } from "./directives.js";

export const allCollectors: Collector[] = [
  ...pageCollectors,
  ...markupCollectors,
  ...directiveCollectors,
];

export { value, table, inRange, upTo, clip, ROW_CAP } from "./kit.js";
