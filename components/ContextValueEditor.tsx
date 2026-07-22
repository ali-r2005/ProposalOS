"use client";

const INPUT_CLS =
  "w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] px-3 py-2 text-sm outline-none focus:border-[var(--app-accent)]";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function labelize(key: string): string {
  return key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Renders one editable value from the proposal's context object, recursing
 * into arrays/objects. Type-driven only (string/number/boolean/array/object) —
 * it never inspects a key name, so it works for any template's context shape.
 */
export function ContextValueEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  if (value === null || value === undefined) {
    return (
      <input
        className={INPUT_CLS}
        defaultValue=""
        placeholder="(empty)"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        {value ? "true" : "false"}
      </label>
    );
  }

  if (typeof value === "number") {
    return (
      <input
        type="number"
        className={INPUT_CLS}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    );
  }

  if (typeof value === "string") {
    const multiline = value.length > 60 || value.includes("\n") || value.includes("<");
    if (multiline) {
      return (
        <textarea
          className={INPUT_CLS}
          rows={Math.min(12, Math.max(3, Math.ceil(value.length / 60)))}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    return <input className={INPUT_CLS} value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-xs text-[var(--app-muted)]">(empty list)</p>;
    }
    return (
      <div className="space-y-3 border-l border-[var(--app-border)] pl-3">
        {value.map((item, index) => (
          <div key={index}>
            <p className="mb-1 text-xs font-medium text-[var(--app-muted)]">#{index + 1}</p>
            <ContextValueEditor
              value={item}
              onChange={(next) => {
                const copy = value.slice();
                copy[index] = next;
                onChange(copy);
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <p className="text-xs text-[var(--app-muted)]">(empty object)</p>;
    }
    return (
      <div className="space-y-3 border-l border-[var(--app-border)] pl-3">
        {entries.map(([key, v]) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
              {labelize(key)}
            </label>
            <ContextValueEditor value={v} onChange={(next) => onChange({ ...value, [key]: next })} />
          </div>
        ))}
      </div>
    );
  }

  // Anything else (function, symbol, ...) shouldn't occur in JSON context data.
  return <p className="text-xs text-[var(--app-muted)]">{String(value)}</p>;
}

/** Top-level: one row (or collapsible section, for arrays/objects) per context key. */
export function ContextEditor({
  context,
  onChange,
}: {
  context: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      {Object.entries(context).map(([key, value]) => {
        const isBranch = Array.isArray(value) || isPlainObject(value);
        if (!isBranch) {
          return (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium">{labelize(key)}</label>
              <ContextValueEditor value={value} onChange={(next) => onChange(key, next)} />
            </div>
          );
        }

        const count = Array.isArray(value) ? value.length : Object.keys(value).length;
        const noun = Array.isArray(value) ? "item" : "field";

        return (
          <details key={key} className="rounded-lg border border-[var(--app-border)] p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              {labelize(key)}{" "}
              <span className="text-xs font-normal text-[var(--app-muted)]">
                ({count} {noun}
                {count === 1 ? "" : "s"})
              </span>
            </summary>
            <div className="mt-3">
              <ContextValueEditor value={value} onChange={(next) => onChange(key, next)} />
            </div>
          </details>
        );
      })}
    </div>
  );
}
