import * as path from 'node:path';
import { defineConfig } from '@rspress/core';

const SITE = 'https://safi-studio-scanner.abdulkadersafi.com';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  // The nav renders this string as the wordmark, so it stays short and sits at
  // 6px tracking. The full name is carried by the hero and the closing band.
  title: 'Scanner',
  description:
    'Website audit engine for Node.js. Crawls a site, runs 93 checks across 15 categories, and returns a scored report as HTML, Markdown, or JSON.',
  lang: 'en',
  icon: '/favicon.svg',
  head: [
    [
      'script',
      {
        defer: 'true',
        src: 'https://u.abdulkadersafi.com/script.js',
        'data-website-id': 'ef137e3d-5f14-4460-9715-75188b03bc6e',
      },
    ],
    // Absolute, because Facebook and LinkedIn will not resolve a relative
    // og:image. Every page shares the one card.
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Safi Studio Scanner' }],
    ['meta', { property: 'og:url', content: SITE }],
    ['meta', { property: 'og:image', content: `${SITE}/og-image.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    [
      'meta',
      {
        property: 'og:image:alt',
        content: '93 checks, one score, every page. Safi Studio Scanner.',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${SITE}/og-image.png` }],
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
