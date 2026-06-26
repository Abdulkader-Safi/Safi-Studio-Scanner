import type { AuditOptions, RawResponse, LinkStatus } from "./types.js";

export function createPool(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const runNext = () => {
    if (active >= limit || queue.length === 0) return;
    active++;
    queue.shift()!();
  };
  return function run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            runNext();
          });
      });
      runNext();
    });
  };
}

function headersToObject(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  h.forEach((v, k) => {
    out[k.toLowerCase()] = v;
  });
  return out;
}

export async function fetchPage(url: string, opts: AuditOptions): Promise<RawResponse> {
  const start = performance.now();
  let current = url;
  let chain = 0;
  try {
    let res: Response;
    for (;;) {
      res = await fetch(current, {
        redirect: "manual",
        headers: { "user-agent": opts.userAgent },
        signal: AbortSignal.timeout(opts.timeout),
      });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc && chain < 10) {
        current = new URL(loc, current).toString();
        chain++;
        continue;
      }
      break;
    }
    const html = await res.text();
    return {
      url,
      finalUrl: current,
      status: res.status,
      ok: res.ok,
      headers: headersToObject(res.headers),
      html,
      redirectChain: chain,
      responseTimeMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    return {
      url,
      finalUrl: current,
      status: 0,
      ok: false,
      headers: {},
      html: "",
      redirectChain: chain,
      responseTimeMs: Math.round(performance.now() - start),
      error: (err as Error).message,
    };
  }
}

export function createLinkChecker(
  opts: AuditOptions,
  pool: <T>(fn: () => Promise<T>) => Promise<T>,
) {
  const cache = new Map<string, Promise<LinkStatus>>();
  return function checkUrl(url: string): Promise<LinkStatus> {
    const hit = cache.get(url);
    if (hit) return hit;
    const p = pool(async (): Promise<LinkStatus> => {
      let current = url;
      let chain = 0;
      try {
        for (;;) {
          let res = await fetch(current, {
            method: "HEAD",
            redirect: "manual",
            headers: { "user-agent": opts.userAgent },
            signal: AbortSignal.timeout(opts.timeout),
          });
          if (res.status === 405 || res.status === 501) {
            res = await fetch(current, {
              method: "GET",
              redirect: "manual",
              headers: { "user-agent": opts.userAgent },
              signal: AbortSignal.timeout(opts.timeout),
            });
          }
          const loc = res.headers.get("location");
          if (res.status >= 300 && res.status < 400 && loc && chain < 10) {
            current = new URL(loc, current).toString();
            chain++;
            continue;
          }
          return { ok: res.ok, status: res.status, redirected: chain > 0, chain };
        }
      } catch (err) {
        return {
          ok: false,
          status: 0,
          redirected: chain > 0,
          chain,
          error: (err as Error).message,
        };
      }
    });
    cache.set(url, p);
    return p;
  };
}

export async function fetchRobots(origin: string, opts: AuditOptions) {
  const res = await fetchPage(`${origin}/robots.txt`, opts);
  const exists = res.ok && !res.error;
  const sitemaps: string[] = [];
  if (exists) {
    for (const line of res.html.split("\n")) {
      const m = line.match(/^\s*sitemap:\s*(.+)$/i);
      if (m) sitemaps.push(m[1].trim());
    }
  }
  return { exists, status: res.status, content: exists ? res.html : "", sitemaps };
}

export async function fetchSitemap(origin: string, declared: string[], opts: AuditOptions) {
  const target = declared[0] || `${origin}/sitemap.xml`;
  const res = await fetchPage(target, opts);
  const exists = res.ok && !res.error;
  const urls: string[] = [];
  if (exists) {
    const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(res.html))) urls.push(m[1].trim());
  }
  return { exists, status: res.status, urls };
}
