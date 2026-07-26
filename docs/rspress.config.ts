import * as path from 'node:path';
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  // The nav renders this string as the wordmark, so it stays short and sits at
  // 6px tracking. The full name is carried by the hero and the closing band.
  title: 'Scanner',
  description:
    'Website audit engine for Node.js. Crawls a site, runs 93 checks across 15 categories, and returns a scored report as HTML, Markdown, or JSON.',
  lang: 'en',
  icon: '/favicon.svg',
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
