import { Marked, Parser, Renderer, type Token, type Tokens } from "marked";

/**
 * Markdown → HTML for the public /docs pages, using `marked` (GitHub-flavoured
 * Markdown). On top of the default output it:
 * - gives headings GitHub-style ids plus a "#" anchor, and collects the level
 *   2–3 headings for the "On this page" list;
 * - lifts the first `# ` heading out as the page title;
 * - maps links to other docs (`database.md`) through a resolver, and opens
 *   external links in a new tab;
 * - shows raw HTML written in the Markdown as text instead of rendering it.
 */

export interface DocHeading {
  id: string;
  text: string;
  level: number;
}

export interface RenderedMarkdown {
  /** Text of the first `# ` heading, removed from `html`. */
  title: string | null;
  html: string;
  /** Level 2–3 headings, for the "On this page" table of contents. */
  headings: DocHeading[];
}

/** Turns a link target into a URL; lets the caller map `x.md` files to pages. */
export type LinkResolver = (href: string) => string;

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity);
}

/** GitHub-style heading anchor: "7. Share your template" → "7-share-your-template". */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

const textParser = new Parser({ gfm: true });

/** Plain text of inline tokens (no markup), for titles, ids and descriptions. */
function plainText(tokens: Token[]): string {
  return decodeEntities(textParser.parseInline(tokens, textParser.textRenderer)).trim();
}

const defaults = new Renderer();

export function renderMarkdown(markdown: string, resolveLink: LinkResolver = (href) => href): RenderedMarkdown {
  const headings: DocHeading[] = [];
  const usedIds = new Map<string, number>();
  const marked = new Marked({ gfm: true });

  const uniqueId = (text: string): string => {
    const base = slugify(text) || "section";
    const count = usedIds.get(base) ?? 0;
    usedIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };

  marked.use({
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const text = plainText(tokens);
        const id = uniqueId(text);
        if (depth === 2 || depth === 3) headings.push({ id, text, level: depth });
        const anchor = `<a class="docs-anchor" href="#${id}" aria-hidden="true">#</a>`;
        return `<h${depth} id="${id}">${anchor}${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      code({ text, lang, escaped }: Tokens.Code) {
        const language = (lang ?? "").trim().split(/\s+/)[0];
        const langAttr = language ? ` data-lang="${escapeHtml(language)}"` : "";
        return `<pre${langAttr}><code>${escaped ? text : escapeHtml(text)}</code></pre>\n`;
      },
      html({ text }: Tokens.HTML | Tokens.Tag) {
        return escapeHtml(text);
      },
      link({ href, title, tokens }: Tokens.Link) {
        const url = resolveLink(href);
        const external = /^https?:\/\//.test(url);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        const targetAttr = external ? ' target="_blank" rel="noopener noreferrer"' : "";
        return `<a href="${escapeHtml(url)}"${titleAttr}${targetAttr}>${this.parser.parseInline(tokens)}</a>`;
      },
      table(token: Tokens.Table) {
        return `<div class="docs-table">${defaults.table.call(this, token)}</div>\n`;
      },
      listitem(item: Tokens.ListItem) {
        const html = defaults.listitem.call(this, item);
        return item.task ? html.replace(/^<li>/, '<li class="docs-task">') : html;
      },
    },
  });

  const tokens = marked.lexer(markdown);
  let title: string | null = null;
  const titleIndex = tokens.findIndex((token) => token.type === "heading" && token.depth === 1);
  if (titleIndex >= 0) {
    const [heading] = tokens.splice(titleIndex, 1) as Tokens.Heading[];
    title = plainText(heading.tokens);
  }

  return { title, html: marked.parser(tokens), headings };
}

/** First paragraph of a Markdown document, as plain text (for doc cards). */
export function firstParagraph(markdown: string): string {
  const marked = new Marked({ gfm: true });
  const paragraph = marked.lexer(markdown).find((token): token is Tokens.Paragraph => token.type === "paragraph");
  return paragraph ? plainText(paragraph.tokens).replace(/\s+/g, " ") : "";
}
