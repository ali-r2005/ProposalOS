/** The merged data bag passed to components. Deliberately untyped —
 *  the engine never inspects business-specific keys. */
export type BusinessContext = Record<string, unknown>;

/** Where a field's selectable options are loaded from at runtime. */
export interface FieldOptionsSource {
  /** Template provider to run for the option catalog. */
  provider: string;
  /** Key in the provider's returned object holding the option array. */
  collection: string;
  /** Property on each record used as the option value. Defaults to "id". */
  valueKey?: string;
  /** Property on each record used as the option label. Defaults to "name". */
  labelKey?: string;
}

/** A single field in a generated form. */
export interface FormField {
  key: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  /** For `type: "file"` — the accepted file types (e.g. ".json,application/json"). */
  accept?: string;
  options?: Array<{ label: string; value: string }>;
  /** Minimum number of selections (multi-select). */
  min?: number;
  /** Maximum number of selections (multi-select). */
  max?: number;
  /** When set, options are fetched from a provider instead of `options`. */
  optionsFrom?: FieldOptionsSource;
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
