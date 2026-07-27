# Safi Studio Scanner: Features

The full feature plan for the audit engine, ordered by priority and grouped into phases. Phase 0 is what ships today. Everything after it is the backlog, sequenced so each phase unlocks the next.

Status legend:

- `[done]` implemented and shipping
- `[partial]` something exists, but it does not do the whole job yet
- `[todo]` not built

Cost legend, per item:

- `(free)` computed from the HTML and headers already parsed, no extra work
- `(module)` needs a new shared module or a real chunk of logic
- `(browser)` needs the headless stage or PageSpeed Insights
- `(network)` needs extra HTTP requests beyond the page fetch
- `(external)` needs a third-party API and a key

---

## Priority Order At A Glance

| Phase | Theme                                   | Why here                                                                             |
| ----- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| 0     | Shipped today                           | Baseline: 94 rules, 15 categories, crawl, 3 formats                                  |
| 1     | Report foundation and free measurements | Nothing else lands cleanly until the report can carry values, not just verdicts      |
| 2     | Text, keyword, and readability engine   | One module unlocks four separate report sections                                     |
| 3     | Answer engine and content structure     | Where search is going, and the main differentiator                                   |
| 4     | Site-wide crawl intelligence            | The crawler already runs; cross-page findings are the payoff no single-page tool has |
| 5     | Trust, authority, and compliance        | High client value, cheap static detection                                            |
| 6     | Performance and speed depth             | Mostly surfacing timings the browser stage already collects                          |
| 7     | Tech stack fingerprinting               | Boring to build, high perceived value in a report                                    |
| 8     | Media and asset analysis                | Real value, but costs network requests, so it goes behind a flag                     |
| 9     | Mobile and browser-stage extras         | Needs Chromium, narrower audience                                                    |
| 10    | External data and site integrity        | Keys, rate limits, and heuristics with false positives                               |

---

# Phase 0: Shipped Today

The current state of the package. 94 rules across 15 categories.

## Engine And SDK

- `[done]` `audit(url, options)` as the public entry point, returning a scored report object.
- `[done]` One-line helpers: `auditToHtml`, `auditToMarkdown`, `auditScore`.
- `[done]` Pluggable rule registry: a rule is one file plus one import.
- `[done]` Multipage concurrent crawl with `maxPages`, `concurrency`, `maxDepth`.
- `[done]` `robots.txt` and `sitemap.xml` fetched once per site and shared with every rule.
- `[done]` Category filtering with `only` and `skip`.
- `[done]` Per-request timeout and custom user agent.
- `[done]` Link checking helper (`checkUrl`) shared across rules, so a URL is fetched once.
- `[done]` Health score out of 100, overall and per category, weighted by severity.
- `[done]` Optional headless browser stage via Playwright, lazy-loaded so a project that never enables it never installs Chromium.
- `[done]` Browser-free alternative through the Google PageSpeed Insights provider (`psiKey`), capped by `psiMaxPages`.
- `[done]` Core install depends on cheerio only.

## Output

- `[done]` JSON: the full report object.
- `[done]` Markdown: per-category headings, findings, score summary.
- `[done]` HTML: one self-contained file with inline CSS and color-coded findings.

## Rule Coverage Today

- `[done]` **Core SEO** (11): title present and length, meta description present and length, single H1, H1 length, canonical present, charset, viewport, robots meta indexable, Open Graph basics.
- `[done]` **Content** (6): heading hierarchy, empty headings, word count, keyword stuffing, text-to-HTML ratio, html lang.
- `[done]` **Links** (5): broken internal, broken external, redirect chains, weak anchor text, external rel.
- `[done]` **Images** (6): missing alt, missing dimensions, empty src, filename quality, lazy loading, modern format.
- `[done]` **Structured data** (11): JSON-LD present, valid, typed, `@context`, duplicates, Organization or WebSite, org logo, org sameAs, Article required fields, Article image, breadcrumb valid.
- `[done]` **Security** (12): HTTPS, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, cookie secure flags, mixed content, server disclosure, X-Powered-By.
- `[done]` **Crawlability** (6): robots.txt exists and valid, sitemap present, page indexable, canonical valid, X-Robots-Tag.
- `[done]` **URL structure** (8): length, depth, hyphens, lowercase, ASCII, no spaces, param count, readable slug.
- `[done]` **Social media** (4): Twitter card, og:image absolute, og:url matches canonical, profile links.
- `[done]` **Internationalization** (2): hreflang present, hreflang valid.
- `[done]` **Legal** (4): privacy policy, terms, cookie consent, contact.
- `[done]` **E-E-A-T** (4): author, date, outbound citations, about page.
- `[done]` **Analytics** (2): tag present, consent mode.
- `[done]` **Performance** (12): TTFB, LCP, CLS, DOM size, page weight, HTML weight, request count, stylesheet count, inline script size, render-blocking scripts, cache control, text compression.
- `[done]` **Accessibility** (1 rule, many findings): full axe-core WCAG pass, one finding per violation.

---

# Phase 1: Report Foundation And Free Measurements

**Goal:** let the report carry numbers and tables, not only pass/fail findings. Then harvest everything already sitting in the parsed DOM.

This phase was the gate, and it shipped in 1.0.2. Most of the backlog is measurements, and until this landed there was nowhere to put one.

## 1.1 Report Shape

- `[done]` `metrics` output alongside `findings`, per category, holding raw numbers and tables. (module)
- `[done]` A value status enum (`ok | warn | bad | missing`) so a measurement can carry a verdict without inventing a finding. (free)
- `[done]` Table-shaped metrics with a row cap plus a "showing N of M" count, for image lists, link lists, keyword lists, and the header tree. (free)
- `[done]` Renderers updated: metrics tables in HTML and Markdown, full metrics in JSON. (module)
- `[partial]` Score out of 100 exists. Keep it, and surface it as one headline number with the per-category breakdown underneath.

## 1.2 Page Basics As Values

- `[done]` HTTP status code reported as a value. (free)
- `[done]` Page size in KB, human readable. Measured today by `performance/html-weight`, never surfaced. (free)
- `[done]` Declared language value, not just a pass on `content/html-lang`. (free)
- `[done]` Published date and updated date, read from meta tags, JSON-LD, and article tags. (free)
- `[done]` Character counts returned for title, description, and H1, so a consumer can render "49 characters, recommended 30 to 60". (free)
- `[done]` H1 length rule with a 10 to 70 target, and H1 count reported as a value. (free)
- `[partial]` Count of elements hidden with `display:none` is reported. The option to include or exclude them from text analysis lands with the phase 2 text module, which is the thing that would read it. (free)

## 1.3 Markup Hygiene Counters

- `[done]` Inline `style` attribute count. (free)
- `[done]` `<style>` blocks inside `<body>` count. (free)
- `[done]` `<script>` tag count. (free)
- `[done]` HTML comment node count. (free)
- `[done]` Placeholder link count (`<a href="#">`). (free)

## 1.4 Index And Directive Values

- `[done]` Robots meta, X-Robots-Tag, canonical, hreflang, and robots.txt all have rules. Their resolved values are reported too. (free)
- `[done]` Canonical match: does the canonical equal the URL actually audited. (free)

## 1.5 Link Tables

- `[done]` Link counters as values: internal, external, dofollow, nofollow, duplicate. (free)
- `[done]` Dofollow link table: URL, anchor text, occurrence count, internal or external. (free)
- `[done]` Nofollow link table, same shape. (free)
- `[done]` Duplicate link table: one row per URL with every distinct anchor used for it and the total count. The most useful single table for internal linking cleanup. (free)

## 1.6 Header Structure

- `[done]` Header count per level, H1 through H6. (free)
- `[done]` Header structure tree in document order, with nesting depth and heading text. (free)
- `[done]` Per-heading child-element counts, for example "IMG: 1, UL: 1", so a reader sees which sections carry media or lists. (free)

## 1.7 Meta Tables

- `[done]` `core-seo/open-graph-basics` checks three tags. The full table is reported with per-property state: og:title, og:description, og:image, og:url, og:type, og:site_name, og:locale. (free)
- `[done]` `social-media/twitter-card` exists. The full table is reported: twitter:card, twitter:title, twitter:description, twitter:image, twitter:site, twitter:creator. (free)
- `[done]` Image alt coverage as a pair of counts, with-alt versus without-alt. (free)
- `[done]` HTTP image count reported as its own number for the mixed-content section. (free)

---

# Phase 2: Text, Keyword, And Readability Engine

**Goal:** one text-analysis module. It unlocks text statistics, top words, the keyword relevance matrix, keyword highlighting in headings, and a better version of the keyword-stuffing rule.

## 2.1 The Module

- `[todo]` Tokenizer that respects the page language and strips boilerplate. (module)
- `[todo]` Stop word lists per language, starting with English. (module)
- `[todo]` Lemma grouping so "development" and "developments" collapse into one row. (module)
- `[todo]` N-gram extraction for 1-word, 2-word, and 3-word phrases. (module)
- `[todo]` Main-content extraction so nav and footer text do not pollute every statistic. (module)

## 2.2 Text Statistics

- `[done]` Total word count.
- `[done]` Text-to-HTML ratio.
- `[todo]` Unique word count and unique percentage. (free after 2.1)
- `[todo]` Stop word count and percentage. (free after 2.1)
- `[todo]` Water or redundancy percentage: the share of words carrying no meaning. (free after 2.1)
- `[todo]` Average sentence length in words. (free after 2.1)
- `[todo]` Character count excluding spaces. (free)

## 2.3 Readability

- `[todo]` Flesch reading ease with a label (Easy, Medium, Difficult). (free after 2.1)
- `[todo]` Flesch-Kincaid grade level. (free after 2.1)
- `[todo]` Gunning Fog index. (free after 2.1)

## 2.4 Keyword Analysis

- `[todo]` Top words table for 1, 2, and 3-word phrases, each with count and percentage. (free after 2.1)
- `[todo]` Stop word table with per-word count and percentage. (free after 2.1)
- `[todo]` Top 10 keyword relevance matrix: for each keyword, present or absent in title, description, and H1. (free after 2.1)
- `[todo]` Keyword highlight markers for title, description, H1, and every heading, so a renderer can mark the matched spans. (free after 2.1)
- `[partial]` `content/keyword-stuffing` gets rewritten to read the n-gram output instead of doing its own counting.

---

# Phase 3: Answer Engine And Content Structure

**Goal:** the part most audit tools do not have. All of it runs on the DOM already parsed, and it maps directly to how AI answers and featured snippets pick content.

## 3.1 Answer Engine Optimization

- `[todo]` Answer snippet check: is there a definition or short answer in the first four content blocks, which block it is, and its length in words. (module)
- `[todo]` Q&A structure check: count of question-like H2s, how many have a short answer directly beneath, and the coverage ratio. (module)
- `[todo]` Answer format check: counts of lists, step sequences, tables, and definitions. (free)

## 3.2 Topic Cluster Signals

- `[todo]` Internal links inside main content only, excluding nav and footer: total count and unique URL count. (free after 2.1)
- `[todo]` Related-reading or related-cluster section detection, and how many links it holds. (free)
- `[todo]` Distinct H2 topic count next to H3 count. (free)
- `[todo]` Anchor descriptiveness ratio: descriptive anchors over total anchors. (free)

## 3.3 Passage-Friendly Structure

- `[todo]` H2 section count. (free)
- `[todo]` Average words per H2 section, with min and max, against a target band. (free after 2.1)
- `[todo]` List, step, and table block counts. (free)
- `[todo]` Definition-format block count (`<dl>` elements and term-separator patterns). (free)

## 3.4 Agent Experience

- `[todo]` AI crawler access: does robots.txt allow GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended. (free)
- `[todo]` `llms.txt` present and parseable. (network)
- `[todo]` Content reachable without JavaScript: does the raw HTML contain the main content. (free)
- `[todo]` Page-type hint: can the page purpose be identified from schema and structure. (free)

## 3.5 Schema Depth

- `[done]` JSON-LD present, valid, typed, `@context`, duplicates, Organization, Article, breadcrumb.
- `[todo]` Nested schema tree output: parent types with their children, for example Article containing Organization and WebPage, FAQPage containing Question containing Answer, LocalBusiness containing GeoCoordinates, OpeningHoursSpecification, Place, PostalAddress, Service. (module)
- `[todo]` Presence status per node in that tree, rather than one verdict per rule. (module)
- `[todo]` Microdata and RDFa detection, not only JSON-LD. (module)
- `[todo]` FAQPage and HowTo validation when present. (free)

---

# Phase 4: Site-Wide Crawl Intelligence

**Goal:** the crawler already visits many pages, but every rule looks at one page in isolation. Cross-page findings are the highest-value thing this codebase can add for the least new infrastructure.

- `[todo]` Duplicate title tags across the crawl, grouped with the URLs that share them. (module)
- `[todo]` Duplicate meta descriptions, same shape. (module)
- `[todo]` Duplicate H1s, same shape. (module)
- `[todo]` Near-duplicate content detection across pages via a shingle hash. (module)
- `[todo]` Orphan pages: in the sitemap but never linked from any crawled page. (module)
- `[todo]` Internal link graph: inbound link count per URL, so thin-linked pages surface. (module)
- `[todo]` Click depth per page from the start URL, with a warning past a threshold. (free)
- `[todo]` Site-wide redirect map: every internal link that lands on a redirect, and where it ends. (free)
- `[todo]` Sitemap versus crawl reconciliation: in the sitemap but not crawlable, crawlable but not in the sitemap. (free)
- `[todo]` Crawl from the sitemap directly, not only by following links. (module)
- `[todo]` Score thresholds for CI: fail the run under a given overall or per-category score. (free)
- `[todo]` A CLI wrapper over the library: run an audit from a terminal or a CI step with no script to write. Dropped in 1.0.1, returning on top of the stable API. (module)

---

# Phase 5: Trust, Authority, And Compliance

**Goal:** the E-E-A-T section clients actually read. Almost all of it is cheap pattern detection.

## 5.1 Experience And Expertise

- `[done]` Author name, publish and updated date, outbound citations.
- `[todo]` Author box or byline block detected as a unit. (free)
- `[todo]` Author page link. (free)
- `[todo]` Short author bio present. (free)
- `[todo]` Report the actual publish and updated dates as values, not just a pass. (free)
- `[todo]` Structured data trust signals listed by name: which of Article, BlogPosting, Organization, author, datePublished, dateModified are present. (free)

## 5.2 Trust

- `[done]` HTTPS, privacy policy, terms, contact page.
- `[todo]` Refund or returns page. (free)
- `[todo]` Phone number and physical address on the page. (free)
- `[todo]` Ads or affiliate disclosure detected by keyword patterns. (free)

## 5.3 Authoritativeness

- `[done]` About page, organization or publisher present, social profile links.
- `[todo]` Editorial policy or ethics page. (free)
- `[todo]` Citation quality: are outbound citations pointing at recognized authoritative domains. (module)

## 5.4 Local SEO

- `[todo]` NAP consistency: name, address, and phone matching between the page text and LocalBusiness schema. (module)
- `[todo]` LocalBusiness schema completeness: address, geo, opening hours. (free)
- `[todo]` Google Business Profile link present. (free)

---

# Phase 6: Performance And Speed Depth

**Goal:** the browser stage already collects a Navigation Timing entry. Most of this is surfacing values that are being thrown away.

## 6.1 Timing Passthrough

- `[done]` TTFB, LCP, CLS, DOM size, page weight, request count.
- `[todo]` Total load time. (browser)
- `[todo]` DNS lookup time. (browser)
- `[todo]` TCP connection time. (browser)
- `[todo]` Response time, reported separately from TTFB. (browser)
- `[todo]` DOM interactive, DOM content loaded, DOM complete. (browser)
- `[todo]` FCP. (browser)
- `[todo]` INP, with an explicit "not measurable without interaction" state instead of an undefined value. (browser)
- `[todo]` Layout shift event count and largest single shift. (browser)
- `[todo]` Slow resource list: every request over a threshold, default 300ms, with a clean "none exceeded" result. (browser)

## 6.2 Static Performance Rules

- `[done]` Cache control, text compression, render-blocking scripts, stylesheet count, inline script size.
- `[todo]` Font loading: `font-display`, preloads, count of font files. (free)
- `[todo]` HTTP/2 or HTTP/3 in use. (free)
- `[todo]` Preconnect and DNS-prefetch for third-party origins. (free)
- `[todo]` Third-party script weight and count. (free)

---

# Phase 7: Tech Stack Fingerprinting

**Goal:** a signature table matched against HTML, script sources, and response headers. Mechanical to build, and it always lands well in a client report.

- `[partial]` `analytics/tag-present` detects one tag. Break it out per vendor.
- `[todo]` Analytics detection per vendor: Google Analytics, Google Tag Manager, Hotjar, Clarity, Matomo, Plausible, Fathom. (module)
- `[todo]` Ad pixel detection per vendor: Google Ads, Meta, TikTok, LinkedIn, X, Pinterest, Snap. (module)
- `[todo]` CMS detection: WordPress, Shopify, Webflow, Wix, Drupal, Joomla, Squarespace, Ghost. (module)
- `[todo]` Framework and library detection: React, Next.js, Vue, Nuxt, Angular, Svelte, jQuery, Laravel. (module)
- `[todo]` CDN detection from headers and asset hosts: Cloudflare, Fastly, Akamai, CloudFront, Vercel, Netlify. (module)
- `[todo]` Server and hosting hints from response headers, without leaking anything the security rules flag. (free)

---

# Phase 8: Media And Asset Analysis

**Goal:** real image and video auditing. It costs extra requests, so it lives behind an opt-in flag with a hard request cap.

- `[done]` Missing alt, missing dimensions, empty src, filename quality, lazy loading, modern format.
- `[todo]` Per-image table: URL, pixel dimensions, transfer size, optimization verdict. (network)
- `[todo]` Natural dimensions via HEAD or a ranged GET per image, capped and opt-in. (network)
- `[todo]` Optimization estimate per image, for example "about 15 to 25 percent smaller via oxipng or zopfli", from a byte-level heuristic per format. (module)
- `[todo]` Oversized images: served dimensions far larger than the layout box. (browser)
- `[todo]` Responsive image checks: `srcset` and `sizes` present where they matter. (free)
- `[todo]` Video schema, thumbnail, and caption checks. (free)
- `[todo]` Favicon and app icon presence and sizes. (network)

---

# Phase 9: Mobile And Browser-Stage Extras

**Goal:** everything that needs a real viewport. Narrower value than the phases above, and it forces the Chromium install.

- `[done]` axe-core WCAG pass through the browser stage.
- `[todo]` Tap target size below the minimum. (browser)
- `[todo]` Font size too small to read on mobile. (browser)
- `[todo]` Horizontal overflow at mobile widths. (browser)
- `[todo]` Intrusive interstitial detection. (browser)
- `[todo]` Viewport behavior: zoom disabled, fixed widths. (free)
- `[todo]` Console errors captured during load. (browser)
- `[todo]` JavaScript dependency: what content goes missing when scripting is off. (browser)
- `[todo]` Screenshot capture, full page and above the fold, attached to the report. (browser)

---

# Phase 10: External Data And Site Integrity

**Goal:** the last mile. Needs API keys, has rate limits, and carries false-positive risk, so it stays opt-in and never runs by default.

## 10.1 External Providers

- `[todo]` Backlink lookup for a domain, behind a provider interface and a key. (external)
- `[todo]` Keyword and content gap analysis from live search data. (external)
- `[todo]` Index coverage check against a search API. (external)

## 10.2 Site Integrity

- `[todo]` Obfuscated or suspicious inline scripts. (module)
- `[todo]` Injected spam content and hidden keyword blocks. (module)
- `[todo]` Known malware and phishing kit patterns. (module)
- `[todo]` Leaked secrets in inline scripts, a basic pattern scan. (free)
- `[todo]` Ad-blocker and privacy-filter impact on tracking and content. (browser)

---

## Build Notes

Three things decide the order above.

**Phase 1 was a hard gate, and it is done.** Roughly sixty items on this list are measurements, and the report object had nowhere to put one. Shipped in 1.0.2: `metrics` beside `findings`, a `ValueStatus` that never touches the score, capped tables, all three renderers, and a public `collectors` registry. Everything after this builds on that shape rather than inventing its own.

**Phase 2 is one module, four features.** The tokenizer with stop words, lemmas, and n-grams pays for text statistics, the top-words table, the relevance matrix, heading keyword highlights, and a rewrite of the keyword-stuffing rule. It is the best ratio on the list.

**Phase 4 may deserve to move up.** Answer-engine checks in phase 3 are the newer idea, but cross-page duplicate detection and orphan pages are what a paying audit customer expects, and the crawl infrastructure for them already exists. If the order changes, that is the swap to make.
