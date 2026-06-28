# Parity expansion plan

Goal: move closer to squirrelscan coverage and scoring. Not exact-number parity (a closed competitor's formula cannot be matched), but broader categories, stricter rules, and a harsher score.

## A. Scoring formula (runner.ts)

- Severity weights: error 10, warning 4, info 1 (info still excluded from the score).
- Status credit: pass 1.0, warn 0.25, fail 0.
- Overall score becomes the mean of category scores (was mean of per-page scores), so weak categories pull the headline down the way squirrelscan's does.

## B. URL structure (rules/url-structure.ts), from Google best practices

Operates on each page URL. Eight rules:
1. url-lowercase: no uppercase in the path.
2. url-hyphens: words separated by hyphens, not underscores.
3. url-no-spaces: no spaces or %20 in the path.
4. url-ascii: non-ASCII characters are percent-encoded, not raw.
5. url-param-count: at most 2 query parameters.
6. url-readable: path is not a bare numeric ID or query-driven id.
7. url-length: full URL under 100 characters (warn), 115+ (fail).
8. url-depth: at most 4 path segments deep.

## C. Strengthen weak categories

- Structured data: add organization/website schema presence, sameAs, logo, and image-object checks.
- Security: add server header leak, X-Powered-By disclosure, cookie Secure/HttpOnly hints from Set-Cookie, and HTTPS canonical.
- Performance (static, no browser): inline-style bloat, render-blocking script in head without defer/async, excessive stylesheet count, missing font-display.

## D. New static categories

- social-media: og:image present and sized, twitter:card, og:url matches canonical, social profile links.
- internationalization: hreflang present and self-referencing, lang matches hreflang.
- legal: privacy policy link, terms link, cookie consent hint.
- analytics: an analytics tag present (GA, GTM, Plausible, etc.), consent mode hint.
- e-e-a-t (subset): author byline, published/updated date, outbound citations, contact/about link.

## E. Wire-up

Registry imports, update rule-count test, README and features, build, live run.

Commit after each batch. No co-author line, no push.
