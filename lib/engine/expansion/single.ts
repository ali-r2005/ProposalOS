import type { BusinessContext, ExpansionConfig } from "@/lib/engine/types";

/**
 * `single`: exactly one slide instance rendered with the full context.
 * If `collection` is set, the section is skipped when that context value is
 * missing (undefined/null) or an empty array — lets a `single` slide depend
 * on optional data without rendering an empty placeholder.
 */
export function expandSingle(context: BusinessContext, config: ExpansionConfig): BusinessContext[] {
  if (config.collection) {
    const collection = context[config.collection];
    if (collection === undefined || collection === null) {
      return [];
    }
    if (Array.isArray(collection) && collection.length === 0) {
      return [];
    }
  }
  return [context];
}
