// Link tables. The duplicate table is the one that earns its place: one row per
// URL with every distinct anchor pointing at it, which is how you find the page
// linked four times under four different names.

import type { Collector, PageLink } from "../types.js";
import { clip, table, value } from "./kit.js";

function isFollowed(l: PageLink): boolean {
  return !/\bnofollow\b/.test(l.rel);
}

function scope(l: PageLink): string {
  return l.internal ? "internal" : "external";
}

/** URL, every distinct anchor used for it, and how many times it appears. */
function byTarget(links: PageLink[]): (string | number)[][] {
  const targets = new Map<string, { anchors: Set<string>; count: number; internal: boolean }>();
  for (const l of links) {
    if (!l.absUrl) continue;
    let t = targets.get(l.absUrl);
    if (!t) {
      t = { anchors: new Set(), count: 0, internal: l.internal };
      targets.set(l.absUrl, t);
    }
    t.count++;
    if (l.text) t.anchors.add(l.text);
  }
  return [...targets.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([url, t]) => [
      clip(url, 70),
      t.anchors.size ? clip([...t.anchors].join(" · "), 60) : "—",
      t.count,
      t.internal ? "internal" : "external",
    ]);
}

function linkRows(links: PageLink[]): (string | number)[][] {
  return links
    .filter((l) => l.absUrl)
    .map((l) => [clip(l.absUrl, 70), l.text ? clip(l.text, 50) : "—", scope(l)]);
}

export const linkCollectors: Collector[] = [
  {
    id: "links/inventory",
    category: "links",
    collect({ page }) {
      const links = page.links;
      const resolved = links.filter((l) => l.absUrl);
      const internal = resolved.filter((l) => l.internal);
      const external = resolved.filter((l) => !l.internal);
      const dofollow = resolved.filter(isFollowed);
      const nofollow = resolved.filter((l) => !isFollowed(l));
      const duplicates = byTarget(resolved).filter((r) => (r[2] as number) > 1);

      const out = [
        value("links/total", "Links", links.length, {
          // A malformed href resolves to nothing, so say so rather than let the
          // internal and external counts quietly fail to add up.
          note:
            `${internal.length} internal, ${external.length} external` +
            (resolved.length < links.length ? `, ${links.length - resolved.length} unresolved` : ""),
        }),
        value("links/internal-count", "Internal links", internal.length),
        value("links/external-count", "External links", external.length),
        value("links/dofollow-count", "Dofollow links", dofollow.length),
        value("links/nofollow-count", "Nofollow links", nofollow.length),
        value("links/duplicate-count", "Duplicated targets", duplicates.length, {
          status: duplicates.length === 0 ? "ok" : "warn",
          note: "URLs linked more than once from this page",
        }),
      ];

      // Tables only when they have something in them.
      if (dofollow.length)
        out.push(
          table("links/dofollow-table", "Dofollow links", ["URL", "Anchor", "Scope"], linkRows(dofollow)),
        );
      if (nofollow.length)
        out.push(
          table("links/nofollow-table", "Nofollow links", ["URL", "Anchor", "Scope"], linkRows(nofollow)),
        );
      if (duplicates.length)
        out.push(
          table(
            "links/duplicate-table",
            "Duplicated link targets",
            ["URL", "Anchors used", "Count", "Scope"],
            duplicates,
          ),
        );
      return out;
    },
  },
];
