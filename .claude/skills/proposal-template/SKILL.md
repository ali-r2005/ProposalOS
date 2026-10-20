---
name: proposal-template
description: Create, extend and preview ProposalOS presentation templates (the folders under templates/ — manifest, blueprint, form JSON, Handlebars + Tailwind slide components, tokens, providers, plugins, AI prompts). Use this skill whenever the user wants a new proposal template, a new or changed slide/component, new form fields wired to a slide, a design preview of a template, or to sync changes between language variants (e.g. a French template and its "-en" copy) — even if they just say "add a slide for X", "make a template for weddings", "sync this to the English version" or "preview my template". Not for Canva social templates and not for engine code (app/, components/, lib/).
---

# ProposalOS template builder

A template is a folder in `templates/<template-id>/`. The engine discovers it automatically and must stay template-agnostic, so **all work happens inside `templates/`** — never edit `app/`, `components/` or `lib/` to make a template work. If something truly can't be done without engine changes, stop and tell the user.

Read `references/anatomy.md` before your first edit in a session. It documents every file format.

## Previewing (design only, no app needed)

```
npm run preview -- <template-id>         # http://localhost:4321/t/<template-id>, reloads on every save
npm run preview:check -- <template-id>   # validation report; exit code 1 = errors
```
The preview renders **every component** with its placeholders visible: text fields show as `{{field}}`, image fields as labelled grey boxes, `{{#each}}` repeats 3 times, `{{#if}}` blocks are shown. It needs no login, database, AI or sample data. It does need internet (Tailwind and fonts load from a CDN). The toolbar can focus on a single component (`?c=<component>`).

Always run `preview:check` after editing. Fix every **error** before finishing. Fix new **warnings** you introduced. Mention any pre-existing warnings to the user, but don't fix them unasked.

## Workflow A — new template

1. **Brief (one short round of questions, skip what the user already said):**
   - name, and the template id (kebab-case);
   - content language;
   - the slides in order, with a phrase each;
   - brand colours and fonts, or "reuse <existing template>'s look";
   - where each slide's data comes from: fixed content (static), typed into the form (manual), computed or fetched (provider), or written by AI.
   If they attach screenshots or a PDF of the design, use those as the source of truth for layout.
2. **Plan:** reply with the slide list as a table (section id · component · source · expansion) and the form steps. Get a go-ahead.
3. **Scaffold:** copy `starter/` from this skill folder to `templates/<template-id>/`. Then fill in `manifest.json` (replace every `__PLACEHOLDER__`) and `tokens.css`. Or copy an existing template's tokens/assets when the user asked to reuse its look. Delete starter components the plan doesn't use.
4. **Build slides one by one:** write `components/<name>/<name>.html` and `schema.json`, add the blueprint section, and add any form fields the slide needs (field `key` = the name used in the HTML).
5. **Data logic last:** providers, plugins and prompts, following the contracts in `references/anatomy.md`.
6. **Verify:** run `npm run preview:check -- <template-id>` until it says OK. Then run `npm run typecheck` if you touched `.ts` files. Then tell the user to open the preview URL.

## Workflow B — add or change a slide in an existing template

1. Read 2–3 existing components of that template first, and match their conventions: header bands, logo placement, spacing, which tokens they use, `data-field` naming.
2. Write or edit the component, `schema.json`, the blueprint entry and the form fields together. A field that is shown on a slide but missing from the form (or the provider output) will always be blank in real proposals.
3. If the slide's data comes through a provider or plugin, update the TypeScript interface **and** the shaping function, so the new key actually flows through.
4. Run `preview:check` and point the user to `/t/<template-id>?c=<component>`.

## Workflow C — sync a change to a language variant

Used when the user changed one template (e.g. `tendencia-event-recommendation`) and wants it mirrored in its sibling (`…-en`).
1. Find what changed: `git diff -- templates/<source-id>/`. If the working tree is clean, use `git diff HEAD~1 -- templates/<source-id>/`. Ask if it's unclear which commits count.
2. Port each hunk to the same file in the target. **Translate** human-readable text (labels, headings, placeholders, prompt language). **Keep** data keys, field keys, class names and logic identical.
3. Don't blindly copy structural differences that exist on purpose (see "Language variants" in `references/anatomy.md`). If a hunk depends on code that only exists in the source, explain this to the user and adapt or skip that hunk.
4. Run `preview:check` on the target. Then summarise each file you ported and anything you skipped, with the reason.

## Component rules

Every slide is one root element with a fixed 1920×1080 canvas, positioned absolutely inside:

```html
<!-- Slide component: <name> — <one-line layout description> -->
<div class="slide relative w-[1920px] h-[1080px] overflow-hidden bg-[var(--color-background)]" style="font-family: var(--font-body);">
  …
</div>
```

- **Styling:** use Tailwind utility classes. Colours always come from `var(--token)` (`text-[var(--brand-primary)]`, `bg-[var(--color-surface)]`, `border-[color:var(--brand-accent)]`). Never write a hex/rgb colour in a component; add a token to `tokens.css` instead.
- **Never** put `<style>`, `<link>` or `<script>` in a component. The page shell already loads Tailwind, the Tabler icon font (`<i class="ti ti-calendar">`) and `tokens.css`.
- **`style=""` is allowed only for** `font-family: var(--font-…)` and the geometry listed under "Visual editor conventions" below. Never for colours.
- **Handlebars:** only `{{x}}`, `{{a.b}}`, `{{#each}}`, `{{#if}}`/`{{else}}`, `{{{html}}}` (triple braces only for fields a provider has already turned into safe HTML, e.g. `\n`→`<br>`). No custom helpers. Keys with dashes need brackets: `{{[event-name]}}`, `{{#if [number-of-participants]}}`.
- **Optional data:** wrap optional lines in `{{#if field}}`. Give images a fallback: `{{#if images.[0]}}{{images.[0]}}{{else}}assets/placeholder-image.svg{{/if}}`.
- **Assets:** put files in the template's root `assets/` folder (never inside a component folder) and reference them as `assets/<file>`. Decorative SVGs (underlines, shapes) go there as files and are used with `<img src="assets/x.svg" alt="">`.
- **`data-field="…"`** on every element showing a data value, so editors can see which field it is. Name it after the field.
- **Text fits:** size text boxes for realistic lengths. Check the preview: placeholders are short, so mentally test a 3× longer value too.

## Visual editor conventions (GrapesJS)

Users fine-tune generated proposals in the visual editor (GrapesJS Studio). These rules come from testing it against `templates/grapesjs-lab`, and they keep slides easy to move, resize and recolour there.

How the editor treats a slide (set up by `lib/editor/slide-editability.ts`):
- **Elements positioned with `absolute`** can be moved anywhere: with the move icon, or by dragging the element itself.
- **Elements in normal flow** (children of a `flex` row) can only be reordered among their siblings.
- **Every element** can be resized from its right, bottom and bottom-right handles.
- **Style edits** apply to the selected element only, and they override its Tailwind classes.

So:

1. **Put the geometry people will adjust in `style`, not Tailwind classes.** For the main blocks of a slide (titles, photos, text boxes, cards), write `class="absolute …" style="left: 90px; top: 58px; width: 820px;"`. The editor's side panel shows and edits inline values. For Tailwind values (`left-[90px]`, `w-[420px]`) the panel stays empty, even though dragging still works. Small fixed details (icons, badges, decorative lines) can keep Tailwind sizes.
2. **Rows of columns or cards: use `flex` with a per-item `style="width: …px"` and `shrink-0`, not `grid`.** Grid tracks belong to the parent, so one column can't be resized on its own. Without `shrink-0`, flexbox squeezes a widened column back. Use `grid` only where columns never need individual sizes.
3. **One positioned element per independent block.** A photo, a logo and a text block are separate `absolute` children of the slide root. Stacked text (label, title, date) is **one** `absolute` wrapper with its lines in normal flow, so a longer title pushes the lines below it down instead of overlapping them. Don't give stacked lines their own fixed `top`.
4. **Don't centre movable elements with transforms** (`-translate-x-1/2`, `left-1/2`). A drag writes `left`/`top`, but the transform stays, so the panel shows numbers that don't match what the user sees. Position with plain `left`/`top` instead.
5. **Text boxes: set a width, never a fixed height** (use `min-height` if needed). Then edited or longer text wraps instead of overflowing.
6. **Colours stay as token classes** (`text-[var(--brand-primary)]`). The editor overrides them per element, and the rest of the deck keeps the theme.
7. **`data-field` is the element's name in the editor's Layers panel**, so put it on every element that shows data. Don't use `data-gjs-*` attributes: GrapesJS drops them on the first save.
8. **Decorative backgrounds (bands, shapes) come first in the markup.** That keeps them behind the content, so clicking the slide selects the content, not the background.

## Finish

Tell the user, in a few lines:
- what you created or changed, with links to the main files;
- the `preview:check` result;
- the preview URL to open;
- any manual step left (e.g. "add the real logo to assets/logo.svg", "the CRM needs a field named X").
