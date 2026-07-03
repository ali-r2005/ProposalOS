import { randomUUID } from "crypto";
import type { RenderedSlide } from "@/lib/engine/types";
import { loadTemplate } from "./template-loader";
import { buildContext } from "./context-builder";
import { expand } from "@/lib/engine/expansion";
import { renderComponent } from "@/lib/engine/renderer/component-renderer";
import { wrapPresentation } from "@/lib/engine/renderer/theme-loader";
import { devLog, devWarn } from "@/lib/utils/error-handler";

export interface GenerateResult {
  success: boolean;
  html: string;
  proposalId: string;
  slides: number;
}

/**
 * Main orchestrator: load template → build context → for each section expand
 * into slides and render them → assemble the final HTML document.
 */
export async function generatePresentation(
  templateId: string,
  formInput: Record<string, unknown>
): Promise<GenerateResult> {
  const template = await loadTemplate(templateId);
  const context = await buildContext(template, formInput);

  const slides: RenderedSlide[] = [];
  for (const section of template.blueprint.sections) {
    const instances = expand(section, context);
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

  const html = wrapPresentation(template, slides);
  devLog(`Generated presentation for "${templateId}": ${slides.length} slides.`);

  return {
    success: true,
    html,
    proposalId: randomUUID(),
    slides: slides.length,
  };
}
