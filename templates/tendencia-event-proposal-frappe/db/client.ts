// Thin re-export so providers can do `import { fetchDocs } from "../db/client"`
// — a short, natural sibling import — instead of every provider having to know
// how many directories up the shared engine client lives.
export { fetchDocs } from "../../../lib/frappe/template-data.ts";
