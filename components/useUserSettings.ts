"use client";

import { useCallback, useEffect, useState } from "react";
import { http } from "@/lib/utils/http";
import { DEFAULT_USER_SETTINGS, withSettingDefaults } from "@/lib/settings";
import type { UserSettings } from "@/lib/settings";

/**
 * Loads the current user's preferences and exposes a partial updater.
 *
 * Reads fall back to defaults on any failure — a preference lookup must never
 * be the reason a page fails to render.
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    http
      .get<{ settings?: Record<string, unknown> }>("/api/admin/settings")
      .then(({ data }) => {
        if (active) setSettings(withSettingDefaults(data.settings));
      })
      .catch(() => {
        // Not signed in, or the request failed — defaults already applied.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<UserSettings>) => {
    // Optimistic: the toggle should feel instant, and the server merges keys.
    setSettings((prev) => ({ ...prev, ...patch }));
    const { data } = await http.put<{ settings?: Record<string, unknown> }>(
      "/api/admin/settings",
      { settings: patch }
    );
    if (data.settings) setSettings(withSettingDefaults(data.settings));
  }, []);

  return { settings, loading, update };
}
