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

  // Always prefer the .ts source over the compiled .js: providers reach the
  // engine's lib/db/client.ts (still raw ESM, never compiled) via relative
  // import, and nativeImport() loads it with native TS type-stripping over
  // real ESM `import` all the way down. The compiled .js providers are CJS
  // (SWC's `require()` output) — `require()`-ing that one raw ESM file from
  // inside them fails in production with "Failed to load the ES module"
  // (Node can parse the TS fine; it just can't load ESM via `require`).
  // .js/.mjs stay as a fallback for a template shipped pre-compiled with no
  // .ts source at all.
  const exts = [".ts", ".js", ".mjs"];

  for (const ext of exts) {
    const file = path.join(template.paths.providersDir, `${name}${ext}`);
    if (!(await exists(file))) continue;

    const mod = await nativeImport(pathToFileURL(file).href + `?v=${Date.now()}`);
    // Compiled templates/*.js are CommonJS; Node's ESM interop can't
    // statically detect SWC's custom export helper, so named exports land
    // inside `mod.default` instead of on `mod` directly. Unwrap it.
    const ns = mod.provider ? mod : mod.default && typeof mod.default === "object" ? mod.default : mod;
    const provider = ns.provider ?? ns.default;
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
