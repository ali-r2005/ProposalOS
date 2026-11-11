import { randomUUID } from "crypto";
import type { BusinessContext, LoadedTemplate, RenderedSlide } from "@/lib/engine/types";
import { loadTemplate } from "./template-loader";
import { buildContext } from "./context-builder";
import { expand } from "@/lib/engine/expansion";
import { renderComponent } from "@/lib/engine/renderer/component-renderer";
import { wrapPresentation } from "@/lib/engine/renderer/theme-loader";
import { resolveLanguage, withLanguage } from "@/lib/engine/i18n/language";
import { devLog, devWarn } from "@/lib/utils/error-handler";

export interface GenerateResult {
  success: boolean;
  html: string;
  proposalId: string;
  slides: number;
  context: BusinessContext;
  /** The language actually used (the requested one, or the template default). */
  lang: string;
}

/**
 * For each section, expand the (already-built) context into slide instances
 * and render them, then assemble the final HTML document. Shared by initial
 * generation and by the editor's re-render-from-edited-context path — neither
 * one re-runs providers/AI, so hand-edited or previously-fetched data survives.
 *
 * Components render in `lang` (template default when absent or not supported)
 * and read that language's static text as `t`.
 */
export async function renderFromContext(
  template: LoadedTemplate,
  context: BusinessContext,
  lang: string | null | undefined
): Promise<{ html: string; slides: number }> {
  const localized = withLanguage(template, context, lang);
  const slides: RenderedSlide[] = [];
  for (const section of template.blueprint.sections) {
    const instances = expand(section, localized);
    for (const data of instances) {
      try {
        const html = await renderComponent(template, section.component, data);
        slides.push({ sectionId: section.id, component: section.component, html });
      } catch (error) {
        // A missing/broken component shouldn't sink the whole presentation.
        devWarn(`Skipping section "${section.id}": ${(error as Error).message}`);
      }
    }
  }

  const html = wrapPresentation(template, slides, String(localized.lang));
  return { html, slides: slides.length };
}

/**
 * Main orchestrator: load template → build context → for each section expand
 * into slides and render them → assemble the final HTML document.
 * `lang` picks one of the template's languages (default when omitted).
 */
export async function generatePresentation(
  templateId: string,
  formInput: Record<string, unknown>,
  lang?: string
): Promise<GenerateResult> {
  const template = await loadTemplate(templateId);
  const context = await buildContext(template, formInput, lang);
  console.log("Context built:", context);

  const resolvedLang = resolveLanguage(template.manifest, lang);
  const { html, slides } = await renderFromContext(template, context, resolvedLang);
  devLog(`Generated presentation for "${templateId}": ${slides} slides.`);

  return {
    success: true,
    html,
    proposalId: randomUUID(),
    slides,
    context,
    lang: resolvedLang,
  };
}
