import type { Integration, IntegrationStatus } from "./types";
import { frappeIntegration } from "./frappe";

/** Every integration the app knows. Add a new one here. */
export const integrations: Integration[] = [frappeIntegration];

/** Checks all integrations in parallel. */
export function checkIntegrations(): Promise<IntegrationStatus[]> {
  return Promise.all(integrations.map((integration) => integration.check()));
}
