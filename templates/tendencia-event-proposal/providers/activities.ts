// Activities provider — team-building & tourism options for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Modes: catalog (search/paginate via q/limit/offset + total) when no selection,
// or selection (filter to `selected-activities` ids, in the user's order).

import { getDb } from "../db/client.ts";
import { activities as activitiesTable } from "../db/schema.ts";

interface ActivityRow {
  id: string;
  name: string;
  type: string; // "indoor" | "outdoor"
  category: string; // e.g. "collaboratif" | "compétitif"
  description: string[]; // one entry per paragraph
  video: string;
  meta: string;
  images: string[]; // detail-slide photos (asset paths or URLs) — 3 per activity
}

export const provider = {
  name: "activities",
  description: "Activity options for the destination.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const all = (await getDb().select().from(activitiesTable)) as ActivityRow[];

    // Selection mode: return only the chosen activities, in the user's order.
    const selected = context["selected-activities"];
    if (Array.isArray(selected)) {
      const byId = new Map(all.map((x) => [x.id, x]));
      const activities = selected
        .map((id) => byId.get(String(id)))
        .filter((x): x is ActivityRow => Boolean(x));
      return { activities };
    }

    // Catalog mode: optional name search, then paginate.
    const q = String(context.q ?? "").toLowerCase();
    const filtered = q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
    const offset = Number.isFinite(context.offset) ? Number(context.offset) : 0;
    const limit = Number.isFinite(context.limit) ? Number(context.limit) : filtered.length;
    return { activities: filtered.slice(offset, offset + limit), total: filtered.length };
  },
};
