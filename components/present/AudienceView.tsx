"use client";

import { useEffect, useState } from "react";
import SlideStage from "@/components/present/SlideStage";
import { useProposalSlides } from "@/components/present/useProposalSlides";
import { usePresentSync } from "@/components/present/usePresentSync";
import { useLocale } from "@/components/LocaleProvider";
import { navigationDelta } from "@/lib/present/slides";

const CURSOR_IDLE_MS = 2500;
const HINT_MS = 6000;

/**
 * The audience screen: the current slide, full screen, nothing else — no
 * notes, controls or presenter information. It follows the presenter window,
 * and its own keys/clicks (a clicker, the room's mouse) navigate both.
 */
export default function AudienceView({ proposalId }: { proposalId: string }) {
  const { t } = useLocale();
  const { html, slides, error } = useProposalSlides(proposalId);
  const { index, blackout, synced, ended, go, setBlackout } = usePresentSync(proposalId, "audience", slides.length);
  const [fullscreen, setFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [cursorIdle, setCursorIdle] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    const hint = window.setTimeout(() => setShowHint(false), HINT_MS);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.clearTimeout(hint);
    };
  }, []);


  // The presenter ended the presentation: close this window (it was opened by
  // script, so the browser allows it); otherwise the "ended" screen shows.
  useEffect(() => {
    if (ended) window.close();
  }, [ended]);

  // Hide the cursor while it isn't moving, so it never sits on a slide.
  useEffect(() => {
    let timer = window.setTimeout(() => setCursorIdle(true), CURSOR_IDLE_MS);
    const onMove = () => {
      setCursorIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setCursorIdle(true), CURSOR_IDLE_MS);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "f" || event.key === "F") {
        void toggleFullscreen();
        return;
      }
      if (event.key === "b" || event.key === "B" || event.key === ".") {
        setBlackout(!blackout);
        return;
      }
      const delta = navigationDelta(event);
      if (delta === null) return;
      event.preventDefault();
      if (blackout) setBlackout(false);
      else go(delta);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, blackout, setBlackout]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Refused (e.g. no user gesture) — the hint stays available.
    }
  }

  // First click goes full screen; after that a click moves to the next slide.
  function onClick() {
    if (!fullscreen) void toggleFullscreen();
    else if (blackout) setBlackout(false);
    else go(1);
  }

  const message = ended
    ? t("present.audienceView.ended")
    : error
      ? t("present.loadFailed")
      : html && slides.length === 0
        ? t("present.noSlides")
        : null;

  return (
    <main
      onClick={onClick}
      onContextMenu={(event) => {
        event.preventDefault();
        go(-1);
      }}
      className={`fixed inset-0 select-none bg-[var(--present-stage)] ${cursorIdle ? "cursor-none" : "cursor-default"}`}
    >
      {html && slides.length > 0 && !ended && (
        <SlideStage
          html={html}
          index={index}
          title={t("present.current")}
          className={`relative h-full w-full transition-opacity duration-200 ${synced ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {blackout && <div className="absolute inset-0 bg-[var(--present-stage)]" aria-label={t("present.audienceView.blackedOut")} />}

      {message && (
        <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-lg text-[var(--app-muted)]">
          {message}
        </p>
      )}

      {!fullscreen && !message && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-8 flex justify-center transition-opacity duration-500 ${
            showHint || !cursorIdle ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-2 text-sm text-[var(--app-text)] shadow-lg">
            {t("present.audienceView.fullscreenHint")}
          </span>
        </div>
      )}
    </main>
  );
}
