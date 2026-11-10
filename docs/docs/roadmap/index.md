---
title: Roadmap
description: What ships today, what is being built next, and the eleven phases planned after it.
---

# Roadmap

Eleven phases, ordered so each one unlocks the next. Phase 0 and phase 1 are what you can install today. Nothing beyond them is in the published package yet.

| Stage | Status |
| --- | --- |
| <span className="sc-tag sc-tag--up">Shipped</span> | In the published package, documented, tested. |
| <span className="sc-tag sc-tag--now">Next</span> | The phase being built now. |
| <span className="sc-tag">Planned</span> | Specified and sequenced, not started. |

<div className="sc-progress">
  <span className="sc-progress__seg sc-progress__seg--done" title="Phase 0: shipped"></span>
  <span className="sc-progress__seg sc-progress__seg--done" title="Phase 1: shipped in 1.0.2"></span>
  <span className="sc-progress__seg sc-progress__seg--now" title="Phase 2: in progress"></span>
  <span className="sc-progress__seg"></span>
  <span className="sc-progress__seg"></span>
  <span className="sc-progress__seg"></span>
  <span className="sc-progress__seg"></span>
  <span className="sc-progress__seg"></span>
  <span className="sc-progress__seg"></span>
  <span className="sc-progress__seg"></span>
  <span className="sc-progress__seg"></span>
</div>

<p className="sc-progress__caption">2 of 11 phases shipped · 1 next · 8 planned</p>

The full item-by-item backlog, with a build-cost tag on every line, lives in [`features.md`](https://github.com/Abdulkader-Safi/Safi-Studio-Scanner/blob/main/features.md) in the repository. This page is the summary.

## Phase 0: Shipped

The engine as published: 94 rules across 15 categories.

<div className="sc-list sc-list--done">

- `audit(url, options)` returning a scored report, plus `auditToHtml`, `auditToMarkdown`, `auditScore`, and `render`.
- Multipage concurrent crawl with `maxPages`, `concurrency`, and `maxDepth`.
- `robots.txt` and `sitemap.xml` fetched once per site and shared with every rule.
- A shared link checker, so a URL referenced by ten rules is fetched once.
- Severity-weighted scoring: per page, per category, and a harsher overall number.
- Optional rendered stage through local Chromium or the PageSpeed Insights API.
- Three output formats: JSON, Markdown, and one self-contained HTML file.
- Pluggable rule registry. One file and one import adds a rule.
- One runtime dependency.

</div>

## Phase 1: Report foundation and free measurements

<p className="sc-phase sc-phase--done">Shipped in 1.0.2</p>

The gate everything else waited on.

Most of what a page audit is expected to report are measurements, not verdicts: counts, tables, percentages. The report object held only pass and fail findings, so there was nowhere to put them. Building any later phase first would have meant building it twice.

<div className="sc-list sc-list--done">

- A `metrics` output beside `findings`, per category, carrying numbers and tables.
- A value status of `ok`, `warn`, `bad`, or `missing`, so a measurement carries a verdict without inventing a finding.
- Capped tables with a "showing N of M" count.
- Metrics rendered in all three formats.
- Public `rules` and `collectors` options, so a custom registry no longer needs a fork.

</div>

Everything already sitting in the parsed DOM is now harvested. All of it is in the [measurement catalog](/guide/using/measurements).

<div className="sc-list sc-list--done">

- Status code, response time, page size, declared language, hidden element count, and published and updated dates as reported values.
- Markup hygiene counters: inline styles, `<style>` blocks in the body, script tags, comment nodes, placeholder links.
- Resolved crawl directives, including whether the canonical equals the URL that was actually audited.
- Link counters and three link tables: dofollow, nofollow, and duplicate URLs with every anchor used for each.
- Header counts per level and the full heading outline in document order, with what each section contains.
- The complete Open Graph and Twitter Card tables, with a state per property.
- Image alt coverage, separating decorative from undescribed.
- Character counts for title, description, and H1, plus an H1 length rule.

</div>

## Phase 2: Text, keyword, and readability engine

<p className="sc-phase sc-phase--done">Built · ships in the next release</p>

One module that pays for four report sections. All of it is in the [measurement catalog](/guide/using/measurements#text-and-keywords).

<div className="sc-list sc-list--done">

- A tokenizer built on `Intl.Segmenter` with the page's language, an English stop word list, plural grouping, and 1, 2, and 3-word n-grams.
- Main-content extraction: `<main>` or `<article>` when the page has one. Navigation, footers, forms and hidden elements are dropped either way.
- Text statistics: unique words, stop word share, water share, average sentence length, characters excluding spaces.
- Readability: Flesch reading ease, Flesch-Kincaid grade, Gunning Fog.
- Top words as 1, 2, and 3-word phrases with counts and percentages, plus a stop word table.
- A keyword relevance matrix: each top keyword present or absent in the title, description, and H1.
- Keyword highlight spans for the title, description, and every heading.
- `content/keyword-stuffing` now reads the n-gram output, so stop words no longer trip it and repeated phrases do.

</div>

## Phase 3: Answer engine and content structure

<p className="sc-phase sc-phase--now">Next up</p>

The part most audit tools do not have, and it runs on a DOM already parsed.

<div className="sc-list sc-list--planned">

- Answer snippet check: is there a definition or short answer in the first four content blocks, and how long is it.
- Q&A structure: question-like H2 count, how many carry a short answer, and the coverage ratio.
- Answer formats: counts of lists, steps, tables, and definitions.
- Topic cluster signals: internal links in main content only, related-reading detection, distinct H2 topics, anchor descriptiveness ratio.
- Passage structure: H2 section count, average words per section, definition-format blocks.
- Agent experience: AI crawler access in `robots.txt`, `llms.txt`, and whether the main content survives without JavaScript.
- Schema depth: the nested type tree, plus microdata and RDFa, not only JSON-LD.

</div>

## Phase 4: Site-wide crawl intelligence

<p className="sc-phase">Planned · not started</p>

The highest-value phase per unit of new infrastructure, since the crawler already visits every page but each rule looks at one page in isolation.

<div className="sc-list sc-list--planned">

- Duplicate titles, meta descriptions, and H1s across the crawl, grouped by the URLs that share them.
- Near-duplicate content detection through a shingle hash.
- Orphan pages: in the sitemap, linked from nowhere.
- An internal link graph with inbound link counts, so thin-linked pages surface.
- Click depth per page, and a site-wide redirect map.
- Sitemap versus crawl reconciliation, both directions.
- Crawling from the sitemap directly, not only by following links.
- Score thresholds, so a run can fail itself in CI.
- A CLI wrapper over the library, so an audit runs from a terminal or a CI step with no script to write. It was dropped in 1.0.1 and comes back on top of the stable API.

</div>

## Phase 5: Trust, authority, and compliance

<p className="sc-phase">Planned · not started</p>

Cheap pattern detection, high client value.

<div className="sc-list sc-list--planned">

- Author box, author page link, and author bio detection, with the actual dates reported.
- Structured data trust signals listed by name.
- Refund or returns page, phone and physical address, affiliate disclosure, editorial policy.
- Citation quality: are outbound citations pointing at recognised authoritative domains.
- Local SEO: NAP consistency against LocalBusiness schema, schema completeness, business profile link.

</div>

## Phase 6: Performance and speed depth

<p className="sc-phase">Planned · not started</p>

Mostly surfacing values the rendered stage already collects and discards.

<div className="sc-list sc-list--planned">

- Total load time, DNS lookup, TCP connection, response time, DOM interactive, DOM content loaded, DOM complete, FCP.
- INP, with an explicit "not measurable without interaction" state rather than an undefined value.
- Layout shift event count and the largest single shift.
- A slow resource list: every request over a threshold.
- Font loading, HTTP/2 and HTTP/3, preconnect hints, third-party script weight.

</div>

## Phase 7: Tech stack fingerprinting

<p className="sc-phase">Planned · not started</p>

A signature table matched against markup, script sources, and headers.

<div className="sc-list sc-list--planned">

- Analytics per vendor, rather than one "a tag is present" result.
- Ad pixels per vendor.
- CMS, framework, and library detection.
- CDN detection from headers and asset hosts.

</div>

## Phase 8: Media and asset analysis

<p className="sc-phase">Planned · not started</p>

Real value, but it costs extra requests, so it sits behind an opt-in flag with a hard cap.

<div className="sc-list sc-list--planned">

- A per-image table: URL, pixel dimensions, transfer size, optimisation verdict.
- Natural dimensions through a HEAD or ranged GET.
- Optimisation estimates per format.
- Images served far larger than their layout box.
- Responsive image checks, video schema and captions, favicon and app icons.

</div>

## Phase 9: Mobile and rendered extras

<p className="sc-phase">Planned · not started</p>

Everything that needs a real viewport.

<div className="sc-list sc-list--planned">

- Tap target size, mobile font size, horizontal overflow, intrusive interstitials.
- Viewport behaviour: disabled zoom, fixed widths.
- Console errors captured during load.
- What content disappears with JavaScript off.
- Screenshot capture attached to the report.

</div>

## Phase 10: External data and site integrity

<p className="sc-phase">Planned · not started</p>

Keys, rate limits, and heuristics with false-positive risk, so it stays opt-in and never runs by default.

<div className="sc-list sc-list--planned">

- Backlink lookup behind a provider interface.
- Keyword and content gap analysis.
- Index coverage against a search API.
- Obfuscated scripts, injected spam, malware and phishing patterns, leaked secrets.
- Ad-blocker and privacy-filter impact.

</div>

## Not planned

Worth saying out loud.

<div className="sc-list sc-list--off">

- **A hosted service or dashboard.** The JSON output exists so you can build your own.
- **Rule configuration files.** Options are passed in code. A config format is a second API to keep in sync.

</div>
