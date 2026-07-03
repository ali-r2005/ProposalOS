import type { BusinessContext, ExpansionConfig } from "@/lib/engine/types";

/**
 * `repeat`: one slide per item in a context collection. Each instance gets the
 * full context plus the item's own fields (spread) and its `index`.
 */
export function expandRepeat(
  context: BusinessContext,
  config: ExpansionConfig
): BusinessContext[] {
  const collection = config.collection ? context[config.collection] : undefined;
  if (!Array.isArray(collection) || collection.length === 0) {
    return [context];
  }

  return collection.map((item, index) => {
    const itemFields = item && typeof item === "object" ? (item as object) : { value: item };
    return { ...context, ...itemFields, item, index };
  });
}
