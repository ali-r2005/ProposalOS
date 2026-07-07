// Soirées provider — gala / evening options for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Two modes, driven by the context:
//   • catalog   — no selection yet: return options for the destination (search +
//                 paginate via `q` / `limit` / `offset`), plus `total`.
//   • selection — `selected-soirees` (array of ids) present: return only those,
//                 in the order the user picked them.

interface SoireeRecord {
  id: string;
  name: string;
  subtitle: string;
  description: string;
}

const DATA: SoireeRecord[] = [
  {
    id: "s1",
    name: "ATLAS CAPITAL GALA",
    subtitle: "TANGER SPIRIT : CÉLÉBRER & RÉUSSIR",
    description:
      "Une soirée d'exception pensée comme un voyage sensoriel entre Tanger et l'Espagne, mêlant saveurs ibériques réinventées et ambiance festive face à la Kasbah.",
  },
  {
    id: "s2",
    name: "NUIT DES MILLE ET UNE LUMIÈRES",
    subtitle: "MARRAKECH : L'ÉLÉGANCE ORIENTALE",
    description:
      "Dîner de gala dans un palais aux jardins illuminés : gastronomie marocaine raffinée, animations andalouses et scénographie féerique sous les étoiles.",
  },
];

export const provider = {
  name: "soirees",
  description: "Soirée (gala) options for the destination — catalog + selection (mock data).",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const all = DATA;

    // Selection mode: return only the chosen soirées, preserving the user's order.
    const selected = context["selected-soirees"];
    if (Array.isArray(selected)) {
      const byId = new Map(all.map((x) => [x.id, x]));
      const soirees = selected.map((id) => byId.get(String(id))).filter(Boolean);
      return { soirees };
    }

    // Catalog mode: optional name search, then paginate.
    const q = String(context.q ?? "").toLowerCase();
    const filtered = q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
    const offset = Number.isFinite(context.offset) ? Number(context.offset) : 0;
    const limit = Number.isFinite(context.limit) ? Number(context.limit) : filtered.length;
    return { soirees: filtered.slice(offset, offset + limit), total: filtered.length };
  },
};
