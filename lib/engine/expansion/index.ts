import type { BlueprintSection, BusinessContext, ExpansionConfig } from "@/lib/engine/types";
import { normaliseExpansion } from "@/lib/engine/core/blueprint-parser";
import { EngineError } from "@/lib/utils/error-handler";
import { expandSingle } from "./single";
import { expandRepeat } from "./repeat";
import { expandChunk } from "./chunk";

/**
 * `parse: json`: when the collection is JSON text, replace it with the parsed
 * value, so every strategy below sees a list. Accepts a bare list, or an
 * object holding the list under the collection's own name
 * (`{"<collection>": [...]}`). Values that are already lists pass through.
 */
function withParsedCollection(
  section: BlueprintSection,
  context: BusinessContext,
  config: ExpansionConfig
): BusinessContext {
  const key = config.collection;
  if (config.parse !== "json" || !key) return context;
  const raw = context[key];
  if (typeof raw !== "string") return context;
  if (!raw.trim()) return { ...context, [key]: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new EngineError(`"${key}" is not valid JSON (section "${section.id}"): ${reason}`, 400);
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const inner = (parsed as Record<string, unknown>)[key];
    if (Array.isArray(inner)) parsed = inner;
  }
  if (!Array.isArray(parsed)) {
    throw new EngineError(`"${key}" must be a JSON list (section "${section.id}")`, 400);
  }
  return { ...context, [key]: parsed };
}

/**
 * Turn one section + the context into the list of slide-data objects to render.
 * Strategy is data-driven; the engine never hardcodes counts.
 */
export function expand(section: BlueprintSection, context: BusinessContext): BusinessContext[] {
  const config = normaliseExpansion(section.expansion);
  const data = withParsedCollection(section, context, config);
  switch (config.strategy) {
    case "repeat":
      return expandRepeat(data, config);
    case "chunk":
      return expandChunk(data, config);
    case "single":
    default:
      return expandSingle(data, config);
  }
}
