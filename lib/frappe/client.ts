import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
// Relative `.ts` imports (not the usual `@/...` alias): template providers
// reach this file via Node's native dynamic import (see provider-loader.ts),
// which only understands real module resolution — not the tsconfig `@/` path
// alias. Same constraint the old lib/db/client.ts carried.
import { EngineError } from "../utils/error-handler.ts";
import type {
  FrappeAuth,
  FrappeDoc,
  FrappeDocTypeMeta,
  ListOptions,
} from "./types.ts";

/**
 * Server-side HTTP client for the Frappe REST API — the replacement for
 * lib/db/client.ts now that persistence lives in Frappe DocTypes rather than
 * Postgres/Drizzle.
 *
 * This deliberately does NOT reuse `lib/utils/http.ts`. That instance is the
 * *browser* client: it carries a 401 -> /api/auth/refresh interceptor and
 * assumes same-origin relative URLs. Pointed at Frappe it would misfire — a
 * legitimate Frappe 401 would trigger a refresh against a relative path that
 * doesn't exist server-side. Same `axios` dependency (per the HTTP rule in
 * CLAUDE.md), separate instance with its own semantics.
 *
 * Every call here runs on the server. Neither the API secret nor a user's
 * Frappe `sid` is ever exposed to the browser: the Next.js route handlers
 * proxy auth (see lib/frappe/auth.ts), which is also what lets a Vercel-hosted
 * frontend talk to a separately-deployed Frappe without relying on
 * third-party cookies.
 */

const globalRef = globalThis as unknown as {
  __frappeHttp?: AxiosInstance;
  __frappeMetaCache?: Map<string, FrappeDocTypeMeta>;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new EngineError(
      `${name} is not set. Add your Frappe connection settings to .env.local.`,
      500
    );
  }
  return value;
}

/** Base URL of the Frappe site, without a trailing slash. */
export function frappeBaseUrl(): string {
  return requireEnv("FRAPPE_URL").replace(/\/+$/, "");
}

/**
 * Pinned to globalThis so Next.js dev-mode module reloads reuse one keep-alive
 * agent pool instead of leaking a fresh one per reload — the same HMR-safety
 * pattern the old Postgres client used for its connection pool. This matters
 * more with Frappe on a separate host: every call is a real TLS round-trip, so
 * connection reuse is the difference between one handshake and one per query.
 */
function httpClient(): AxiosInstance {
  return (globalRef.__frappeHttp ??= axios.create({
    baseURL: frappeBaseUrl(),
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    timeout: 30_000,
  }));
}

/**
 * Frappe reports errors as an HTML traceback or a JSON `exception`/`_server_messages`
 * blob depending on the endpoint and whether the site runs in developer mode.
 * Collapse all of that into a single readable line.
 */
function toFrappeError(error: unknown, fallback: string): EngineError {
  if (!axios.isAxiosError(error)) {
    return new EngineError(fallback, 500, error);
  }

  const status = error.response?.status ?? 500;
  const data = error.response?.data as Record<string, unknown> | string | undefined;

  if (typeof data === "object" && data !== null) {
    // `_server_messages` is a JSON-encoded array of JSON-encoded strings.
    const serverMessages = data._server_messages;
    if (typeof serverMessages === "string") {
      try {
        const parsed = JSON.parse(serverMessages) as string[];
        const messages = parsed
          .map((entry) => {
            try {
              return (JSON.parse(entry) as { message?: string }).message ?? entry;
            } catch {
              return entry;
            }
          })
          .filter(Boolean);
        if (messages.length) {
          return new EngineError(messages.join(" "), status, error);
        }
      } catch {
        // fall through to the other shapes
      }
    }

    const message = data.message ?? data.exception ?? data.exc_type;
    if (typeof message === "string" && message.trim()) {
      return new EngineError(message.trim(), status, error);
    }
  }

  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    return new EngineError(
      `Cannot reach the Frappe server at ${frappeBaseUrl()}. Is FRAPPE_URL correct and the site reachable?`,
      502,
      error
    );
  }

  return new EngineError(error.message || fallback, status, error);
}

/**
 * Build the auth headers for a call.
 *
 * `sid` travels as a Cookie header rather than a browser cookie precisely
 * because the request is server-to-server — cross-origin cookie policy never
 * enters into it.
 */
function authHeaders(auth: FrappeAuth): Record<string, string> {
  if (auth.mode === "session") {
    return { Cookie: `sid=${auth.sid}` };
  }
  const key = requireEnv("FRAPPE_API_KEY");
  const secret = requireEnv("FRAPPE_API_SECRET");
  return { Authorization: `token ${key}:${secret}` };
}

async function request<T>(
  config: AxiosRequestConfig,
  auth: FrappeAuth,
  fallbackMessage: string
): Promise<T> {
  try {
    const response = await httpClient().request<T>({
      ...config,
      headers: { ...config.headers, ...authHeaders(auth) },
    });
    return response.data;
  } catch (error) {
    throw toFrappeError(error, fallbackMessage);
  }
}

/**
 * Frappe's JSON fieldtype is stored as text and, depending on the Frappe
 * version and the endpoint, comes back either already-parsed or as a raw JSON
 * string. Callers (providers, the CRUD routes) must not have to care, so
 * normalise here rather than trusting either behaviour.
 *
 * Only strings that actually look like a JSON array/object are touched — a
 * plain Data field containing "[unparsed]" text is left alone.
 */
export function parseJsonFields<T extends Record<string, unknown>>(
  doc: T,
  jsonFields: string[]
): T {
  if (!jsonFields.length) return doc;
  const out: Record<string, unknown> = { ...doc };
  for (const field of jsonFields) {
    const value = out[field];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) continue;
    try {
      out[field] = JSON.parse(trimmed);
    } catch {
      // Leave the raw string in place: a malformed JSON field is a data
      // problem to surface, not something to silently blank out.
    }
  }
  return out as T;
}

/** Fetch a single document by its `name` (Frappe's primary key). */
export async function getDoc(
  doctype: string,
  name: string,
  auth: FrappeAuth = { mode: "apiKey" }
): Promise<FrappeDoc> {
  const data = await request<{ data: FrappeDoc }>(
    { method: "GET", url: `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}` },
    auth,
    `Failed to load ${doctype} "${name}"`
  );
  return data.data;
}

/**
 * List documents. Note Frappe defaults to a page length of 20 and returns
 * only `name` unless `fields` is given — both differ from SQL intuition, so
 * this always sends explicit values.
 */
export async function getList(
  doctype: string,
  options: ListOptions = {},
  auth: FrappeAuth = { mode: "apiKey" }
): Promise<FrappeDoc[]> {
  const params: Record<string, string> = {
    fields: JSON.stringify(options.fields ?? ["*"]),
    limit_page_length: String(options.limit ?? 0), // 0 = no limit, in Frappe
    limit_start: String(options.offset ?? 0),
  };
  if (options.filters?.length) params.filters = JSON.stringify(options.filters);
  if (options.orderBy) params.order_by = options.orderBy;

  const data = await request<{ data: FrappeDoc[] }>(
    { method: "GET", url: `/api/resource/${encodeURIComponent(doctype)}`, params },
    auth,
    `Failed to list ${doctype}`
  );
  return data.data ?? [];
}

/**
 * Row count for a doctype. Frappe has no `SELECT COUNT(*)` equivalent on the
 * resource endpoint, so this is a second HTTP call — callers that need rows
 * *and* a count should issue both concurrently (Promise.all) rather than
 * sequentially, since each one crosses the network.
 */
export async function getCount(
  doctype: string,
  filters?: unknown[],
  auth: FrappeAuth = { mode: "apiKey" }
): Promise<number> {
  const params: Record<string, string> = { doctype };
  if (filters?.length) params.filters = JSON.stringify(filters);

  const data = await request<{ message: number }>(
    { method: "GET", url: "/api/method/frappe.client.get_count", params },
    auth,
    `Failed to count ${doctype}`
  );
  return Number(data.message ?? 0);
}

export async function insertDoc(
  doctype: string,
  values: Record<string, unknown>,
  auth: FrappeAuth = { mode: "apiKey" }
): Promise<FrappeDoc> {
  const data = await request<{ data: FrappeDoc }>(
    { method: "POST", url: `/api/resource/${encodeURIComponent(doctype)}`, data: values },
    auth,
    `Failed to create ${doctype}`
  );
  return data.data;
}

/** Partial update. Returns the updated document, covering the old `.returning()` usage. */
export async function updateDoc(
  doctype: string,
  name: string,
  values: Record<string, unknown>,
  auth: FrappeAuth = { mode: "apiKey" }
): Promise<FrappeDoc> {
  const data = await request<{ data: FrappeDoc }>(
    {
      method: "PUT",
      url: `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      data: values,
    },
    auth,
    `Failed to update ${doctype} "${name}"`
  );
  return data.data;
}

/** Returns true if the document was deleted, false if it didn't exist. */
export async function deleteDoc(
  doctype: string,
  name: string,
  auth: FrappeAuth = { mode: "apiKey" }
): Promise<boolean> {
  try {
    await request<unknown>(
      {
        method: "DELETE",
        url: `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      },
      auth,
      `Failed to delete ${doctype} "${name}"`
    );
    return true;
  } catch (error) {
    if (error instanceof EngineError && error.status === 404) return false;
    throw error;
  }
}

/**
 * DocType field metadata — the Frappe equivalent of the Drizzle introspection
 * that made the CRUD routes agnostic. Cached per doctype (pinned to
 * globalThis, HMR-safe) because `describeTable()` is called on *every* CRUD
 * request; uncached, that would add a full internet round-trip per request
 * against a separately-deployed Frappe. DocType definitions only change when
 * a developer migrates the app, so a process-lifetime cache is safe.
 */
export async function getDocTypeMeta(
  doctype: string,
  auth: FrappeAuth = { mode: "apiKey" }
): Promise<FrappeDocTypeMeta> {
  const cache = (globalRef.__frappeMetaCache ??= new Map<string, FrappeDocTypeMeta>());
  const cached = cache.get(doctype);
  if (cached) return cached;

  const data = await request<{ message: FrappeDocTypeMeta }>(
    {
      method: "GET",
      url: "/api/method/frappe.client.get",
      params: { doctype: "DocType", name: doctype },
    },
    auth,
    `Failed to load metadata for DocType "${doctype}"`
  );

  const meta = data.message;
  if (!meta?.fields) {
    throw new EngineError(`DocType "${doctype}" returned no field metadata`, 500);
  }
  cache.set(doctype, meta);
  return meta;
}

/** Clear the DocType metadata cache (after a Frappe migrate, or in tests). */
export function clearDocTypeMetaCache(doctype?: string): void {
  if (!globalRef.__frappeMetaCache) return;
  if (doctype) globalRef.__frappeMetaCache.delete(doctype);
  else globalRef.__frappeMetaCache.clear();
}
