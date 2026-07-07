// Soirées provider — gala / evening options for a destination.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Two modes, driven by the context:
//   • catalog   — no selection yet: return options (search + paginate via
//                 `q` / `limit` / `offset`), plus `total`.
//   • selection — `selected-soirees` (array of ids) present: return only those,
//                 in the order the user picked them, each with a 1-based `option`.

interface SoireeRecord {
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

const DATA: SoireeRecord[] = [
  {
    id: "s1",
    name: "ATLAS CAPITAL GALA",
    subtitle: "TANGER SPIRIT : CÉLÉBRER & RÉUSSIR",
    description: [
      "Offrez à vos invités une soirée d'exception, pensée comme un voyage sensoriel entre Tanger et l'Espagne. Dans une atmosphère intime et chaleureuse, l'expérience mêle saveurs ibériques réinventées, touches méditerranéennes et une ambiance festive propice à la convivialité et au partage.",
      "Nichée au cœur d'une élégante demeure arabo-andalouse dotée d'une terrasse à ciel ouvert offrant une vue panoramique sur la médina et la baie de Tanger, cette soirée prend place dans un décor authentique et harmonieux, juste en face de la Kasbah.",
      "La proposition culinaire revisite les classiques marocains en les fusionnant avec l'esprit des tapas espagnols : petites portions raffinées, assiettes à partager, notes parfumées et généreuses. Chaque bouchée devient une rencontre entre deux rives.",
      "Pour sublimer l'instant, une animation rythmée par des sonorités chaudes et entraînantes donne vie à la soirée : mélodies andalouses, accents folkloriques marocains et rythmes envoûtants créent un véritable pont culturel, invitant les convives à célébrer, vibrer et réussir ensemble.",
    ],
    image: "assets/p5.png",
  },
  {
    id: "s2",
    name: "NUIT DES MILLE ET UNE LUMIÈRES",
    subtitle: "MARRAKECH : L'ÉLÉGANCE ORIENTALE",
    description: [
      "Plongez vos invités dans la magie de Marrakech le temps d'un dîner de gala au cœur d'un palais aux jardins illuminés, où l'élégance orientale se dévoile sous les étoiles.",
      "Dans un décor féerique de lanternes, de tapis et de fontaines, la gastronomie marocaine raffinée se déguste au rythme d'animations andalouses et de spectacles envoûtants.",
      "Des saveurs d'exception, une scénographie somptueuse et un service haut de gamme se conjuguent pour offrir à vos convives une expérience inoubliable, entre tradition et raffinement.",
    ],
    image: "assets/p6.png",
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
      const chosen = selected
        .map((id) => byId.get(String(id)))
        .filter((x): x is SoireeRecord => Boolean(x));
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
