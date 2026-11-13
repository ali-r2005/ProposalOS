import Handlebars from "handlebars";
import type { BusinessContext } from "@/lib/engine/types";

/** Compiled-template cache keyed by the raw HTML string. */
const cache = new Map<string, Handlebars.TemplateDelegate>();

/** Upper bound for `{{#times}}`, so a bad value can't render a huge page. */
const MAX_TIMES = 100;

/** Any value as a finite number (form values often arrive as strings). */
function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** A non-negative whole number, for counts. */
function toCount(value: unknown): number {
  return Math.max(0, Math.floor(toNumber(value)));
}

// Generic display helpers available to every template. They know nothing
// about any template's data, so templates can show form values directly
// instead of needing a provider to precompute display shapes.
// Handlebars passes its options object as the last argument, so a missing
// argument arrives as that object and toNumber() reads it as 0.

/** `{{add index 1}}` → index + 1. */
Handlebars.registerHelper("add", (a: unknown, b: unknown) => toNumber(a) + toNumber(b));

/** `{{#times category}}★{{else}}–{{/times}}` → the block repeated N times
 *  (`@index`, `@first`, `@last` available), or the else block when N is 0. */
Handlebars.registerHelper("times", function (this: unknown, n: unknown, options: Handlebars.HelperOptions) {
  const count = Math.min(MAX_TIMES, toCount(n));
  if (count === 0) return options.inverse(this);
  let out = "";
  for (let i = 0; i < count; i++) {
    const data = Handlebars.createFrame(options.data);
    data.index = i;
    data.first = i === 0;
    data.last = i === count - 1;
    out += options.fn(this, { data });
  }
  return out;
});

/** `{{#each (limit items 4)}}` → the first N items of a list. */
Handlebars.registerHelper("limit", (list: unknown, n: unknown) =>
  Array.isArray(list) ? list.slice(0, toCount(n)) : []
);

/**
 * Compile (once) and render a Handlebars template string with the given data.
 * Built-in helpers plus the generic ones registered above.
 */
export function render(htmlTemplate: string, data: BusinessContext): string {
  let compiled = cache.get(htmlTemplate);
  if (!compiled) {
    compiled = Handlebars.compile(htmlTemplate);
    cache.set(htmlTemplate, compiled);
  }
  return compiled(data);
}
