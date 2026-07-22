import path from "path";
import { promises as fs } from "fs";
import { pathToFileURL } from "url";
import type { LoadedTemplate } from "@/lib/engine/types";
import { isProvider, type Provider } from "./provider-interface";
import { EngineError, devWarn } from "@/lib/utils/error-handler";

/**
 * Native dynamic import that webpack must NOT try to bundle — the target is a
 * template-authored `.ts` file discovered at runtime, outside the app's module
 * graph. Node (v22.18+/24) strips the TypeScript types on import.
 */
const nativeImport: (specifier: string) => Promise<any> = new Function(
  "specifier",
  "return import(specifier);"
) as (specifier: string) => Promise<any>;

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load `providers/{name}.{ts,js,mjs}` from a template and return the exported
 * `provider` object. Domain logic lives entirely in these files.
 */
export async function loadProvider(
  template: LoadedTemplate,
  name: string
): Promise<Provider> {
  if (!template.paths.providersDir) {
    throw new EngineError(`Template "${template.id}" has no providers directory`, 500);
  }
  if (name.includes("..") || name.includes("/")) {
    throw new EngineError(`Invalid provider name: "${name}"`, 400);
  }

  // On production/serverless, prefer compiled .js over .ts (Node can't execute TS natively)
  const exts = process.env.NODE_ENV === "production" ? [".js", ".mjs", ".ts"] : [".ts", ".js", ".mjs"];

  for (const ext of exts) {
    const file = path.join(template.paths.providersDir, `${name}${ext}`);
    if (!(await exists(file))) continue;

    const mod = await nativeImport(pathToFileURL(file).href + `?v=${Date.now()}`);
    const provider = mod.provider ?? mod.default;
    if (!isProvider(provider)) {
      throw new EngineError(
        `Provider "${name}" must export \`const provider = { name, description, execute }\``,
        500
      );
    }
    return provider as Provider;
  }

  throw new EngineError(`Provider "${name}" not found in template "${template.id}"`, 404);
}

/** Run a provider, tolerating failures so one bad provider can't kill the build. */
export async function runProvider(
  template: LoadedTemplate,
  name: string,
  context: Record<string, any>
): Promise<Record<string, any>> {
  try {
    const provider = await loadProvider(template, name);
    const result = await provider.execute(context);
    return result && typeof result === "object" ? result : {};
  } catch (error) {
    devWarn(`Provider "${name}" failed:`, error);
    return {};
  }
}
