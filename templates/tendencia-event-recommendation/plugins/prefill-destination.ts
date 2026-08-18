// Prefill plugin — fills the destination form on mount from a Frappe CRM Deal.
// Plugin contract (strict): export const plugin = { name, description, trigger, execute }.
//
// Triggered from /templates/tendencia-event-recommendation/new?deal=<CRM Deal name>.
// The `deal` query param is forwarded into `execute()`'s context by the engine's
// prefill route (verbatim passthrough — the engine never inspects it).
import { getWithRetry } from "./frappe-http.ts";

const DEAL_FIELD_MAP: Record<string, string> = {
  custom_theme: "event-name",
  custom_destination: "destination",
  custom_participants_count: "participant-count",
  custom_event_type: "event-type",
  custom_event_start_date: "event-dates",
  custom_destination_image_url:"destination-image",
  custom_travel_duration:"travel-duration",
  custom_formalities:"formalities",
  custom_climate:"climate",
  custom_programme:"programme"
};

interface CrmDeal {
  custom_theme?: string;
  custom_destination?: string;
  custom_participants_count?: number;
  custom_event_type?: string;
  custom_event_start_date?: string;
  custom_event_end_date?: string;
  [key: string]: unknown;
}

function daysBetween(start?: string, end?: string): string | undefined {
  if (!start || !end) return undefined;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return undefined;
  const nights = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (nights < 0) return undefined;
  return `${nights + 1} jours / ${nights} nuits`;
}

function getYearFromDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.getFullYear().toString();
}

export const plugin = {
  name: "prefill-destination",
  description: "Prefills the destination form from a Frappe CRM Deal (?deal=<name>).",
  trigger: "onMount" as const,
  async execute(context: Record<string, any>): Promise<Record<string, any>> {
    const dealId = context.deal;
    if (!dealId || typeof dealId !== "string") return {};

    const baseUrl = process.env.FRAPPE_CRM_URL;
    const apiKey = process.env.FRAPPE_CRM_API_KEY;
    const apiSecret = process.env.FRAPPE_CRM_API_SECRET;
    if (!baseUrl || !apiKey || !apiSecret) return {};

    const data = await getWithRetry<{ data: CrmDeal }>(
      `${baseUrl.replace(/\/+$/, "")}/api/resource/CRM%20Deal/${encodeURIComponent(dealId)}`,
      { headers: { Authorization: `token ${apiKey}:${apiSecret}` }, timeout: 15_000 }
    );
    const deal = data.data;

    const values: Record<string, any> = {};

    for (const [dealField, formKey] of Object.entries(DEAL_FIELD_MAP)) {
      const value = deal[dealField];
      if (value !== undefined && value !== null && value !== "") values[formKey] = value;
    }

    const duration = daysBetween(deal.custom_event_start_date, deal.custom_event_end_date);
    if (duration) values["stay-duration"] = duration;

    const year = getYearFromDate(deal.custom_event_start_date);
    if (year) values["event-year"] = year;

    values["langue"] = "fr"; 

    return values;
  },
};
