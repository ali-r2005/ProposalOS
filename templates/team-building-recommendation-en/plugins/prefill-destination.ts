// Prefill plugin — fills the event / cahier-de-charge form fields on mount from
// a Frappe CRM Deal (same CRM Deal doctype as tendencia-event-recommendation).
// Plugin contract (strict): export const plugin = { name, description, trigger, execute }.
//
// Triggered from /templates/team-building-recommendation-en/new?deal=<CRM Deal name>.
// The `deal` query param is forwarded into `execute()`'s context by the engine's
// prefill route (verbatim passthrough — the engine never inspects it).
import { getWithRetry, FRAPPE_BASE_URL } from "./frappe-http.ts";

// CRM Deal field -> this template's form key. Only fields this template's
// form actually has; the rest of the Deal is ignored.
const DEAL_FIELD_MAP: Record<string, string> = {
  organization: "client-name",
  custom_participants_count: "number-of-participants",
  custom_destination: "venue",
  custom_event_start_date: "event-date",
};

interface CrmDeal {
  [key: string]: unknown;
}

export const plugin = {
  name: "prefill-destination",
  description: "Prefills the event and cahier-de-charge fields from a Frappe CRM Deal (?deal=<name>).",
  trigger: "onMount" as const,
  async execute(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const dealId = context.deal;
    if (!dealId || typeof dealId !== "string") return {};

    const apiKey = process.env.FRAPPE_CRM_API_KEY;
    const apiSecret = process.env.FRAPPE_CRM_API_SECRET;
    if (!apiKey || !apiSecret) return {};

    const data = await getWithRetry<{ data: CrmDeal }>(
      `${FRAPPE_BASE_URL}/api/resource/CRM%20Deal/${encodeURIComponent(dealId)}`,
      { headers: { Authorization: `token ${apiKey}:${apiSecret}` }, timeoutMs: 15_000 }
    );
    const deal = data.data;

    const values: Record<string, unknown> = {};
    for (const [dealField, formKey] of Object.entries(DEAL_FIELD_MAP)) {
      const value = deal[dealField];
      if (value !== undefined && value !== null && value !== "") values[formKey] = value;
    }
    return values;
  },
};
