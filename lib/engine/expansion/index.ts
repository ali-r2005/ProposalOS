import type { BlueprintSection, BusinessContext } from "@/lib/engine/types";
import { normaliseExpansion } from "@/lib/engine/core/blueprint-parser";
import { expandSingle } from "./single";
import { expandRepeat } from "./repeat";
import { expandChunk } from "./chunk";

/**
 * Turn one section + the context into the list of slide-data objects to render.
 * Strategy is data-driven; the engine never hardcodes counts.
 */
export function expand(section: BlueprintSection, context: BusinessContext): BusinessContext[] {
  const config = normaliseExpansion(section.expansion);
  switch (config.strategy) {
    case "repeat":
      return expandRepeat(context, config);
    case "chunk":
      return expandChunk(context, config);
    case "single":
    default:
      return expandSingle(context);
  }
}
