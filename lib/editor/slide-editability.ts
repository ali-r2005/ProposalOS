import type { Component, Editor } from "grapesjs";

/**
 * Makes rendered slides editable the way a designer expects, for any template.
 *
 * Out of the box GrapesJS only lets images be resized, moves elements by
 * re-ordering the HTML, and reads positions from the component's own style —
 * which is empty when a template positions things with Tailwind classes
 * (`absolute left-[90px]`). Editor-only component props (`resizable`,
 * `draggable`, `dmode`, `name`) are not exported on save, so they are applied
 * on every load here rather than authored into templates.
 */

const SKIP_TYPES = new Set(["wrapper", "textnode"]);

// Editor-only props must not count as edits, or merely opening/hovering would
// mark the proposal dirty and trigger autosave.
const SILENT = { avoidStore: true } as const;

// Right/bottom handles only: left/top handles also rewrite left/top, which
// GrapesJS miscalculates on a zoomed canvas.
const RESIZE_HANDLES = { tl: false, tc: false, tr: false, cl: false, bl: false, cr: true, bc: true, br: true };

function computedStyle(component: Component): CSSStyleDeclaration | null {
  const el = component.getEl();
  const view = el?.ownerDocument.defaultView;
  return el && view ? view.getComputedStyle(el) : null;
}

function isPositioned(component: Component): boolean {
  return computedStyle(component)?.position === "absolute";
}

/**
 * Positioned elements move anywhere. In-flow elements (e.g. columns in a flex
 * row) only reorder among their siblings — dropped elsewhere they would land
 * unpositioned in the slide's top-left corner.
 */
const canDrop = (target: Component, destination: Component) =>
  isPositioned(target) || destination === target.parent();

function prepare(component: Component): void {
  if (!SKIP_TYPES.has(component.get("type") ?? "")) {
    const resizable = component.get("resizable");
    component.set("resizable", { ...(typeof resizable === "object" ? resizable : {}), ...RESIZE_HANDLES }, SILENT);
    if (component.get("draggable") === true) component.set("draggable", canDrop, SILENT);
    // `data-field` survives a save (data-gjs-name does not), so it is the stable layer label.
    const field = component.getAttributes()["data-field"];
    if (typeof field === "string" && field && !component.get("name")) component.set("name", field, SILENT);
  }
  component.components().forEach(prepare);
}

/**
 * GrapesJS's absolute drag only trusts `position/left/top` from the component's
 * own style. Without them it freezes the element's width and height and drags
 * from (0,0). Copy the rendered position in just before the drag starts.
 */
function pinPosition(component: Component | undefined): void {
  if (!component || component.getStyle().position === "absolute" || !isPositioned(component)) return;
  const computed = computedStyle(component);
  if (!computed) return;
  component.addStyle({ position: "absolute", left: computed.left, top: computed.top, right: "auto", bottom: "auto" });
}

type CommandEvent = {
  options?: { target?: Component | Component[]; dragger?: Record<string, unknown> };
};

/**
 * GrapesJS's dragger reads `clientX/Y` from whatever event it gets, but a drag
 * started from the toolbar mixes coordinate spaces: Studio's synthetic start
 * event and every event over the canvas are in iframe coordinates, while real
 * mouse events over the toolbar/panels are in page coordinates. Unconverted,
 * the element jumps by the iframe's offset (and drifts with zoom). Convert the
 * page-coordinate events to unscaled slide pixels.
 */
function pointerInFrame(editor: Editor, component: Component, event: MouseEvent | TouchEvent): { x: number; y: number } {
  const point = "touches" in event ? (event.touches[0] ?? event.changedTouches[0]) : event;
  // The iframe holding this component — with several pages there is more than one.
  const frame = component.getEl()?.ownerDocument.defaultView?.frameElement as HTMLIFrameElement | null;
  const target = event.target as Node | null;
  const doc = target?.nodeType === Node.DOCUMENT_NODE ? (target as Document) : target?.ownerDocument;
  const inPageCoordinates = event instanceof Event && event.isTrusted && doc !== frame?.contentDocument;
  if (!frame || !inPageCoordinates) return { x: point.clientX, y: point.clientY };
  const rect = frame.getBoundingClientRect();
  const zoom = editor.Canvas.getZoom() / 100;
  return { x: (point.clientX - rect.left) / zoom, y: (point.clientY - rect.top) / zoom };
}

export function enableSlideEditing(editor: Editor): () => void {
  // Absolute drag mode is switched on only for the duration of a move: left on,
  // the resizer would also rewrite left/top on every resize.
  const armed = new Set<Component>();

  const onAdd = (component: Component) => prepare(component);
  const onMoveStart = (data?: CommandEvent) => {
    const target = data?.options?.target;
    const targets = target ? (Array.isArray(target) ? target : [target]) : editor.getSelectedAll();
    for (const component of targets) {
      if (!isPositioned(component)) continue;
      component.set("dmode", "absolute", SILENT);
      armed.add(component);
    }
  };
  const onDragStart = (data?: CommandEvent) => {
    const options = data?.options;
    if (!options) return;
    const target = Array.isArray(options.target) ? options.target[0] : options.target;
    if (!target) return;
    pinPosition(target);
    options.dragger = {
      ...options.dragger,
      getPointerPosition: (event: MouseEvent | TouchEvent) => pointerInFrame(editor, target, event),
    };
  };
  const onDragEnd = () => {
    armed.forEach((component) => component.set("dmode", "", SILENT));
    armed.clear();
  };

  editor.onReady(() => editor.Pages.getAll().forEach((page) => prepare(page.getMainComponent())));
  editor.on("component:add", onAdd);
  editor.on("command:run:before:tlb-move", onMoveStart);
  editor.on("command:run:before:core:component-drag", onDragStart);
  editor.on("component:drag:end", onDragEnd);

  return () => {
    editor.off("component:add", onAdd);
    editor.off("command:run:before:tlb-move", onMoveStart);
    editor.off("command:run:before:core:component-drag", onDragStart);
    editor.off("component:drag:end", onDragEnd);
  };
}
