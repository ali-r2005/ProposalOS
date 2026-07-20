# CLAUDE.md — Rules & Constraints

---

## Core Rule: ENGINE IS AGNOSTIC

The engine knows NOTHING about business domains.

**Test:** If you swap `/templates/tendencia-event-proposal` with `/templates/wedding-proposal`, should your engine code change? 

**Answer:** NO. If YES, you've coupled the engine to the template.

This means:
- ❌ No "if hotel" logic
- ❌ No "if event" logic
- ❌ No hardcoded concepts
- ❌ All business logic lives in the template

---

## Three Critical Decisions Locked

### 1. Forms Load From Multiple JSON Files
- `/templates/[id]/forms/client.json`
- `/templates/[id]/forms/event.json`
- `/templates/[id]/forms/selections.json`
- **NOT** a single schema file
- API route `/api/templates/[id]/forms` returns ALL of them

### 2. Component HTML: Tailwind + Tokens.css Only
No external links. No inline styles. No hardcoded colors.

Use CSS variables:
- `var(--brand-primary)` instead of `#1e40af`
- `var(--text-heading)` instead of `#1f2937`
- `var(--color-background)` instead of `#fff`

Every color is a variable from `/tokens.css`.

### 3. Form Fields Use `key` Property
```json
{"key": "destination", "type": "text", "label": "City"}
```

NOT `id` or any other property. The `key` is the context property name.

---

## What You Must Do

- ✅ Keep engine 100% agnostic (no domain logic)
- ✅ Use TypeScript (strict mode)
- ✅ Load ALL form JSON files (not one schema)
- ✅ Create providers with standard interface: `{name, description, execute()}`
- ✅ Use Handlebars for templating
- ✅ Use Claude Sonnet 4.6 for AI
- ✅ Use CSS variables for all colors
- ✅ Handle errors gracefully (fallback to defaults)
- ✅ Read files from disk (template-loader)
- ✅ Parse YAML for blueprint
- ✅ Parse JSON for forms and schemas

---

## What You Must NOT Do

- ❌ Hardcode business concepts (hotels, weddings, events, activities)
- ✅ Database is ALLOWED via Drizzle ORM + Postgres (see "Database Rules"). Still ❌ no auth libraries (NextAuth, etc.) — that remains out of scope.
- ✅ PDF export is ALLOWED via server-side headless Chrome (see "PDF Export Rules"). Do NOT add client-side PDF libraries.
- ❌ Build PPTX export (not needed ever)
- ❌ Modify `/templates/tendencia-event-proposal` structure
- ❌ Leave inline `<style>` blocks in components
- ❌ Leave `<link>` tags in components
- ❌ Hardcode hex colors (#abc, #123456) in components
- ❌ Use decorators, experimental TypeScript, or bleeding-edge deps
- ❌ Create ad-hoc folder structures
- ❌ Use relative imports outside `lib/` (use absolute paths) — **exception:** template files (`providers/*.ts`, `db/*.ts`) are loaded via Node's native dynamic import, not webpack, so they structurally cannot use the `@/` alias; they use short relative imports with explicit `.ts` extensions instead (see "Database Rules")
- ❌ Add unused dependencies
- ❌ Create circular dependencies
- ❌ Hardcode file paths (use variables)

---

## Three Specific Tasks

### Task 1: Form Loading
Route: `/api/templates/[id]/forms`

Must:
1. Accept templateId from URL
2. Load `/templates/{templateId}/forms/client.json`
3. Load `/templates/{templateId}/forms/event.json`
4. Load `/templates/{templateId}/forms/selections.json`
5. Return as: `{forms: [{id, title, fields}]}`

Each form field must have: `key`, `type`, `label`, `required`

### Task 2: Component HTML Cleanup
For EACH component in `/templates/tendencia-event-proposal/components/*/component.html`:

1. Remove all `<link rel="stylesheet">` tags
2. Remove all `<style>` blocks
3. Replace hardcoded colors with CSS variables
4. Convert custom CSS to Tailwind classes
5. Use Tabler icons: `<i class="ti ti-name"></i>` (no external link)
6. Keep structure clean and readable
7. Root div: `width: 1920px; height: 1080px; overflow: hidden`

### Task 3: Create Providers
Create these files in `/templates/tendencia-event-proposal/providers/`:

**hotels.ts** — returns `{hotels: [...]}`  
**activities.ts** — returns `{activities: [...]}`

Both must:
- Export `const provider` with `{name, description, async execute()}`
- Take `context` as parameter
- Return object that merges into context
- Use mock data (hardcoded arrays)

---

## Component HTML Quality Standards

### Must Be Clean
```html
<!-- ✅ GOOD -->
<div class="w-[1920px] h-[1080px] overflow-hidden bg-[var(--color-background)] p-12">
  <h1 class="text-5xl font-bold" style="color: var(--text-heading);">
    {{title}}
  </h1>
</div>
```

### Must NOT Be Cluttered
```html
<!-- ❌ BAD -->
<link rel="stylesheet" href="https://cdn...">
<style>
  .header {color: #1e40af; font-family: sans-serif;}
</style>
<div style="width: 1920px; height: 1080px; color: #333; background: #fff;">
  {{title}}
</div>
```

---

## Code Quality Rules

- **TypeScript:** Strict mode, explicit types, no `any` (unless necessary)
- **Folder structure:** Exactly as specified in PROJECT_SPEC.md
- **Module responsibility:** Single responsibility principle
- **Error handling:** Try-catch, meaningful messages
- **Logging:** Minimal in production, helpful in development
- **Testing:** Build each module standalone before wiring together

---

## Provider Interface (Strict)

Every provider MUST export:

```typescript
export const provider = {
  name: string;
  description: string;
  async execute(context: any): Promise<any>;
}
```

**NOT:**
- Default exports
- Function exports
- Class exports
- Dynamic exports

Always: `export const provider = {...}`

---

## Handlebars Usage Rules

Simple. Don't overcomplicate.

```javascript
import Handlebars from 'handlebars';

const template = Handlebars.compile(htmlString);
const rendered = template(dataObject);
```

Supported in components:
- `{{variable}}`
- `{{object.property}}`
- `{{#each array}}...{{/each}}`
- `{{#if condition}}...{{/if}}`

That's it. No custom helpers unless necessary.

---

## AI Integration Rules

### Prompt Format
Prompts live in `/templates/[id]/prompts/` as `.md` files.

**Must request JSON output:**
```markdown
Return ONLY this JSON:
{
  "field1": "value",
  "field2": ["array"]
}

Output format: Valid JSON only. No markdown.
```

### API Usage
```typescript
const anthropic = new Anthropic();
const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1000,
  messages: [{role: "user", content: promptWithContext}]
});
const result = JSON.parse(message.content[0].text);
```

Always:
- Use Claude Sonnet (locked)
- Limit max_tokens to reasonable values
- Expect JSON response (prompt requests it)
- Parse and handle errors

---

## File System Rules

- Templates live in `/templates/` (user responsibility)
- Engine reads from disk (no hardcoding)
- Use `fs` or dynamic imports for provider loading
- Cache template metadata if possible
- Error messages if template not found

---

## Dependency Rules

Use ONLY:
- next, react, typescript (locked)
- handlebars (locked)
- @anthropic-ai/sdk (locked)
- yaml (locked)
- zod (optional, for validation)
- axios (locked — HTTP client)
- tailwindcss, autoprefixer (styling)
- puppeteer (locked — server-side PDF export only; see "PDF Export Rules")
- drizzle-orm, drizzle-kit, postgres, dotenv (locked — database only; see "Database Rules")

NOT allowed:
- Custom UI libraries
- ORMs other than Drizzle (Prisma, TypeORM, Mongoose, etc.)
- Auth libraries (NextAuth, etc.)
- Client-side PDF libraries (jsPDF, html2pdf.js, html2canvas, etc.) — PDF is generated server-side with Puppeteer
- Decorators or experimental features
- Bloated packages

---

## HTTP Rules (Strict)

Use **axios** for ALL HTTP requests. Never use `fetch`.

- ❌ No `fetch(...)` anywhere (client or server)
- ✅ Import the shared instance: `import { http, toErrorMessage } from "@/lib/utils/http";`
- ✅ `http.get<T>(url)`, `http.post<T>(url, body)` — the instance already sets JSON headers + timeout
- ✅ Read the response body from `res.data` (not `await res.json()`)
- ✅ Normalize failures with `toErrorMessage(err, "fallback message")`
- ✅ Need the raw error body on a non-2xx? Pass `{ validateStatus: () => true }`

```typescript
import { http, toErrorMessage } from "@/lib/utils/http";

try {
  const { data } = await http.get<TemplateSummary[]>("/api/templates");
  // use data
} catch (err) {
  setError(toErrorMessage(err, "Failed to load templates"));
}
```

Keep transport config in `/lib/utils/http.ts` only. No domain logic there — the engine stays agnostic.

---

## PDF Export Rules (Strict)

PDF export is generated **server-side with Puppeteer (headless Chrome)** — never a client-side PDF library.

- ✅ Route: `GET /api/proposals/[id]/pdf` — `export const runtime = "nodejs"`.
- ✅ Puppeteer **navigates to the app's own `/api/proposals/[id]` HTML page** (`page.goto(origin + url, { waitUntil: "networkidle0" })`) so `<base href>`, same-origin asset routes, the CDN Tailwind runtime, and the icon font resolve exactly as in the preview. Do NOT `setContent` raw HTML — relative asset URLs won't resolve.
- ✅ Print with `page.pdf({ printBackground: true, preferCSSPageSize: true })` so the document's `@page { size: 1920px 1080px }` yields **one slide per page** at true 16:9 (1440×810 pt). Keep that `@page`/`@media print` CSS in the engine-owned document shell (`theme-loader.ts`), not in components.
- ✅ Launch with `args: ["--no-sandbox", "--disable-setuid-sandbox"]`; always `await browser.close()` in `finally`.
- ✅ Return `application/pdf` with `content-disposition: attachment`. The client downloads via the shared axios instance (`responseType: "blob"`) — never `fetch`.
- ❌ No client-side PDF libs (jsPDF, html2pdf.js, html2canvas). Fidelity on the 1920×1080 slides is too poor.
- ⚠️ Deploy note: the runtime host needs Chromium available. On serverless, switch to `@sparticuz/chromium` + `puppeteer-core`. This stays engine-agnostic — the PDF route knows nothing about business domains, only how to print a proposal's HTML.

---

## Database Rules (Strict)

One physical Postgres database, but **two schema tiers** — this is what keeps the database agnostic the same way everything else is:

### Tier 1 — engine-owned (static, known ahead of time)
- `lib/db/schema.ts` — the `proposals` table (id, template_id, html, context jsonb, timestamps). This replaced the old in-memory `proposal-store.ts` Map.
- `lib/db/client.ts` — the pooled Drizzle client. Uses `drizzle-orm/postgres-js` (the `postgres` package), **not** `pg`/node-postgres, with `prepare: false` — Supabase's pooler runs PgBouncer in "Transaction" mode, which silently breaks prepared statements that `pg` relies on.
- Client creation is **lazy** (a function, not a module-level constant) so a missing `DATABASE_URL` throws inside the caller's own try/catch, not at import time (which would crash before any error handling runs).
- `DATABASE_URL` is a single connection string (not discrete host/port/user fields) — if the password contains any of `: / ? # [ ] @ ! $ & ' ( ) * + , ; = %` it MUST be percent-encoded or the URL parser silently misreads the host/port.
- Migrations: `npm run db:generate` then `npm run db:migrate` (root `drizzle.config.ts`), same as any normal Drizzle project — this schema is static and known, so there's nothing agnostic about it.

### Tier 2 — template-owned (dynamic, discovered at runtime)
- A template that needs real data (not hardcoded arrays) puts Drizzle table definitions in `templates/[id]/db/schema.ts` — plain `pgTable()` calls, no build step required.
- Every table MUST live under that template's own Postgres schema/namespace via `pgSchema("tmpl_<id>")` (exported, not just used locally — drizzle-kit only emits `CREATE SCHEMA` for a `pgSchema` it can see as a top-level export). This is what lets two templates each have a `hotels` table with different columns in the same database without colliding.
- The engine discovers a template's tables at runtime via `lib/db/template-schema-loader.ts` (`loadTemplateSchema`/`loadTemplateTable`) — dynamic `import()` of `db/schema.ts`, same cache-busted mechanism as `provider-loader.ts`. It never parses a column name; it only knows *that* a table exists, via `is(value, PgTable)`.
- Migrations for a template's own schema: `npx drizzle-kit generate|migrate --config=templates/<id>/db/drizzle.config.ts`, run from the repo root. That config's `schema`/`out` paths are resolved relative to the CLI's cwd (repo root), not relative to the config file itself.
- Providers read from their template's own table instead of a hardcoded array, but keep the **exact same** `execute(context)` interface — the pipeline doesn't know or care where a provider's data comes from.

### Cross-boundary imports (the one sharp edge)
Template files (`providers/*.ts`, `db/*.ts`) are loaded via Node's **native** dynamic import (see `provider-loader.ts`'s `nativeImport`) — not webpack. That loader does not understand the `@/` tsconfig alias, and Node's native TS support requires **explicit `.ts` extensions** on relative imports (`allowImportingTsExtensions` is enabled in `tsconfig.json` for this). Practical upshot:
- A template's own `db/client.ts` is a one-line shim: `export { getDb } from "../../../lib/db/client.ts";` (relative, `.ts` extension, exact depth to the repo root) — providers then do `import { getDb } from "../db/client.ts";`, a short sibling import, instead of every provider needing to know the engine's exact file layout.
- Any engine file reachable from that chain (e.g. `lib/db/client.ts` itself) must use relative imports internally too (`../utils/error-handler.ts`, not `@/lib/utils/error-handler`) — the `@/` alias only resolves inside Next's own bundler graph.

### Generic CRUD (never add a per-table route)
- `GET/POST /api/templates/[id]/data/[table]` and `PUT/DELETE /api/templates/[id]/data/[table]/[rowId]` work for **any** table in **any** template, purely through runtime column introspection (`lib/db/table-introspect.ts`: `describeTable`, `primaryKeyOf`, `sanitizeValues`, `coercePrimaryKey`). If a new template needs CRUD, it needs a `db/schema.ts` — it does NOT need new routes.
- The admin UI (`components/TemplateAdmin.tsx`) is equally generic: it reuses `ContextEditor`/`ContextValueEditor` (the same type-driven, recursive editor built for hand-editing a proposal's context) to render a create/edit form for a row of any shape.

---

## Testing Before Submission

Before handing code off, verify:

- [ ] `npm install` completes without warnings
- [ ] `npm run dev` starts on port 3000
- [ ] No TypeScript errors
- [ ] All modules import/export correctly
- [ ] Template loads from disk
- [ ] Blueprint parses without errors
- [ ] All form JSON files load
- [ ] Providers execute and return data
- [ ] AI integrates and parses JSON
- [ ] Pipeline runs end-to-end
- [ ] HTML renders with data injected
- [ ] No console errors
- [ ] No hardcoded business logic

---

## If You're Stuck

Ask yourself:

1. **"Is this domain-specific?"** If yes, move it to the template.
2. **"Did I hardcode data?"** If yes, make it data-driven.
3. **"Does this belong in engine?"** If no, it doesn't.
4. **"Would this work for ANY template?"** If no, reconsider.

---

## Final Check

Before you write a single line of code, answer these:

- [ ] I understand the engine is agnostic
- [ ] I know the pipeline flow completely
- [ ] I understand the three tasks (forms, components, providers)
- [ ] I know what's locked and what's flexible
- [ ] I know what NOT to do

If all are YES: Start building.