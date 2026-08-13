'use client';

import { useLocale } from './LocaleProvider';
import { LOCALES, type Locale } from '@/lib/i18n/t';

export default function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Language"
      className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-2 text-sm font-medium text-[var(--app-text)] transition hover:border-[var(--app-accent)]"
    >
      {LOCALES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}
