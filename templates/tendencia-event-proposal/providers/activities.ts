// Activities provider — returns team-building & tourism options for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.

interface ActivityRecord {
  id: string;
  name: string;
  type: string; // "indoor" | "outdoor"
  category: string; // e.g. "collaboratif" | "compétitif"
  description: string;
  video: string;
  meta: string;
}

const DATA: Record<string, ActivityRecord[]> = {
  tangier: [
    {
      id: "a1",
      name: "ATLAS ANIMATE",
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
      type: "outdoor",
      category: "compétitif",
      description:
        "Un city-game immersif à travers la médina de Tanger : énigmes, défis et exploration pour renforcer la cohésion d'équipe.",
      video: "https://www.catalyst.ma/activites-teambuilding/team-building/enigma",
      meta: "OUTDOOR - 10 TO 200 - COMPÉTITIF",
    },
  ],
  marrakech: [
    {
      id: "a3",
      name: "ATLAS SPY MISSION",
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
      type: "indoor",
      category: "collaboratif",
      description:
        "Atelier créatif collaboratif autour d'une œuvre collective : chaque équipe contribue à une fresque commune symbolisant les valeurs de l'entreprise.",
      video: "https://www.catalyst.ma/activites-teambuilding/team-building/bloom",
      meta: "INDOOR - 10 TO 120 - COLLABORATIF",
    },
  ],
};

export const provider = {
  name: "activities",
  description: "Fetches team-building & tourism activities for the destination (mock data).",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const destination = String(context.destination ?? "").toLowerCase();
    const key = Object.keys(DATA).find((city) => destination.includes(city)) ?? "tangier";
    return { activities: DATA[key] };
  },
};
