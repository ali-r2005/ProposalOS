// Activities provider — team-building & tourism options for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Modes: catalog (search/paginate via q/limit/offset + total) when no selection,
// or selection (filter to `selected-activities` ids, in the user's order).

interface ActivityRecord {
  id: string;
  name: string;
  type: string; // "indoor" | "outdoor"
  category: string; // e.g. "collaboratif" | "compétitif"
  description: string[]; // one entry per paragraph
  video: string;
  meta: string;
  images: string[]; // detail-slide photos (asset paths or URLs) — 3 per activity
}

const DATA: ActivityRecord[] = [
  {
    id: "a1",
    name: "ATLAS ANIMATE",
    type: "indoor",
    category: "collaboratif",
    description: [
      "Dans ce défi créatif, les équipes réalisent des vidéos d'animation qui, une fois assemblées, forment un clip cohérent. Chaque équipe contribue à une partie de l'histoire, nécessitant collaboration et coordination.",
      "L'activité développe des compétences en communication et en gestion de projet tout en stimulant la créativité. Adaptée à vos besoins, elle permet de transmettre des messages tels que la promotion de produits, la mise en avant des objectifs commerciaux ou les valeurs d'entreprise.",
    ],
    video: "https://www.catalyst.ma/activites-teambuilding/team-building/animate",
    meta: "INDOOR - 10 TO 100 - COLLABORATIF",
    images: ["assets/p1.png", "assets/p2.png", "assets/p3.png"],
  },
  {
    id: "a2",
    name: "TANGER ENIGMA",
    type: "outdoor",
    category: "compétitif",
    description: [
      "Un city-game immersif à travers la médina de Tanger : énigmes, défis et exploration pour renforcer la cohésion d'équipe.",
      "Les participants progressent en équipe de point en point, résolvant des épreuves qui mêlent culture locale, observation et esprit de compétition dans une ambiance conviviale.",
    ],
    video: "https://www.catalyst.ma/activites-teambuilding/team-building/enigma",
    meta: "OUTDOOR - 10 TO 200 - COMPÉTITIF",
    images: ["assets/p4.png", "assets/p5.png", "assets/p6.png"],
  },
  {
    id: "a3",
    name: "ATLAS SPY MISSION",
    type: "outdoor",
    category: "compétitif",
    description: [
      "Mission d'espionnage grandeur nature dans les jardins et ruelles de Marrakech : coopération, stratégie et sens de l'observation.",
      "Chaque équipe reçoit une couverture et un objectif secret ; la réussite dépend de la communication, de la répartition des rôles et de la capacité à déjouer les autres agents.",
    ],
    video: "https://www.catalyst.ma/activites-teambuilding/team-building/spy-mission",
    meta: "OUTDOOR - 20 TO 150 - COMPÉTITIF",
    images: ["assets/p7.png", "assets/p1.png", "assets/p2.png"],
  },
  {
    id: "a4",
    name: "BLOOM AS ONE",
    type: "indoor",
    category: "collaboratif",
    description: [
      "Atelier créatif collaboratif autour d'une œuvre collective : chaque équipe contribue à une fresque commune symbolisant les valeurs de l'entreprise.",
      "Au-delà de la peinture, l'expérience met en scène l'écoute, le partage d'une vision et la construction d'un résultat qui n'a de sens qu'assemblé — une métaphore directe du travail d'équipe.",
    ],
    video: "https://www.catalyst.ma/activites-teambuilding/team-building/bloom",
    meta: "INDOOR - 10 TO 120 - COLLABORATIF",
    images: ["assets/p3.png", "assets/p4.png", "assets/p5.png"],
  },
];


export const provider = {
  name: "activities",
  description: "Activity options for the destination — catalog + selection (mock data).",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const all = DATA;

    // Selection mode: return only the chosen activities, in the user's order.
    // Also expose `indoor`/`outdoor` groups for the options-summary slide.
    const selected = context["selected-activities"];
    if (Array.isArray(selected)) {
      const byId = new Map(all.map((x) => [x.id, x]));
      const activities = selected
        .map((id) => byId.get(String(id)))
        .filter((x): x is ActivityRecord => Boolean(x));
      const indoor = activities.filter((x) => x.type === "indoor");
      const outdoor = activities.filter((x) => x.type === "outdoor");
      return { activities, indoor, outdoor };
    }

    // Catalog mode: optional name search, then paginate.
    const q = String(context.q ?? "").toLowerCase();
    const filtered = q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
    const offset = Number.isFinite(context.offset) ? Number(context.offset) : 0;
    const limit = Number.isFinite(context.limit) ? Number(context.limit) : filtered.length;
    return { activities: filtered.slice(offset, offset + limit), total: filtered.length };
  },
};
