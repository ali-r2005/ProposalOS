# CLAUDE.md — Rules & Constraints

## Core Rule: ENGINE IS AGNOSTIC
**No hardcoded domain logic.** Swap `tendencia-event-proposal` with `wedding-proposal` → engine code doesn't change.
- ❌ No "if hotel/event/activity" logic
- ✅ All business logic → templates

## Three Locked Decisions
1. **Forms:** 3 separate JSON files (`client.json`, `event.json`, `selections.json`) — route `/api/templates/[id]/forms`
2. **HTML:** Tailwind + CSS variables only (`var(--brand-primary)`). No inline styles, `<link>`, or hex colors.
3. **Form Fields:** Use `key` property (maps to context). Field: `{key, type, label, required}`

## Must Do
- Keep engine agnostic (no domain concepts)
- TypeScript strict mode
- Load all form JSON files
- Providers: `export const provider = {name, description, async execute(context)}`
- Handlebars for templating
- Claude Sonnet for AI
- Read files from disk, parse YAML/JSON
- CSS variables for all colors
- Error handling + graceful fallbacks

## Must NOT Do
- ❌ Hardcode hex colors, `<style>`, `<link>` in components
- ❌ Relative imports outside `lib/` (use `@/` alias) — **exception:** templates use relative `.ts` imports
- ❌ Add unused deps
- ❌ Use decorators, experimental TS, or bloated packages
- ❌ Modify template structure
- ❌ Use NextAuth, non-Drizzle ORMs, or client-side PDF libs

## HTTP (Strict)
- ✅ Use `axios` only: `import { http, toErrorMessage } from "@/lib/utils/http";`
- ❌ Never `fetch()`
- Response: `res.data` (not `res.json()`)
- Errors: `toErrorMessage(err, "fallback")`

## Dependencies (Locked)
✅ next, react, typescript, handlebars, @anthropic-ai/sdk, yaml, zod, axios, tailwindcss, autoprefixer, puppeteer, drizzle-orm, drizzle-kit, postgres, dotenv, @grapesjs/studio-sdk, @grapesjs/studio-sdk-plugins (visual proposal editor — free plan only: `document` project type + `presetPrintable`; no paid-tier plugins)

## Server External Packages Rule
Template files loaded via native `import()` (not webpack). If package imported in `providers/*.ts` or `db/*.ts`:
1. Add to `serverExternalPackages` in `next.config.js`
2. Add to `outputFileTracingIncludes` (for Vercel deployment)

```javascript
// next.config.js
serverExternalPackages: ["handlebars", "drizzle-orm", "postgres"],
outputFileTracingIncludes: {
  "/api/**/*": [
    "./templates/**/*",
    "./node_modules/drizzle-orm/**/*",
    "./node_modules/postgres/**/*",
  ],
}
```

## Provider Interface (Strict)
```typescript
export const provider = {
  name: string;
  description: string;
  async execute(context: any): Promise<any>;
}
```
NOT: default/function/class exports.

## Handlebars (Simple)
- `{{variable}}`, `{{object.property}}`
- `{{#each array}}...{{/each}}`
- `{{#if condition}}...{{/if}}`
No custom helpers unless necessary.

## AI Integration
- Prompts in `/templates/[id]/prompts/` as `.md`
- **Always request JSON:** `Return ONLY this JSON: {...}\n\nOutput format: Valid JSON only.`
- Use Sonnet, max_tokens ≤ 1000, parse + handle errors

## Database (Tier 1 + 2)
**Tier 1 (engine):** `lib/db/schema.ts` → `proposals` table. `lib/db/client.ts` → lazy Drizzle client. Migrations: `npm run db:generate && npm run db:migrate`

**Tier 2 (templates):** `templates/[id]/db/schema.ts` → template tables under `pgSchema("tmpl_<id>")`. Runtime discovery via `loadTemplateSchema()`. Migrations: `npx drizzle-kit generate|migrate --config=templates/<id>/db/drizzle.config.ts`

**Generic CRUD:** `/api/templates/[id]/data/[table]` works for any table (runtime introspection). No per-table routes needed.

**Cross-boundary imports:** Templates use relative `.ts` imports (Node native TS, no webpack). Engine uses `@/` paths. Template `db/client.ts` = one-line shim: `export { getDb } from "../../../lib/db/client.ts";`

## PDF Export (Server-side Puppeteer)
- Route: `GET /api/proposals/[id]/pdf` (runtime: `"nodejs"`)
- Navigate to `/api/proposals/[id]` (not `setContent()`) so assets resolve
- Print: `page.pdf({ printBackground: true, preferCSSPageSize: true })`
- Launch: `args: ["--no-sandbox", "--disable-setuid-sandbox"]`
- Return: `application/pdf` + `content-disposition: attachment`
- ❌ No client-side PDF libs
- ⚠️ Serverless: use `@sparticuz/chromium` + `puppeteer-core`

## Code Quality
- TypeScript strict, no `any`
- Single responsibility
- Try-catch + meaningful errors
- Minimal logging (dev-friendly)

## Template Files Structure
```
templates/[id]/
  db/schema.ts        (Drizzle tables + pgSchema export)
  db/client.ts        (one-line shim to engine client)
  providers/          (discover at runtime via nativeImport)
    hotels.ts
    activities.ts
  forms/
    client.json
    event.json
    selections.json
  components/
    */component.html  (Tailwind + CSS vars)
  prompts/
    *.md              (request JSON output)
```

## Agnostic Test
**If swapping template IDs breaks engine code → violation.**
- Don't inspect key names
- Don't hardcode concepts
- Reuse generic patterns (ContextEditor, provider interface, CRUD routes)

## Quick Checklist
- [ ] Engine is 100% agnostic?
- [ ] Forms load from 3 JSON files?
- [ ] No inline styles/hardcoded colors?
- [ ] Providers: `export const provider`?
- [ ] Templates use relative `.ts` imports?
- [ ] serverExternalPackages updated?
- [ ] No `fetch`, no auth libs, no client PDF libs?