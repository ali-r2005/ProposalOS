// Soirées provider — shapes the form's `catalogue-soirees` records (filled by
// the prefill-catalogue plugin from the CRM Deal, editable by the user) into
// the `soirees` collection the dining-options/soiree-detail components expect.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// No database here — this template's "catalogue" is the form input, already
// resolved before the wizard renders. This provider only reshapes it.

interface CatalogueSoiree {
  id?: string;
  "soiree-name"?: string;
  subtitle?: string;
  keywords?: string;
  description?: string;
  images?: string[];
}

function shape(soiree: CatalogueSoiree, index: number) {
  const images = Array.isArray(soiree.images) ? soiree.images : [];
  return {
    id: soiree.id ?? String(index),
    option: index + 1,
    name: soiree["soiree-name"] ?? "",
    subtitle: soiree.subtitle ?? "",
    keywords: soiree.keywords ?? "",
    description: soiree.description ?? "",
    images,
    image: images[0] ?? "",
  };
}

export const provider = {
  name: "soirees",
  description: "Shapes form-submitted catalogue soirées for the dining/soiree components.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const rows: CatalogueSoiree[] = Array.isArray(context["catalogue-soirees"])
      ? context["catalogue-soirees"]
      : [];
    return { soirees: rows.map(shape) };
  },
};
