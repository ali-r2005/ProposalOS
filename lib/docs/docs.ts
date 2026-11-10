import { promises as fs } from "fs";
import path from "path";
import { firstParagraph, renderMarkdown, type DocHeading } from "@/lib/docs/markdown";

/**
 * Reads the Markdown files in the repo's `docs/` folder for the public /docs
 * pages. Every `docs/<slug>.md` becomes `/docs/<slug>`; pages are generated at
 * build time, so nothing here runs on a request in production.
 */

export interface DocSummary {
  slug: string;
  title: string;
  description: string;
}

export interface Doc extends DocSummary {
  html: string;
  headings: DocHeading[];
}

const DOCS_DIR = path.join(process.cwd(), "docs");
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;
const MAX_DESCRIPTION = 180;

function titleFromSlug(slug: string): string {
  const words = slug.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function titleOf(markdown: string, slug: string): string {
  return renderMarkdown(markdown).title ?? titleFromSlug(slug);
}

function truncate(text: string): string {
  if (text.length <= MAX_DESCRIPTION) return text;
  return `${text.slice(0, MAX_DESCRIPTION).replace(/\s+\S*$/, "")}…`;
}

/** Maps links between docs (`database.md`, `./database.md#seeding`) to their pages. */
function resolveDocLink(href: string): string {
  const match = /^(?:\.\/|docs\/)?([a-z0-9][a-z0-9-]*)\.md(#.*)?$/i.exec(href);
  return match ? `/docs/${match[1]}${match[2] ?? ""}` : href;
}

async function readDoc(slug: string): Promise<string | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  try {
    return await fs.readFile(path.join(DOCS_DIR, `${slug}.md`), "utf8");
  } catch {
    return null;
  }
}

export async function listDocs(): Promise<DocSummary[]> {
  let files: string[];
  try {
    files = await fs.readdir(DOCS_DIR);
  } catch {
    return [];
  }

  const slugs = files
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -3))
    .filter((slug) => SLUG_PATTERN.test(slug))
    .sort();

  const docs = await Promise.all(
    slugs.map(async (slug) => {
      const markdown = (await readDoc(slug)) ?? "";
      return { slug, title: titleOf(markdown, slug), description: truncate(firstParagraph(markdown)) };
    }),
  );
  return docs.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getDoc(slug: string): Promise<Doc | null> {
  const markdown = await readDoc(slug);
  if (markdown === null) return null;

  const rendered = renderMarkdown(markdown, resolveDocLink);
  return {
    slug,
    title: rendered.title ?? titleFromSlug(slug),
    description: truncate(firstParagraph(markdown)),
    html: rendered.html,
    headings: rendered.headings,
  };
}
