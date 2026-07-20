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
}

/** Lightweight summary returned by `GET /api/templates`. */
export interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  version: string;
}
