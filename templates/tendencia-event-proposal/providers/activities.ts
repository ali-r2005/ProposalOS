// Activities provider — team-building & tourism options for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Modes: catalog (search/paginate via q/limit/offset + total) when no selection,
// or selection (filter to `selected-activities` ids, in the user's order).

interface ActivityRecord {
  id: string;
  name: string;
  city: string;
  type: string; // "indoor" | "outdoor"
  category: string; // e.g. "collaboratif" | "compétitif"
  description: string;
  video: string;
  meta: string;
}

const DATA: ActivityRecord[] = [
  {
    id: "a1",
    name: "ATLAS ANIMATE",
    city: "Tanger",
    type: "indoor",
    category: "collaboratif",
    description:
      "Les équipes réalisent des vidéos d'animation qui, une fois assemblées, forment un clip cohérent. Communication, planification et coordination au cœur de l'expérience.",
    video: "https://www.catalyst.ma/activites-teambuilding/team-building/animate",
    meta: "INDOOR - 10 TO 100 - COLLABORATIF",
  },
  {
    id: "a2",
    name: "TANGER ENIGMA",
    city: "Tanger",
    type: "outdoor",
    category: "compétitif",
    description:
      "Un city-game immersif à travers la médina de Tanger : énigmes, défis et exploration pour renforcer la cohésion d'équipe.",
    video: "https://www.catalyst.ma/activites-teambuilding/team-building/enigma",
    meta: "OUTDOOR - 10 TO 200 - COMPÉTITIF",
  },
  {
    id: "a3",
    name: "ATLAS SPY MISSION",
    city: "Marrakech",
    type: "outdoor",
    category: "compétitif",
    description:
      "Mission d'espionnage grandeur nature dans les jardins et ruelles de Marrakech : coopération, stratégie et sens de l'observation.",
    video: "https://www.catalyst.ma/activites-teambuilding/team-building/spy-mission",
    meta: "OUTDOOR - 20 TO 150 - COMPÉTITIF",
  },
  {
    id: "a4",
    name: "BLOOM AS ONE",
    city: "Marrakech",
    type: "indoor",
    category: "collaboratif",
    description:
      "Atelier créatif collaboratif autour d'une œuvre collective : chaque équipe contribue à une fresque commune symbolisant les valeurs de l'entreprise.",
    video: "https://www.catalyst.ma/activites-teambuilding/team-building/bloom",
    meta: "INDOOR - 10 TO 120 - COLLABORATIF",
  },
];

// DB-style row filter: keep rows whose `city` appears in the destination text.
// Equivalent to `WHERE lower($destination) LIKE '%' || lower(city) || '%'`.
function forDestination(context: Record<string, any>): ActivityRecord[] {
  const destination = String(context.destination ?? "").toLowerCase();
  return DATA.filter((row) => destination.includes(row.city.toLowerCase()));
}

export const provider = {
  name: "activities",
  description: "Activity options for the destination — catalog + selection (mock data).",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const all = forDestination(context);

    const selected = context["selected-activities"];
    if (Array.isArray(selected)) {
      const byId = new Map(all.map((x) => [x.id, x]));
      const activities = selected.map((id) => byId.get(String(id))).filter(Boolean);
      return { activities };
    }

    const q = String(context.q ?? "").toLowerCase();
    const filtered = q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
    const offset = Number.isFinite(context.offset) ? Number(context.offset) : 0;
    const limit = Number.isFinite(context.limit) ? Number(context.limit) : filtered.length;
    return { activities: filtered.slice(offset, offset + limit), total: filtered.length };
  },
};
