import type { BusinessContext, LoadedTemplate } from "@/lib/engine/types";
import { resolveSource } from "@/lib/engine/sources";
import { orderSections } from "./dependency-resolver";
import { withLanguage, withoutLanguage } from "@/lib/engine/i18n/language";
import { devLog } from "@/lib/utils/error-handler";

/**
 * Build the single merged context for a run: start from the user's form input,
 * then fold in every section's source data (providers, AI, static) in
 * dependency order. The result is a flat bag the components read from.
 *
 * While sources run, the context also holds the resolved language as `lang`
 * and its dictionary as `t`. Both are removed from the returned context: the
 * language is saved in its own column, and the dictionary is re-read on render.
 */
export async function buildContext(
  template: LoadedTemplate,
  formInput: Record<string, unknown>,
  lang?: string
): Promise<BusinessContext> {
  const context: BusinessContext = withLanguage(template, formInput, lang);

  for (const section of orderSections(template.blueprint.sections)) {
    const result = await resolveSource(section, template, context);
    if (result && typeof result === "object") {
      Object.assign(context, result);
    }
  }

  const result = withoutLanguage(context);
  devLog(`Context built with keys: ${Object.keys(result).join(", ")}`);
  return result;
}
