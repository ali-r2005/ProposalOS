"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import StudioEditor from "@grapesjs/studio-sdk/react";
import "@grapesjs/studio-sdk/style";
import type { Editor } from "grapesjs";
import { http, toErrorMessage } from "@/lib/utils/http";
import type { RenderedSlide } from "@/lib/engine/types";

interface ParsedDocument {
  slides: RenderedSlide[];
  canvasStyles: string[];
  canvasScripts: string[];
  assetBase: string;
}

/**
 * Split the stored, already-rendered proposal document (see
 * lib/engine/renderer/theme-loader.ts) back into per-slide chunks, and pull
 * out the runtime assets (Tailwind CDN, Tabler icon font, tokens.css) so they
 * can be loaded into the GrapesJS canvas iframe for a faithful preview.
 */
function parseDocument(fullHtml: string): ParsedDocument {
  const doc = new DOMParser().parseFromString(fullHtml, "text/html");

  const assetBase = doc.querySelector("base")?.getAttribute("href") ?? "/";

  const slides: RenderedSlide[] = Array.from(doc.querySelectorAll(".slide-wrapper")).map((el) => ({
    sectionId: el.getAttribute("data-section") ?? "",
    component: el.getAttribute("data-component") ?? "",
    html: el.innerHTML.trim(),
  }));

  const canvasScripts = Array.from(doc.querySelectorAll("script[src]")).map(
    (s) => (s as HTMLScriptElement).src
  );
  const linkHrefs = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(
    (l) => (l as HTMLLinkElement).href
  );

  // The inline <style> (tokens.css + .slide-wrapper rules) has no URL of its
  // own — wrap it in a blob URL so it can sit in the same canvasStyles array.
  const inlineCss = doc.querySelector("head > style")?.textContent ?? "";
  const blobUrl = inlineCss ? URL.createObjectURL(new Blob([inlineCss], { type: "text/css" })) : null;

  return { slides, canvasStyles: [...linkHrefs, ...(blobUrl ? [blobUrl] : [])], canvasScripts, assetBase };
}

/** Components reference images via relative `assets/...` — resolve them against the template's asset base before handing markup to GrapesJS's own iframe/base. */
function resolveAssetPaths(html: string, assetBase: string): string {
  return html.replace(/(src|href)="assets\//g, `$1="${assetBase}assets/`);
}

/** Reverse of resolveAssetPaths, run before saving so stored HTML keeps its original relative-path convention. */
function relativizeAssetPaths(html: string, assetBase: string): string {
  const escaped = assetBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`(src|href)="${escaped}assets/`, "g"), `$1="assets/`);
}

export default function ProposalDesignEditor({ proposalId }: { proposalId: string }) {
  const [parsed, setParsed] = useState<ParsedDocument | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    http
      .get<string>(`/api/proposals/${proposalId}`)
      .then(({ data }) => setParsed(parseDocument(data)))
      .catch((err) => setError(toErrorMessage(err, "Failed to load proposal")))
      .finally(() => setLoading(false));
  }, [proposalId]);

  const pages = useMemo(() => {
    if (!parsed) return [];
    return parsed.slides.map((slide) => ({
      name: slide.component || slide.sectionId,
      component: resolveAssetPaths(slide.html, parsed.assetBase),
    }));
  }, [parsed]);

  const save = useCallback(async () => {
    if (!editor || !parsed) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const editorPages = editor.Pages.getAll();
      const slides: RenderedSlide[] = editorPages.map((page, i) => {
        const mainComponent = page.getMainComponent();
        const css = editor.getCss({ component: mainComponent }) ?? "";
        const bodyHtml = editor.getHtml({ component: mainComponent });
        const original = parsed.slides[i];
        return {
          sectionId: original?.sectionId ?? "",
          component: original?.component ?? "",
          html: relativizeAssetPaths(css ? `<style>${css}</style>${bodyHtml}` : bodyHtml, parsed.assetBase),
        };
      });

      const { data } = await http.put<{ success?: boolean; error?: string }>(
        `/api/proposals/${proposalId}/html`,
        { slides },
        { validateStatus: () => true }
      );
      if (!data.success) {
        setError(data.error ?? "Save failed");
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(toErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }, [editor, parsed, proposalId]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-panel)] px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold">Visual editor</h1>
          <p className="text-xs text-[var(--app-muted)]">{proposalId}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/proposal/${proposalId}`}
            className="rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-xs"
          >
            Back to preview
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={saving || !editor}
            className="rounded-lg bg-[var(--app-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </header>

      {error && (
        <p className="border-b border-[var(--app-border)] bg-[var(--app-panel)] px-6 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="flex-1 overflow-hidden">
        {loading && <p className="p-6 text-sm text-[var(--app-muted)]">Loading…</p>}
        {parsed && (
          <StudioEditor
            key={proposalId}
            onEditor={setEditor}
            options={{
              licenseKey: "LOCAL_LICENSE_KEY",
              // Default "web" project type (no print/pagination behavior —
              // that's what "document" + presetPrintable forced onto us,
              // cropping slides to an A3 page and mangling text while trying
              // to paginate a fixed 1920x1080 absolute-positioned artboard).
              project: { id: proposalId, default: { pages } },
              // Studio SDK defaults to `storage.type: "browser"`, which
              // auto-persists the project to the browser and loads from
              // that cache on next mount instead of `project.default` —
              // across proposals sharing no unique id, this served whichever
              // proposal was cached first. We already persist explicitly via
              // the Save button (PUT /api/proposals/[id]/html), so opt out
              // of GrapesJS's own load/autosave entirely.
              storage: { type: "self" },
              // "Slide" device replaces the A3 paper-size selector with one
              // matching the artboard. `width: ""` (empty, like GrapesJS's
              // own built-in "desktop" device) marks it as the unconstrained
              // base tier — any other value (eg. "1920px") makes GrapesJS
              // treat it as a responsive breakpoint, wrapping every inline
              // `style="..."` attribute it extracts into an auto-generated
              // `@media (max-width: 1920px)` rule on Save. Since the actual
              // 1920x1080 sizing already comes from each slide's own Tailwind
              // classes (not the device), we don't need — and must avoid —
              // a pixel value here.
              devices: { default: [{ id: "slide", name: "Slide", width: "" }] },
              // canvas.styles/scripts is a *core* GrapesJS EditorConfig option
              // (injects <link>/<script> into the canvas iframe's own <head>),
              // exposed here via Studio SDK's `gjsOptions` passthrough — not
              // the same as Studio SDK's own top-level `canvas` prop, which
              // only configures canvas-spot UI (selection/hover overlays).
              gjsOptions: {
                canvas: { styles: parsed.canvasStyles, scripts: parsed.canvasScripts },
                // Separate from Studio SDK's `storage` option above: *core*
                // GrapesJS ships its own StorageManager, defaulting to
                // `type: "local"` + `autoload: true` — it was silently
                // loading whichever proposal's editor state got saved to the
                // browser's localStorage first, ignoring `project.default`
                // entirely. Disable it outright; we persist explicitly via
                // the Save button (PUT /api/proposals/[id]/html).
                storageManager: false,
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
