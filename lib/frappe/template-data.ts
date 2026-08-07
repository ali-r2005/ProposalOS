// Shared Frappe read helper for templates whose catalog data is entered in the
// Frappe app rather than in this one.
//
// This is an *opt-in* helper, not an engine dependency: templates that own their
// data keep using Drizzle (templates/[id]/db/schema.ts), and the engine itself
// knows nothing about Frappe. A template chooses its data source purely by which
// client its providers import.
//
// Relative `.ts` imports (not the `@/` alias): this module is reached from
// template providers through Node's native dynamic import, which resolves real
// paths only — the tsconfig alias doesn't exist at runtime.
import { getList, parseJsonFields } from "./client.ts";
import type { FrappeDoc } from "./types.ts";

/**
 * Fetch every document of a DocType, JSON fields already parsed.
 *
 * `jsonFields` names the fields to decode: Frappe stores JSON fields as text and
 * is inconsistent about whether reads come back parsed, so array-valued fields
 * (image lists, description paragraphs) must be normalised rather than trusted.
 *
 * Reads use the engine's API key: catalog data is engine-internal at generation
 * time and not subject to per-user DocType permissions.
 */
export async function fetchDocs<T = FrappeDoc>(
  doctype: string,
  jsonFields: string[] = []
): Promise<T[]> {
  const rows = await getList(doctype, {});
  return rows.map((row) => parseJsonFields(row, jsonFields)) as T[];
}
