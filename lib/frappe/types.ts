/**
 * Shared types for the Frappe REST layer.
 *
 * Kept separate from client.ts so introspection/auth modules can import the
 * shapes without pulling in the axios instance (and its env-var requirements)
 * at module-load time.
 */

/** A Frappe document. `name` is always the primary key. */
export interface FrappeDoc {
  name: string;
  [field: string]: unknown;
}

/**
 * How a given call authenticates against Frappe.
 *
 * - `apiKey`  — engine-internal reads (providers, template catalogs). Uses the
 *   server-side API key/secret pair, so it bypasses per-user permissions.
 * - `session` — acts as the logged-in user via their Frappe `sid`, so Frappe's
 *   own DocType permissions apply. Used by the admin CRUD routes.
 *
 * The secret/sid never reaches the browser: every call originates server-side.
 */
export type FrappeAuth = { mode: "apiKey" } | { mode: "session"; sid: string };

export interface ListOptions {
  /** Fieldnames to return. Defaults to `["*"]`. */
  fields?: string[];
  /** Frappe filter form: `[[fieldname, operator, value], ...]`. */
  filters?: unknown[];
  limit?: number;
  offset?: number;
  /** e.g. `"modified desc"` — passed through as Frappe's `order_by`. */
  orderBy?: string;
}

/**
 * One field of a DocType, as reported by Frappe's meta API. This is the raw
 * shape; doctype-introspect.ts (Phase 3) maps it onto the engine's existing
 * ColumnDescriptor so the admin UI and CRUD routes keep working unchanged.
 */
export interface FrappeDocField {
  fieldname: string;
  fieldtype: string;
  label?: string;
  reqd?: 0 | 1;
  hidden?: 0 | 1;
  read_only?: 0 | 1;
  options?: string;
}

export interface FrappeDocTypeMeta {
  name: string;
  fields: FrappeDocField[];
}

/** Identity as reported by Frappe for the current session. */
export interface FrappeUser {
  name: string; // the user's email — Frappe's primary key for User
  email: string;
  fullName: string;
  roles: string[];
}
