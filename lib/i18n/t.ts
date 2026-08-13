import { messages, DEFAULT_LOCALE, type Locale, type MessageKey } from "./messages";

export { LOCALES, DEFAULT_LOCALE, type Locale, type MessageKey } from "./messages";

/** Looks up `key` in `locale`'s dictionary and substitutes any `{name}` placeholders. */
export function t(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = messages[locale]?.[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}
