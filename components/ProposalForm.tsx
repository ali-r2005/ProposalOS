"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { http, toErrorMessage } from "@/lib/utils/http";
import type { FormField, FormGroup } from "@/lib/engine/types";

type FormValue = string | number | string[];
type Option = { label: string; value: string };
type OptionsMeta = { total: number; loading: boolean; error?: string };

const PAGE_SIZE = 20;

function FieldInput({
  field,
  value,
  onChange,
  options,
  meta,
  onLoadMore,
}: {
  field: FormField;
  value: FormValue | undefined;
  onChange: (value: FormValue) => void;
  options: Option[];
  meta?: OptionsMeta;
  onLoadMore?: () => void;
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
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "multi-select") {
    const selected = Array.isArray(value) ? value : [];
    const atMax = typeof field.max === "number" && selected.length >= field.max;
    const toggle = (v: string) => {
      if (selected.includes(v)) onChange(selected.filter((s) => s !== v));
      else if (!atMax) onChange([...selected, v]);
    };
    const hasMore = meta ? meta.total > options.length : false;

    return (
      <div className="space-y-2">
        {typeof field.max === "number" && (
          <p className="text-xs text-[var(--app-muted)]">
            Selected {selected.length}/{field.max}
          </p>
        )}
        {options.map((opt) => {
          const checked = selected.includes(opt.value);
          const disabled = !checked && atMax;
          return (
            <label
              key={opt.value}
              className={`flex items-center gap-2 text-sm ${disabled ? "opacity-40" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          );
        })}
        {meta?.loading && <p className="text-xs text-[var(--app-muted)]">Loading options…</p>}
        {meta?.error && <p className="text-xs text-red-400">{meta.error}</p>}
        {!meta?.loading && !meta?.error && options.length === 0 && (
          <p className="text-xs text-[var(--app-muted)]">No options available.</p>
        )}
        {hasMore && !meta?.loading && (
          <button
            type="button"
            onClick={onLoadMore}
            className="text-xs font-medium text-[var(--app-accent)]"
          >
            Load more
          </button>
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

  // Options fetched from providers for fields that declare `optionsFrom`.
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, Option[]>>({});
  const [optionsMeta, setOptionsMeta] = useState<Record<string, OptionsMeta>>({});

  const destination = String(values["destination"] ?? "");

  useEffect(() => {
    if (!templateId) {
      setError("No templateId provided.");
      setLoading(false);
      return;
    }
    http
      .get<{ forms?: FormGroup[]; error?: string }>(
        `/api/templates/${encodeURIComponent(templateId)}/forms`
      )
      .then(({ data }) => {
        if (Array.isArray(data.forms)) setGroups(data.forms);
        else setError(data.error ?? "Failed to load forms");
      })
      .catch((err) => setError(toErrorMessage(err, "Failed to load forms")))
      .finally(() => setLoading(false));
  }, [templateId]);

  const current = groups[step];
  const isLast = step === groups.length - 1;

  // Fetch a page of options for a provider-backed field.
  const loadOptions = useCallback(
    async (field: FormField, offset: number, append: boolean) => {
      const src = field.optionsFrom;
      if (!src) return;
      setOptionsMeta((m) => ({
        ...m,
        [field.key]: { total: m[field.key]?.total ?? 0, loading: true },
      }));
      try {
        const { data } = await http.get<Record<string, unknown>>(
          `/api/templates/${encodeURIComponent(templateId)}/options`,
          { params: { provider: src.provider, destination, limit: PAGE_SIZE, offset } }
        );
        const rows = Array.isArray(data[src.collection]) ? (data[src.collection] as Record<string, unknown>[]) : [];
        const valueKey = src.valueKey ?? "id";
        const labelKey = src.labelKey ?? "name";
        const opts: Option[] = rows.map((r) => ({
          value: String(r[valueKey]),
          label: String(r[labelKey] ?? r[valueKey]),
        }));
        setDynamicOptions((prev) => ({
          ...prev,
          [field.key]: append ? [...(prev[field.key] ?? []), ...opts] : opts,
        }));
        setOptionsMeta((m) => ({
          ...m,
          [field.key]: { total: Number(data.total ?? rows.length), loading: false },
        }));
      } catch (err) {
        setOptionsMeta((m) => ({
          ...m,
          [field.key]: { total: 0, loading: false, error: toErrorMessage(err, "Failed to load options") },
        }));
      }
    },
    [templateId, destination]
  );

  // When the active step (or the destination) changes, (re)load options for any
  // provider-backed field in that step, starting from the first page.
  useEffect(() => {
    if (!current) return;
    for (const field of current.fields) {
      if (field.optionsFrom) loadOptions(field, 0, false);
    }
  }, [step, destination, current, loadOptions]);

  const setValue = (key: string, value: FormValue) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  // Fields in the current step that block navigation (required/min/max).
  const stepIssues = useMemo(() => {
    if (!current) return [] as string[];
    const keys: string[] = [];
    for (const f of current.fields) {
      const v = values[f.key];
      const empty = v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
      const count = Array.isArray(v) ? v.length : 0;
      if (f.required && empty) keys.push(f.key);
      else if (typeof f.min === "number" && !empty && count < f.min) keys.push(f.key);
      if (typeof f.max === "number" && count > f.max) keys.push(f.key);
    }
    return keys;
  }, [current, values]);

  const stepBlocked = stepIssues.length > 0;

  const optionsFor = (field: FormField): Option[] =>
    field.optionsFrom ? dynamicOptions[field.key] ?? [] : field.options ?? [];

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      // Accept any status so we can read the server's error body on 4xx/5xx.
      const { data } = await http.post<{
        success?: boolean;
        proposalId?: string;
        error?: string;
        missing?: string[];
        invalid?: string[];
      }>(
        "/api/generate",
        { templateId, formInput: values },
        { validateStatus: () => true }
      );
      if (!data.success) {
        const details = [...(data.missing ?? []), ...(data.invalid ?? [])];
        setError((data.error ?? "Generation failed") + (details.length ? `: ${details.join(", ")}` : ""));
        return;
      }
      router.push(`/proposal/${data.proposalId}`);
    } catch (err) {
      setError(toErrorMessage(err, "Generation failed"));
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
            <FieldInput
              field={field}
              value={values[field.key]}
              onChange={(v) => setValue(field.key, v)}
              options={optionsFor(field)}
              meta={field.optionsFrom ? optionsMeta[field.key] : undefined}
              onLoadMore={
                field.optionsFrom
                  ? () => loadOptions(field, (dynamicOptions[field.key] ?? []).length, true)
                  : undefined
              }
            />
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
            disabled={generating || stepBlocked}
            onClick={handleGenerate}
            className="rounded-lg bg-[var(--app-accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {generating ? "Generating…" : "Generate proposal"}
          </button>
        ) : (
          <button
            type="button"
            disabled={stepBlocked}
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
