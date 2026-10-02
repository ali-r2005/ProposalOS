// Programme provider — parses the form's `programme` textarea (a raw JSON
// string the user pastes/types) into the array of day objects the
// programme-day component expects (repeat over `programme`).
// Provider contract (strict): export const provider = { name, description, execute }.
//
// Expected JSON shape (array of days):
// [{ "date": "Jour 1 — 15 juin", "matinee": ["<p>...</p>"], "midi": [...],
//    "apres_midi": [...], "soir": [...] }, ...]
// Each phase's items are HTML snippets injected raw ({{{this}}}) by the component.

interface ProgrammeDay {
  date?: string;
  matinee?: string[];
  midi?: string[];
  apres_midi?: string[];
  soir?: string[];
}

export const provider = {
  name: "programme",
  description: "Parses the raw JSON programme field into day objects for programme-day.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const raw = context.programme;

    // Already parsed (e.g. re-render from a saved/edited context) — pass through.
    if (Array.isArray(raw)) return { programme: raw };

    if (typeof raw !== "string" || !raw.trim()) return { programme: [] };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { programme: [] };
    }

    // Accept both the bare array and a `{ "programme": [...] }` wrapper —
    // pasting the field's own key alongside its value is a natural mistake
    // given the field is itself named "programme".
    if (!Array.isArray(parsed) && parsed && typeof parsed === "object" && Array.isArray((parsed as any).programme)) {
      parsed = (parsed as any).programme;
    }
    if (!Array.isArray(parsed)) return { programme: [] };

    const days: ProgrammeDay[] = parsed.map((day) => ({
      date: typeof day?.date === "string" ? day.date : "",
      matinee: Array.isArray(day?.matinee) ? day.matinee : [],
      midi: Array.isArray(day?.midi) ? day.midi : [],
      apres_midi: Array.isArray(day?.apres_midi) ? day.apres_midi : [],
      soir: Array.isArray(day?.soir) ? day.soir : [],
    }));

    return { programme: days };
  },
};
