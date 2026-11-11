"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampIndex,
  openPresentChannel,
  type PresentMessage,
  type PresentRole,
  type PresentState,
} from "@/lib/present/slides";

const INITIAL: PresentState = { index: 0, blackout: false };
/** How long a new window waits for another one to tell it the current slide. */
const SYNC_TIMEOUT_MS = 600;

/**
 * Keeps the presenter and audience windows of one proposal on the same slide,
 * over a BroadcastChannel (same browser, any tab or window). Every window can
 * navigate — a clicker aimed at the audience screen must work too — and each
 * change is broadcast to the others. A window that opens says "hello" and the
 * others reply with the current state, so a reload resumes where it was.
 */
export function usePresentSync(proposalId: string, role: PresentRole, slideCount: number) {
  const [state, setState] = useState<PresentState>(INITIAL);
  const [synced, setSynced] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const stateRef = useRef<PresentState>(INITIAL);
  const syncedRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const channel = openPresentChannel(proposalId);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<PresentMessage>) => {
      const message = event.data;
      if (message.type === "state") {
        stateRef.current = message.state;
        setState(message.state);
        syncedRef.current = true;
        setSynced(true);
      } else if (message.type === "end") {
        setEnded(true);
        return;
      } else if (message.type === "hello" && syncedRef.current) {
        // A window that hasn't learned the current slide yet doesn't answer,
        // so it can't send a newcomer back to slide 1.
        channel.postMessage({ type: "state", state: stateRef.current, from: role } satisfies PresentMessage);
      }
      // Whether an audience window is open: any message from one means yes,
      // its "bye" (window closed or reloaded) means no.
      const sender = message.type === "state" ? message.from : message.role;
      if (sender === "audience") setAudienceOpen(message.type !== "bye");
    };

    channel.postMessage({ type: "hello", role } satisfies PresentMessage);
    const timer = window.setTimeout(() => {
      syncedRef.current = true;
      setSynced(true);
    }, SYNC_TIMEOUT_MS);
    const sayBye = () => channel.postMessage({ type: "bye", role } satisfies PresentMessage);
    window.addEventListener("pagehide", sayBye);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", sayBye);
      sayBye();
      channel.close();
      channelRef.current = null;
    };
  }, [proposalId, role]);

  const update = useCallback(
    (change: (current: PresentState) => PresentState) => {
      const next = change(stateRef.current);
      stateRef.current = next;
      syncedRef.current = true;
      setState(next);
      channelRef.current?.postMessage({ type: "state", state: next, from: role } satisfies PresentMessage);
    },
    [role]
  );

  const goTo = useCallback(
    (index: number) => update((s) => ({ ...s, index: clampIndex(index, slideCount) })),
    [update, slideCount]
  );

  const go = useCallback(
    (delta: number | "first" | "last") =>
      update((s) => {
        const target = delta === "first" ? 0 : delta === "last" ? slideCount - 1 : clampIndex(s.index, slideCount) + delta;
        return { ...s, index: clampIndex(target, slideCount) };
      }),
    [update, slideCount]
  );

  const setBlackout = useCallback((blackout: boolean) => update((s) => ({ ...s, blackout })), [update]);

  /** Tell every other window the presentation is over. */
  const end = useCallback(() => channelRef.current?.postMessage({ type: "end" } satisfies PresentMessage), []);

  return {
    index: clampIndex(state.index, slideCount),
    blackout: state.blackout,
    /** False until another window answered (or nobody did in time). */
    synced,
    /** Whether an audience window is open (as far as this window has heard). */
    audienceOpen,
    /** Another window ended the presentation. */
    ended,
    end,
    go,
    goTo,
    setBlackout,
  };
}
