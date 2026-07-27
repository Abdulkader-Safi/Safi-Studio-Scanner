import * as path from 'node:path';
import { defineConfig } from '@rspress/core';

const SITE = 'https://safi-studio-scanner.abdulkadersafi.com';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  // The nav renders this string as the wordmark, so it stays short and sits at
  // 6px tracking. The full name is carried by the hero and the closing band.
  title: 'Scanner',
  description:
    'Website audit engine for Node.js. Crawls a site, runs 94 checks across 15 categories, and returns a scored report as HTML, Markdown, or JSON.',
  lang: 'en',
  icon: '/favicon.svg',
  head: [
    // Absolute, because Facebook, LinkedIn and WhatsApp will not resolve a
    // relative og:image. rspress already emits og:type, og:title and
    // og:description, so only the card is declared here. It is a JPEG because
    // WhatsApp skips images much over a couple of hundred kilobytes.
    ['meta', { property: 'og:site_name', content: 'Safi Studio Scanner' }],
    ['meta', { property: 'og:url', content: SITE }],
    ['meta', { property: 'og:image', content: `${SITE}/og-image.jpg` }],
    ['meta', { property: 'og:image:secure_url', content: `${SITE}/og-image.jpg` }],
    ['meta', { property: 'og:image:type', content: 'image/jpeg' }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    [
      'meta',
      {
        property: 'og:image:alt',
        content: '94 checks, one score, every page. Safi Studio Scanner.',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${SITE}/og-image.jpg` }],
    // Written as a raw string, which rspress passes through verbatim. The tuple
    // form renders `<tag attrs>` and never closes it, so an unclosed <script>
    // swallowed the meta tags after it and social scrapers saw no card at all.
    '<script defer src="https://u.abdulkadersafi.com/script.js" data-website-id="ef137e3d-5f14-4460-9715-75188b03bc6e"></script>',
  ],
  themeConfig: {
    // The system has no light mode, so there is no toggle to show.
    darkMode: false,
    outlineTitle: 'On this page',
    lastUpdated: false,
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/Abdulkader-Safi/Safi-Studio-Scanner',
      },
    ],
    footer: {
      message: 'MIT licensed. Built by Abdulkader Safi.',
    },
  },
});
