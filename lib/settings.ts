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

/** Fill in any key the stored blob is missing, so callers get a total object. */
export function withSettingDefaults(stored: Record<string, unknown> | null | undefined): UserSettings {
  return { ...DEFAULT_USER_SETTINGS, ...(stored ?? {}) } as UserSettings;
}
