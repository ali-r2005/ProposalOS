// Thin re-export so providers can do `import { getDb } from "../db/client"` —
// a short, natural sibling import — instead of every provider having to know
// how many directories up the shared engine client lives.
export { getDb } from "../../../lib/db/client.ts";
