import type { FormGroup } from "@/lib/engine/types";

export interface ValidationResult {
  valid: boolean;
  missing: string[];
}

/**
 * Validate submitted form input against required fields across all groups.
 * Purely structural — no domain knowledge.
 */
export function validateFormInput(
  groups: FormGroup[],
  input: Record<string, unknown>
): ValidationResult {
  const missing: string[] = [];

  for (const group of groups) {
    for (const field of group.fields) {
      if (!field.required) continue;
      const value = input[field.key];
      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (empty) missing.push(field.key);
    }
  }

  return { valid: missing.length === 0, missing };
}
