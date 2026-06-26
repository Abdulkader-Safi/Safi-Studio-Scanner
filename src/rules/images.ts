import type { Rule } from "../types.js";

export const imagesRules: Rule[] = [
  {
    id: "images/img-alt",
    category: "images",
    title: "Image alt text",
    severity: "error",
    run({ page }) {
      const missing = page.images.filter((i) => i.alt === null);
      return [
        missing.length === 0
          ? { status: "pass", message: `All ${page.images.length} images have alt` }
          : {
              status: "fail",
              message: `${missing.length} image(s) missing alt`,
              evidence: missing.slice(0, 3).map((i) => i.src).join(", "),
            },
      ];
    },
  },
  {
    id: "images/img-dimensions",
    category: "images",
    title: "Image dimensions",
    severity: "warning",
    run({ page }) {
      const missing = page.images.filter((i) => !i.width || !i.height);
      return [
        missing.length === 0
          ? { status: "pass", message: "All images have width and height" }
          : { status: "warn", message: `${missing.length} image(s) missing width/height` },
      ];
    },
  },
  {
    id: "images/img-modern-format",
    category: "images",
    title: "Modern image formats",
    severity: "info",
    run({ page }) {
      const legacy = page.images.filter((i) => /\.(jpg|jpeg|png|gif)(\?|$)/i.test(i.absUrl));
      return [
        legacy.length === 0
          ? { status: "pass", message: "No legacy image formats" }
          : { status: "warn", message: `${legacy.length} image(s) not using WebP/AVIF` },
      ];
    },
  },
  {
    id: "images/img-lazy-loading",
    category: "images",
    title: "Lazy loading",
    severity: "info",
    run({ page }) {
      if (page.images.length <= 1)
        return [{ status: "pass", message: "Too few images to need lazy loading" }];
      const eager = page.images.slice(1).filter((i) => i.loading !== "lazy");
      return [
        eager.length === 0
          ? { status: "pass", message: "Below-the-fold images lazy loaded" }
          : { status: "warn", message: `${eager.length} image(s) without loading="lazy"` },
      ];
    },
  },
  {
    id: "images/img-filename-quality",
    category: "images",
    title: "Image filenames",
    severity: "info",
    run({ page }) {
      const bad = page.images.filter((i) =>
        /\/(img|image|dsc|screenshot)?[-_]?\d{3,}\.\w+$/i.test(i.absUrl),
      );
      return [
        bad.length === 0
          ? { status: "pass", message: "Descriptive image filenames" }
          : { status: "warn", message: `${bad.length} image(s) with non-descriptive filenames` },
      ];
    },
  },
  {
    id: "images/img-empty-src",
    category: "images",
    title: "Image src present",
    severity: "warning",
    run({ page }) {
      const empty = page.images.filter((i) => !i.src.trim());
      return [
        empty.length === 0
          ? { status: "pass", message: "All images have src" }
          : { status: "fail", message: `${empty.length} image(s) with empty src` },
      ];
    },
  },
];
