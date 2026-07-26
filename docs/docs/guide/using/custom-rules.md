---
title: Writing a rule
description: The rule interface, the context every rule reads from, and how to run your own alongside the built-in set.
---

# Writing a rule

A rule is one object. It declares who it is, then exports a `run` function that reads a context and returns findings.

```ts
interface Rule {
  id: string;                   // "core-seo/title-present"
  category: string;             // "core-seo"
  title: string;                // shown in the report
  severity: "error" | "warning" | "info";
  requiresBrowser?: boolean;    // skipped unless the page was rendered
  fix?: string;                 // default remediation line for every finding
  run(ctx: RuleContext): RuleResult[] | Promise<RuleResult[]>;
}
```

## A first rule

```ts
import type { Rule } from "safi-studio-scanner";

export const faviconRule: Rule = {
  id: "brand/favicon",
  category: "brand",
  title: "Favicon declared",
  severity: "warning",
  fix: 'Add <link rel="icon" href="/favicon.svg"> to the document head.',
  run({ page }) {
    const icon = page.$('link[rel~="icon"]').attr("href");
    if (!icon) {
      return [{ status: "fail", message: "No favicon link in the head." }];
    }
    return [{ status: "pass", message: `Favicon declared: ${icon}`, evidence: icon }];
  },
};
```

`page.$` is the cheerio instance for the parsed document, so every cheerio selector works.

## What the context holds

```ts
interface RuleContext {
  page: PageContext;
  site: SiteContext;
  checkUrl(url: string): Promise<LinkStatus>;
}
```

**`page`** is everything known about the page being audited: `url`, `finalUrl`, `status`, `ok`, `headers`, `html`, the cheerio instance `$`, `responseTimeMs`, `redirectChain`, `depth`, and two pre-extracted arrays.

```ts
page.links;   // { href, absUrl, text, rel, internal }[]
page.images;  // { src, absUrl, alt, width, height, loading }[]
page.browser; // rendered data, or undefined
```

Use `page.links` and `page.images` rather than re-querying the DOM. They are built once per page, with URLs already resolved to absolute.

**`site`** is fetched once for the whole run and shared:

```ts
site.origin;
site.startUrl;
site.robots;   // { exists, status, content, sitemaps }
site.sitemap;  // { exists, status, urls }
```

**`checkUrl`** fetches a URL through the shared pool and caches the result, so ten rules asking about the same link produce one request.

```ts
const { ok, status, redirected, chain } = await ctx.checkUrl(link.absUrl);
```

## Returning findings

A `RuleResult` needs a status and a message. Everything else is optional.

```ts
{
  status: "fail",              // pass | fail | warn | info
  message: "Human sentence describing what was found.",
  details: "Longer explanation, optional.",
  evidence: "<the offending markup, header, or value>",
  fix: "What to do about it.",
}
```

Return an array, so one rule can report on many elements:

```ts
run({ page }) {
  return page.images
    .filter((img) => img.alt === null)
    .map((img) => ({
      status: "fail" as const,
      message: `Image is missing an alt attribute.`,
      evidence: img.src,
    }));
}
```

A rule that finds nothing wrong should return a `pass`, not an empty array. An empty array contributes nothing to the score, so the rule silently stops counting.

### Overriding per finding

When one rule emits several distinct issues, each result can override the rule's own metadata:

```ts
{ status: "fail", message: "...", ruleId: "accessibility/color-contrast", title: "Colour contrast", severity: "error" }
```

That is how the accessibility rule turns one axe-core run into a finding per violation.

## Running your rules

```ts
import { audit, allRules } from "safi-studio-scanner";
import { faviconRule } from "./rules/favicon.js";

const rules = [...allRules, faviconRule];
```

:::warning Custom registries are not wired up yet
`audit()` reads the built-in registry directly; there is no `rules` option to pass your own array in. Today the way to run a custom rule is to fork, or to call the rule yourself against a context you built. A public `rules` option is [phase 1 work](/roadmap/#phase-1-report-foundation-and-free-measurements) on the roadmap, alongside the report shape changes.
:::

## Rules that need a rendered page

Set `requiresBrowser: true` and the runner skips the rule unless that page carries browser data. It is skipped, not failed, so a static run is never penalised for what it could not measure.

```ts
export const consoleErrorsRule: Rule = {
  id: "runtime/console-errors",
  category: "runtime",
  title: "No console errors",
  severity: "warning",
  requiresBrowser: true,
  run({ page }) {
    const metrics = page.browser?.metrics;
    if (!metrics) return [];
    // ...
  },
};
```

## House rules

- **One concern per rule.** A rule that checks three things cannot be scored, skipped, or explained cleanly.
- **Always give evidence.** The offending markup, header, or URL. A finding with no evidence sends the reader hunting.
- **Write the fix as an instruction.** "Add a meta description between 70 and 160 characters" beats "meta description missing".
- **Pick severity by consequence, not by annoyance.** `error` means it breaks indexing, security, or access. Most things are `warning`. `info` is for values with no correct answer.
- **Never throw.** The runner catches and downgrades to a warning, but a rule that fails quietly is better than one that fails loudly.
