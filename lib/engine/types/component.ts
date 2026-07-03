/** Parsed `schema.json` sitting next to a component's HTML. */
export interface ComponentSchema {
  id?: string;
  name?: string;
  description?: string;
  requiredProps?: Record<string, unknown>;
}

/** A component's HTML template plus its optional schema. */
export interface LoadedComponent {
  id: string;
  html: string;
  schema?: ComponentSchema;
}
