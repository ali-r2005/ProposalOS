# ProposalOS template anatomy

A template is one folder: `templates/<template-id>/`. The app finds it automatically (no registration). The folder name **must equal** `manifest.json → id` (lowercase, digits, dashes).

```
templates/<template-id>/
  manifest.json      required — name, language, plugins
  blueprint.yaml     required — slide order and where each slide's data comes from
  tokens.css         colours, fonts, radii as CSS variables (the only place raw colour values live)
  form/*.json        wizard steps; every JSON file = one step, ordered by file name
  components/<name>/<name>.html   one slide layout (Handlebars + Tailwind)
  components/<name>/schema.json   documents the fields the slide reads
  assets/            images, logos, SVGs — referenced as "assets/<file>"
  providers/*.ts     optional — reshape/fetch data for `source: database` sections
  plugins/*.ts       optional — prefill the form on open (listed in manifest "plugins")
  prompts/*.md       optional — AI prompts for `source: ai` sections (folder may also be spelled `propmts/`)
  db/schema.ts       optional — template-owned tables under pgSchema("tmpl_<id>")
```

## manifest.json

```json
{
  "id": "wedding-proposal",
  "name": "Wedding Proposal",
  "version": "0.1.0",
  "author": "Tendencia Events",
  "lang": "en",
  "description": "One line shown in the template picker",
  "plugins": [],
  "canvas": { "width": 1920, "height": 1080, "aspectRatio": "16:9" }
}
```
`lang` is the language of the template's own content (labels, slide text, prompts) — not the app UI language. `plugins` lists file names in `plugins/` (no extension); omit or `[]` for none.

## blueprint.yaml

Ordered list of sections. Each section renders one component.

```yaml
sections:
  - id: cover                 # unique
    component: cover          # folder name under components/
    source: manual            # static | manual | database | ai
    expansion: single

  - id: hotel-detail
    component: hotel-detail
    source: database
    provider: accommodation   # providers/accommodation.ts
    expansion:
      strategy: repeat        # one slide per item
      collection: hotels      # context key holding the list
    dependsOn: [accommodation]

  - id: intro
    component: intro
    source: ai
    prompt: destination       # prompts/destination.md
    expansion: single
```

Sources:
- `static` — no data needed; optional inline `static:` block whose keys are merged into the context.
- `manual` — values come from the form as-is (form field `key` = context key).
- `database` — runs `providers/<provider>.ts`; whatever it returns is merged into the context.
- `ai` — runs `prompts/<prompt>.md`; the JSON it returns is merged into the context.

Expansion:
- `single` — one slide. With `collection:` set, the slide is skipped when that value is missing or an empty list.
- `repeat` + `collection` — one slide per list item. The item's fields are available directly (`{{name}}`), plus `{{index}}`.
- `chunk` + `collection` + `size` — groups of `size` items per slide, available as `{{#each items}}`.

`dependsOn` lists section ids or provider names that must run first.

## Context — what a component can read

One flat object, built in this order: form values → static blocks → provider results → AI results. Every component reads from it with Handlebars. Keys with dashes need brackets: `{{[event-name]}}`.

## form/*.json

```json
{
  "id": "event",
  "title": "Event",
  "description": "Shown under the step title",
  "fields": [
    { "key": "event-name", "label": "Event name", "type": "text", "required": true, "placeholder": "e.g. …" }
  ]
}
```
Field types: `text`, `textarea`, `number`, `email`, `url`, `select` (with `options` or `optionsFrom`), `image-list` (array of URLs), `record-list` (array of objects; needs `itemLabel` + `itemFields`). Optional: `min`, `max` (list sizes), `placeholder`, `accept`. **`min`/`max` count list items only** — never put them on `text`/`number` fields: the wizard counts a non-list value as 0 items, so `"min": 1` on a number field blocks the Next button forever.

`select` from a provider: `"optionsFrom": { "provider": "hotels", "collection": "hotels", "valueKey": "id", "labelKey": "name" }`.

## components/<name>/<name>.html

Also accepted: `components/<name>/component.html` or `components/<name>.html`. See SKILL.md → "Component rules".

## components/<name>/schema.json

Documentation for humans and Claude — not enforced by the engine. Keep it in sync with the fields the HTML reads.

```json
{
  "id": "hotel-detail",
  "name": "Hotel Detail Slide",
  "description": "Repeated once per hotel (repeat over `hotels`).",
  "requiredProps": {
    "name": { "type": "string" },
    "images": { "type": "array", "items": { "type": "string", "format": "url" } }
  }
}
```

## providers/<name>.ts (strict contract)

```ts
export const provider = {
  name: "activities",
  description: "Shapes form activities for the activity slides.",
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const rows = Array.isArray(context["catalogue-activities"]) ? context["catalogue-activities"] : [];
    return { activities: rows.map((r) => ({ name: r["activity-name"] ?? "" })) };
  },
};
```
- Named export `provider` only — no default/function/class exports.
- Plain `.ts`, run by Node directly (no build step). Imports between template files are relative **with `.ts`**: `import { x } from "./helpers.ts"`.
- Calling an external API: use built-in `fetch` (never axios) — see `templates/tendencia-event-recommendation/plugins/frappe-http.ts`.
- Database access: `import { getDb } from "../db/client.ts"` (one-line shim to the engine client).
- Any npm package imported here must also be added to `serverExternalPackages` and `outputFileTracingIncludes` in `next.config.js`.

## plugins/<name>.ts (strict contract)

```ts
export const plugin = {
  name: "prefill-x",
  description: "…",
  trigger: "onMount" as const,
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    return { "event-name": "…" };   // partial form values; user input always wins
  },
};
```
Runs only when listed in `manifest.json → plugins`.

## prompts/<name>.md

Markdown prompt rendered with Handlebars against the context. Must end by demanding JSON only:

```
Return ONLY this JSON: { "destination-paragraphs": ["…", "…"] }

Output format: Valid JSON only.
```
The returned keys are merged into the context, so components read them like any other field.

## Language variants (e.g. FR ↔ EN)

Sibling templates such as `tendencia-event-recommendation` (fr) and `tendencia-event-recommendation-en` share structure; only human-readable text differs (form labels, slide titles, prompt language). Data keys, providers, plugins and component markup stay identical. Structural differences between variants are intentional when the upstream data differs (e.g. the FR plugin resolves Item → Item Group → reference, EN resolves Item → reference) — check before "fixing" them.
