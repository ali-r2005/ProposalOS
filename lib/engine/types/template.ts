import type { TemplateManifest } from "./manifest";
import type { Blueprint } from "./blueprint";

/** Absolute paths to a template's well-known sub-directories/files.
 *  Anything that may be absent is nullable so the engine can degrade
 *  gracefully rather than assume a fixed layout. */
export interface TemplatePaths {
  root: string;
  formsDir: string | null;
  componentsDir: string | null;
  providersDir: string | null;
  promptsDir: string | null;
  assetsDir: string | null;
  tokensCss: string | null;
  /** `i18n/` folder holding one `<lang>.json` dictionary per language. */
  i18nDir: string | null;
  /** Template-owned Drizzle schema (business tables), if the template has one. */
  dbDir: string | null;
}

/** A fully loaded template: metadata, plan, paths and theme. */
export interface LoadedTemplate {
  id: string;
  manifest: TemplateManifest;
  blueprint: Blueprint;
  paths: TemplatePaths;
  tokensCss: string;
  /** Parsed `i18n/<lang>.json` dictionaries, keyed by language code. */
  i18n: Record<string, I18nDictionary>;
}

/** One language's static text, as nested key/value objects. Never inspected by
 *  the engine — it is handed to components verbatim as `t`. */
export type I18nDictionary = Record<string, unknown>;

/** Lightweight summary returned by `GET /api/templates`. */
export interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  version: string;
  /** Default content language. */
  lang: string;
  /** Every content language the template can render (default first). */
  languages: string[];
}
