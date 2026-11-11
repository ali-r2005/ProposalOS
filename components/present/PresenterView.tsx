"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import SlideStage from "@/components/present/SlideStage";
import { useProposalSlides } from "@/components/present/useProposalSlides";
import { usePresentSync } from "@/components/present/usePresentSync";
import { useProposalName } from "@/components/useProposalName";
import { useLocale } from "@/components/LocaleProvider";
import { Captioned, KEYS, KeyList, ShortcutsPanel } from "@/components/present/Shortcuts";
import { http } from "@/lib/utils/http";
import { isTypingTarget, navigationDelta } from "@/lib/present/slides";

const NOTE_SAVE_DELAY_MS = 700;

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Window Management API (Chromium): lets us open the audience window on the
 *  other screen. Not in TypeScript's DOM types yet. */
interface ScreenDetailed {
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  isPrimary: boolean;
}
interface ScreenDetails {
  screens: ScreenDetailed[];
  currentScreen: ScreenDetailed;
}
type WindowWithScreens = Window & { getScreenDetails?: () => Promise<ScreenDetails> };

/** Window features that put the audience window on a screen other than this one. */
async function secondScreenFeatures(): Promise<string> {
  const win = window as WindowWithScreens;
  const extended = (window.screen as Screen & { isExtended?: boolean }).isExtended;
  if (typeof win.getScreenDetails !== "function" || !extended) return "popup";
  try {
    const details = await win.getScreenDetails();
    const other = details.screens.find((s) => s !== details.currentScreen);
    if (!other) return "popup";
    return `popup,left=${other.availLeft},top=${other.availTop},width=${other.availWidth},height=${other.availHeight}`;
  } catch {
    return "popup"; // Permission refused: open it here; the user can drag it over.
  }
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Elapsed presentation time with pause/resume/reset. */
function useTimer() {
  const [startedAt, setStartedAt] = useState<number | null>(() => Date.now());
  const [banked, setBanked] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const running = startedAt !== null;
  const elapsed = banked + (startedAt !== null ? now - startedAt : 0);
  const toggle = () => {
    if (startedAt !== null) {
      setBanked((b) => b + Date.now() - startedAt);
      setStartedAt(null);
    } else {
      setStartedAt(Date.now());
    }
  };
  const reset = () => {
    setBanked(0);
    setStartedAt(running ? Date.now() : null);
  };
  return { elapsed, running, now, toggle, reset };
}

/** Speaker notes for a proposal: loaded once, saved per slide as you type. */
function useSpeakerNotes(proposalId: string) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loadFailed, setLoadFailed] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timers = useRef(new Map<string, number>());
  const pending = useRef(new Map<string, string>());

  useEffect(() => {
    http
      .get<{ notes?: Record<string, string> }>(`/api/proposals/${encodeURIComponent(proposalId)}/notes`)
      .then(({ data }) => setNotes(data.notes ?? {}))
      .catch(() => setLoadFailed(true));
  }, [proposalId]);

  const save = useCallback(
    async (key: string) => {
      const text = pending.current.get(key);
      if (text === undefined) return;
      pending.current.delete(key);
      setStatus("saving");
      try {
        await http.patch(`/api/proposals/${encodeURIComponent(proposalId)}/notes`, { key, text });
        setStatus(pending.current.size ? "saving" : "saved");
      } catch {
        setStatus("error");
      }
    },
    [proposalId]
  );

  const change = useCallback(
    (key: string, text: string) => {
      setNotes((n) => ({ ...n, [key]: text }));
      pending.current.set(key, text);
      setStatus("saving");
      window.clearTimeout(timers.current.get(key));
      timers.current.set(key, window.setTimeout(() => void save(key), NOTE_SAVE_DELAY_MS));
    },
    [save]
  );

  /** Save everything typed but not yet sent (on slide change or leaving). */
  const flush = useCallback(() => {
    for (const [key, timer] of timers.current) {
      window.clearTimeout(timer);
      void save(key);
    }
    timers.current.clear();
  }, [save]);

  useEffect(() => flush, [flush]);

  return { notes, loadFailed, status, change, flush };
}

/** How long a typed slide number waits for Enter. */
const GOTO_TIMEOUT_MS = 2000;

/**
 * The presenter's private dashboard: current slide, next slide, speaker notes,
 * timer and navigation. The audience sees only the slide, in its own window
 * (/proposal/[id]/present/audience), kept in sync by usePresentSync. Every
 * control has a caption with its shortcut and what it does; "?" lists them all.
 */
export default function PresenterView({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const proposalName = useProposalName(proposalId);
  const { html, slides, error } = useProposalSlides(proposalId);
  const sync = usePresentSync(proposalId, "presenter", slides.length);
  const { index, blackout, go, goTo, setBlackout } = sync;
  const timer = useTimer();
  const speaker = useSpeakerNotes(proposalId);
  const audienceRef = useRef<Window | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Slide number being typed for "number + Enter".
  const [gotoDigits, setGotoDigits] = useState("");
  const gotoRef = useRef({ digits: "", timer: 0 });

  // Set after load so it wins over the root layout's static <title>.
  useEffect(() => {
    document.title = `${t("present.title")} · ${proposalName}`;
  }, [proposalName, t]);

  const current = slides[index];
  const next = slides[index + 1];
  const audienceUrl = `/proposal/${encodeURIComponent(proposalId)}/present/audience`;
  const windowName = `proposalos-audience-${proposalId}`;

  const openAudience = useCallback(async () => {
    setPopupBlocked(false);
    if (audienceRef.current && !audienceRef.current.closed) {
      audienceRef.current.focus();
      return;
    }
    const features = await secondScreenFeatures();
    const win = window.open(audienceUrl, windowName, features);
    if (!win) {
      setPopupBlocked(true);
      return;
    }
    audienceRef.current = win;
  }, [audienceUrl, windowName]);

  const endPresentation = useCallback(() => {
    speaker.flush();
    sync.end();
    audienceRef.current?.close();
    router.push(`/proposal/${encodeURIComponent(proposalId)}`);
  }, [speaker, sync, router, proposalId]);

  // Save the note being typed before moving to another slide.
  const { flush } = speaker;
  useEffect(() => {
    flush();
  }, [index, flush]);


  const { toggle: toggleTimer } = timer;
  useEffect(() => {
    const clearDigits = () => {
      window.clearTimeout(gotoRef.current.timer);
      gotoRef.current.digits = "";
      setGotoDigits("");
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) {
        if (event.key === "Escape") (event.target as HTMLElement).blur();
        return;
      }
      if (showShortcuts) return; // the panel handles its own keys (Esc)
      if (event.key === "?") {
        event.preventDefault();
        setShowShortcuts(true);
        return;
      }
      // "number + Enter" jumps to that slide.
      if (/^[0-9]$/.test(event.key)) {
        window.clearTimeout(gotoRef.current.timer);
        gotoRef.current.digits = (gotoRef.current.digits + event.key).slice(-4);
        setGotoDigits(gotoRef.current.digits);
        gotoRef.current.timer = window.setTimeout(clearDigits, GOTO_TIMEOUT_MS);
        return;
      }
      if (event.key === "Enter" && gotoRef.current.digits) {
        event.preventDefault();
        goTo(Number(gotoRef.current.digits) - 1);
        clearDigits();
        return;
      }
      if (event.key === "b" || event.key === "B" || event.key === ".") {
        setBlackout(!blackout);
        return;
      }
      if (event.key === "t" || event.key === "T") {
        toggleTimer();
        return;
      }
      const delta = navigationDelta(event);
      if (delta === null) return;
      event.preventDefault();
      clearDigits();
      go(delta);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(gotoRef.current.timer);
    };
  }, [go, goTo, blackout, setBlackout, toggleTimer, showShortcuts]);

  if (error) {
    return (
      <main className="flex h-screen items-center justify-center p-8 text-center">
        <div>
          <p className="text-red-400">{t("present.loadFailed")}</p>
          <Link href={`/proposal/${proposalId}`} className="mt-4 inline-block text-sm text-[var(--app-accent)]">
            {t("present.back")}
          </Link>
        </div>
      </main>
    );
  }

  const noteValue = current ? speaker.notes[current.key] ?? "" : "";
  const noteStatus: Record<SaveStatus, string> = {
    idle: t("present.notes.private"),
    saving: t("present.notes.saving"),
    saved: t("present.notes.saved"),
    error: t("present.notes.error"),
  };
  const button =
    "rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--app-accent)] disabled:opacity-40 disabled:hover:border-[var(--app-border)]";

  return (
    <div className="flex h-screen flex-col bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-[var(--app-border)] bg-[var(--app-panel)] px-5 py-2.5">
        <div className="min-w-0 self-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{t("present.title")}</p>
          <h1 className="truncate text-sm font-semibold">{proposalName}</h1>
        </div>

        <div className="flex items-start gap-5">
          <Captioned keys={KEYS.timer} hint={t("present.timer.hint")}>
            <p className="font-mono text-2xl font-semibold leading-none tabular-nums" aria-label={t("present.timer.label")}>
              {formatElapsed(timer.elapsed)}
            </p>
            <div className="flex justify-center gap-2 text-[11px] text-[var(--app-muted)]">
              <button type="button" onClick={timer.toggle} className="hover:text-[var(--app-text)]">
                {timer.running ? t("present.timer.pause") : t("present.timer.resume")}
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={timer.reset} className="hover:text-[var(--app-text)]">
                {t("present.timer.reset")}
              </button>
            </div>
          </Captioned>
          <p className="pt-1 font-mono text-sm tabular-nums text-[var(--app-muted)]" aria-label={t("present.clock")}>
            {new Date(timer.now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <Captioned hint={t("present.audience.hint")}>
            <button
              type="button"
              onClick={() => void openAudience()}
              className="rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              {sync.audienceOpen ? t("present.audience.showButton") : t("present.audience.openButton")}
            </button>
            <span className={`flex items-center gap-1.5 text-[10px] ${sync.audienceOpen ? "text-[var(--app-text)]" : "text-[var(--app-muted)]"}`}>
              <span
                className={`h-2 w-2 rounded-full ${sync.audienceOpen ? "bg-[var(--app-accent)]" : "bg-[var(--app-border)]"}`}
                aria-hidden="true"
              />
              {sync.audienceOpen ? t("present.audience.open") : t("present.audience.none")}
            </span>
          </Captioned>
          <Captioned keys={KEYS.blackout} hint={t("present.blackout.hint")}>
            <button type="button" onClick={() => setBlackout(!blackout)} aria-pressed={blackout} className={button}>
              {blackout ? t("present.blackout.off") : t("present.blackout.on")}
            </button>
          </Captioned>
          <Captioned keys={KEYS.help} hint={t("present.shortcuts.hint")}>
            <button type="button" onClick={() => setShowShortcuts(true)} className={button}>
              {t("present.shortcuts.button")}
            </button>
          </Captioned>
          <Captioned hint={t("present.end.hint")}>
            <button type="button" onClick={endPresentation} className={button}>
              {t("present.end")}
            </button>
          </Captioned>
        </div>
      </header>

      {popupBlocked && (
        <p className="border-b border-[var(--app-border)] bg-[var(--app-panel)] px-5 py-2 text-xs text-red-400">
          {t("present.audience.blocked")}
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <section className="flex min-h-0 flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-[var(--app-muted)]">
            <span>
              {t("present.current")}
              {current ? ` · ${current.sectionId}` : ""}
              {blackout && <span className="ml-2 font-semibold text-[var(--app-text)]">{t("present.blackout.active")}</span>}
            </span>
            <span className="tabular-nums">
              {slides.length ? t("present.slideCount", { current: index + 1, total: slides.length }) : ""}
            </span>
          </div>
          {html && slides.length > 0 ? (
            <button
              type="button"
              onClick={() => go(1)}
              title={t("present.next.hint")}
              className="relative min-h-[200px] flex-1 overflow-hidden rounded-lg border border-[var(--app-border)]"
            >
              <SlideStage html={html} index={index} title={t("present.current")} className="absolute inset-0" />
              {blackout && <div className="absolute inset-0 bg-[var(--present-stage)] opacity-70" aria-hidden="true" />}
            </button>
          ) : (
            <p className="flex flex-1 items-center justify-center rounded-lg border border-[var(--app-border)] text-sm text-[var(--app-muted)]">
              {html ? t("present.noSlides") : t("present.loading")}
            </p>
          )}
        </section>

        <aside className="flex min-h-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--app-muted)]">
              {t("present.next")}
              {next ? ` · ${next.sectionId}` : ""}
            </p>
            {html && next ? (
              <button
                type="button"
                onClick={() => go(1)}
                title={t("present.next.hint")}
                className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--app-border)]"
              >
                <SlideStage html={html} index={index + 1} title={t("present.next")} className="absolute inset-0" />
              </button>
            ) : (
              <p className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-[var(--app-border)] text-sm text-[var(--app-muted)]">
                {slides.length ? t("present.endOfDeck") : ""}
              </p>
            )}
          </div>

          <div className="flex min-h-[160px] flex-1 flex-col gap-2">
            <label htmlFor="speaker-notes" className="text-xs text-[var(--app-muted)]">
              {t("present.notes.label")}
            </label>
            <textarea
              id="speaker-notes"
              value={noteValue}
              disabled={!current || speaker.loadFailed}
              onChange={(event) => current && speaker.change(current.key, event.target.value)}
              placeholder={t("present.notes.placeholder")}
              className="min-h-0 flex-1 resize-none rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] p-3 text-base leading-relaxed outline-none focus:border-[var(--app-accent)]"
            />
            <p
              className={`text-[11px] ${speaker.status === "error" || speaker.loadFailed ? "text-red-400" : "text-[var(--app-muted)]"}`}
            >
              {speaker.loadFailed ? t("present.notes.loadFailed") : noteStatus[speaker.status]}
            </p>
            <p className="flex flex-wrap items-center gap-1 text-[10px] text-[var(--app-muted)]">
              <KeyList keys={KEYS.esc} />
              <span>{t("present.notes.escHint")}</span>
            </p>
          </div>
        </aside>
      </div>

      <footer className="flex flex-wrap items-start gap-4 border-t border-[var(--app-border)] bg-[var(--app-panel)] px-5 py-2.5">
        <Captioned keys={KEYS.prev} hint={t("present.prev.hint")}>
          <button type="button" onClick={() => go(-1)} disabled={index === 0} className={button}>
            {t("present.prev.button")}
          </button>
        </Captioned>
        <Captioned keys={KEYS.next} hint={t("present.next.hint")}>
          <button type="button" onClick={() => go(1)} disabled={index >= slides.length - 1} className={button}>
            {t("present.next.button")}
          </button>
        </Captioned>
        <Captioned
          keys={KEYS.goto}
          sequence
          hint={gotoDigits ? t("present.goto.typing", { number: gotoDigits }) : t("present.goto.hint")}
        >
          <select
            aria-label={t("present.goto.label")}
            value={index}
            onChange={(event) => goTo(Number(event.target.value))}
            className="max-w-[16rem] rounded-lg border border-[var(--app-border)] bg-[var(--app-panel)] px-2 py-1.5 text-xs"
          >
            {slides.map((slide, i) => (
              <option key={slide.key} value={i}>
                {i + 1}. {slide.sectionId}
              </option>
            ))}
          </select>
        </Captioned>
      </footer>

      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
