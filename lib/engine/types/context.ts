/** The merged data bag passed to components. Deliberately untyped —
 *  the engine never inspects business-specific keys. */
export type BusinessContext = Record<string, unknown>;

/** A single field in a generated form. */
export interface FormField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

/** A group of fields — one wizard step. */
export interface FormGroup {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

/** One rendered slide of the final presentation. */
export interface RenderedSlide {
  sectionId: string;
  component: string;
  html: string;
}
