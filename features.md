# Safi Studio Scanner: features

This is the feature backlog. It lists what ships in the first version, then the full rule catalog we grow into. Status legend:

- `[v0.1]` ships in the first build
- `[shipped]` built and available now (includes browser mode)
- `[later]` planned, behind the rule registry
- `[browser]` needs the headless browser stage (a later version)

## Core product features

- `[v0.1]` Audit a single URL from the terminal.
- `[v0.1]` Export one report as HTML, Markdown, or JSON via `--format`.
- `[v0.1]` Write to a file with `--out`, or print to stdout.
- `[v0.1]` Filter categories with `--only` and `--skip`.
- `[v0.1]` Per-request timeout and custom user agent.
- `[v0.1]` Health score out of 100, overall and per category.
- `[v0.1]` Pluggable rule registry: add a rule with one file and one import.
- `[v0.1]` Library entry point `audit(url, options)` so the engine can be imported.
- `[shipped]` Multi-page concurrent crawl (`--max-pages`, `--concurrency`, `--depth`).
- `[shipped]` Headless browser stage via `--browser` (Playwright + axe-core + Core Web Vitals).
- `[later]` SDK packaging with a stable public API.
- `[later]` Multi-page crawl from the sitemap directly.
- `[later]` CI-friendly exit codes and score thresholds (`--fail-under`).

## Output formats

- `[v0.1]` JSON: the full report object for pipelines and CI.
- `[v0.1]` Markdown: per-category headings, findings table, score summary.
- `[v0.1]` HTML: one self-contained file, inline CSS, score badges, color-coded findings.

---

## Starter rule set (v0.1)

Roughly 45 static rules across 7 categories. All run from fetched HTML and headers, no browser.

### Core SEO

- `[v0.1]` Title tag present and non-empty
- `[v0.1]` Title length within a sane range (about 30 to 60 characters)
- `[v0.1]` Meta description present
- `[v0.1]` Meta description length within range (about 70 to 160 characters)
- `[v0.1]` Exactly one H1 on the page
- `[v0.1]` Canonical URL present and well-formed
- `[v0.1]` Charset declared
- `[v0.1]` Viewport meta present
- `[v0.1]` Robots meta does not accidentally block indexing
- `[v0.1]` Open Graph basics present (og:title, og:description, og:image)

### Content

- `[v0.1]` Heading hierarchy has no skipped levels (no H3 before an H2)
- `[v0.1]` Word count above a thin-content threshold
- `[v0.1]` No empty headings
- `[v0.1]` Keyword stuffing check (no single word over-repeated)
- `[v0.1]` Page has a meaningful text-to-HTML ratio
- `[v0.1]` Language attribute set on `<html>`

### Links

- `[v0.1]` Broken internal links (capped concurrent HEAD or GET requests)
- `[v0.1]` Broken external links (same, with a request cap)
- `[v0.1]` Redirect chains flagged (more than one hop)
- `[v0.1]` Links with empty or generic anchor text ("click here", "read more")
- `[v0.1]` External links missing rel attributes where expected
- `[v0.1]` Mixed-content links on an HTTPS page

### Images

- `[v0.1]` Images missing alt text
- `[v0.1]` Images missing width and height attributes
- `[v0.1]` Oversized image files (over a size threshold)
- `[v0.1]` Non-modern formats where a modern one is expected (no WebP or AVIF)
- `[v0.1]` Lazy loading absent on below-the-fold images
- `[v0.1]` Poor image filenames (e.g. IMG_1234.jpg)

### Structured data

- `[v0.1]` At least one JSON-LD block present
- `[v0.1]` JSON-LD parses without errors
- `[v0.1]` JSON-LD declares a recognized `@type`
- `[v0.1]` Organization or website schema present on the home page
- `[v0.1]` Breadcrumb schema valid when present

### Security

- `[v0.1]` Served over HTTPS
- `[v0.1]` HSTS header present
- `[v0.1]` Content-Security-Policy header present
- `[v0.1]` X-Frame-Options or frame-ancestors set
- `[v0.1]` X-Content-Type-Options set to nosniff
- `[v0.1]` Referrer-Policy set
- `[v0.1]` No mixed content on an HTTPS page
- `[v0.1]` No obvious leaked secrets in inline scripts (basic pattern scan)

### Crawlability

- `[v0.1]` robots.txt exists and is reachable
- `[v0.1]` robots.txt parses without errors
- `[v0.1]` Sitemap declared in robots.txt or reachable at /sitemap.xml
- `[v0.1]` Page is not blocked by robots meta and robots.txt at the same time as being in the sitemap
- `[v0.1]` Canonical does not point to a noindex page
- `[v0.1]` No canonical chain (canonical pointing to another canonical)

---

## Full catalog roadmap

The squirrelscan reference covers 245 rules across 22 categories. Below is the target backlog. Items tagged `[browser]` need the headless stage. Everything else is reachable with the static engine and gets added category by category after v0.1.

### Already started above

- Core SEO (13 rules total in reference): starter covers the essentials
- Content (14): starter covers the essentials
- Links (14): starter covers the essentials
- Images (14): starter covers the essentials
- Structured Data (10): starter covers the essentials
- Security (14): starter covers the essentials
- Crawlability (17): starter covers the essentials

### Planned categories

- `[later]` URL structure (8): length, keywords in slug, hyphenation, lowercase, special characters
- `[later]` Social media (4): Open Graph image sizing, URL matching, social profile links
- `[later]` Internationalization (2): language declarations, hreflang correctness
- `[later]` Legal compliance (4): privacy policy, cookie consent, terms of service presence
- `[later]` Local SEO (3): NAP consistency, local business schema
- `[later]` Video (3): video schema, thumbnails, captions
- `[later]` Analytics (2): tracking present, consent mode setup
- `[later]` E-E-A-T (15): author credentials, content dates, citations, authority and trust signals
- `[later]` Agent experience (5): AI crawler access, LLM parsability, page-type and site-profile hints
- `[later]` Site integrity (6): injected pages, phishing kits, malware, SEO spam, obfuscated scripts
- `[later]` Blocking (3): ad-blocker impact, privacy filter matches
- `[later]` Gap analysis (2): keyword and content gaps from live search data (opt-in)
- `[shipped]` Performance: Core Web Vitals (LCP, CLS, TTFB), DOM size, page weight, request count via `--browser`. Font loading, render-blocking, caching, HTTP/2 still to add.
- `[shipped]` Accessibility: full axe-core WCAG audit via `--browser`, one finding per check. Covers the ARIA, contrast, landmark, heading-order, and form-label rules.
- `[browser]` Mobile (6): viewport behavior, tap target size, font sizing, interstitials

### Sequencing

1. v0.1 starter set ships first.
2. Static categories come next, cheapest and highest value first: URL structure, social media, internationalization, legal, local SEO, analytics, video, E-E-A-T, agent experience, site integrity.
3. Browser categories (performance, accessibility, mobile) arrive once the headless stage lands.
