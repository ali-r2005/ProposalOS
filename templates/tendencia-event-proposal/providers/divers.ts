// Divers provider — custom sections, services, and auxiliary proposal items.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Each divers package is its own titled bundle of items (like a hotel or an
// activity), not a single shared bucket — the user picks 1+ whole packages
// in the selections form, and each renders its own set of slides.
//
// Two modes, driven by the context:
//   • catalog   — no selection yet: return every package (dummy data, no db table).
//   • selection — `selected-divers` (array of ids) present: return only those,
//                 in the order the user picked them.

export interface Item {
  title?: string;
  image?: string;
  paragraphes?: string[];
}

export interface DiversPackage {
  id: string;
  name: string;
  title: string;
  items: Item[];
}

type RawDiversPackage = DiversPackage;

/**
 * A package's own item shape decides its layout — no engine or template
 * numeric-comparison logic involved, just a plain array field per bucket:
 *   • items have no `paragraphes` → images-only (image gallery, no text)
 *   • items have `paragraphes` and there are exactly 2 → two-columns
 *   • items have `paragraphes` and there are 3+ → three-columns (capped to 3)
 */
function hasParagraphes(pkg: RawDiversPackage): boolean {
  return pkg.items.some((item) => Array.isArray(item.paragraphes) && item.paragraphes.length > 0);
}
interface DiversBuckets {
  diversImagesOnly?: DiversPackage[];
  diversTwoColumns?: DiversPackage[];
  diversThreeColumns?: DiversPackage[];
}

function bucketDivers(packages: RawDiversPackage[]): DiversBuckets {
  const diversImagesOnly: DiversPackage[] = [];
  const diversTwoColumns: DiversPackage[] = [];
  const diversThreeColumns: DiversPackage[] = [];
  const divers : DiversBuckets = {
  };

  for (const pkg of packages) {
    if (!hasParagraphes(pkg)) {
      diversImagesOnly.push({ ...pkg, items: pkg.items.slice(0, 4) });
    } else if (pkg.items.length === 2) {
      diversTwoColumns.push(pkg);
    } else {
      diversThreeColumns.push({ ...pkg, items: pkg.items.slice(0, 3) });
    }
  }
  if(diversImagesOnly.length > 0){
    divers["diversImagesOnly"] = diversImagesOnly;
  }
  if(diversTwoColumns.length > 0){
    divers["diversTwoColumns"] = diversTwoColumns;
  }
  if(diversThreeColumns.length > 0){
    divers["diversThreeColumns"] = diversThreeColumns;
  }

  return divers;
}

const rawDummyDivers: RawDiversPackage[] = [
  {
    id: "scenographie-design-espace",
    name: "Scénographie & Design d'Espace",
    title: "SCÉNOGRAPHIE & DESIGN D'ESPACE",
    items: [
      {
        title: "Aménagement Sur-Mesure",
        image: "assets/p1.png",
        paragraphes: [
          "Conception visuelle et aménagement sur-mesure pour sublimer l'identité de votre événement.",
          "Création d'ambiances immersives associant décors contemporains, scénographie lumineuse et structures personnalisées."
        ]
      },
      {
        title: "Mobilier & Décor",
        image: "assets/p2.png",
        paragraphes: [
          "Sélection de mobilier design et de décors modulables adaptés à chaque thématique d'événement.",
          "Habillage complet des espaces : signalétique, éclairage d'ambiance et éléments scénographiques sur-mesure."
        ]
      }
    ]
  },
  {
    id: "team-building-experiences",
    name: "Team Building & Expériences",
    title: "TEAM BUILDING & EXPÉRIENCES",
    items: [
      {
        title: "Ateliers Collaboratifs",
        image: "assets/p2.png",
        paragraphes: [
          "Ateliers interactifs et défis ludiques favorisant la cohésion, l'esprit d'équipe et la créativité.",
          "Activités immersives et sur-mesure alignées avec les valeurs et objectifs stratégiques de votre organisation."
        ]
      },
      {
        title: "Défis Sportifs & Ludiques",
        image: "assets/p3.png",
        paragraphes: [
          "Challenges en équipe, chasses au trésor et jeux de piste conçus pour renforcer la dynamique collective.",
          "Encadrement professionnel garantissant sécurité et engagement pour tous les participants."
        ]
      }
    ]
  },
  {
    id: "logistique-conciergerie-vip",
    name: "Logistique & Conciergerie VIP",
    title: "LOGISTIQUE & CONCIERGERIE VIP",
    items: [
      {
        title: "Transport & Transferts",
        image: "assets/p3.png",
        paragraphes: [
          "Coordination intégrale du transport, de la gestion des flux et des accueils haut de gamme.",
          "Assistance dédiée 24/7 sur le terrain avec nos régisseurs et coordinateurs d'expérience."
        ]
      },
      {
        title: "Accueil Personnalisé",
        image: "assets/p4.png",
        paragraphes: [
          "Service de conciergerie dédié pour chaque participant, du transfert aéroport à l'accompagnement sur site.",
          "Gestion des demandes spéciales et coordination avec les partenaires locaux pour une expérience sans faille."
        ]
      }
    ]
  },
  {
    id: "gastronomie-evenements-festifs",
    name: "Gastronomie & Événements Festifs",
    title: "GASTRONOMIE & ÉVÉNEMENTS FESTIFS",
    items: [
      {
        title: "Dîners de Gala",
        image: "assets/p4.png",
        paragraphes: [
          "Sélection exclusive des meilleurs traiteurs et chefs pour des dîners de gala et cocktails raffinés.",
          "Création de concepts culinaires alliant saveurs authentiques et haute gastronomie."
        ]
      },
      {
        title: "Cocktails & Animations",
        image: "assets/p1.png",
        paragraphes: [
          "Cocktails dînatoires thématiques avec animations culinaires en live et mise en scène des mets.",
          "Coordination complète avec DJ, éclairagiste et décorateur pour une soirée mémorable."
        ]
      }
    ]
  },
  {
    id: "communication-signaletique",
    name: "Communication & Signalétique",
    title: "COMMUNICATION & SIGNALÉTIQUE",
    items: [
      {
        title: "Identité Visuelle Événementielle",
        image: "assets/p2.png",
        paragraphes: [
          "Conception graphique complète : invitations, badges, roll-ups et supports de communication sur-mesure.",
          "Déclinaison de votre identité de marque sur l'ensemble des supports physiques et digitaux de l'événement."
        ]
      },
      {
        title: "Signalétique & Wayfinding",
        image: "assets/p3.png",
        paragraphes: [
          "Signalétique directionnelle et informative pensée pour fluidifier les parcours des participants.",
          "Habillage des espaces d'accueil, de restauration et des salles de conférence."
        ]
      }
    ]
  },
  {
    id: "galerie-realisations",
    name: "Galerie de Réalisations",
    title: "GALERIE DE RÉALISATIONS",
    items: [
      { title: "Réception d'Entreprise", image: "assets/p1.png" },
      { title: "Soirée de Gala", image: "assets/p2.png" },
      { title: "Séminaire Résidentiel", image: "assets/p3.png" },
      { title: "Lancement de Produit", image: "assets/p4.png" }
    ]
  }
];

export const provider = {
  name: "divers",
  description: "Custom services and divers packages provider.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const allPackages: RawDiversPackage[] = context.diversPackages || rawDummyDivers;

    // Selection mode: filter to the chosen packages, in the user's order.
    const selected = context["selected-divers"];
    const packages = Array.isArray(selected)
      ? (() => {
          const byId = new Map(allPackages.map((x) => [x.id, x]));
          return selected.map((id) => byId.get(String(id))).filter((x): x is RawDiversPackage => Boolean(x));
        })()
      : allPackages;

    return { divers: packages, ...bucketDivers(packages) };
  }
};
