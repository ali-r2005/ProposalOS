import { promises as fs } from "fs";
import path from "path";
import type { LoadedTemplate, TemplateManifest, TemplatePaths } from "@/lib/engine/types";
import { parseBlueprint } from "./blueprint-parser";
import { EngineError, devLog } from "@/lib/utils/error-handler";

/** Root directory that holds all templates. Never hardcode a template id. */
export function templatesRoot(): string {
  return path.join(process.cwd(), "templates");
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/** Return the first candidate directory that exists, else null. */
async function firstDir(root: string, candidates: string[]): Promise<string | null> {
  for (const name of candidates) {
    const p = path.join(root, name);
    if (await exists(p)) return p;
  }
  return null;
}

async function firstFile(root: string, candidates: string[]): Promise<string | null> {
  for (const name of candidates) {
    const p = path.join(root, name);
    if (await exists(p)) return p;
  }
  return null;
}

/**
 * Discover the well-known sub-directories of a template. The names are
 * tolerated in a couple of spellings so the engine stays agnostic to a
 * template's exact on-disk layout (e.g. `forms/` vs `form/`).
 */
async function discoverPaths(root: string): Promise<TemplatePaths> {
  return {
    root,
    formsDir: await firstDir(root, ["forms", "form"]),
    componentsDir: await firstDir(root, ["components"]),
    providersDir: await firstDir(root, ["providers"]),
    promptsDir: await firstDir(root, ["prompts", "propmts"]),
    assetsDir: await firstDir(root, ["assets"]),
    tokensCss: await firstFile(root, ["tokens.css"]),
    dbDir: await firstDir(root, ["db"]),
  };
}

/** Read + parse a template from disk. Cached per-process. */
const cache = new Map<string, LoadedTemplate>();

export async function loadTemplate(templateId: string): Promise<LoadedTemplate> {
  if (!templateId || templateId.includes("..") || templateId.includes("/")) {
    throw new EngineError(`Invalid template id: "${templateId}"`, 400);
  }

  const cached = cache.get(templateId);
  if (cached && process.env.NODE_ENV === "production") return cached;

  const root = path.join(templatesRoot(), templateId);
  if (!(await exists(root))) {
    throw new EngineError(`Template not found: "${templateId}"`, 404);
  }

  const manifestPath = path.join(root, "manifest.json");
  if (!(await exists(manifestPath))) {
    throw new EngineError(`Template "${templateId}" is missing manifest.json`, 500);
  }
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as TemplateManifest;

  const blueprintPath = path.join(root, "blueprint.yaml");
  if (!(await exists(blueprintPath))) {
    throw new EngineError(`Template "${templateId}" is missing blueprint.yaml`, 500);
  }
  const blueprint = parseBlueprint(await fs.readFile(blueprintPath, "utf-8"));

  const paths = await discoverPaths(root);
  const tokensCss = paths.tokensCss ? await fs.readFile(paths.tokensCss, "utf-8") : "";

  const template: LoadedTemplate = {
    id: templateId,
    manifest,
    blueprint,
    paths,
    tokensCss,
  };

  cache.set(templateId, template);
  devLog(`Loaded template "${templateId}" (${blueprint.sections.length} sections)`);
  return template;
}

/** List every template directory that contains a manifest.json. */
export async function listTemplates(): Promise<TemplateManifest[]> {
  const root = templatesRoot();
  if (!(await exists(root))) return [];

  const entries = await fs.readdir(root, { withFileTypes: true });
  const manifests: TemplateManifest[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(root, entry.name, "manifest.json");
    if (!(await exists(manifestPath))) continue;
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as TemplateManifest;
      manifests.push({ ...manifest, id: manifest.id ?? entry.name });
    } catch {
      // Skip templates with an unreadable manifest.
    }
  }
  return manifests;
}
