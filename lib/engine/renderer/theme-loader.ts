import type { LoadedTemplate, RenderedSlide } from "@/lib/engine/types";

/** Base href so components' relative `assets/...` URLs resolve to the API. */
function assetBase(templateId: string): string {
  return `/api/templates/${templateId}/`;
}

/**
 * Authored slide size. Components are absolutely positioned against this fixed
 * canvas, so it is the reference the on-screen fit-to-width scale is computed
 * from and the page size used for PDF export.
 */
const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;

/**
 * Assemble the final standalone HTML document: theme tokens + the runtime the
 * cleaned components rely on (Tailwind + Tabler icon font) + every slide.
 *
 * The runtime links live in this engine-owned document shell — never in the
 * components themselves, which stay pure Tailwind + CSS-variable markup.
 */
export function wrapPresentation(template: LoadedTemplate, slides: RenderedSlide[]): string {
  const body = slides
    .map(
      (slide) =>
        `<section class="slide-wrapper" data-section="${slide.sectionId}" data-component="${slide.component}">\n${slide.html}\n</section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(template.manifest.name)}</title>
<base href="${assetBase(template.id)}">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css">
<style>
${template.tokensCss}
body { margin: 0; background: #333; overflow-x: hidden; }

/* Slides are authored at a fixed pixel size (--slide-w x --slide-h). On screen
   they are scaled down to fit the viewport width, so narrow screens never need
   horizontal scrolling.

   A CSS transform repaints at the new size but leaves the layout box at the
   original 1920x1080 — which alone would keep the page 1920px wide and leave a
   tall gap under every slide. So the wrapper is laid out at the *rendered* size
   and the untouched full-size slide inside it is transformed down to match. */
:root {
  --slide-w: ${SLIDE_WIDTH}px;
  --slide-h: ${SLIDE_HEIGHT}px;
  /* The rendered width of one slide: never wider than the slide's true size,
     and never wider than the viewport minus a small gutter. Pure CSS, so it is
     already correct on first paint and if JS never runs. */
  --slide-box-w: min(var(--slide-w), 100vw - 32px);
  /* Unitless scale for transform: scale(). CSS cannot divide a length by a
     length to get a number, so the script sets this; until it does, the
     aspect-ratio box below still reserves the right space. */
  --slide-scale: 1;
}
.slide-wrapper {
  display: block;
  width: var(--slide-box-w);
  /* Keeps the box the right height at any scale without needing the ratio. */
  aspect-ratio: ${SLIDE_WIDTH} / ${SLIDE_HEIGHT};
  overflow: hidden;
  margin: 0 auto 24px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.35);
}
.slide-wrapper > .slide {
  transform: scale(var(--slide-scale));
  transform-origin: top left;
}

/* Print / export-to-PDF: one slide per page at true size, no scaling or chrome. */
@media print {
  @page { size: ${SLIDE_WIDTH}px ${SLIDE_HEIGHT}px; margin: 0; }
  body { background: #fff; overflow-x: visible; }
  .slide-wrapper {
    width: var(--slide-w);
    height: var(--slide-h);
    aspect-ratio: auto;
    overflow: visible;
    margin: 0;
    box-shadow: none;
    break-after: page;
    page-break-after: always;
  }
  .slide-wrapper > .slide { transform: none; }
  .slide-wrapper:last-child { break-after: auto; page-break-after: auto; }
}
</style>
</head>
<body>
${body}
<script>
(function () {
  var SLIDE_W = ${SLIDE_WIDTH};
  var root = document.documentElement;
  // Derive the scale from the box CSS actually laid out, so the stylesheet
  // stays the single source of truth for how wide a slide may be.
  function fit() {
    var box = document.querySelector('.slide-wrapper');
    if (!box) return;
    root.style.setProperty('--slide-scale', String(box.clientWidth / SLIDE_W));
  }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
})();
</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
