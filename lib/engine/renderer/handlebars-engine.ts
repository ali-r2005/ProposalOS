import Handlebars from "handlebars";
import type { BusinessContext } from "@/lib/engine/types";

/** Compiled-template cache keyed by the raw HTML string. */
const cache = new Map<string, Handlebars.TemplateDelegate>();

/**
 * Compile (once) and render a Handlebars template string with the given data.
 * Only the built-in helpers are used — `{{var}}`, `{{obj.prop}}`,
 * `{{#each}}`, `{{#if}}` — as mandated by the project rules.
 */
export function render(htmlTemplate: string, data: BusinessContext): string {
  let compiled = cache.get(htmlTemplate);
  if (!compiled) {
    compiled = Handlebars.compile(htmlTemplate);
    cache.set(htmlTemplate, compiled);
  }
  return compiled(data);
}
