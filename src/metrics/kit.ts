// Helpers every collector uses, so a measurement is one line and the shape is
// identical everywhere.

import type { MetricCell, MetricInput, ValueStatus } from "../types.js";

// Tables exist to be read, not scrolled. Rows past this are dropped and the
// renderer says "showing 25 of 340" from `total`.
export const ROW_CAP = 25;

export function value(
  id: string,
  label: string,
  v: string | number | null,
  opts: { unit?: string; status?: ValueStatus; note?: string } = {},
): MetricInput {
  return { kind: "value", id, label, value: v, ...opts };
}

export function table(
  id: string,
  label: string,
  columns: string[],
  rows: MetricCell[][],
  opts: { cap?: number; status?: ValueStatus; note?: string } = {},
): MetricInput {
  const { cap = ROW_CAP, ...rest } = opts;
  return {
    kind: "table",
    id,
    label,
    columns,
    rows: rows.slice(0, cap),
    total: rows.length,
    ...rest,
  };
}

/** ok inside the band, warn outside it. For targets with a floor and a ceiling. */
export function inRange(n: number, min: number, max: number): ValueStatus {
  return n >= min && n <= max ? "ok" : "warn";
}

/** ok up to `warn`, warn up to `bad`, bad past it. For ceilings. */
export function upTo(n: number, warn: number, bad: number): ValueStatus {
  if (n <= warn) return "ok";
  return n <= bad ? "warn" : "bad";
}

/** Trims a long string for a table cell so one row cannot own the width. */
export function clip(s: string, max = 80): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
