import type { Integration, IntegrationStatus } from "../types";
import { frappeBaseUrl, frappeGet, FrappeHttpError } from "./client";

const ENV = ["FRAPPE_CRM_API_KEY", "FRAPPE_CRM_API_SECRET"];

export const frappeIntegration: Integration = {
  id: "frappe-crm",
  name: "Frappe CRM",
  description: "Prefills proposal forms from CRM deals and their products.",
  env: ["FRAPPE_CRM_URL", ...ENV],

  async check(): Promise<IntegrationStatus> {
    const base = { id: this.id, name: this.name, url: frappeBaseUrl() };
    const missingEnv = ENV.filter((name) => !process.env[name]);
    if (missingEnv.length) return { ...base, configured: false, ok: false, missingEnv };

    const started = Date.now();
    try {
      // Returns the user the API key belongs to: proves both reachability and auth.
      const body = await frappeGet<{ message?: string }>("/api/method/frappe.auth.get_logged_user", {
        timeoutMs: 8_000,
        retry: false,
      });
      return { ...base, configured: true, ok: true, latencyMs: Date.now() - started, account: body.message };
    } catch (error) {
      const status = error instanceof FrappeHttpError ? error.status : undefined;
      const message =
        status === 401 || status === 403
          ? `Credentials rejected (HTTP ${status})`
          : status
            ? `CRM answered HTTP ${status}`
            : `Unreachable: ${error instanceof Error ? error.message : String(error)}`;
      return { ...base, configured: true, ok: false, latencyMs: Date.now() - started, error: message };
    }
  },
};
