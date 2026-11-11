"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n/t";

/** Key names: either a symbol shown as-is ("→", "B") or a translated name. */
export type KeyName = string | { label: MessageKey };

/** One keyboard key, drawn as a key cap. */
export function Kbd({ name }: { name: KeyName }) {
  const { t } = useLocale();
  return (
    <kbd className="inline-flex min-w-[1.4em] whitespace-nowrap items-center justify-center rounded border border-[var(--app-border)] bg-[var(--app-bg)] px-1 font-sans text-[10px] font-medium leading-[1.5] text-[var(--app-text)] shadow-[0_1px_0_var(--app-border)]">
      {typeof name === "string" ? name : t(name.label)}
    </kbd>
  );
}

/** Alternative keys for one action ("→ / Space"), or with `sequence` keys
 *  pressed one after the other ("number + Enter"). */
export function KeyList({ keys, sequence = false }: { keys: KeyName[]; sequence?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5">
      {keys.map((key, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {i > 0 && <span className="text-[var(--app-muted)]">{sequence ? "+" : "/"}</span>}
          <Kbd name={key} />
        </span>
      ))}
    </span>
  );
}

/**
 * A control with a caption under it: the keys that do the same thing (if any)
 * and a short description of what it does.
 */
export function Captioned({
  children,
  keys,
  sequence = false,
  hint,
  align = "center",
}: {
  children: React.ReactNode;
  keys?: KeyName[];
  sequence?: boolean;
  hint: string;
  align?: "start" | "center";
}) {
  return (
    <div className={`flex flex-col gap-1 ${align === "center" ? "items-center text-center" : "items-start"}`}>
      {children}
      <p className="flex max-w-[13rem] flex-wrap items-center justify-center gap-1 text-[10px] leading-tight text-[var(--app-muted)]">
        {keys && keys.length > 0 && <KeyList keys={keys} sequence={sequence} />}
        <span>{hint}</span>
      </p>
    </div>
  );
}

/** Shortcut keys, shared by the captions and the shortcuts list. */
export const KEYS = {
  next: ["→", { label: "present.kbd.space" }, { label: "present.kbd.pageDown" }],
  prev: ["←", { label: "present.kbd.pageUp" }],
  firstLast: [{ label: "present.kbd.home" }, { label: "present.kbd.end" }],
  goto: [{ label: "present.kbd.number" }, { label: "present.kbd.enter" }],
  blackout: ["B"],
  timer: ["T"],
  help: ["?"],
  fullscreen: ["F"],
  esc: [{ label: "present.kbd.esc" }],
  click: [{ label: "present.kbd.click" }],
  rightClick: [{ label: "present.kbd.rightClick" }],
} satisfies Record<string, KeyName[]>;

interface Row {
  keys: KeyName[];
  action: MessageKey;
  /** The number-then-Enter shortcut reads "number + Enter", not "number / Enter". */
  sequence?: boolean;
  alsoAudience?: boolean;
}

const PRESENTER_ROWS: Row[] = [
  { keys: KEYS.next, action: "present.action.next", alsoAudience: true },
  { keys: KEYS.prev, action: "present.action.prev", alsoAudience: true },
  { keys: KEYS.firstLast, action: "present.action.firstLast", alsoAudience: true },
  { keys: KEYS.goto, action: "present.action.goto", sequence: true },
  { keys: KEYS.blackout, action: "present.action.blackout", alsoAudience: true },
  { keys: KEYS.timer, action: "present.action.timer" },
  { keys: KEYS.help, action: "present.action.help" },
];

const AUDIENCE_ROWS: Row[] = [
  { keys: KEYS.fullscreen, action: "present.action.fullscreen" },
  { keys: KEYS.esc, action: "present.action.exitFullscreen" },
  { keys: KEYS.click, action: "present.action.next" },
  { keys: KEYS.rightClick, action: "present.action.prev" },
];

function ShortcutTable({ title, rows }: { title: string; rows: Row[] }) {
  const { t } = useLocale();
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.action + row.keys.length} className="border-t border-[var(--app-border)]">
              <td className="py-2 pr-4 align-top">
                <KeyList keys={row.keys} sequence={row.sequence} />
              </td>
              <td className="py-2">
                {t(row.action)}
                {row.alsoAudience && (
                  <span className="block text-[11px] text-[var(--app-muted)]">{t("present.shortcuts.both")}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Every shortcut, explained. Opened with "?" or the toolbar button. */
export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "?") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--present-stage)_60%,transparent)] p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-[var(--app-text)] shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-lg font-semibold">
            {t("present.shortcuts.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1 text-xs hover:border-[var(--app-accent)]"
          >
            {t("present.shortcuts.close")}
          </button>
        </div>
        <p className="mb-5 text-sm text-[var(--app-muted)]">{t("present.shortcuts.intro")}</p>
        <div className="grid gap-6 md:grid-cols-2">
          <ShortcutTable title={t("present.shortcuts.presenter")} rows={PRESENTER_ROWS} />
          <ShortcutTable title={t("present.shortcuts.audience")} rows={AUDIENCE_ROWS} />
        </div>
      </div>
    </div>
  );
}
