import path from "path";
import { promises as fs } from "fs";
import type { FieldOptionsSource, FormField, FormGroup, LoadedTemplate } from "@/lib/engine/types";
import { EngineError, devWarn } from "@/lib/utils/error-handler";

function normaliseOptionsSource(raw: unknown): FieldOptionsSource | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.provider !== "string" || typeof o.collection !== "string") return undefined;
  return {
    provider: o.provider,
    collection: o.collection,
    valueKey: typeof o.valueKey === "string" ? o.valueKey : undefined,
    labelKey: typeof o.labelKey === "string" ? o.labelKey : undefined,
  };
}

function normaliseField(raw: unknown): FormField | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  // The `key` property is authoritative — it is the context property name.
  if (typeof f.key !== "string" || !f.key) return null;

  return {
    key: f.key,
    type: typeof f.type === "string" ? f.type : "text",
    label: typeof f.label === "string" ? f.label : f.key,
    required: f.required === true,
    placeholder: typeof f.placeholder === "string" ? f.placeholder : undefined,
    options: Array.isArray(f.options)
      ? (f.options as FormField["options"])
      : undefined,
    min: typeof f.min === "number" ? f.min : undefined,
    max: typeof f.max === "number" ? f.max : undefined,
    optionsFrom: normaliseOptionsSource(f.optionsFrom),
  };
}

function normaliseGroup(fileId: string, raw: unknown): FormGroup | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const fields = Array.isArray(g.fields)
    ? g.fields.map(normaliseField).filter((f): f is FormField => f !== null)
    : [];
  if (fields.length === 0) return null;

  return {
    id: typeof g.id === "string" ? g.id : fileId,
    title: typeof g.title === "string" ? g.title : fileId,
    description: typeof g.description === "string" ? g.description : undefined,
    fields,
  };
}

/**
 * Load EVERY `*.json` file from the template's forms directory and return them
 * as an ordered array of form groups — one wizard step each. This is the
 * "forms load from multiple JSON files" contract, kept agnostic to how many
 * files a template ships.
 */
export async function loadForms(template: LoadedTemplate): Promise<FormGroup[]> {
  if (!template.paths.formsDir) {
    throw new EngineError(`Template "${template.id}" has no forms directory`, 404);
  }

  const entries = await fs.readdir(template.paths.formsDir, { withFileTypes: true });
  const jsonFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => e.name)
    .sort();

  const groups: FormGroup[] = [];
  for (const name of jsonFiles) {
    const fileId = name.replace(/\.json$/, "");
    try {
      const raw = JSON.parse(await fs.readFile(path.join(template.paths.formsDir, name), "utf-8"));
      const group = normaliseGroup(fileId, raw);
      if (group) groups.push(group);
    } catch (error) {
      devWarn(`Skipping unreadable form file "${name}":`, error);
    }
  }

  return groups;
}
