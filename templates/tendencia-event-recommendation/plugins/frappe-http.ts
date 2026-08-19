// Shared retry-with-backoff GET helper for this template's Frappe CRM
// plugins. Not a plugin itself — not listed in manifest.json's `plugins`
// array, so the loader never tries to run it; it's just a module the actual
// plugins import via relative path (nativeImport resolves it the same way
// providers reach the engine's shared lib/ files).
//
// Uses the built-in `fetch` (global in the Node runtime), not axios: axios
// pulls in a chain of transitive npm dependencies (form-data,
// proxy-from-env, follow-redirects, https-proxy-agent, ...) that Vercel's
// output file tracer cannot discover through this plugin's runtime
// nativeImport() — each one had to be hunted down and force-included in
// next.config.js one broken deploy at a time ("Cannot find package
// 'form-data'", then 'proxy-from-env', ...). `fetch` has zero node_modules
// footprint, so there is nothing for the tracer to miss.
//
// Frappe has occasionally reset the connection (ECONNRESET) under bursts of
// concurrent requests — prefill-catalogue fires one call per product plus one
// per resolved catalogue doc, all at once via Promise.all. A transient reset,
// timeout, 429, or 5xx is retried with exponential backoff; a real 4xx (bad
// deal id, permission denied) is not retried since retrying won't change the
// outcome.

export class FrappeHttpError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "FrappeHttpError";
    this.status = status;
  }
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

function isRetryable(error: unknown): boolean {
  // No status = network-level failure (reset, timeout, DNS) — retry.
  if (!(error instanceof FrappeHttpError) || error.status === undefined) return true;
  // 429/5xx are worth a retry; 4xx (bad id, auth, permissions) are not.
  return error.status === 429 || error.status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GetOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

async function getOnce<T>(url: string, options: GetOptions): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  try {
    const response = await fetch(url, { headers: options.headers, signal: controller.signal });
    if (!response.ok) {
      throw new FrappeHttpError(`Request to ${url} failed with status ${response.status}`, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof FrappeHttpError) throw error;
    // AbortError (timeout) and any other fetch-level failure (DNS, reset) —
    // no status, so isRetryable() treats it as transient.
    throw new FrappeHttpError(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timeout);
  }
}

/** GET with exponential backoff on transient failures (connection resets,
 *  timeouts, 429, 5xx). Throws the last error if every attempt fails. */
export async function getWithRetry<T>(url: string, options: GetOptions): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await getOnce<T>(url, options);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS || !isRetryable(error)) throw error;
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
