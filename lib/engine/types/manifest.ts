/** Template metadata read from `manifest.json`. */
export interface Canvas {
  width: number;
  height: number;
  aspectRatio?: string;
}

export interface TemplateManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  /** Language the template's own content (form labels, components, prompts) is written
   *  in, e.g. "en" or "fr". Independent of the app UI language — a user can browse the
   *  admin in French while creating an English-content proposal. */
  lang: string;
  /** Every language the template can render, e.g. ["fr", "en"]. `lang` is the
   *  default and is always included even if missing here. Static slide text for
   *  each one lives in `i18n/<lang>.json` and reaches components as `{{t.…}}`.
   *  Omit for a single-language template. */
  languages?: string[];
  /** Names of files under plugins/ to run (without extension). Opt-in: templates
   *  that omit this run no plugin logic at all. */
  plugins?: string[];
  canvas: Canvas;
}
