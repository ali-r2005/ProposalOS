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
  // Two-column packages (2 items with paragraphes)
  {
    id: "scenographie-design-espace",
    name: "Scénographie & Design d'Espace",
    title: "SCÉNOGRAPHIE & DESIGN D'ESPACE",
    items: [
      {
        title: "Aménagement Sur-Mesure",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
        paragraphes: [
          "Conception visuelle et aménagement sur-mesure pour sublimer l'identité de votre événement.",
          "Création d'ambiances immersives associant décors contemporains, scénographie lumineuse et structures personnalisées."
        ]
      },
      {
        title: "Mobilier & Décor",
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop",
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
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
        paragraphes: [
          "Ateliers interactifs et défis ludiques favorisant la cohésion, l'esprit d'équipe et la créativité.",
          "Activités immersives et sur-mesure alignées avec les valeurs et objectifs stratégiques de votre organisation."
        ]
      },
      {
        title: "Défis Sportifs & Ludiques",
        image: "https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=600&h=400&fit=crop",
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
        image: "https://images.unsplash.com/photo-1464207687429-7505649dae38?w=600&h=400&fit=crop",
        paragraphes: [
          "Coordination intégrale du transport, de la gestion des flux et des accueils haut de gamme.",
          "Assistance dédiée 24/7 sur le terrain avec nos régisseurs et coordinateurs d'expérience."
        ]
      },
      {
        title: "Accueil Personnalisé",
        image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=400&fit=crop",
        paragraphes: [
          "Service de conciergerie dédié pour chaque participant, du transfert aéroport à l'accompagnement sur site.",
          "Gestion des demandes spéciales et coordination avec les partenaires locaux pour une expérience sans faille."
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
        image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop",
        paragraphes: [
          "Conception graphique complète : invitations, badges, roll-ups et supports de communication sur-mesure.",
          "Déclinaison de votre identité de marque sur l'ensemble des supports physiques et digitaux de l'événement."
        ]
      },
      {
        title: "Signalétique & Wayfinding",
        image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=400&fit=crop",
        paragraphes: [
          "Signalétique directionnelle et informative pensée pour fluidifier les parcours des participants.",
          "Habillage des espaces d'accueil, de restauration et des salles de conférence."
        ]
      }
    ]
  },
  // Three-column packages (3+ items with paragraphes)
  {
    id: "gastronomie-evenements-festifs",
    name: "Gastronomie & Événements Festifs",
    title: "GASTRONOMIE & ÉVÉNEMENTS FESTIFS",
    items: [
      {
        title: "Dîners de Gala",
        image: "https://images.unsplash.com/photo-1559329007-40790c9c41b7?w=600&h=400&fit=crop",
        paragraphes: [
          "Sélection exclusive des meilleurs traiteurs et chefs pour des dîners de gala et cocktails raffinés.",
          "Création de concepts culinaires alliant saveurs authentiques et haute gastronomie."
        ]
      },
      {
        title: "Cocktails & Animations",
        image: "https://images.unsplash.com/photo-1516769751317-29589a2e1b25?w=600&h=400&fit=crop",
        paragraphes: [
          "Cocktails dînatoires thématiques avec animations culinaires en live et mise en scène des mets.",
          "Coordination complète avec DJ, éclairagiste et décorateur pour une soirée mémorable."
        ]
      },
      {
        title: "Buffets & Réceptions",
        image: "https://images.unsplash.com/photo-1555311534912-6a7de06bbf38?w=600&h=400&fit=crop",
        paragraphes: [
          "Buffets variés adaptés à tous les régimes et préférences culinaires avec service impeccable.",
          "Mise en valeur des mets avec présentation élaborée et service personnalisé."
        ]
      }
    ]
  },
  {
    id: "production-audiovisuelle",
    name: "Production Audiovisuelle",
    title: "PRODUCTION AUDIOVISUELLE & STREAMING",
    items: [
      {
        title: "Captation Vidéo Professionnelle",
        image: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&h=400&fit=crop",
        paragraphes: [
          "Captation multi-caméra en haute définition avec équipe technique expérimentée.",
          "Post-production complète : montage, étalonnage, et ajout d'effets visuels professionnels."
        ]
      },
      {
        title: "Streaming en Direct",
        image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&h=400&fit=crop",
        paragraphes: [
          "Diffusion en direct sur multiple plateformes avec qualité 4K et faible latence.",
          "Interaction en temps réel avec commentaires et animations directement sur le flux."
        ]
      },
      {
        title: "Animation Visuelle",
        image: "https://images.unsplash.com/photo-1633356122544-f134324ef6e6?w=600&h=400&fit=crop",
        paragraphes: [
          "Motion design et animations 3D pour sublimer vos contenus et messages clés.",
          "Création de génériques, cartons et éléments graphiques animés immersifs."
        ]
      }
    ]
  },
  // Images-only packages (no paragraphes)
  {
    id: "galerie-realisations",
    name: "Galerie de Réalisations",
    title: "GALERIE DE RÉALISATIONS",
    items: [
      { title: "Réception d'Entreprise", image: "https://images.unsplash.com/photo-1519671482677-0d63fdf6fa16?w=600&h=400&fit=crop" },
      { title: "Soirée de Gala", image: "https://images.unsplash.com/photo-1559329007-40790c9c41b7?w=600&h=400&fit=crop" },
      { title: "Séminaire Résidentiel", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop" },
      { title: "Lancement de Produit", image: "https://images.unsplash.com/photo-1540575467063-178f50002c4b?w=600&h=400&fit=crop" }
    ]
  },
  {
    id: "portfolio-installations",
    name: "Portfolio Installations & Aménagements",
    title: "NOS RÉALISATIONS SCÉNOGRAPHIQUES",
    items: [
      { title: "Salon d'Exposition", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop" },
      { title: "Espace Lounge VIP", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop" },
      { title: "Podium & Scène", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop" },
      { title: "Zone d'Accueil Immersive", image: "https://images.unsplash.com/photo-1540575467063-178f50002c4b?w=600&h=400&fit=crop" }
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
