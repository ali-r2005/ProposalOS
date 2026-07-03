import path from "path";
import { promises as fs } from "fs";
import Handlebars from "handlebars";
import type { LoadedTemplate, BusinessContext } from "@/lib/engine/types";
import { EngineError } from "@/lib/utils/error-handler";

/**
 * Load a prompt markdown file from the template and inject context via
 * Handlebars, so `{{destination}}` etc. resolve against the running context.
 */
export async function loadPrompt(
  template: LoadedTemplate,
  name: string,
  context: BusinessContext
): Promise<string> {
  if (!template.paths.promptsDir) {
    throw new EngineError(`Template "${template.id}" has no prompts directory`, 500);
  }
  if (name.includes("..") || name.includes("/")) {
    throw new EngineError(`Invalid prompt name: "${name}"`, 400);
  }

  const file = path.join(template.paths.promptsDir, `${name}.md`);
  const raw = await fs.readFile(file, "utf-8");

  // `noEscape` keeps prompt text human-readable (no HTML entity encoding).
  const compiled = Handlebars.compile(raw, { noEscape: true });
  return compiled(context);
}
