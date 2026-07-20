// Soirées provider — gala / evening options for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Two modes, driven by the context:
//   • catalog   — no selection yet: return options (search + paginate via
//                 `q` / `limit` / `offset`), plus `total`.
//   • selection — `selected-soirees` (array of ids) present: return only those,
//                 in the order the user picked them, each with a 1-based `option`.

import { getDb } from "../db/client.ts";
import { soirees as soireesTable } from "../db/schema.ts";

interface SoireeRow {
  id: string;
  name: string;
  subtitle: string;
  description: string[]; // one entry per paragraph
  image: string; // detail-slide full-bleed photo (asset path or URL)
}

/** Add a 1-based `option` number reflecting the item's position in the list. */
function withOption<T>(rows: T[], start = 0): (T & { option: number })[] {
  return rows.map((row, i) => ({ ...row, option: start + i + 1 }));
}

export const provider = {
  name: "soirees",
  description: "Soirée (gala) options for the destination.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const all = (await getDb().select().from(soireesTable)) as SoireeRow[];

    // Selection mode: return only the chosen soirées, preserving the user's order.
    const selected = context["selected-soirees"];
    if (Array.isArray(selected)) {
      const byId = new Map(all.map((x) => [x.id, x]));
      const chosen = selected
        .map((id) => byId.get(String(id)))
        .filter((x): x is SoireeRow => Boolean(x));
      return { soirees: withOption(chosen) };
    }

    // Catalog mode: optional name search, then paginate.
    const q = String(context.q ?? "").toLowerCase();
    const filtered = q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
    const offset = Number.isFinite(context.offset) ? Number(context.offset) : 0;
    const limit = Number.isFinite(context.limit) ? Number(context.limit) : filtered.length;
    return { soirees: filtered.slice(offset, offset + limit), total: filtered.length };
  },
};
