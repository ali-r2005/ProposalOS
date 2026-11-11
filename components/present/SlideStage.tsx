"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STAGE_CSS } from "@/lib/present/slides";

const STYLE_ID = "proposalos-present-stage";

/**
 * Shows one slide of a proposal's HTML, scaled to fit this box. The whole
 * document is loaded once (as `srcdoc`, so it is same-origin and keeps the
 * engine's Tailwind/tokens runtime); changing `index` only toggles which slide
 * is visible, so navigation is instant.
 *
 * The frame ignores the pointer and the keyboard: clicks and keys reach the
 * page that hosts it, which owns navigation.
 */
export default function SlideStage({
  html,
  index,
  title,
  className = "",
}: {
  html: string;
  index: number;
  title: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    const box = boxRef.current;
    if (!doc?.documentElement || !box) return;

    if (!doc.getElementById(STYLE_ID)) {
      const style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = STAGE_CSS;
      doc.head?.appendChild(style);
    }

    const root = doc.documentElement;
    const css = getComputedStyle(root);
    const slideW = parseFloat(css.getPropertyValue("--slide-w")) || 1920;
    const slideH = parseFloat(css.getPropertyValue("--slide-h")) || 1080;
    const scale = Math.min(box.clientWidth / slideW, box.clientHeight / slideH);
    root.style.setProperty("--pv-scale", String(Number.isFinite(scale) && scale > 0 ? scale : 0));

    doc.querySelectorAll(".slide-wrapper").forEach((el, i) => el.classList.toggle("pv-current", i === index));
  }, [index]);

  // Show the slide as soon as the document is parsed. Waiting for the frame's
  // `load` event would also wait for every image, and one slow remote image
  // (e.g. a CRM photo) would leave the whole stage blank.
  useEffect(() => {
    setLoaded(false);
    const timer = window.setInterval(() => {
      const doc = frameRef.current?.contentDocument;
      if (doc && doc.readyState !== "loading" && doc.querySelector(".slide-wrapper")) {
        window.clearInterval(timer);
        setLoaded(true);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [html]);

  useEffect(() => {
    if (loaded) apply();
  }, [loaded, apply]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => apply());
    observer.observe(box);
    return () => observer.disconnect();
  }, [apply]);

  return (
    // `className` must position the box (e.g. "relative h-full" or "absolute
    // inset-0"): the frame fills it absolutely.
    <div ref={boxRef} className={`overflow-hidden bg-[var(--present-stage)] ${className}`}>
      <iframe
        ref={frameRef}
        title={title}
        srcDoc={html}
        tabIndex={-1}
        aria-hidden="true"
        onLoad={() => {
          setLoaded(true);
          apply();
        }}
        className={`pointer-events-none absolute inset-0 h-full w-full border-0 transition-opacity duration-150 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
