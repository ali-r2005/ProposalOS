"use client";

import { useEffect, useState } from "react";
import { http } from "@/lib/utils/http";
import { listSlides, type PresentSlide } from "@/lib/present/slides";

/**
 * Load a proposal's HTML once for presenting, plus its slide list. Fetched
 * through the app's HTTP client (which refreshes an expired session) rather
 * than letting an iframe request it, so a window opened late in a long
 * presentation still loads.
 */
export function useProposalSlides(proposalId: string): {
  html: string | null;
  slides: PresentSlide[];
  /** Loading failed (the views show their own translated message). */
  error: boolean;
} {
  const [html, setHtml] = useState<string | null>(null);
  const [slides, setSlides] = useState<PresentSlide[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    http
      .get<string>(`/api/proposals/${encodeURIComponent(proposalId)}`, { responseType: "text" })
      .then(({ data }) => {
        if (!active) return;
        setHtml(data);
        setSlides(listSlides(data));
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [proposalId]);

  return { html, slides, error };
}
