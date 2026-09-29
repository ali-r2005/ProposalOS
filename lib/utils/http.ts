import axios from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";

/** Original request config, tagged once it has been replayed after a refresh. */
type RetriableConfig = AxiosRequestConfig & {
  _retried?: boolean;
  headers: Record<string, unknown>;
};

export const http = axios.create({
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

// The access token lives 15 minutes and the client also keeps a copy in an
// axios default header (see AuthProvider). If a request 401s — token expired
// mid-session, or a stale header from a prior session — silently refresh via
// the httpOnly refreshToken cookie and retry once. Concurrent 401s share a
// single in-flight refresh instead of each firing their own.
let refreshPromise: Promise<string | null> | null = null;

// Resolved by AuthProvider once its initial refresh has settled. Child effects
// run before parent effects in React, so without this gate a page's mount
// fetch races the provider and goes out with no Authorization header — landing
// as "Unauthorized: invalid token" whenever the accessToken cookie has also
// expired. Stays null outside the browser (SSR/route handlers), where there is
// no provider and nothing to wait for.
let authReadyPromise: Promise<void> | null = null;

export function setAuthReady(promise: Promise<void>): void {
  authReadyPromise = promise;
}

http.interceptors.request.use(async (config) => {
  // Auth endpoints bootstrap the gate — awaiting it here would deadlock.
  if (authReadyPromise && !config.url?.includes("/api/auth/")) {
    await authReadyPromise;
    const token = http.defaults.headers.common["Authorization"];
    if (token && !config.headers["Authorization"]) {
      config.headers["Authorization"] = token;
    }
  }
  return config;
});

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string }>("/api/auth/refresh")
      .then(({ data }) => data.accessToken)
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** Refresh once and replay the original request. Returns null if refresh failed. */
async function retryWithFreshToken(
  original: RetriableConfig
): Promise<AxiosResponse | null> {
  original._retried = true;

  const accessToken = await refreshAccessToken();
  if (!accessToken) return null;

  http.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  original.headers["Authorization"] = `Bearer ${accessToken}`;
  return http(original);
}

function isRetryable401(
  config: RetriableConfig | undefined,
  status: number | undefined
): boolean {
  return status === 401 && !config?._retried && !config?.url?.includes("/api/auth/");
}

http.interceptors.response.use(
  // Callers that pass `validateStatus: () => true` (the save paths) land a 401
  // here as a *success*, so it would otherwise skip the refresh-and-retry below
  // and surface as a hard "Unauthorized" — losing unsaved editor work. Catch
  // that case on the success branch too.
  async (response: AxiosResponse) => {
    const config = response.config as RetriableConfig;
    if (!isRetryable401(config, response.status)) return response;
    const retried = await retryWithFreshToken(config);
    return retried ?? response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const original = error.config as RetriableConfig | undefined;
    if (!original || !isRetryable401(original, error.response?.status)) {
      return Promise.reject(error);
    }
    const retried = await retryWithFreshToken(original);
    return retried ?? Promise.reject(error);
  }
);

/**
 * Normalize an axios/unknown error into a human-readable message.
 * Prefers a server-provided `error` field when present.
 */
export function toErrorMessage(err: unknown, fallback = "Request failed"): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return String(err ?? fallback);
}
