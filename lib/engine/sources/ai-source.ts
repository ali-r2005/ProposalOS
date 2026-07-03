import type { BlueprintSection, BusinessContext, LoadedTemplate } from "@/lib/engine/types";
import { loadPrompt } from "@/lib/engine/ai/prompt-loader";
import { callClaudeForJson } from "@/lib/engine/ai/claude";
import { devWarn } from "@/lib/utils/error-handler";

/**
 * `ai` source: render the section's prompt with the context, ask Claude for
 * JSON, and merge it back. On any failure the section contributes nothing —
 * the component is expected to tolerate missing AI fields.
 */
export async function resolveAi(
  section: BlueprintSection,
  template: LoadedTemplate,
  context: BusinessContext
): Promise<Record<string, unknown>> {
  if (!section.prompt) {
    devWarn(`Section "${section.id}" is an ai source but names no prompt.`);
    return {};
  }

  try {
    const prompt = await loadPrompt(template, section.prompt, context);
    const result = await callClaudeForJson(prompt);
    return result ?? {};
  } catch (error) {
    devWarn(`AI source for section "${section.id}" failed:`, error);
    return {};
  }
}
