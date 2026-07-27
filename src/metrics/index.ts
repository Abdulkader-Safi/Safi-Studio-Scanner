import type { Collector } from "../types.js";
import { pageCollectors } from "./page.js";

export const allCollectors: Collector[] = [...pageCollectors];

export { value, table, inRange, upTo, clip, ROW_CAP } from "./kit.js";
