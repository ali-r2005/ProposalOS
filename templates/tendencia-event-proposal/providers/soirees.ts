// Soirées provider — returns gala / evening options for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.

interface SoireeRecord {
  id: string;
  name: string;
  subtitle: string;
  description: string;
}

const DATA: Record<string, SoireeRecord[]> = {
  tangier: [
    {
      id: "s1",
      name: "ATLAS CAPITAL GALA",
      subtitle: "TANGER SPIRIT : CÉLÉBRER & RÉUSSIR",
      description:
        "Une soirée d'exception pensée comme un voyage sensoriel entre Tanger et l'Espagne, mêlant saveurs ibériques réinventées et ambiance festive face à la Kasbah.",
    },
  ],
  marrakech: [
    {
      id: "s2",
      name: "NUIT DES MILLE ET UNE LUMIÈRES",
      subtitle: "MARRAKECH : L'ÉLÉGANCE ORIENTALE",
      description:
        "Dîner de gala dans un palais aux jardins illuminés : gastronomie marocaine raffinée, animations andalouses et scénographie féerique sous les étoiles.",
    },
  ],
};

export const provider = {
  name: "soirees",
  description: "Fetches gala / evening (soirée) options for the destination (mock data).",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const destination = String(context.destination ?? "").toLowerCase();
    const key = Object.keys(DATA).find((city) => destination.includes(city)) ?? "tangier";
    return { soirees: DATA[key] };
  },
};
