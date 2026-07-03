import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { templatesRoot } from "@/lib/engine/core/template-loader";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".css": "text/css",
};

/**
 * GET /api/templates/[id]/assets/[...path]
 * Serve a template's static asset (images, svg, …) so components' relative
 * `assets/...` URLs resolve in the preview. Path traversal is blocked.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  const { id, path: segments } = await params;

  if (id.includes("..") || segments.some((s) => s.includes("..") || s.includes("/"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const assetsDir = path.join(templatesRoot(), id, "assets");
  const filePath = path.join(assetsDir, ...segments);

  // Ensure the resolved path stays inside the template's assets directory.
  if (!path.resolve(filePath).startsWith(path.resolve(assetsDir))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
