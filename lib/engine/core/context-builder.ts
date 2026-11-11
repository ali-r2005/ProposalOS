import type { BusinessContext, LoadedTemplate } from "@/lib/engine/types";
import { resolveSource } from "@/lib/engine/sources";
import { orderSections } from "./dependency-resolver";
import { withLanguage, withoutDictionary } from "@/lib/engine/i18n/language";
import { devLog } from "@/lib/utils/error-handler";

/**
 * Build the single merged context for a run: start from the user's form input,
 * then fold in every section's source data (providers, AI, static) in
 * dependency order. The result is a flat bag the components read from.
 *
 * `lang` (the requested content language) is resolved against the template's
 * languages and stored as `context.lang`; while sources run they also see the
 * dictionary as `context.t`, which is removed from the returned context.
 */
export async function buildContext(
  template: LoadedTemplate,
  formInput: Record<string, unknown>,
  lang?: string
): Promise<BusinessContext> {
  const context: BusinessContext = withLanguage(template, formInput, lang);
  const resolvedLang = context.lang;

  for (const section of orderSections(template.blueprint.sections)) {
    const result = await resolveSource(section, template, context);
    if (result && typeof result === "object") {
      Object.assign(context, result);
    }
  }

  // A source may have overwritten the reserved keys; restore them.
  const result = withoutDictionary({ ...context, lang: resolvedLang });
  devLog(`Context built with keys: ${Object.keys(result).join(", ")}`);
  return result;
}
