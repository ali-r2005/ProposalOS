#!/usr/bin/env node
// Design preview for templates — no Next.js, no login, no database, no data.
// Every component is rendered with its Handlebars placeholders made visible:
// text fields show as "{{field}}", image fields as labelled grey boxes, each
// `{{#each}}` repeats 3 times and every `{{#if}}` is shown. The page shell
// (tokens.css, Tailwind, slide scaling) is the engine's own wrapPresentation().
//
//   npm run preview                         → list templates
//   npm run preview -- <template-id>        → preview one, live reload on save
//   npm run preview:check -- <template-id>  → validate (exit 1 on errors)
import http from "node:http";
import path from "node:path";
import { existsSync, watch, promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { parse as parseYaml } from "yaml";
import { wrapPresentation } from "../lib/engine/renderer/theme-loader.ts";
import { render } from "../lib/engine/renderer/handlebars-engine.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = path.join(ROOT, "templates");
const SAFE_NAME = /^[a-zA-Z0-9_-]+$/;
const EACH_COUNT = 3;

// ---------- placeholder context, inferred from the component's own tags ----------

// The text right before a tag tells us whether it lands in an image URL.
const IMAGE_SLOT = /(?:src|poster|srcset)\s*=\s*["'][^"']*$|url\(\s*["']?[^"')]*$/i;

const escapeXml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function placeholderImage(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#e4e4e7"/><path d="M0 0L800 600M800 0L0 600" stroke="#a1a1aa" stroke-width="2"/><rect x="200" y="255" width="400" height="90" rx="8" fill="#fafafa"/><text x="400" y="312" font-family="monospace" font-size="30" fill="#3f3f46" text-anchor="middle">${escapeXml(label)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const isImage = (v) => typeof v === "string" && v.startsWith("data:image/");
const isIndex = (k) => /^\d+$/.test(k);

// Layouts that depend on a list's size use provider flags named `count-N`
// (exactly one is true in real data). Showing them all would stack every layout,
// so the preview turns on just one, chosen with ?count=.
let previewCount = 4;
let sawCountFlags = false;
const COUNT_FLAG = /^count-(\d+)$/;

function buildPlaceholderContext(source) {
  const root = {};
  const countFlags = new Set();
  let tail = "";

  const frameFor = (stack, p) => stack[Math.max(0, stack.length - 1 - (p.depth ?? 0))];

  function put(obj, parts, make, shouldReplace) {
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];
      if (i === parts.length - 1) {
        if (Array.isArray(cur) && isIndex(key)) {
          for (let j = 0; j < Number(key); j++) if (cur[j] === undefined) cur[j] = make(j);
        }
        if (cur[key] === undefined || shouldReplace(cur[key])) cur[key] = make(isIndex(key) ? Number(key) : 0);
        return;
      }
      if (cur[key] === null || typeof cur[key] !== "object") cur[key] = isIndex(parts[i + 1]) ? [] : {};
      cur = cur[key];
    }
  }

  function leaf(p, stack) {
    if (p.type !== "PathExpression" || p.data) return;
    const frame = frameFor(stack, p);
    const image = IMAGE_SLOT.test(tail);
    if (p.parts.length === 0) {
      frame.self = image ? "image" : frame.self ?? "text";
      return;
    }
    const label = p.original.replace(/^(\.\.\/)+|^this\./g, "");
    put(
      frame.obj,
      p.parts,
      () => (image ? placeholderImage(label) : `{{${label}}}`),
      (existing) => image && typeof existing === "string" && !isImage(existing)
    );
  }

  function block(node, stack) {
    const helper = node.path.original;
    const target = node.params[0];
    if ((helper === "each" || helper === "with") && target?.type === "PathExpression" && !target.data && target.parts.length) {
      const frame = { obj: {}, self: null };
      walk(node.program, [...stack, frame]);
      if (node.inverse) walk(node.inverse, stack);
      const label = target.original.replace(/^(\.\.\/)+|^this\./g, "");
      const owner = frameFor(stack, target).obj;
      if (helper === "with") {
        put(owner, target.parts, () => frame.obj, (v) => typeof v !== "object" || v === null);
        return;
      }
      const primitive = frame.self && Object.keys(frame.obj).length === 0;
      const make = (i) =>
        primitive
          ? frame.self === "image" ? placeholderImage(`${label} ${i + 1}`) : `{{${label} ${i + 1}}}`
          : structuredClone(frame.obj);
      put(owner, target.parts, () => Array.from({ length: EACH_COUNT }, (_, i) => make(i)), (v) => !Array.isArray(v) || v.length < EACH_COUNT);
      return;
    }
    const flag = target?.type === "PathExpression" ? COUNT_FLAG.exec(target.original) : null;
    if (flag && (helper === "if" || helper === "unless")) {
      countFlags.add(target.original);
      sawCountFlags = true;
    } else if ((helper === "if" || helper === "unless") && target) leaf(target, stack);
    if (node.program) walk(node.program, stack);
    if (node.inverse) walk(node.inverse, stack);
  }

  function walk(program, stack) {
    for (const node of program.body) {
      if (node.type === "ContentStatement") tail = (tail + node.value).slice(-300);
      else if (node.type === "MustacheStatement" && node.params.length === 0) leaf(node.path, stack);
      else if (node.type === "BlockStatement") block(node, stack);
    }
  }

  walk(Handlebars.parse(source), [{ obj: root, self: null }]);
  for (const name of countFlags) root[name] = Number(COUNT_FLAG.exec(name)[1]) === previewCount;
  return root;
}

// ---------- reading a template straight from disk ----------

async function readText(file) {
  try {
    return await fs.readFile(file, "utf-8");
  } catch {
    return null;
  }
}

/** Same lookup order as the engine's component-renderer. */
async function readComponent(componentsDir, id) {
  for (const candidate of [path.join(componentsDir, id, "component.html"), path.join(componentsDir, id, `${id}.html`), path.join(componentsDir, `${id}.html`)]) {
    const html = await readText(candidate);
    if (html !== null) return html;
  }
  return null;
}

async function loadForPreview(templateId) {
  const root = path.join(TEMPLATES, templateId);
  if (!existsSync(root)) throw new Error(`Template folder not found: templates/${templateId}`);
  const errors = [];
  const warnings = [];

  const manifestRaw = await readText(path.join(root, "manifest.json"));
  let manifest = { id: templateId, name: templateId };
  if (manifestRaw === null) errors.push("manifest.json is missing (the app will not load this template).");
  else {
    try {
      manifest = { ...manifest, ...JSON.parse(manifestRaw) };
      if (manifest.id !== templateId) errors.push(`manifest.json "id" is "${manifest.id}" but the folder is "${templateId}" — they must match.`);
    } catch (e) {
      errors.push(`manifest.json is not valid JSON: ${e.message}`);
    }
  }

  let blueprintComponents = [];
  const blueprintRaw = await readText(path.join(root, "blueprint.yaml"));
  if (blueprintRaw === null) errors.push("blueprint.yaml is missing (the app will not load this template).");
  else {
    try {
      const sections = parseYaml(blueprintRaw)?.sections;
      if (!Array.isArray(sections)) errors.push("blueprint.yaml must define a `sections` list.");
      else blueprintComponents = sections.map((s) => s?.component).filter((c) => typeof c === "string");
    } catch (e) {
      errors.push(`blueprint.yaml is not valid YAML: ${e.message}`);
    }
  }

  const tokensCss = (await readText(path.join(root, "tokens.css"))) ?? "";
  if (!tokensCss) warnings.push("tokens.css is missing — CSS variables like var(--brand-primary) will be empty.");

  const componentsDir = path.join(root, "components");
  const onDisk = existsSync(componentsDir)
    ? (await fs.readdir(componentsDir, { withFileTypes: true }))
        .map((e) => (e.isDirectory() ? e.name : e.name.endsWith(".html") ? e.name.slice(0, -5) : null))
        .filter(Boolean)
        .sort()
    : [];
  if (!onDisk.length) warnings.push("No components yet — add components/<name>/<name>.html.");

  const ordered = [...new Set([...blueprintComponents, ...onDisk])];
  const components = [];
  for (const id of ordered) {
    const html = await readComponent(componentsDir, id);
    if (html === null) {
      errors.push(`blueprint.yaml uses component "${id}" but components/${id}/${id}.html does not exist.`);
      continue;
    }
    components.push({ id, html, inBlueprint: blueprintComponents.includes(id) });
  }

  for (const formDir of ["forms", "form"]) {
    const dir = path.join(root, formDir);
    if (!existsSync(dir)) continue;
    for (const f of (await fs.readdir(dir)).filter((n) => n.endsWith(".json"))) {
      try {
        JSON.parse(await fs.readFile(path.join(dir, f), "utf-8"));
      } catch (e) {
        errors.push(`${formDir}/${f} is not valid JSON: ${e.message}`);
      }
    }
  }

  return { manifest, tokensCss, components, errors, warnings };
}

/** Project rules (CLAUDE.md) that a component's markup can break. */
function lintComponent(c) {
  const issues = [];
  if (/<style[\s>]/i.test(c.html)) issues.push("contains a <style> tag");
  if (/<link[\s>]/i.test(c.html)) issues.push("contains a <link> tag");
  if (/<script[\s>]/i.test(c.html)) issues.push("contains a <script> tag");
  const hex = c.html.replace(/<!--[\s\S]*?-->/g, "").match(/(?<![&\w/])#[0-9a-fA-F]{3,8}\b/g);
  if (hex) issues.push(`hardcoded colour(s) ${[...new Set(hex)].join(", ")} — use var(--…) tokens`);
  return issues.map((i) => `${c.id}: ${i}`);
}

function renderSlide(c) {
  try {
    return { html: render(c.html, buildPlaceholderContext(c.html)), error: null };
  } catch (e) {
    return {
      html: `<div class="slide" style="width:1920px;height:1080px;background:#2a1215;color:#fca5a5;font:28px monospace;padding:80px;box-sizing:border-box;white-space:pre-wrap">Component "${escapeXml(c.id)}" failed to render:\n\n${escapeXml(e.message)}</div>`,
      error: `${c.id}: ${e.message.split("\n")[0]}`,
    };
  }
}

async function buildPreview(templateId) {
  const t = await loadForPreview(templateId);
  const slides = [];
  const errors = [...t.errors];
  const warnings = [...t.warnings];
  for (const c of t.components) {
    const { html, error } = renderSlide(c);
    if (error) errors.push(error);
    warnings.push(...lintComponent(c));
    if (!c.inBlueprint) warnings.push(`${c.id}: not used in blueprint.yaml (it will never appear in a proposal)`);
    slides.push({ sectionId: c.id, component: c.id, html });
  }
  const html = wrapPresentation({ id: templateId, manifest: t.manifest, tokensCss: t.tokensCss }, slides);
  return { ...t, html, errors, warnings };
}

// ---------- --check mode ----------

const args = process.argv.slice(2);
const flagValue = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const checkMode = args.includes("--check");
if (checkMode) args.splice(args.indexOf("--check"), 1);
const port = Number(flagValue("--port") ?? 4321);
const onlyTemplate = args[0];

if (checkMode) {
  if (!onlyTemplate || !SAFE_NAME.test(onlyTemplate)) {
    console.error("Usage: npm run preview:check -- <template-id>");
    process.exit(2);
  }
  try {
    const { components, errors, warnings } = await buildPreview(onlyTemplate);
    console.log(`\n${onlyTemplate}: ${components.length} component(s)`);
    for (const c of components) console.log(`  ${c.inBlueprint ? "✓" : "·"} ${c.id}`);
    if (warnings.length) console.log(`\nWarnings (${warnings.length}):\n${warnings.map((w) => `  - ${w}`).join("\n")}`);
    if (errors.length) console.log(`\nErrors (${errors.length}):\n${errors.map((e) => `  ✗ ${e}`).join("\n")}`);
    console.log(errors.length ? "\nFAILED" : "\nOK");
    process.exit(errors.length ? 1 : 0);
  } catch (e) {
    console.error(`\nFAILED: ${e.message}`);
    process.exit(1);
  }
}

// ---------- preview server ----------

const clients = new Set();
let reloadTimer;
watch(TEMPLATES, { recursive: true }, () => {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const res of clients) res.write("data: reload\n\n");
  }, 150);
});

const LIVE_RELOAD = `<script>new EventSource("/__reload").onmessage=()=>location.reload();</script>`;

const CHROME_CSS = `<style>
.pv-bar{position:sticky;top:0;z-index:9999;font:13px system-ui;background:#111;color:#eee;padding:8px 16px;border-bottom:1px solid #444}
.pv-bar a{color:#93c5fd}.pv-bar select{background:#222;color:#eee;border:1px solid #555;border-radius:4px;padding:2px 4px}.pv-bar details{margin-top:6px}.pv-bar ul{margin:4px 0;padding-left:20px;max-height:40vh;overflow:auto}
.pv-label{width:var(--slide-box-w);margin:24px auto 6px;font:12px ui-monospace,monospace;color:#d4d4d8}
.pv-label span{color:#fbbf24}
@media print{.pv-bar,.pv-label{display:none}}
</style>`;

function toolbar(templateId, components, focus, errors, warnings, count) {
  const options = [`<option value="">all components</option>`]
    .concat(components.map((c) => `<option${c.id === focus ? " selected" : ""}>${escapeXml(c.id)}</option>`))
    .join("");
  const list = (title, items, colour) =>
    items.length
      ? `<details style="color:${colour}"${title === "error" ? " open" : ""}><summary>${items.length} ${title}(s)</summary><ul>${items.map((i) => `<li>${escapeXml(i)}</li>`).join("")}</ul></details>`
      : "";
  return `<div class="pv-bar"><a href="/">← templates</a> · <b>${escapeXml(templateId)}</b> ·
<select id="pv-c" onchange="pvGo()">${options}</select>
${sawCountFlags ? `<select id="pv-n" onchange="pvGo()">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}"${n === count ? " selected" : ""}>${n} image${n > 1 ? "s" : ""}</option>`).join("")}</select>` : ""}
<script>function pvGo(){var p=new URLSearchParams(),c=document.getElementById('pv-c').value,n=document.getElementById('pv-n');if(c)p.set('c',c);if(n)p.set('count',n.value);location.search=p.toString()}</script>
<span style="opacity:.6"> · placeholders shown as {{field}} · live reload on</span>
${list("error", errors, "#fca5a5")}${list("warning", warnings, "#fbbf24")}</div>`;
}

async function serveAsset(res, templateId, rel) {
  const assetsDir = path.join(TEMPLATES, templateId, "assets");
  const file = path.resolve(assetsDir, decodeURIComponent(rel));
  if (!file.startsWith(assetsDir + path.sep) || !existsSync(file)) {
    res.writeHead(404).end("Not found");
    return;
  }
  const types = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff",
    ".ttf": "font/ttf", ".otf": "font/otf", ".mp4": "video/mp4", ".css": "text/css",
  };
  res.writeHead(200, { "content-type": types[path.extname(file).toLowerCase()] ?? "application/octet-stream" });
  res.end(await fs.readFile(file));
}

async function indexPage() {
  const ids = (await fs.readdir(TEMPLATES, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const rows = await Promise.all(
    ids.map(async (id) => {
      let name = id;
      try {
        name = JSON.parse(await fs.readFile(path.join(TEMPLATES, id, "manifest.json"), "utf-8")).name ?? id;
      } catch {}
      return `<li style="margin:10px 0"><a href="/t/${escapeXml(id)}" style="color:#93c5fd;font-weight:600">${escapeXml(name)}</a> <code style="opacity:.6">${escapeXml(id)}</code></li>`;
    })
  );
  return `<!doctype html><meta charset="utf-8"><title>Template preview</title>
<body style="font:15px system-ui;background:#1a1a1a;color:#eee;padding:32px"><h1>Template preview</h1><ul>${rows.join("")}</ul>${LIVE_RELOAD}</body>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (url.pathname === "/__reload") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    // Same URL shape as the engine's asset route, so the engine's <base href> resolves unchanged.
    const asset = url.pathname.match(/^\/api\/templates\/([^/]+)\/assets\/(.+)$/);
    if (asset && SAFE_NAME.test(asset[1])) return await serveAsset(res, asset[1], asset[2]);

    const page = url.pathname.match(/^\/t\/([^/]+)\/?$/);
    if (page && SAFE_NAME.test(page[1])) {
      const templateId = page[1];
      const focus = url.searchParams.get("c") ?? "";
      previewCount = Number(url.searchParams.get("count")) || 4;
      sawCountFlags = false;
      try {
        const preview = await buildPreview(templateId);
        let html = preview.html;
        if (focus) {
          const only = preview.components.find((c) => c.id === focus);
          if (only) {
            html = wrapPresentation({ id: templateId, manifest: preview.manifest, tokensCss: preview.tokensCss }, [
              { sectionId: only.id, component: only.id, html: renderSlide(only).html },
            ]);
          }
        }
        const unused = new Set(preview.components.filter((c) => !c.inBlueprint).map((c) => c.id));
        html = html
          .replace("</head>", `${CHROME_CSS}</head>`)
          .replace("<body>", `<body>\n${toolbar(templateId, preview.components, focus, preview.errors, preview.warnings, previewCount)}`)
          .replace(/<section class="slide-wrapper" data-section="([^"]+)"/g, (m, id) =>
            `<div class="pv-label">${escapeXml(id)}${unused.has(id) ? " <span>(not in blueprint)</span>" : ""}</div>${m}`
          )
          .replace("</body>", `${LIVE_RELOAD}</body>`);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html);
      } catch (e) {
        res.writeHead(500, { "content-type": "text/html; charset=utf-8" }).end(
          `<!doctype html><body style="font:14px system-ui;background:#1a1a1a;color:#fca5a5;padding:32px"><a href="/" style="color:#93c5fd">← templates</a><h2>Could not preview ${escapeXml(templateId)}</h2><pre style="white-space:pre-wrap">${escapeXml(e.stack ?? e.message)}</pre>${LIVE_RELOAD}</body>`
        );
      }
      return;
    }
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(await indexPage());
      return;
    }
    res.writeHead(404).end("Not found");
  } catch (e) {
    res.writeHead(500).end(String(e.message ?? e));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`\nTemplate preview → http://localhost:${port}${onlyTemplate ? `/t/${onlyTemplate}` : "/"}`);
  console.log("Edits under templates/ reload the page automatically. Ctrl+C to stop.\n");
});
