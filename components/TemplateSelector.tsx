"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { http, toErrorMessage } from "@/lib/utils/http";
import type { TemplateSummary } from "@/lib/engine/types";
import { useLocale } from "@/components/LocaleProvider";

/** Filters templates by their *content* language — independent of the app UI
 *  language (`useLocale`). A user browsing the admin in French can still filter
 *  for English-content templates, and vice versa. */
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
    () => Array.from(new Set(templates.map((tpl) => tpl.lang))).sort(),
    [templates]
  );
  const filtered = useMemo(
    () => (langFilter === "all" ? templates : templates.filter((tpl) => tpl.lang === langFilter)),
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
        {filtered.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/templates/${encodeURIComponent(tpl.id)}/new`}
            className="block rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6 transition hover:border-[var(--app-accent)] hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{tpl.name}</h3>
              <span className="text-xs text-[var(--app-muted)]">v{tpl.version}</span>
            </div>
            {tpl.description && (
              <p className="mt-2 text-sm text-[var(--app-muted)]">{tpl.description}</p>
            )}
            <span className="mt-4 inline-block text-sm font-medium text-[var(--app-accent)]">
              {t("templates.cta")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
