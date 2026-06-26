import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPageContext } from "../src/context.js";
import type { RawResponse } from "../src/types.js";

function raw(file: string, finalUrl: string): RawResponse {
  return {
    url: finalUrl,
    finalUrl,
    status: 200,
    ok: true,
    headers: {},
    html: readFileSync(new URL(`./fixtures/${file}`, import.meta.url), "utf8"),
    redirectChain: 0,
    responseTimeMs: 1,
  };
}

test("buildPageContext extracts links and images with absolute urls", () => {
  const ctx = buildPageContext(
    raw("good.html", "https://example.com/good"),
    "https://example.com",
    0,
  );
  assert.equal(ctx.links.length, 2);
  const about = ctx.links.find((l) => l.href === "/about")!;
  assert.equal(about.absUrl, "https://example.com/about");
  assert.equal(about.internal, true);
  assert.equal(ctx.images.length, 2);
  assert.equal(ctx.images[0].alt, "Hero");
});

test("buildPageContext marks missing alt as null", () => {
  const ctx = buildPageContext(
    raw("bad.html", "https://example.com/bad"),
    "https://example.com",
    1,
  );
  assert.equal(ctx.images[0].alt, null);
  assert.equal(ctx.depth, 1);
});
