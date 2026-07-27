---
title: Rule catalog
description: All 94 checks across 15 categories, with rule ids and severities.
---

# Rule catalog

94 rules across 15 categories. Thirteen categories need nothing but the fetched HTML and response headers. Two, links and images, make extra requests. Accessibility and the Core Web Vitals half of performance need a [rendered page](/guide/using/rendered-checks).

Every rule id is `category/name`, and the category half is what `only` and `skip` accept.

```ts
import { allRules, selectRules } from "safi-studio-scanner";

console.log(allRules.length); // 94
const security = selectRules(allRules, ["security"]);
```

Rules are only half of a report. The numbers that sit alongside them are in the [measurement catalog](/guide/using/measurements).

## Core SEO

11 rules. The checks a search engine reads first.

| Rule | Title | Severity |
| --- | --- | --- |
| `core-seo/title-present` | Title tag present | error |
| `core-seo/title-length` | Title length | warning |
| `core-seo/meta-description-present` | Meta description present | error |
| `core-seo/meta-description-length` | Meta description length | warning |
| `core-seo/single-h1` | Exactly one H1 | warning |
| `core-seo/h1-length` | H1 length | info |
| `core-seo/canonical-present` | Canonical URL present | warning |
| `core-seo/charset-declared` | Charset declared | warning |
| `core-seo/viewport-present` | Viewport meta present | warning |
| `core-seo/robots-meta-indexable` | Page is indexable | error |
| `core-seo/open-graph-basics` | Open Graph basics | info |

## Performance

12 rules. The first six read the response. The last six need a rendered page and are skipped without one.

| Rule | Title | Severity |
| --- | --- | --- |
| `performance/render-blocking-scripts` | Render-blocking scripts | warning |
| `performance/stylesheet-count` | Stylesheet count | info |
| `performance/inline-script-size` | Inline script size | info |
| `performance/text-compression` | Text compression | warning |
| `performance/cache-control` | Cache headers | info |
| `performance/html-weight` | HTML document size | info |
| `performance/lcp` | Largest Contentful Paint | error |
| `performance/cls` | Cumulative Layout Shift | warning |
| `performance/ttfb` | Time to First Byte | warning |
| `performance/dom-size` | DOM size | info |
| `performance/page-weight` | Page weight | warning |
| `performance/request-count` | Request count | info |

## Security

12 rules, all read from response headers.

| Rule | Title | Severity |
| --- | --- | --- |
| `security/https` | Served over HTTPS | error |
| `security/mixed-content` | Mixed content | error |
| `security/hsts` | HSTS header | warning |
| `security/csp` | Content-Security-Policy | warning |
| `security/x-frame-options` | Clickjacking protection | warning |
| `security/x-content-type-options` | X-Content-Type-Options | warning |
| `security/cookie-secure` | Secure cookies | warning |
| `security/referrer-policy` | Referrer-Policy | info |
| `security/permissions-policy` | Permissions-Policy | info |
| `security/coop` | Cross-Origin-Opener-Policy | info |
| `security/server-disclosure` | Server header disclosure | info |
| `security/x-powered-by` | X-Powered-By disclosure | info |

## Structured data

11 rules covering JSON-LD parsing, types, and the two schemas that matter most.

| Rule | Title | Severity |
| --- | --- | --- |
| `structured-data/jsonld-present` | JSON-LD present | info |
| `structured-data/jsonld-valid` | JSON-LD parses | warning |
| `structured-data/jsonld-type` | JSON-LD has @type | info |
| `structured-data/context-declared` | JSON-LD @context | info |
| `structured-data/duplicate-jsonld` | Duplicate JSON-LD types | info |
| `structured-data/org-or-website` | Organization or WebSite schema | warning |
| `structured-data/org-logo` | Organization logo | info |
| `structured-data/org-sameas` | Organization sameAs links | info |
| `structured-data/article-required` | Article required fields | warning |
| `structured-data/article-image` | Article schema has image | info |
| `structured-data/breadcrumb-valid` | Breadcrumb schema | info |

## URL structure

8 rules, applied to every crawled URL.

| Rule | Title | Severity |
| --- | --- | --- |
| `url-structure/lowercase` | Lowercase URL | warning |
| `url-structure/hyphens` | Hyphens not underscores | warning |
| `url-structure/no-spaces` | No spaces in URL | warning |
| `url-structure/ascii` | ASCII or encoded characters | info |
| `url-structure/param-count` | Few query parameters | info |
| `url-structure/readable` | Readable, word-based path | info |
| `url-structure/length` | URL length | info |
| `url-structure/depth` | Shallow path depth | info |

## Content

6 rules on the page text and its heading structure.

| Rule | Title | Severity |
| --- | --- | --- |
| `content/heading-hierarchy` | Heading hierarchy | warning |
| `content/no-empty-headings` | No empty headings | warning |
| `content/html-lang` | HTML lang attribute | warning |
| `content/word-count` | Word count | info |
| `content/keyword-stuffing` | Keyword stuffing | info |
| `content/text-html-ratio` | Text to HTML ratio | info |

## Crawlability

6 rules. `robots.txt` and the sitemap are fetched once per site and shared.

| Rule | Title | Severity |
| --- | --- | --- |
| `crawlability/page-indexable` | Page indexable | error |
| `crawlability/robots-exists` | robots.txt exists | warning |
| `crawlability/sitemap-present` | Sitemap present | warning |
| `crawlability/canonical-valid` | Canonical valid | warning |
| `crawlability/robots-valid` | robots.txt valid | info |
| `crawlability/x-robots-tag` | X-Robots-Tag header | info |

## Images

6 rules, read from every `<img>` on the page.

| Rule | Title | Severity |
| --- | --- | --- |
| `images/img-alt` | Image alt text | error |
| `images/img-dimensions` | Image dimensions | warning |
| `images/img-empty-src` | Image src present | warning |
| `images/img-modern-format` | Modern image formats | info |
| `images/img-lazy-loading` | Lazy loading | info |
| `images/img-filename-quality` | Image filenames | info |

## Links

5 rules. This category makes extra requests: every unique link is checked once and the result is cached for the whole run.

| Rule | Title | Severity |
| --- | --- | --- |
| `links/broken-internal` | Broken internal links | error |
| `links/broken-external` | Broken external links | warning |
| `links/redirect-chains` | Redirect chains | warning |
| `links/weak-anchor-text` | Weak anchor text | info |
| `links/external-rel` | External link rel | info |

## Social media

4 rules on the sharing metadata.

| Rule | Title | Severity |
| --- | --- | --- |
| `social-media/og-image-absolute` | Open Graph image is absolute | warning |
| `social-media/twitter-card` | Twitter Card | info |
| `social-media/og-url-canonical` | og:url matches canonical | info |
| `social-media/profile-links` | Social profile links | info |

## Legal

4 rules looking for the pages a compliant site is expected to carry.

| Rule | Title | Severity |
| --- | --- | --- |
| `legal/privacy-policy` | Privacy policy link | warning |
| `legal/terms` | Terms of service link | info |
| `legal/cookie-consent` | Cookie consent | info |
| `legal/contact` | Contact information | info |

## E-E-A-T

4 rules on experience, expertise, authority, and trust signals.

| Rule | Title | Severity |
| --- | --- | --- |
| `eeat/author` | Author attribution | info |
| `eeat/date` | Published or updated date | info |
| `eeat/outbound-citations` | Outbound citations | info |
| `eeat/about-page` | About page | info |

## Analytics

2 rules.

| Rule | Title | Severity |
| --- | --- | --- |
| `analytics/tag-present` | Analytics installed | info |
| `analytics/consent-mode` | Consent mode | info |

## Internationalization

2 rules on hreflang.

| Rule | Title | Severity |
| --- | --- | --- |
| `internationalization/hreflang-present` | hreflang annotations | info |
| `internationalization/hreflang-valid` | hreflang values valid | warning |

## Accessibility

1 rule that emits many findings. The full axe-core WCAG pass runs against the rendered page and each violation becomes its own finding, carrying its own axe rule id, impact, and help URL.

| Rule | Title | Severity |
| --- | --- | --- |
| `accessibility/axe` | Accessibility (axe-core) | warning |

Without `browser: true` or a `psiKey`, this rule is skipped rather than failed.
