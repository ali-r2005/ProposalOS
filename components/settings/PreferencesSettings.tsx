'use client';

import { useLocale } from '@/components/LocaleProvider';
import { useTheme } from '@/components/ThemeProvider';
import { useUserSettings } from '@/components/useUserSettings';
import { LOCALES, type Locale } from '@/lib/i18n/t';
import { AUTOSAVE_INTERVALS, type UserSettings } from '@/lib/settings';
import { toErrorMessage } from '@/lib/utils/http';
import { Field, NoticeText, SettingsCard, inputClass, useNotice } from './ui';

export default function PreferencesSettings() {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const { settings, loading, update } = useUserSettings();
  const [notice, setNotice] = useNotice();

  async function save(patch: Partial<UserSettings>) {
    setNotice(null);
    try {
      await update(patch);
      setNotice({ type: 'success', text: t('settings.editor.saved') });
    } catch (error) {
      setNotice({ type: 'error', text: toErrorMessage(error, t('settings.editor.failed')) });
    }
  }

  const themes = [
    { value: 'light', label: t('settings.appearance.light') },
    { value: 'dark', label: t('settings.appearance.dark') },
  ] as const;

  return (
    <div className="space-y-6">
      <SettingsCard title={t('settings.appearance.title')} description={t('settings.appearance.hint')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.appearance.language')} htmlFor="pref-language">
            <select id="pref-language" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}
              className={inputClass}>
              {LOCALES.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label={t('settings.appearance.theme')}>
            <div role="radiogroup" className="flex rounded-lg border border-[var(--app-border)] p-1">
              {themes.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === option.value}
                  onClick={() => setTheme(option.value)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm transition ${
                    theme === option.value
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'text-[var(--app-text)] hover:bg-[var(--app-panel)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </SettingsCard>

      <SettingsCard title={t('settings.editor.title')} action={<NoticeText notice={notice} />}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autosaveEnabled}
            disabled={loading}
            onChange={(e) => save({ autosaveEnabled: e.target.checked })}
            className="mt-1 h-4 w-4 accent-[var(--app-accent)] disabled:opacity-50"
          />
          <span>
            <span className="block text-sm font-medium text-[var(--app-text)]">{t('settings.editor.autosave')}</span>
            <span className="block text-sm text-[var(--app-muted)]">{t('settings.editor.autosaveHint')}</span>
          </span>
        </label>

        {settings.autosaveEnabled && (
          <div className="mt-4 pl-7 sm:max-w-xs">
            <Field label={t('settings.editor.intervalLabel')} hint={t('settings.editor.intervalHint')} htmlFor="autosave-interval">
              <select
                id="autosave-interval"
                value={settings.autosaveIntervalMs}
                disabled={loading}
                onChange={(e) => save({ autosaveIntervalMs: Number(e.target.value) })}
                className={inputClass}
              >
                {AUTOSAVE_INTERVALS.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
