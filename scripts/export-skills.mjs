#!/usr/bin/env node
// Package Claude skills from .claude/skills/ as uploadable .zip files.
//
//   npm run skills:export                       → every skill
//   npm run skills:export -- proposal-template  → just one
//
// Output: dist/skills/<name>.zip, each containing <name>/SKILL.md + its files —
// the layout Claude expects when a skill is uploaded or unzipped into a
// skills folder. Pure Node (zlib), so it works the same on Windows/macOS/Linux.
import path from "node:path";
import { promises as fs } from "node:fs";
import { deflateRawSync, crc32 } from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = path.join(ROOT, ".claude", "skills");
const OUT = path.join(ROOT, "dist", "skills");
const IGNORED = new Set([".DS_Store", "Thumbs.db", "node_modules", ".git"]);

/** Recursively list files, following symlinks (some skills are linked in). */
async function listFiles(dir, prefix) {
  const files = [];
  for (const name of (await fs.readdir(dir)).sort()) {
    if (IGNORED.has(name)) continue;
    const full = path.join(dir, name);
    const rel = `${prefix}/${name}`;
    const stat = await fs.stat(full);
    if (stat.isDirectory()) files.push(...(await listFiles(full, rel)));
    else if (stat.isFile()) files.push({ full, rel });
  }
  return files;
}

// Fixed timestamp (1980-01-01) so re-exporting an unchanged skill gives an identical zip.
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1;

function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf-8");
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, packed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + packed.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

const wanted = process.argv[2];
const available = [];
for (const name of (await fs.readdir(SKILLS)).sort()) {
  try {
    await fs.access(path.join(SKILLS, name, "SKILL.md"));
    available.push(name);
  } catch {}
}
if (wanted && !available.includes(wanted)) {
  console.error(`No skill "${wanted}" in .claude/skills. Available: ${available.join(", ")}`);
  process.exit(1);
}

await fs.mkdir(OUT, { recursive: true });
for (const name of wanted ? [wanted] : available) {
  const files = await listFiles(path.join(SKILLS, name), name);
  const entries = await Promise.all(files.map(async (f) => ({ name: f.rel, data: await fs.readFile(f.full) })));
  const zip = buildZip(entries);
  const target = path.join(OUT, `${name}.zip`);
  await fs.writeFile(target, zip);
  console.log(`${path.relative(ROOT, target)}  (${files.length} files, ${(zip.length / 1024).toFixed(1)} KB)`);
}
