import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { getProposal } from "@/lib/proposal-store";
import { extractTokenFromRequest } from "@/lib/auth/context";

// Headless Chrome needs the Node runtime (not edge). PDF generation can take a
// few seconds while the CDN Tailwind runtime + icon font load and paint.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/proposals/[id]/pdf — render the generated presentation in headless
 * Chrome and stream it back as a downloadable PDF. Chrome navigates to our own
 * `/api/proposals/[id]` HTML endpoint so `<base href>`, same-origin asset routes
 * and the document's `@page` print CSS all resolve exactly as in the preview.
 */
export async function GET( request: Request,{ params }: { params: Promise<{ id: string }> } ) {
  const { id } = await params;

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    // Extract auth token from request for puppeteer to use
    const token = extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await getProposal(id))) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const pageUrl = `${origin}/api/proposals/${encodeURIComponent(id)}`;

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    // Pass auth token to puppeteer so it can access protected routes
    await page.setExtraHTTPHeaders({
      Authorization: `Bearer ${token}`,
    });
    await page.goto(pageUrl, { waitUntil: "networkidle0", timeout: 45_000 });

    const pdf = await page.pdf({
      printBackground: true,
      // Honor the document's `@page { size: 1920px 1080px }` — one slide per page.
      preferCSSPageSize: true,
    });

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="proposal-${id}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "PDF generation failed" },
      { status: 500 }
    );
  } finally {
    await browser?.close();
  }
}
