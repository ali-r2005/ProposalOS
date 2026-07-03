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
  canvas: Canvas;
}
