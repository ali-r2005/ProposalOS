# Creating a ProposalOS template

This guide explains how to build a proposal template: the slides, the form that fills them, and the logic that fetches data. You can follow it by hand, or let Claude do the work with the `proposal-template` skill (see [Building with Claude](#building-with-claude)).

A template is one folder. The engine finds it on its own: you never register a template or change engine code (`app/`, `components/`, `lib/`) to make one work. If something seems impossible without an engine change, ask the engine maintainer first.

---

## 1. Get set up

Templates live in a separate private repo, [`proposalos-templates`](https://github.com/ali-r2005/proposalos-templates), mounted inside the engine at `templates/` as a git submodule.

**If you have access to the templates repo:**
```bash
git clone --recurse-submodules https://github.com/ali-r2005/ProposalOS.git
cd ProposalOS
npm install
```
Already cloned without `--recurse-submodules`? Run `git submodule update --init`.

**If you only have the engine repo:** clone it normally and run `npm install`. `templates/` will be empty. That's fine: create your template folder inside it and send it back as a zip (see [Sharing your template](#7-share-your-template)).

You need Node and an internet connection for the preview (Tailwind and fonts load from a CDN). You don't need a database, a login or an AI key.

---

## 2. Start from the starter

Copy the starter template and rename it:

```bash
cp -r .claude/skills/proposal-template/starter templates/my-template
```

The folder name is the **template id**. Use lowercase letters, digits and dashes (`wedding-proposal`, `team-building-recommendation`). It must be identical to `id` in `manifest.json`.

Then open `templates/my-template/manifest.json` and replace every `__PLACEHOLDER__`.

---

## 3. What's in a template

```
templates/<template-id>/
  manifest.json      required: id, name, language(s), plugins
  i18n/<lang>.json   the slides' static text, one file per language (optional)
  blueprint.yaml     required: slide order, and where each slide's data comes from
  tokens.css         colours and fonts as CSS variables
  form/*.json        the form steps; one file = one step, ordered by file name
  components/<name>/<name>.html   one slide layout (Handlebars + Tailwind)
  components/<name>/schema.json   lists the fields the slide reads
  assets/            images, logos, SVGs
  providers/*.ts     optional: fetch or reshape data for a slide
  plugins/*.ts       optional: prefill the form when it opens
  prompts/*.md       optional: AI prompts that write slide text
  db/schema.ts       optional: the template's own database tables (see docs/database.md)
```

How the pieces connect:

1. The user fills in the **form**. Each field has a `key`.
2. The **blueprint** lists the slides in order. For each slide it says where the data comes from: the form, a provider, an AI prompt, or nothing (static).
3. All the data ends up in one object, the **context**. Each **component** (slide) reads from it with `{{key}}`.

So a form field with `"key": "event-name"` appears on a slide as `{{[event-name]}}`.

### manifest.json

```json
{
  "id": "wedding-proposal",
  "name": "Wedding Proposal",
  "version": "0.1.0",
  "author": "Tendencia Events",
  "lang": "en",
  "languages": ["en", "fr"],
  "description": "One line shown in the template picker",
  "plugins": [],
  "canvas": { "width": 1920, "height": 1080, "aspectRatio": "16:9" }
}
```
- `lang` is the template's default content language (slide text, labels, prompts), not the app's.
- `languages` lists every language a proposal can be generated in. Leave it out for a single-language template. See [Languages](#languages).
- `plugins` lists the files in `plugins/` to run, without the extension. Leave it `[]` if you have none.

### blueprint.yaml

One entry per section. A section renders one component, once or once per item of a list.

```yaml
sections:
  - id: cover
    component: cover          # folder name under components/
    source: manual            # static | manual | database | ai
    expansion: single

  - id: hotel-detail
    component: hotel-detail
    source: database
    provider: accommodation   # runs providers/accommodation.ts
    expansion:
      strategy: repeat        # one slide per hotel
      collection: hotels      # the list in the context
    dependsOn: [accommodation]

  - id: intro
    component: intro
    source: ai
    prompt: destination       # runs prompts/destination.md
    expansion: single
```

| `source` | Where the data comes from |
|---|---|
| `static` | Nothing; the slide is the same every time. An optional `static:` block adds fixed values. |
| `manual` | The form, as typed. |
| `database` | A provider in `providers/`. What it returns is added to the context. |
| `ai` | A prompt in `prompts/`. The JSON the AI returns is added to the context. |

| `expansion` | Result |
|---|---|
| `single` | One slide. If you add `collection:`, the slide is skipped when that list is empty. |
| `repeat` + `collection` | One slide per item. The item's fields are readable directly (`{{name}}`), plus `{{index}}`. |
| `chunk` + `collection` + `size` | One slide per group of `size` items, readable with `{{#each items}}`. |

Add `parse: json` to any of them when the list is typed or pasted as JSON text (for example in a textarea). The engine parses it first: a plain list, or an object holding the list under the collection's name (`{"programme": [...]}`). If the JSON is invalid, saving shows the error instead of silently showing no slides.

`dependsOn` lists sections or providers that must run first.

### form/*.json

Each file is one step of the form. Files are shown in file-name order, so prefix them: `1-client.json`, `2-event.json`.

```json
{
  "id": "event",
  "title": "Event",
  "description": "Shown under the step title",
  "fields": [
    { "key": "event-name", "label": "Event name", "type": "text", "required": true, "placeholder": "e.g. Annual Summit" }
  ]
}
```

Field types:
- `text`, `textarea`, `number`, `email`, `url`.
- `select`, with `options`, or with `optionsFrom` to load the choices from a provider: `{ "provider": "hotels", "collection": "hotels", "valueKey": "id", "labelKey": "name" }`.
- `image-list`: a list of image URLs.
- `record-list`: a list of objects. Needs `itemLabel` and `itemFields` (the fields of each object).

> ⚠️ **`min` and `max` count list items.** Use them only on `image-list` and `record-list`. On a `text` or `number` field the form counts the value as 0 items, so `"min": 1` blocks the Next button forever.

### tokens.css

The only file where colours and fonts are written as raw values:

```css
:root {
  --brand-primary: #255AA8;
  --brand-accent: #FFC000;
  --color-text-primary: #1a1a1a;
  --color-background: #ffffff;
  --font-heading: 'Poppins', 'Arial', sans-serif;
  --font-body: 'Poppins', 'Segoe UI', sans-serif;
}
```
Need a new colour? Add a token here, then use it in the components.

---

## 4. Build the slides

Each slide is `components/<name>/<name>.html`: one root element with a fixed 1920×1080 canvas.

```html
<!-- Slide component: cover — photo left, client and event right -->
<div class="slide relative w-[1920px] h-[1080px] overflow-hidden bg-[var(--color-background)]" style="font-family: var(--font-body);">

  <img src="{{[cover-image]}}" alt="" data-field="cover-image" class="absolute object-cover" style="left: 0; top: 0; width: 1100px; height: 1080px;">

  <div data-field="cover-text" class="absolute" style="left: 1180px; top: 300px; width: 660px;">
    <p data-field="client-name" class="text-[28px] uppercase text-[var(--brand-primary)]">{{[client-name]}}</p>
    <h1 data-field="event-name" class="mt-6 text-[88px] font-bold text-[var(--color-text-primary)]" style="font-family: var(--font-heading);">{{[event-name]}}</h1>
    {{#if [event-dates]}}
    <p data-field="event-dates" class="mt-10 text-[30px]">{{[event-dates]}}</p>
    {{/if}}
  </div>

</div>
```

### Rules

**Styling**
- Use Tailwind classes. Colours always come from a token: `text-[var(--brand-primary)]`, `bg-[var(--color-surface)]`, `border-[color:var(--brand-accent)]`.
- ❌ Never write a hex or rgb colour in a component.
- ❌ Never add `<style>`, `<link>` or `<script>`. The page already loads Tailwind, `tokens.css` and the Tabler icon font (`<i class="ti ti-calendar"></i>`).
- `style=""` is only for `font-family: var(--font-…)` and for position and size (see the editor rules below).

**Handlebars**
- Allowed: `{{x}}`, `{{a.b}}`, `{{#each list}}…{{/each}}`, `{{#if x}}…{{else}}…{{/if}}`.
- Helpers for simple display logic, so you don't need a provider just to reshape form values:
  - `{{add index 1}}`: adds two numbers, e.g. "Option 1, 2, 3" from the 0-based `index` (or `@index` inside `{{#each}}`).
  - `{{#times category}}<i class="ti ti-star-filled"></i>{{/times}}`: repeats the block N times (up to 100), e.g. stars from a number. `{{else}}` shows when N is 0.
  - `{{#each (limit items 4)}}…{{/each}}`: only the first N items of a list.
- Line breaks typed in a textarea: add the class `whitespace-pre-line` to the element showing the text.
- Keys with dashes need brackets: `{{[event-name]}}`, `{{#if [number-of-participants]}}`.
- `{{{html}}}` (triple braces) outputs raw HTML. Use it only for values that a provider has already made safe, for example by turning line breaks into `<br>`.
- Wrap optional lines in `{{#if}}`. Give images a fallback: `{{#if images.[0]}}{{images.[0]}}{{else}}assets/placeholder-image.svg{{/if}}`.

**Assets**
- Put files in the template's `assets/` folder (not inside a component folder) and use them as `assets/<file>`.

**Layouts that depend on how many items there are** (for example a photo collage for 1 to 5 photos)
- Handlebars can't compare numbers. Instead, a provider returns one flag per count (`count-1` … `count-5`, only one of them true) and the items spread into slots (`image-1` …). The component has one `{{#if [count-N]}}` block per layout.
- Example: `templates/team-building-recommendation/providers/activities.ts`.

**Text length**
- Size text boxes for real content, not for the short placeholders shown in the preview. Imagine each value 3× longer.

### Rules for the visual editor

Users adjust generated proposals in the visual editor (GrapesJS). These rules keep slides easy to move, resize and recolour there:

1. **Main blocks use `absolute` plus inline geometry:** `class="absolute" style="left: 90px; top: 58px; width: 820px;"`. The editor's side panel shows inline values, but it stays empty for Tailwind ones like `left-[90px]`.
2. **For rows of cards or columns, use `flex` with `style="width: …px"` and `shrink-0` on each item, not `grid`.** Otherwise one column can't be resized on its own.
3. **Each independent block is its own `absolute` element.** A photo, a logo and a text block are three positioned elements. Lines of text that belong together (label, title, date) sit inside one positioned wrapper, so a longer title pushes the lines below it down.
4. **Don't centre with transforms** (`left-1/2 -translate-x-1/2`). Use plain `left`/`top`.
5. **Give text boxes a width, never a fixed height**, so longer text wraps.
6. **Put `data-field="…"` on every element that shows data**, named after the field. It's the element's name in the editor's Layers panel, and it lets editors see which field is which. Don't use `data-gjs-*` attributes.
7. **Decorative backgrounds come first in the markup**, so they stay behind the content.

### schema.json

Next to each component, list the fields it reads. The engine doesn't enforce it; it's documentation for people and for Claude.

```json
{
  "id": "cover",
  "name": "Cover Slide",
  "description": "Opening slide: cover photo, client name, event name.",
  "requiredProps": {
    "client-name": { "type": "string" },
    "event-name": { "type": "string" },
    "cover-image": { "type": "string", "format": "url" }
  }
}
```

---

## 5. Add data logic (optional)

All three file types are plain TypeScript or Markdown. Node runs `.ts` files directly; there's no build step.

### Providers: fetch or reshape data

`providers/<name>.ts`, used by `source: database` sections.

```ts
export const provider = {
  name: "activities",
  description: "Shapes the activities from the form for the activity slides.",
  async execute(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const rows = Array.isArray(context["catalogue-activities"]) ? context["catalogue-activities"] : [];
    return { activities: rows.map((r) => ({ name: r["activity-name"] ?? "" })) };
  },
};
```

### Plugins: prefill the form

`plugins/<name>.ts`. Runs when the form opens, and only if it's listed in `manifest.json → plugins`. It returns form values. A value the user types always wins over a prefilled one.

```ts
export const plugin = {
  name: "prefill-x",
  description: "Fills the event name from the CRM deal.",
  trigger: "onMount" as const,
  async execute(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { "event-name": "…" };
  },
};
```

### Rules for providers and plugins
- Export exactly `export const provider = {…}` or `export const plugin = {…}`. No default, function or class exports.
- Import other template files with a relative path that ends in `.ts`: `import { getWithRetry } from "./frappe-http.ts"`.
- To call an external API (Frappe, a hotel API…), use the built-in `fetch`, never `axios`. Copy the retry helper from `templates/tendencia-event-recommendation/plugins/frappe-http.ts`.
- Read secrets from environment variables (`process.env.X`). Never write them in the file.
- Importing an npm package needs a change in the engine's `next.config.js`, so ask the engine maintainer first.

### AI prompts

`prompts/<name>.md`, used by `source: ai` sections. The prompt can read the context with Handlebars and must ask for JSON only:

```
Write two paragraphs presenting {{destination}} for a corporate group of {{[number-of-participants]}} people.

Return ONLY this JSON: { "destination-paragraphs": ["…", "…"] }

Output format: Valid JSON only.
```
The keys of the returned JSON are added to the context, so slides read them like any other field.

---

## 6. Preview and check

```bash
npm run preview -- my-template          # http://localhost:4321/t/my-template
npm run preview:check -- my-template    # validation report
```

- **Preview** shows every slide with its placeholders: text as `{{field}}`, images as grey boxes, each `{{#each}}` repeated 3 times, every `{{#if}}` shown. It reloads when you save. Add `?c=<component>` to see one slide, or `?count=N` for count-dependent layouts.
- **Check** reports errors and warnings. It must end with `OK` before you share the template.

To test with real data, run the app (`npm run dev`) and create a proposal from your template.

---

## 7. Share your template

**With access to the templates repo:**
```bash
cd templates
git checkout -b my-template
git add my-template
git commit -m "add my-template"
git push -u origin my-template      # then open a pull request
```

**Without access:** zip your template folder (the folder itself, so the zip contains `my-template/manifest.json`, …) and send it.

**For the maintainer, to add a received zip:**
1. Unzip it into `templates/` and run `npm run preview:check -- my-template`.
2. Commit it in the templates repo: `cd templates && git add my-template && git commit && git push`.
3. Point the engine at the new templates version: `cd .. && git add templates && git commit -m "update templates" && git push`.

Step 3 is what makes the deployed app pick up the template.

---

## Languages

One template can produce proposals in several languages. Don't copy the folder per language: the copies drift apart, and every fix has to be made twice.

**1. List the languages in the manifest.** `lang` is the default, `languages` lists them all:

```json
"lang": "fr",
"languages": ["fr", "en"]
```

The template picker then shows one button per language, and the form gets a "Proposal language" choice. The language is chosen once, before generating.

**2. Put the slides' fixed text in `i18n/<lang>.json`.** One file per language, with the same keys in each. Group the keys by component:

```jsonc
// i18n/fr.json
{ "meta": { "languageName": "French" }, "closingThanks": { "signoff": "À VOTRE SERVICE" } }

// i18n/en.json
{ "meta": { "languageName": "English" }, "closingThanks": { "signoff": "AT YOUR SERVICE" } }
```

**3. Use the keys in components with `t`:**

```html
<p data-field="signoff">{{t.closingThanks.signoff}}</p>
<img src="assets/box.png" alt="{{t.ideaBox.imageAlt}}">
```

If a key is missing in a language, the default language's text is shown. `npm run preview:check` lists missing keys and keys a component uses that don't exist.

**4. Let the data follow the language.** The proposal's language code is in the context as `lang` (`"fr"`, `"en"`):
- **Plugins and providers** read `context.lang`. For example, the catalogue plugins pick the CRM record's `translations` row whose `language` matches, and fall back to the base text when there is none.
- **Prompts** can use the dictionary too, e.g. `Write both paragraphs in {{t.meta.languageName}}.`
- **Text the user types** (form values) is used as typed.

**What stays in one language:** form labels (they're for your team, not the client) and the manifest's name and description.

**Images with text in them** need one file per language. Put the path in the dictionary, e.g. `"invitationImage": "assets/en/invitation.png"`, and use `src="{{t.welcome.invitationImage}}"`.

`lang` and `t` are reserved: don't use them as form field keys or provider output keys.

To preview a language, use the language menu in the preview toolbar, or add `?lang=en` to the preview URL.

---

## Building with Claude

The `proposal-template` skill (in `.claude/skills/proposal-template/`) follows this guide for you.

- **In Claude Code**, from the engine folder: describe what you want, for example "make a template for weddings with a cover, a venue slide and a pricing slide", or "add a testimonial slide to team-building-recommendation". Attach screenshots or a PDF of the design if you have one.
- **In the Claude app:** run `npm run skills:export` and upload `dist/skills/proposal-template.zip` as a skill.

Claude asks a few questions, proposes the slide list, builds the template and runs `preview:check`. Review the preview before sharing.

---

## Checklist before sharing

- [ ] Folder name = `manifest.json → id`.
- [ ] `npm run preview:check -- <id>` ends with `OK`.
- [ ] No hex colours, `<style>`, `<link>` or `<script>` in components.
- [ ] Every field shown on a slide comes from the form, a provider or a prompt.
- [ ] No `min`/`max` on non-list fields.
- [ ] Providers and plugins use `export const provider` / `export const plugin`, and `fetch` for external APIs.
- [ ] Multi-language: every fixed slide text is a `{{t.…}}` key, and every language in `languages` has its `i18n/<lang>.json`.
- [ ] No secrets in files.
- [ ] Images are in `assets/`; the template contains only images you're allowed to use.
