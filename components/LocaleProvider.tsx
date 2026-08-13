'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_LOCALE, LOCALES, t as translate, type Locale, type MessageKey } from '@/lib/i18n/t';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const STORAGE_KEY = 'locale';

const LOCALE_CODES = LOCALES.map((l) => l.code);

// Runs before hydration so the correct locale is already on <html> at first paint.
export const localeInitScript = `(function(){try{var l=localStorage.getItem('${STORAGE_KEY}');if(!l||${JSON.stringify(LOCALE_CODES)}.indexOf(l)===-1){l='${DEFAULT_LOCALE}';}document.documentElement.setAttribute('lang',l);}catch(e){}})();`;

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const current = document.documentElement.getAttribute('lang') as Locale | null;
    if (current && LOCALE_CODES.includes(current)) {
      setLocaleState(current);
    }
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    document.documentElement.setAttribute('lang', next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t: (key, vars) => translate(locale, key, vars) }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
