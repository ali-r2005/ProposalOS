import type { LoadedTemplate, RenderedSlide } from "@/lib/engine/types";

/** Base href so components' relative `assets/...` URLs resolve to the API. */
function assetBase(templateId: string): string {
  return `/api/templates/${templateId}/`;
}

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
body { margin: 0; background: #333; }
.slide-wrapper { display: block; margin: 0 auto 24px; box-shadow: 0 8px 30px rgba(0,0,0,0.35); }
.slide-wrapper > .slide { margin: 0 auto; }
</style>
</head>
<body>
${body}
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
