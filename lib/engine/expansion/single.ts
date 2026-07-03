import type { BusinessContext } from "@/lib/engine/types";

/** `single`: exactly one slide instance rendered with the full context. */
export function expandSingle(context: BusinessContext): BusinessContext[] {
  return [context];
}
