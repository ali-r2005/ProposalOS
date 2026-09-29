/**
 * User-preference keys and their defaults.
 *
 * The API route (app/api/admin/settings/route.ts) treats the settings object
 * as opaque; this module is where a feature declares the key it owns and what
 * it falls back to when the user has never set it.
 */
export interface UserSettings {
  /** Autosave in the visual editor (see components/ProposalDesignEditor.tsx). */
  autosaveEnabled: boolean;
  /** Idle delay before an autosave fires, in milliseconds. */
  autosaveIntervalMs: number;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  // Off by default: autosave overwrites the stored proposal without asking,
  // so it's opt-in rather than something that surprises an existing user.
  autosaveEnabled: false,
  autosaveIntervalMs: 5000,
};

/**
 * Selectable autosave delays. Single source of truth for both the dropdown and
 * the server-side check, so the two can't drift apart. `labelKey` points at an
 * i18n message rather than literal text — the settings page is translated.
 */
export const AUTOSAVE_INTERVALS = [
  { value: 5000, labelKey: "settings.editor.interval.5s" },
  { value: 10000, labelKey: "settings.editor.interval.10s" },
  { value: 30000, labelKey: "settings.editor.interval.30s" },
  { value: 60000, labelKey: "settings.editor.interval.60s" },
] as const;

export function isValidAutosaveInterval(value: unknown): value is number {
  return AUTOSAVE_INTERVALS.some((option) => option.value === value);
}

/** Fill in any key the stored blob is missing, so callers get a total object. */
export function withSettingDefaults(stored: Record<string, unknown> | null | undefined): UserSettings {
  const merged = { ...DEFAULT_USER_SETTINGS, ...(stored ?? {}) } as UserSettings;
  // A value written by an older build (or a removed option) would otherwise
  // leave the <select> with nothing matching — fall back to the default.
  if (!isValidAutosaveInterval(merged.autosaveIntervalMs)) {
    merged.autosaveIntervalMs = DEFAULT_USER_SETTINGS.autosaveIntervalMs;
  }
  return merged;
}
