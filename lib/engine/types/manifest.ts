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
  /** Names of files under plugins/ to run (without extension). Opt-in: templates
   *  that omit this run no plugin logic at all. */
  plugins?: string[];
  canvas: Canvas;
}
