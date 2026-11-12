import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { listTemplates, loadTemplate } from "@/lib/engine/core/template-loader";
import { generatePresentation, renderFromContext } from "@/lib/engine/core/pipeline";
import { buildContext } from "@/lib/engine/core/context-builder";
import { resolveLanguage, templateLanguages, withoutLanguage } from "@/lib/engine/i18n/language";
import { loadForms } from "@/lib/forms/form-generator";
import { validateFormInput } from "@/lib/forms/form-validator";
import { loadPlugin, runPlugins } from "@/lib/plugins/plugin-loader";
import { runProvider } from "@/lib/providers/provider-loader";
import { createShareSignature } from "@/lib/share/link";
import {
  getProposal,
  getProposalMeta,
  listProposals,
  saveProposal,
  updateProposal,
  updateProposalMeta,
} from "@/lib/proposal-store";
import type { AuthUser } from "@/lib/auth/session";
import type { FormField, FormGroup, LoadedTemplate } from "@/lib/engine/types";
import { toErrorResponse } from "@/lib/utils/error-handler";

/**
 * The ProposalOS MCP server: generic tools over the engine, so Claude can
 * create and change proposals for any template. Nothing here knows what a
 * template is about. Claude learns each template's fields from its form JSON
 * (get_template_form) and passes values back by field `key`.
 *
 * A new server is built per HTTP request (stateless transport), which is
 * what Vercel's serverless functions need.
 */

const SERVER_INSTRUCTIONS = `ProposalOS generates presentation proposals from templates.
Typical flow: list_templates → get_template_form (learn the field keys) → optionally prefill_form (e.g. from a CRM record) → ask the user for missing required values → create_proposal.
To change a proposal: get_proposal → update_proposal. Changing values re-renders the slides from the template, which discards edits made by hand in the visual editor, so tell the user before doing it.
Values are keyed by the form field "key". Image fields take image URLs.
Always give the user the links returned by create_proposal / update_proposal.`;

const EMBEDDED_PREFIX = "[embedded file";
const MAX_INLINE_STRING = 300;
const SHARE_TTL_MAX_DAYS = 90;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Run a tool body and turn any thrown error into an MCP tool error. */
async function guarded(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    return fail(toErrorResponse(error).message);
  }
}

/**
 * Uploaded files are stored inside the context as data URIs, which can be
 * megabytes. Replace them with a short marker before showing a context to
 * Claude, so a proposal fits in the conversation.
 */
function compact(value: unknown): Json {
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.length > MAX_INLINE_STRING) {
      return `${EMBEDDED_PREFIX}, ~${Math.round(value.length / 1365)} KB — unchanged unless you replace it]`;
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, compact(v)]));
  }
  return null;
}

/** True when a value (or anything inside it) is a compact() marker sent back by mistake. */
function containsMarker(value: unknown): boolean {
  if (typeof value === "string") return value.startsWith(EMBEDDED_PREFIX);
  if (Array.isArray(value)) return value.some(containsMarker);
  if (value && typeof value === "object") return Object.values(value).some(containsMarker);
  return false;
}

/** Field description for Claude: the form JSON minus UI-only details. */
function describeField(field: FormField): Record<string, unknown> {
  return {
    key: field.key,
    type: field.type,
    label: field.label,
    required: field.required,
    ...(field.placeholder ? { placeholder: field.placeholder } : {}),
    ...(field.options ? { options: field.options } : {}),
    ...(field.optionsFrom ? { optionsFrom: "dynamic — call get_field_options" } : {}),
    ...(field.min !== undefined ? { min: field.min } : {}),
    ...(field.max !== undefined ? { max: field.max } : {}),
    ...(field.itemFields ? { itemFields: field.itemFields.map(describeField) } : {}),
  };
}

function allFields(groups: FormGroup[]): FormField[] {
  return groups.flatMap((g) => g.fields.flatMap((f) => [f, ...(f.itemFields ?? [])]));
}

function formKeys(groups: FormGroup[]): Set<string> {
  return new Set(groups.flatMap((g) => g.fields.map((f) => f.key)));
}

async function pluginDescriptions(template: LoadedTemplate): Promise<Array<{ name: string; description: string }>> {
  const result: Array<{ name: string; description: string }> = [];
  for (const name of template.manifest.plugins ?? []) {
    try {
      const plugin = await loadPlugin(template, name);
      result.push({ name: plugin.name, description: plugin.description });
    } catch {
      // A broken plugin is reported when it runs; just leave it out here.
    }
  }
  return result;
}

function links(origin: string, proposalId: string): Record<string, string> {
  return {
    open: `${origin}/proposal/${proposalId}`,
    editValues: `${origin}/proposal/${proposalId}/edit`,
    visualEditor: `${origin}/proposal/${proposalId}/design`,
    pdf: `${origin}/api/proposals/${proposalId}/pdf`,
  };
}

function validationMessage(missing: string[], invalid: string[]): string {
  const parts: string[] = [];
  if (missing.length) parts.push(`Missing required fields: ${missing.join(", ")}`);
  if (invalid.length) parts.push(`Too many selections: ${invalid.join(", ")}`);
  return parts.join(". ");
}

const valuesSchema = z
  .record(z.unknown())
  .describe("Field values keyed by the form field `key`, as returned by get_template_form.");

export function createMcpServer(origin: string, user: AuthUser): McpServer {
  const server = new McpServer(
    { name: "proposalos", version: "1.0.0" },
    { instructions: SERVER_INSTRUCTIONS }
  );

  server.registerTool(
    "list_templates",
    {
      title: "List templates",
      description: "List the proposal templates available in ProposalOS, with their content languages.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () =>
      guarded(async () => {
        const manifests = await listTemplates();
        return ok(
          manifests.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            defaultLanguage: m.lang,
            languages: templateLanguages(m),
          }))
        );
      })
  );

  server.registerTool(
    "get_template_form",
    {
      title: "Get a template's form",
      description:
        "Return the form steps and fields of a template (key, type, label, required, options), its languages, and its prefill plugins. Call this before create_proposal to know which keys to fill.",
      inputSchema: { templateId: z.string().describe("Template id from list_templates") },
      annotations: { readOnlyHint: true },
    },
    ({ templateId }) =>
      guarded(async () => {
        const template = await loadTemplate(templateId);
        const groups = await loadForms(template);
        return ok({
          templateId,
          defaultLanguage: template.manifest.lang,
          languages: templateLanguages(template.manifest),
          steps: groups.map((g) => ({
            id: g.id,
            title: g.title,
            ...(g.description ? { description: g.description } : {}),
            fields: g.fields.map(describeField),
          })),
          prefillPlugins: await pluginDescriptions(template),
        });
      })
  );

  server.registerTool(
    "get_field_options",
    {
      title: "Get options for a dynamic field",
      description:
        "Fetch the choices for a field whose options are loaded dynamically (optionsFrom). Pass the values entered so far, since some option lists depend on them.",
      inputSchema: {
        templateId: z.string(),
        fieldKey: z.string().describe("The field's `key`"),
        values: valuesSchema.optional(),
        lang: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    ({ templateId, fieldKey, values, lang, limit, offset }) =>
      guarded(async () => {
        const template = await loadTemplate(templateId);
        const field = allFields(await loadForms(template)).find((f) => f.key === fieldKey);
        if (!field) return fail(`Template "${templateId}" has no field "${fieldKey}"`);
        const source = field.optionsFrom;
        if (!source) return ok({ fieldKey, options: field.options ?? [] });

        const result = await runProvider(template, source.provider, {
          ...(values ?? {}),
          lang: resolveLanguage(template.manifest, lang),
          limit: limit ?? 50,
          offset: offset ?? 0,
        });
        const rows = Array.isArray(result[source.collection]) ? (result[source.collection] as Record<string, unknown>[]) : [];
        const valueKey = source.valueKey ?? "id";
        const labelKey = source.labelKey ?? "name";
        return ok({
          fieldKey,
          total: typeof result.total === "number" ? result.total : rows.length,
          options: rows.map((r) => ({ value: String(r[valueKey]), label: String(r[labelKey] ?? r[valueKey]) })),
        });
      })
  );

  server.registerTool(
    "prefill_form",
    {
      title: "Prefill form values",
      description:
        "Run the template's prefill plugins (listed by get_template_form, e.g. reading a CRM record) and return the values they found. Nothing is saved; use the values in create_proposal. The parameters each plugin expects are given in its description (for example { \"deal\": \"<CRM deal id>\" }).",
      inputSchema: {
        templateId: z.string(),
        params: z.record(z.string()).describe("Parameters for the plugins, e.g. { \"deal\": \"CRM-DEAL-0042\" }"),
        lang: z.string().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ templateId, params, lang }) =>
      guarded(async () => {
        const template = await loadTemplate(templateId);
        const values = await runPlugins(template, "onMount", {
          ...params,
          lang: resolveLanguage(template.manifest, lang),
        });
        return ok({
          values: compact(values),
          note: Object.keys(values).length
            ? "Show these to the user and ask for any missing required fields before creating the proposal."
            : "The plugins returned nothing: check the parameters, or the template has no prefill plugins.",
        });
      })
  );

  server.registerTool(
    "create_proposal",
    {
      title: "Create a proposal",
      description:
        "Generate a new proposal from a template and save it. Returns its id and links (open, edit values, visual editor, PDF).",
      inputSchema: {
        templateId: z.string(),
        values: valuesSchema,
        title: z.string().optional().describe("Name shown in the proposal history"),
        lang: z.string().optional().describe("One of the template's languages; default when omitted"),
      },
    },
    ({ templateId, values, title, lang }) =>
      guarded(async () => {
        const template = await loadTemplate(templateId);
        const groups = await loadForms(template).catch((): FormGroup[] => []);
        const validation = validateFormInput(groups, values);
        if (!validation.valid) return fail(validationMessage(validation.missing, validation.invalid));

        const result = await generatePresentation(templateId, values, lang);
        const name = title?.trim() || undefined;
        await saveProposal(result.proposalId, templateId, result.html, result.context, name, result.lang);
        return ok({
          proposalId: result.proposalId,
          title: name ?? null,
          lang: result.lang,
          slides: result.slides,
          createdBy: user.email,
          links: links(origin, result.proposalId),
        });
      })
  );

  server.registerTool(
    "list_proposals",
    {
      title: "List proposals",
      description: "List saved proposals, most recently changed first. Optionally filter by template or by text in the title.",
      inputSchema: {
        templateId: z.string().optional(),
        search: z.string().optional().describe("Case-insensitive text to find in the title"),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    ({ templateId, search, limit, offset }) =>
      guarded(async () => {
        const needle = search?.trim().toLowerCase();
        // Title search scans a wider page, then trims to `limit`.
        const { rows, total } = await listProposals({
          templateId,
          limit: needle ? 500 : limit ?? 25,
          offset: needle ? 0 : offset ?? 0,
        });
        const matches = needle ? rows.filter((r) => (r.title ?? "").toLowerCase().includes(needle)) : rows;
        const page = needle ? matches.slice(offset ?? 0, (offset ?? 0) + (limit ?? 25)) : matches;
        return ok({
          total: needle ? matches.length : total,
          proposals: page.map((r) => ({
            id: r.id,
            title: r.title,
            templateId: r.templateId,
            lang: r.lang,
            updatedAt: r.updatedAt,
            link: `${origin}/proposal/${r.id}`,
          })),
        });
      })
  );

  server.registerTool(
    "get_proposal",
    {
      title: "Get a proposal",
      description:
        "Return a proposal's title, template, language, links and its current form values (keyed by field key). Set includeComputed to also see the values computed by the template (providers/AI).",
      inputSchema: {
        proposalId: z.string(),
        includeComputed: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    ({ proposalId, includeComputed }) =>
      guarded(async () => {
        const [meta, proposal] = await Promise.all([getProposalMeta(proposalId), getProposal(proposalId)]);
        if (!meta || !proposal) return fail(`Proposal "${proposalId}" not found`);

        const template = await loadTemplate(proposal.templateId);
        const keys = formKeys(await loadForms(template).catch((): FormGroup[] => []));
        const entries = Object.entries(proposal.context);
        const values = Object.fromEntries(entries.filter(([k]) => keys.has(k)));
        const computed = entries.filter(([k]) => !keys.has(k));

        return ok({
          id: meta.id,
          title: meta.title,
          templateId: meta.templateId,
          lang: resolveLanguage(template.manifest, meta.lang),
          updatedAt: meta.updatedAt,
          links: links(origin, meta.id),
          values: compact(values),
          ...(includeComputed
            ? { computed: compact(Object.fromEntries(computed)) }
            : { computedKeys: computed.map(([k]) => k) }),
        });
      })
  );

  server.registerTool(
    "update_proposal",
    {
      title: "Update a proposal",
      description: [
        "Change a proposal's title, language and/or values.",
        "A title-only change never touches the slides.",
        "Changing values or the language re-renders every slide from the template, which DISCARDS edits made by hand in the visual editor: tell the user and get their OK, then pass rebuild: true.",
        "mode \"regenerate\" (default) re-runs the template's providers/AI so computed values (formatted dates, totals, fetched data) follow the new values; AI-written text may change.",
        "mode \"rerender\" keeps every computed value as it is and only re-renders, so it is for direct text fixes, including computed keys from get_proposal with includeComputed.",
      ].join(" "),
      inputSchema: {
        proposalId: z.string(),
        changes: valuesSchema.optional().describe("Only the keys to change; other values are kept."),
        title: z.string().optional(),
        lang: z.string().optional(),
        mode: z.enum(["regenerate", "rerender"]).optional(),
        rebuild: z.boolean().optional().describe("Must be true when changes or lang are given"),
      },
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    ({ proposalId, changes, title, lang, mode, rebuild }) =>
      guarded(async () => {
        const proposal = await getProposal(proposalId);
        if (!proposal) return fail(`Proposal "${proposalId}" not found`);

        const hasChanges = !!changes && Object.keys(changes).length > 0;
        const rerenders = hasChanges || lang !== undefined;
        if (rerenders && rebuild !== true) {
          return fail(
            "Not changed. Changing values or the language rebuilds all slides and discards hand edits made in the visual editor. Ask the user, then call again with rebuild: true."
          );
        }
        if (hasChanges && containsMarker(changes)) {
          return fail(`A value starts with "${EMBEDDED_PREFIX}": that is a placeholder for an existing file, not a real value. Leave that key out to keep the file.`);
        }

        const template = await loadTemplate(proposal.templateId);
        let slides: number | undefined;
        const nextLang = lang !== undefined ? resolveLanguage(template.manifest, lang) : proposal.lang;

        if (rerenders) {
          const merged = withoutLanguage({ ...proposal.context, ...(changes ?? {}) });
          const context = (mode ?? "regenerate") === "regenerate" ? await buildContext(template, merged, nextLang ?? undefined) : merged;
          const rendered = await renderFromContext(template, context, nextLang);
          await updateProposal(proposalId, rendered.html, context);
          slides = rendered.slides;
        }

        const metaPatch: { title?: string | null; lang?: string | null } = {};
        if (title !== undefined) metaPatch.title = title.trim() || null;
        if (lang !== undefined) metaPatch.lang = nextLang;
        if (Object.keys(metaPatch).length) await updateProposalMeta(proposalId, metaPatch);

        return ok({
          proposalId,
          updated: { values: hasChanges ? Object.keys(changes ?? {}) : [], title: title !== undefined, lang: lang !== undefined },
          ...(slides !== undefined ? { slides, mode: mode ?? "regenerate" } : {}),
          links: links(origin, proposalId),
        });
      })
  );

  server.registerTool(
    "get_share_link",
    {
      title: "Get a public share link",
      description: "Create a public link to view the proposal without logging in. Anyone with the link can view it until it expires.",
      inputSchema: {
        proposalId: z.string(),
        ttlDays: z.number().min(1).max(SHARE_TTL_MAX_DAYS).optional().describe("Days until the link expires (default 30)"),
      },
    },
    ({ proposalId, ttlDays }) =>
      guarded(async () => {
        const meta = await getProposalMeta(proposalId);
        if (!meta) return fail(`Proposal "${proposalId}" not found`);
        const expiresAt = Date.now() + (ttlDays ?? 30) * 24 * 60 * 60 * 1000;
        const sig = createShareSignature(proposalId, expiresAt);
        return ok({
          url: `${origin}/p/${proposalId}?expires=${expiresAt}&sig=${sig}`,
          expiresAt: new Date(expiresAt).toISOString(),
        });
      })
  );

  return server;
}
