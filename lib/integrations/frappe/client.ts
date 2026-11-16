// Frappe CRM integration: the one HTTP client every template plugin uses to
// talk to the CRM (erp.tendenciaevents.com). It replaces the copies of
// `frappe-http.ts` that each template used to carry.
//
// Rules for this file, because templates load it through Node's native dynamic
// import (see lib/plugins/plugin-loader.ts):
// - relative imports only (the `@/` alias doesn't exist at runtime);
// - no npm dependencies. It uses the built-in `fetch`, not axios: axios's
//   transitive packages are invisible to Vercel's file tracer when reached
//   this way, and broke deploys one missing package at a time.
//
// Configuration (env): FRAPPE_CRM_URL, FRAPPE_CRM_API_KEY, FRAPPE_CRM_API_SECRET.
//
// Frappe has occasionally reset the connection (ECONNRESET) under bursts of
// concurrent requests (prefill-catalogue fires one call per product at once).
// A transient reset, timeout, 429 or 5xx is retried with exponential backoff;
// a real 4xx (bad id, permission denied) is not, since retrying won't help.

const DEFAULT_BASE_URL = "https://erp.tendenciaevents.com";
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;
const DEFAULT_TIMEOUT_MS = 15_000;

export class FrappeHttpError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "FrappeHttpError";
    this.status = status;
  }
}

/** Base URL of the CRM site, without a trailing slash. */
export function frappeBaseUrl(): string {
  return (process.env.FRAPPE_CRM_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

/** True when the API key and secret are set. Plugins skip prefill otherwise. */
export function isFrappeConfigured(): boolean {
  return Boolean(process.env.FRAPPE_CRM_API_KEY && process.env.FRAPPE_CRM_API_SECRET);
}

/** Absolute URL for a CRM path such as a file attachment (`/files/x.jpg`). */
export function frappeUrl(path: string): string {
  return path.startsWith("/") ? `${frappeBaseUrl()}${path}` : path;
}

function authHeaders(): Record<string, string> {
  const key = process.env.FRAPPE_CRM_API_KEY;
  const secret = process.env.FRAPPE_CRM_API_SECRET;
  if (!key || !secret) {
    throw new FrappeHttpError("Frappe CRM is not configured (FRAPPE_CRM_API_KEY / FRAPPE_CRM_API_SECRET)");
  }
  return { Authorization: `token ${key}:${secret}`, Accept: "application/json" };
}

function isRetryable(error: unknown): boolean {
  // No status = network-level failure (reset, timeout, DNS): retry.
  if (!(error instanceof FrappeHttpError) || error.status === undefined) return true;
  return error.status === 429 || error.status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FrappeGetOptions {
  timeoutMs?: number;
  /** Retry transient failures (default true). The connection check turns it off. */
  retry?: boolean;
}

async function getOnce<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: authHeaders(), signal: controller.signal });
    if (!response.ok) {
      throw new FrappeHttpError(`Request to ${url} failed with status ${response.status}`, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof FrappeHttpError) throw error;
    // AbortError (timeout), DNS, reset: no status, so it counts as transient.
    throw new FrappeHttpError(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Authenticated GET on a CRM path (e.g. `/api/resource/CRM Deal/X`), returning
 * the parsed JSON body. Throws FrappeHttpError after the last failed attempt.
 */
export async function frappeGet<T>(path: string, options: FrappeGetOptions = {}): Promise<T> {
  const url = frappeUrl(path);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const attempts = options.retry === false ? 1 : MAX_ATTEMPTS;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await getOnce<T>(url, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryable(error)) throw error;
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

/** One document (`GET /api/resource/<doctype>/<name>`), its `data` unwrapped. */
export async function frappeGetDoc<T>(doctype: string, name: string, options?: FrappeGetOptions): Promise<T> {
  const body = await frappeGet<{ data: T }>(
    `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    options
  );
  return body.data;
}
