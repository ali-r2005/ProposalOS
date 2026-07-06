import type { FormGroup } from "@/lib/engine/types";

export interface ValidationResult {
  valid: boolean;
  /** Required fields left empty (or below `min` selections). */
  missing: string[];
  /** Fields that violate a constraint, e.g. more than `max` selections. */
  invalid: string[];
}

/**
 * Validate submitted form input against declared field constraints across all
 * groups. Purely structural — no domain knowledge. Enforces `required`, and the
 * `min`/`max` selection counts for multi-select fields.
 */
export function validateFormInput(
  groups: FormGroup[],
  input: Record<string, unknown>
): ValidationResult {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const group of groups) {
    for (const field of group.fields) {
      const value = input[field.key];
      const count = Array.isArray(value) ? value.length : 0;

      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);

      if (field.required && empty) missing.push(field.key);
      // `min` applies once the user has engaged the field (or it's required).
      if (typeof field.min === "number" && !empty && count < field.min) {
        missing.push(field.key);
      }
      if (typeof field.max === "number" && count > field.max) {
        invalid.push(field.key);
      }
    }
  }

  return { valid: missing.length === 0 && invalid.length === 0, missing, invalid };
}
