"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { http, toErrorMessage } from "@/lib/utils/http";
import type { TemplateSummary } from "@/lib/engine/types";
import { useLocale } from "@/components/LocaleProvider";

/** Filters templates by their *content* languages — independent of the app UI
 *  language (`useLocale`). A user browsing the admin in French can still filter
 *  for English-content templates, and vice versa. A template listing several
 *  languages shows one "create" link per language (`?lang=` on the form). */
export default function TemplateSelector() {
  const { t } = useLocale();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState<string>("all");

  useEffect(() => {
    http
      .get<TemplateSummary[] | { error?: string }>("/api/templates")
      .then(({ data }) => {
        if (Array.isArray(data)) setTemplates(data);
        else setError(data.error ?? "Failed to load templates");
      })
      .catch((err) => setError(toErrorMessage(err, "Failed to load templates")))
      .finally(() => setLoading(false));
  }, []);

  const availableLangs = useMemo(
    () => Array.from(new Set(templates.flatMap((tpl) => languagesOf(tpl)))).sort(),
    [templates]
  );
  const filtered = useMemo(
    () => (langFilter === "all" ? templates : templates.filter((tpl) => languagesOf(tpl).includes(langFilter))),
    [templates, langFilter]
  );

  if (loading) return <p className="text-[var(--app-muted)]">{t("templates.loading")}</p>;
  if (error) return <p className="text-red-400">{t("templates.error", { message: error })}</p>;
  if (templates.length === 0) return <p className="text-[var(--app-muted)]">{t("templates.empty")}</p>;

  return (
    <div>
      {availableLangs.length > 1 && (
        <div className="mb-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLangFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              langFilter === "all"
                ? "bg-[var(--app-accent)] text-white"
                : "border border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
            }`}
          >
            {t("templates.filter.all")}
          </button>
          {availableLangs.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLangFilter(lang)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium uppercase transition ${
                langFilter === lang
                  ? "bg-[var(--app-accent)] text-white"
                  : "border border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((tpl) => {
          const languages = languagesOf(tpl);
          // With a language filter active, the main link opens the form in it.
          const primaryLang = langFilter !== "all" ? langFilter : languages[0];
          return (
            <div
              key={tpl.id}
              className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6 transition hover:border-[var(--app-accent)] hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">
                  {/* The stretched link makes the whole card clickable without
                      nesting the language links inside another link. */}
                  <Link href={newProposalHref(tpl.id, primaryLang)} className="after:absolute after:inset-0">
                    {tpl.name}
                  </Link>
                </h3>
                <span className="text-xs text-[var(--app-muted)]">v{tpl.version}</span>
              </div>
              {tpl.description && (
                <p className="mt-2 text-sm text-[var(--app-muted)]">{tpl.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-[var(--app-accent)]">{t("templates.cta")}</span>
                {languages.length > 1 &&
                  languages.map((lang) => (
                    <Link
                      key={lang}
                      href={newProposalHref(tpl.id, lang)}
                      title={t("templates.createIn", { lang: lang.toUpperCase() })}
                      className={`relative z-10 rounded-md border px-2 py-0.5 text-xs font-medium uppercase transition ${
                        lang === primaryLang
                          ? "border-[var(--app-accent)] text-[var(--app-accent)]"
                          : "border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
                      }`}
                    >
                      {lang}
                    </Link>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Older API responses may lack `languages`; fall back to the single `lang`. */
function languagesOf(tpl: TemplateSummary): string[] {
  return Array.isArray(tpl.languages) && tpl.languages.length ? tpl.languages : [tpl.lang];
}

function newProposalHref(templateId: string, lang: string): string {
  return `/templates/${encodeURIComponent(templateId)}/new?lang=${encodeURIComponent(lang)}`;
}
