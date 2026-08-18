// Shared retry-with-backoff GET helper for this template's Frappe CRM
// plugins. Not a plugin itself — not listed in manifest.json's `plugins`
// array, so the loader never tries to run it; it's just a module the actual
// plugins import via relative path (nativeImport resolves it the same way
// providers reach the engine's shared lib/ files).
//
// Frappe has occasionally reset the connection (ECONNRESET) under bursts of
// concurrent requests — prefill-catalogue fires one call per product plus one
// per resolved catalogue doc, all at once via Promise.all. A transient reset
// or timeout is retried with exponential backoff before giving up; a real
// 4xx (bad deal id, permission denied) is not retried since retrying won't
// change the outcome.
import axios, { type AxiosRequestConfig } from "axios";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

function isRetryable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  // No response at all = connection-level failure (reset, timeout, DNS) — retry.
  if (!error.response) return true;
  // 429/5xx are worth a retry; 4xx (bad id, auth, permissions) are not.
  const status = error.response.status;
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** GET with exponential backoff on transient failures (connection resets,
 *  timeouts, 429, 5xx). Throws the last error if every attempt fails. */
export async function getWithRetry<T>(url: string, config: AxiosRequestConfig): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { data } = await axios.get<T>(url, config);
      return data;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS || !isRetryable(error)) throw error;
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
