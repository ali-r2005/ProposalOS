import axios from "axios";

export const http = axios.create({
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

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
