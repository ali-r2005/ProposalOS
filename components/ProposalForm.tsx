"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormField, FormGroup } from "@/lib/engine/types";

type FormValue = string | number | string[];

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: FormValue | undefined;
  onChange: (value: FormValue) => void;
}) {
  const base =
    "w-full rounded-lg border border-[var(--app-border)] bg-[#0f172a] px-3 py-2 text-sm outline-none focus:border-[var(--app-accent)]";

  if (field.type === "textarea") {
    return (
      <textarea
        className={base}
        rows={3}
        placeholder={field.placeholder}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        className={base}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— select —</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "multi-select") {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (v: string) =>
      onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
    return (
      <div className="space-y-2">
        {(field.options ?? []).map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
            />
            {opt.label}
          </label>
        ))}
        {(field.options ?? []).length === 0 && (
          <p className="text-xs text-[var(--app-muted)]">No options provided.</p>
        )}
      </div>
    );
  }

  const inputType =
    field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "number" ? "number" : "text";

  return (
    <input
      type={inputType}
      className={base}
      placeholder={field.placeholder}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
    />
  );
}

export default function ProposalForm() {
  const router = useRouter();
  const params = useSearchParams();
  const templateId = params.get("templateId") ?? "";

  const [groups, setGroups] = useState<FormGroup[]>([]);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, FormValue>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) {
      setError("No templateId provided.");
      setLoading(false);
      return;
    }
    fetch(`/api/templates/${encodeURIComponent(templateId)}/forms`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.forms)) setGroups(data.forms);
        else setError(data.error ?? "Failed to load forms");
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [templateId]);

  const current = groups[step];
  const isLast = step === groups.length - 1;

  const missingInStep = useMemo(() => {
    if (!current) return [];
    return current.fields
      .filter((f) => f.required)
      .filter((f) => {
        const v = values[f.key];
        return v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
      })
      .map((f) => f.key);
  }, [current, values]);

  const setValue = (key: string, value: FormValue) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId, formInput: values }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Generation failed" + (data.missing ? `: ${data.missing.join(", ")}` : ""));
        return;
      }
      router.push(`/proposal/${data.proposalId}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p className="text-[var(--app-muted)]">Loading form…</p>;
  if (error && groups.length === 0) return <p className="text-red-400">Error: {error}</p>;
  if (!current) return <p className="text-[var(--app-muted)]">This template has no forms.</p>;

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {groups.map((g, i) => (
          <div key={g.id} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i === step
                  ? "bg-[var(--app-accent)] text-white"
                  : i < step
                    ? "bg-[var(--app-accent)]/40 text-white"
                    : "bg-[var(--app-border)] text-[var(--app-muted)]"
              }`}
            >
              {i + 1}
            </div>
            {i < groups.length - 1 && <div className="h-px w-6 bg-[var(--app-border)]" />}
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-semibold">{current.title}</h2>
      {current.description && (
        <p className="mt-1 text-sm text-[var(--app-muted)]">{current.description}</p>
      )}

      <div className="mt-6 space-y-5">
        {current.fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-sm font-medium">
              {field.label}
              {field.required && <span className="ml-1 text-red-400">*</span>}
            </label>
            <FieldInput field={field} value={values[field.key]} onChange={(v) => setValue(field.key, v)} />
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm disabled:opacity-40"
        >
          Back
        </button>

        {isLast ? (
          <button
            type="button"
            disabled={generating || missingInStep.length > 0}
            onClick={handleGenerate}
            className="rounded-lg bg-[var(--app-accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {generating ? "Generating…" : "Generate proposal"}
          </button>
        ) : (
          <button
            type="button"
            disabled={missingInStep.length > 0}
            onClick={() => setStep((s) => s + 1)}
            className="rounded-lg bg-[var(--app-accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
