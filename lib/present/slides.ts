/**
 * Presenting a proposal: shared slide identity and the presenter ↔ audience
 * sync protocol. Browser-only (DOMParser, BroadcastChannel).
 *
 * A proposal's stored HTML is the engine's document shell with one
 * `<section class="slide-wrapper" data-section="…">` per slide. Both views load
 * that same document and show one slide at a time, so slides look exactly as
 * in the preview and the PDF.
 */

export interface PresentSlide {
  /** Stable id for notes: `<sectionId>#<occurrence>`, e.g. "activity-detail#2".
   *  Survives a re-render from context or a visual-editor save as long as the
   *  slide stays in its place among that section's slides. */
  key: string;
  sectionId: string;
  component: string;
}

/** The slides in a proposal's HTML, in order. */
export function listSlides(html: string): PresentSlide[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const seen = new Map<string, number>();
  return Array.from(doc.querySelectorAll(".slide-wrapper")).map((el, index) => {
    const sectionId = el.getAttribute("data-section") || `slide-${index + 1}`;
    const occurrence = (seen.get(sectionId) ?? 0) + 1;
    seen.set(sectionId, occurrence);
    return { key: `${sectionId}#${occurrence}`, sectionId, component: el.getAttribute("data-component") ?? "" };
  });
}

/** What every window shows. The presenter is not special: whichever window
 *  navigates (e.g. a clicker aimed at the audience screen) broadcasts it. */
export interface PresentState {
  index: number;
  /** Audience screen blacked out (the "B" key). */
  blackout: boolean;
}

export type PresentRole = "presenter" | "audience";

export type PresentMessage =
  | { type: "state"; state: PresentState; from: PresentRole }
  /** Sent by a window when it opens; the others answer with "state". */
  | { type: "hello"; role: PresentRole }
  | { type: "bye"; role: PresentRole }
  /** The presenter ended the presentation; audience windows close. */
  | { type: "end" };

/** One channel per proposal, shared by every window of this browser. */
export function openPresentChannel(proposalId: string): BroadcastChannel {
  return new BroadcastChannel(`proposalos:present:${proposalId}`);
}

export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(0, Math.trunc(index)), count - 1);
}

/** Keys that move between slides, shared by both views (clickers send these). */
export function navigationDelta(event: KeyboardEvent): number | "first" | "last" | null {
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
    case "PageDown":
    case " ":
    case "Enter":
    case "n":
    case "N":
      return 1;
    case "ArrowLeft":
    case "ArrowUp":
    case "PageUp":
    case "Backspace":
    case "p":
    case "P":
      return -1;
    case "Home":
      return "first";
    case "End":
      return "last";
    default:
      return null;
  }
}

/** True when a key press belongs to a text field, not to slide navigation. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Injected into a slide frame's document: hides every slide but the one
 * marked `pv-current` and scales that one to fit the frame (letterboxed).
 * `--pv-scale` is set by the parent from the frame's size; `--slide-w/-h`
 * come from the engine's document shell (lib/engine/renderer/theme-loader.ts).
 */
export const STAGE_CSS = `
html, body { margin: 0 !important; width: 100%; height: 100%; overflow: hidden !important; background: transparent !important; }
.slide-wrapper { display: none !important; }
.slide-wrapper.pv-current {
  display: block !important; position: fixed !important; left: 50%; top: 50%;
  width: calc(var(--slide-w, 1920px) * var(--pv-scale, 1)) !important;
  height: calc(var(--slide-h, 1080px) * var(--pv-scale, 1)) !important;
  aspect-ratio: auto !important; margin: 0 !important; overflow: hidden !important;
  transform: translate(-50%, -50%); box-shadow: none !important;
}
.slide-wrapper.pv-current > * { transform: scale(var(--pv-scale, 1)) !important; transform-origin: top left !important; }
`;
