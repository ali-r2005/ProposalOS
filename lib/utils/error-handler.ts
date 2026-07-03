/** A typed error carrying an HTTP status, used across the engine and routes. */
export class EngineError extends Error {
  readonly status: number;
  readonly cause?: unknown;

  constructor(message: string, status = 500, cause?: unknown) {
    super(message);
    this.name = "EngineError";
    this.status = status;
    this.cause = cause;
  }
}

/** Normalise any thrown value into a message + status. */
export function toErrorResponse(error: unknown): { message: string; status: number } {
  if (error instanceof EngineError) {
    return { message: error.message, status: error.status };
  }
  if (error instanceof Error) {
    return { message: error.message, status: 500 };
  }
  return { message: String(error), status: 500 };
}

const isDev = process.env.NODE_ENV !== "production";

/** Dev-only logger — silent in production per the engine rules. */
export function devLog(...args: unknown[]): void {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log("[ProposalOS]", ...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn("[ProposalOS]", ...args);
  }
}
