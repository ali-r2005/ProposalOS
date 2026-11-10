# Database Guide

One Postgres database, two schema tiers:

- **Engine tier** — `lib/db/schema.ts` (the `proposals` table). Static, rarely changes.
- **Template tier** — `templates/<id>/db/schema.ts`. One per template, holds that template's own business data (hotels, activities, ...).

---

## After changing a schema

**Engine schema** (`lib/db/schema.ts`):
```bash
npm run db:generate
npm run db:migrate
```

**Template schema** (`templates/<id>/db/schema.ts`):
```bash
npx drizzle-kit generate --config=templates/<id>/db/drizzle.config.ts
npx drizzle-kit migrate  --config=templates/<id>/db/drizzle.config.ts
```

Run both from the repo root — `schema`/`out` paths in a config are resolved relative to the CLI's *current directory*, not the config file's own folder.

- `generate` diffs your `schema.ts` against the last migration and writes a new `.sql` file under `db/migrations/`. It never touches the real database.
- `migrate` is the step that actually applies the pending SQL files.

---

## Seeding data in a template

A template with a schema keeps a `db/seed.ts` — a plain script (not an API route) that inserts starter rows using `getDb()`:

```ts
await db.insert(hotels).values([...]).onConflictDoNothing();
```

Run it once after migrating:
```bash
node templates/<id>/db/seed.ts
```

Rules of thumb:
- Always use `.onConflictDoNothing()` — re-running the seed should be harmless, never duplicate rows or crash.
- Seed is for *initial* content only. After that, edit data through the admin UI (`/templates/<id>/admin`) or the CRUD API, not by re-editing `seed.ts`.
- Adding a new table later? Add a matching `db.insert(newTable).values([...])` block and re-run.

---

## The `db/` folder in a template

```
templates/<id>/db/
  schema.ts          tables for this template's business data
  client.ts          tiny shim re-exporting the shared getDb()
  drizzle.config.ts  migration config scoped to this template
  seed.ts            (optional) initial data
  migrations/         generated SQL, created by `drizzle-kit generate`
```

Not every template needs one — a purely static template (no real data to manage) is fine without a `db/` folder at all.

---

## Creating this folder for a new template

**1. `db/schema.ts`** — define your tables under this template's own namespace:

```ts
import { pgSchema, text, integer } from "drizzle-orm/pg-core";

// Must be exported — drizzle-kit only emits CREATE SCHEMA for a pgSchema
// it can see as a top-level export.
export const schema = pgSchema("tmpl_<your-template-id>");

export const rooms = schema.table("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
});
```

Use a unique `tmpl_<id>` namespace so two templates can each have a table with the same name without colliding.

**2. `db/client.ts`** — copy this verbatim (the relative depth to the repo root is always the same):

```ts
export { getDb } from "../../../lib/db/client.ts";
```

**3. `db/drizzle.config.ts`** — copy from an existing template and swap the template id in these two paths:

```ts
schema: "./templates/<your-template-id>/db/schema.ts",
out: "./templates/<your-template-id>/db/migrations",
```

**4. Generate + migrate** (commands above).

**5. (Optional) `db/seed.ts`** — copy the pattern from an existing template's `seed.ts` if you want starter rows.

**6. Wire up a provider** — query your table from `templates/<id>/providers/<name>.ts`:

```ts
import { getDb } from "../db/client.ts";
import { rooms } from "../db/schema.ts";

export const provider = {
  name: "rooms",
  description: "...",
  async execute(context: Record<string, any>) {
    const all = await getDb().select().from(rooms);
    return { rooms: all };
  },
};
```

Note the explicit `.ts` extensions on the relative imports — provider files are loaded by Node's native dynamic import (not webpack), so they can't use the `@/` alias and need real extensions to resolve.

That's it — the generic CRUD API and admin UI (`/templates/<id>/admin`) automatically pick up any table exported from `db/schema.ts`. No engine code changes required.
