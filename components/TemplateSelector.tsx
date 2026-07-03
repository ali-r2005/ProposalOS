"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TemplateSummary } from "@/lib/engine/types";

export default function TemplateSelector() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
        else setError(data.error ?? "Failed to load templates");
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[var(--app-muted)]">Loading templates…</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (templates.length === 0) return <p className="text-[var(--app-muted)]">No templates found.</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {templates.map((t) => (
        <Link
          key={t.id}
          href={`/proposal/new?templateId=${encodeURIComponent(t.id)}`}
          className="block rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6 transition hover:border-[var(--app-accent)] hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t.name}</h3>
            <span className="text-xs text-[var(--app-muted)]">v{t.version}</span>
          </div>
          {t.description && (
            <p className="mt-2 text-sm text-[var(--app-muted)]">{t.description}</p>
          )}
          <span className="mt-4 inline-block text-sm font-medium text-[var(--app-accent)]">
            Create proposal →
          </span>
        </Link>
      ))}
    </div>
  );
}
