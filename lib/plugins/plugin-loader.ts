import path from "path";
import { promises as fs } from "fs";
import { pathToFileURL } from "url";
import type { LoadedTemplate } from "@/lib/engine/types";
import { isPlugin, type Plugin, type PluginTrigger } from "./plugin-interface";
import { EngineError, devWarn } from "@/lib/utils/error-handler";

/**
 * Native dynamic import that webpack must NOT try to bundle — the target is a
 * template-authored `.ts` file discovered at runtime, outside the app's module
 * graph. Node (v22.18+/24) strips the TypeScript types on import. Mirrors
 * lib/providers/provider-loader.ts exactly — same reason, same mechanism.
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
 * Load `plugins/{name}.{ts,js,mjs}` from a template and return the exported
 * `plugin` object. Custom form-fill logic lives entirely in these files.
 */
export async function loadPlugin(template: LoadedTemplate, name: string): Promise<Plugin> {
  if (name.includes("..") || name.includes("/")) {
    throw new EngineError(`Invalid plugin name: "${name}"`, 400);
  }

  const pluginsDir = path.join(template.paths.root, "plugins");
  const exts = [".ts", ".js", ".mjs"];

  for (const ext of exts) {
    const file = path.join(pluginsDir, `${name}${ext}`);
    if (!(await exists(file))) continue;

    const mod = await nativeImport(pathToFileURL(file).href + `?v=${Date.now()}`);
    // Compiled templates/*.js are CommonJS; Node's ESM interop can't
    // statically detect SWC's custom export helper, so named exports land
    // inside `mod.default` instead of on `mod` directly. Unwrap it — same
    // quirk documented in provider-loader.ts.
    const ns = mod.plugin ? mod : mod.default && typeof mod.default === "object" ? mod.default : mod;
    const plugin = ns.plugin ?? ns.default;
    if (!isPlugin(plugin)) {
      throw new EngineError(
        `Plugin "${name}" must export \`const plugin = { name, description, trigger, execute }\``,
        500
      );
    }
    return plugin as Plugin;
  }

  throw new EngineError(`Plugin "${name}" not found in template "${template.id}"`, 404);
}

/**
 * Run every manifest-listed plugin matching `trigger`, merging their returned
 * objects into one. Order follows the manifest list; later plugins win on key
 * collision. A failing plugin is skipped, not fatal — prefill is a
 * convenience, never a hard requirement for the form to work.
 */
export async function runPlugins(
  template: LoadedTemplate,
  trigger: PluginTrigger,
  context: Record<string, any>
): Promise<Record<string, any>> {
  const names = template.manifest.plugins ?? [];
  let merged: Record<string, any> = {};

  for (const name of names) {
    try {
      const plugin = await loadPlugin(template, name);
      if (plugin.trigger !== trigger) continue;
      const result = await plugin.execute(context);
      if (result && typeof result === "object") merged = { ...merged, ...result };
    } catch (error) {
      devWarn(`Plugin "${name}" failed:`, error);
    }
  }

  return merged;
}
