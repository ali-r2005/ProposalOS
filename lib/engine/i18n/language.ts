import { promises as fs } from "fs";
import path from "path";
import type { BusinessContext, I18nDictionary, TemplateManifest } from "@/lib/engine/types";

/**
 * Multi-language templates. One template folder can render several content
 * languages: the manifest lists them (`lang` = default, `languages` = all),
 * static slide text lives in `i18n/<lang>.json`, and the engine hands the
 * chosen language's dictionary to components as `t` (`{{t.welcome.title}}`).
 *
 * Two context keys are reserved by the engine:
 * - `lang`: the proposal's language code. Saved with the context, so a re-render
 *   keeps the language, and passed to providers, plugins and prompts so they
 *   can pick translated data.
 * - `t`: the dictionary. Added at build/render time only, never saved — so an
 *   edit to `i18n/*.json` shows up on the next re-render.
 *
 * The engine never reads a dictionary's keys; it only merges and forwards them.
 * Only type imports from `@/` here: scripts/preview-template.mjs imports this
 * file directly with Node, which cannot resolve the alias.
 */

export const LANG_KEY = "lang";
export const I18N_KEY = "t";

const LANG_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

/** The parts of a loaded template this module needs (lets the preview script
 *  pass a plain object instead of a full LoadedTemplate). */
export interface LanguageSource {
  manifest: Pick<TemplateManifest, "lang" | "languages">;
  i18n: Record<string, I18nDictionary>;
}

/** Every language the template renders, default first, without duplicates. */
export function templateLanguages(manifest: Pick<TemplateManifest, "lang" | "languages">): string[] {
  const all = [manifest.lang, ...(Array.isArray(manifest.languages) ? manifest.languages : [])];
  return [...new Set(all.filter((lang): lang is string => typeof lang === "string" && LANG_PATTERN.test(lang)))];
}

/** The requested language if the template supports it, else its default. */
export function resolveLanguage(manifest: Pick<TemplateManifest, "lang" | "languages">, requested: unknown): string {
  const languages = templateLanguages(manifest);
  if (typeof requested === "string" && languages.includes(requested)) return requested;
  return languages[0] ?? manifest.lang;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Deep-merge `override` onto `base`: nested objects merge, everything else replaces. */
export function mergeDictionaries(base: I18nDictionary, override: I18nDictionary): I18nDictionary {
  const merged: I18nDictionary = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = merged[key];
    merged[key] = isPlainObject(current) && isPlainObject(value) ? mergeDictionaries(current, value) : value;
  }
  return merged;
}

/**
 * The dictionary for `lang`, laid over the default language's, so a key not yet
 * translated shows the default text instead of an empty slot.
 */
export function dictionaryFor(source: LanguageSource, lang: string): I18nDictionary {
  const fallback = source.i18n[source.manifest.lang] ?? {};
  if (lang === source.manifest.lang) return fallback;
  return mergeDictionaries(fallback, source.i18n[lang] ?? {});
}

/**
 * Read `i18n/<lang>.json` for each language. A missing file yields an empty
 * dictionary (falls back to the default language); an unreadable one throws,
 * since rendering with silently missing text would be worse.
 */
export async function loadDictionaries(
  i18nDir: string | null,
  languages: string[]
): Promise<Record<string, I18nDictionary>> {
  const dictionaries: Record<string, I18nDictionary> = {};
  if (!i18nDir) return dictionaries;

  for (const lang of languages) {
    const file = path.join(i18nDir, `${lang}.json`);
    let raw: string;
    try {
      raw = await fs.readFile(file, "utf-8");
    } catch {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`i18n/${lang}.json is not valid JSON: ${(error as Error).message}`);
    }
    if (!isPlainObject(parsed)) throw new Error(`i18n/${lang}.json must contain a JSON object`);
    dictionaries[lang] = parsed;
  }
  return dictionaries;
}

/** The context's language, falling back to the template default. */
export function contextLanguage(source: LanguageSource, context: BusinessContext): string {
  return resolveLanguage(source.manifest, context[LANG_KEY]);
}

/** A copy of `context` with the resolved `lang` and its dictionary `t`. */
export function withLanguage(source: LanguageSource, context: BusinessContext, requested?: unknown): BusinessContext {
  const lang = resolveLanguage(source.manifest, requested ?? context[LANG_KEY]);
  return { ...context, [LANG_KEY]: lang, [I18N_KEY]: dictionaryFor(source, lang) };
}

/** A copy of `context` without the dictionary, for saving. */
export function withoutDictionary(context: BusinessContext): BusinessContext {
  const { [I18N_KEY]: _dictionary, ...rest } = context;
  return rest;
}

/** Every `a.b.c` leaf path in a dictionary (used to report untranslated keys). */
export function dictionaryKeys(dictionary: I18nDictionary, prefix = ""): string[] {
  return Object.entries(dictionary).flatMap(([key, value]) =>
    isPlainObject(value) ? dictionaryKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );
}
