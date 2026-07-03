import path from "path";
import { promises as fs } from "fs";
import type { BusinessContext, LoadedComponent, LoadedTemplate } from "@/lib/engine/types";
import { render } from "./handlebars-engine";
import { EngineError } from "@/lib/utils/error-handler";

const componentCache = new Map<string, LoadedComponent>();

async function readIfExists(target: string): Promise<string | null> {
  try {
    return await fs.readFile(target, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Locate and load a component by id. Templates are tolerated in a few naming
 * conventions: `components/{id}/component.html`, `components/{id}/{id}.html`,
 * or a loose `components/{id}.html`.
 */
export async function loadComponent(
  template: LoadedTemplate,
  componentId: string
): Promise<LoadedComponent> {
  const cacheKey = `${template.id}:${componentId}`;
  const cached = componentCache.get(cacheKey);
  if (cached && process.env.NODE_ENV === "production") return cached;

  if (!template.paths.componentsDir) {
    throw new EngineError(`Template "${template.id}" has no components directory`, 500);
  }
  if (componentId.includes("..") || componentId.includes("/")) {
    throw new EngineError(`Invalid component id: "${componentId}"`, 400);
  }

  const dir = template.paths.componentsDir;
  const candidates = [
    path.join(dir, componentId, "component.html"),
    path.join(dir, componentId, `${componentId}.html`),
    path.join(dir, `${componentId}.html`),
  ];

  let html: string | null = null;
  for (const candidate of candidates) {
    html = await readIfExists(candidate);
    if (html !== null) break;
  }
  if (html === null) {
    throw new EngineError(`Component "${componentId}" not found in template "${template.id}"`, 404);
  }

  const schemaRaw = await readIfExists(path.join(dir, componentId, "schema.json"));
  const component: LoadedComponent = {
    id: componentId,
    html,
    schema: schemaRaw ? JSON.parse(schemaRaw) : undefined,
  };

  componentCache.set(cacheKey, component);
  return component;
}

/** Load a component and inject slide data via Handlebars. */
export async function renderComponent(
  template: LoadedTemplate,
  componentId: string,
  data: BusinessContext
): Promise<string> {
  const component = await loadComponent(template, componentId);
  return render(component.html, data);
}
