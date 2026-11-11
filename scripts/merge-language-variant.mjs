#!/usr/bin/env node
// Repoint saved proposals from a retired language copy of a template (e.g.
// "tendencia-event-recommendation-en") to the multi-language template that
// replaced it, so they keep rendering after the copy's folder is deleted:
//   - template_id      → the base template id
//   - context.lang     → the copy's language (so re-renders stay in it)
//   - html <base href> → the base template's asset URL (assets are shared)
//
//   node scripts/merge-language-variant.mjs <old-id> <new-id> <lang>          → dry run
//   node scripts/merge-language-variant.mjs <old-id> <new-id> <lang> --apply  → write
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const [oldId, newId, lang, flag] = process.argv.slice(2);
const SAFE = /^[a-zA-Z0-9_-]+$/;
if (!SAFE.test(oldId ?? "") || !SAFE.test(newId ?? "") || !/^[a-z]{2,3}$/.test(lang ?? "")) {
  console.error("Usage: node scripts/merge-language-variant.mjs <old-id> <new-id> <lang> [--apply]");
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (.env.local).");
  process.exit(2);
}

const apply = flag === "--apply";
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const oldBase = `/api/templates/${oldId}/`;
const newBase = `/api/templates/${newId}/`;

try {
  const rows = await sql`select id, title from proposals where template_id = ${oldId} order by created_at`;
  console.log(`${rows.length} proposal(s) on "${oldId}":`);
  for (const row of rows) console.log(`  - ${row.id}  ${row.title ?? "(untitled)"}`);

  if (!rows.length) {
    console.log("Nothing to do.");
  } else if (!apply) {
    console.log(`\nDry run. Re-run with --apply to move them to "${newId}" with lang "${lang}".`);
  } else {
    const updated = await sql`
      update proposals
      set template_id = ${newId},
          context = context || ${sql.json({ lang })},
          html = replace(html, ${oldBase}, ${newBase})
      where template_id = ${oldId}
      returning id`;
    console.log(`\nUpdated ${updated.length} proposal(s).`);
  }
} catch (error) {
  console.error(`Failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
