import axios from "axios";

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

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retried || original.url?.includes("/api/auth/")) {
      return Promise.reject(error);
    }
    original._retried = true;

    const accessToken = await refreshAccessToken();
    if (!accessToken) return Promise.reject(error);

    http.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    original.headers["Authorization"] = `Bearer ${accessToken}`;
    return http(original);
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
