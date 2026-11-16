/**
 * An Integration connects ProposalOS to another app (a CRM, an ERP…).
 * Each one lives in `lib/integrations/<id>/`: its own client that template
 * plugins import, plus this description used by the settings page.
 */
export interface IntegrationStatus {
  id: string;
  name: string;
  /** The site the integration talks to (never contains secrets). */
  url?: string;
  /** False when required env vars are missing: no request was attempted. */
  configured: boolean;
  /** True when the remote app answered and accepted the credentials. */
  ok: boolean;
  latencyMs?: number;
  /** Who the credentials authenticate as, when the app reports it. */
  account?: string;
  error?: string;
  /** Names (not values) of the env vars that are missing. */
  missingEnv?: string[];
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  /** Env var names the integration needs. */
  env: string[];
  /** Pings the remote app with the configured credentials. Never throws. */
  check(): Promise<IntegrationStatus>;
}
