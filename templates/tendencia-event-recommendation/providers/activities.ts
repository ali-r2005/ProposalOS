// Activities provider — shapes the form's `catalogue-activities` records
// (filled by the prefill-catalogue plugin from the CRM Deal, editable by the
// user) into the `activities` collection the activity-* components expect.
// Provider contract (strict): export const provider = { name, description, execute }.
//
// No database here — this template's "catalogue" is the form input, already
// resolved before the wizard renders. This provider only reshapes it.

interface CatalogueActivity {
  id?: string;
  "activity-name"?: string;
  type?: string;
  difficulty?: string;
  description?: string;
  images?: string[];
}

// `category` has no CRM equivalent field, so it's filled from `difficulty` —
// the closest semantic match among what the CRM's Activity doctype provides.
function shape(activity: CatalogueActivity, index: number) {
  return {
    id: activity.id ?? String(index),
    name: activity["activity-name"] ?? "",
    type: activity.type ?? "",
    category: activity.difficulty ?? "",
    description: activity.description ?? "",
    video: "",
    meta: "",
    images: Array.isArray(activity.images) ? activity.images : [],
  };
}

export const provider = {
  name: "activities",
  description: "Shapes form-submitted catalogue activities for the activity components.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const rows: CatalogueActivity[] = Array.isArray(context["catalogue-activities"])
      ? context["catalogue-activities"]
      : [];
    return { activities: rows.map(shape) };
  },
};
