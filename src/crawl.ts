import { fetchPage } from "./http.js";
import { buildPageContext } from "./context.js";
import type { AuditOptions, PageContext } from "./types.js";

function normalize(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.toString();
  } catch {
    return u;
  }
}

export async function crawl(
  startUrl: string,
  opts: AuditOptions,
  pool: <T>(fn: () => Promise<T>) => Promise<T>,
  /** Fired as each page lands, so a caller can report progress mid-crawl. */
  onPage?: (page: PageContext, index: number, ms: number) => void,
): Promise<PageContext[]> {
  const origin = new URL(startUrl).origin;
  const seen = new Set<string>([normalize(startUrl)]);
  let frontier: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
  const pages: PageContext[] = [];

  while (frontier.length > 0 && pages.length < opts.maxPages) {
    const batch = frontier;
    frontier = [];
    const built = await Promise.all(
      batch.map((item) =>
        pool(async () => {
          const started = Date.now();
          const res = await fetchPage(item.url, opts);
          return {
            ctx: buildPageContext(res, origin, item.depth),
            depth: item.depth,
            ms: Date.now() - started,
          };
        }),
      ),
    );

    for (const { ctx, depth, ms } of built) {
      if (pages.length >= opts.maxPages) break;
      pages.push(ctx);
      onPage?.(ctx, pages.length, ms);
      if (depth >= opts.maxDepth) continue;
      for (const link of ctx.links) {
        if (!link.internal || !link.absUrl) continue;
        const n = normalize(link.absUrl);
        if (seen.has(n)) continue;
        seen.add(n);
        frontier.push({ url: link.absUrl, depth: depth + 1 });
      }
    }
  }
  return pages.slice(0, opts.maxPages);
}
