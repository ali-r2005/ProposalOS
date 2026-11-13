# ProposalOS

ProposalOS turns a short form into a finished presentation proposal: a deck of 1920×1080 slides you can edit visually, present, share with a public link, or export to PDF.

The engine is **agnostic**: it knows nothing about events, hotels or team building. Everything about a kind of proposal (its slides, form, brand, data sources, AI prompts and languages) lives in a **template** under `templates/`. A new kind of proposal is a new template folder, not new engine code.

## Features

- **Templates**: a manifest, a slide blueprint, Handlebars + Tailwind components, form steps as JSON, brand tokens, and translations. Add one and the app picks it up.
- **Form → deck**: the form is built from the template's JSON files. Providers fetch or compute data, AI writes text, and everything is merged and rendered into slides.
- **CRM prefill**: template plugins can fill the form from an external system (e.g. a Frappe CRM deal).
- **Editing**: change the values and re-render, or fine-tune the slides in the visual editor (GrapesJS Studio).
- **Presenting**: presenter view with notes, synchronized with an audience window.
- **Sharing**: signed public links that expire, and server-side PDF export.
- **Languages**: one template renders several languages (`i18n/<lang>.json`).
- **Claude connector (MCP)**: create and update proposals from the Claude app or Claude Code.

## Tech stack

| Area | Choice |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS + CSS variables |
| Templating | Handlebars |
| Database | Postgres (Supabase) with Drizzle ORM |
| AI | Google Gemini through LangChain (`AI_API_KEY`, `AI_MODEL`) |
| Visual editor | `@grapesjs/studio-sdk` |
| PDF | Puppeteer, server-side (`@sparticuz/chromium` on Vercel) |
| MCP | `@modelcontextprotocol/sdk` |
| Hosting | Vercel |

## Getting started

### 1. Clone with the templates

`templates/` is a git submodule pointing at the private repo `ali-r2005/proposalos-templates`, so clone with it:

```bash
git clone --recurse-submodules <this repo>
# already cloned without it?
git submodule update --init
```

You need access to the templates repo.

### 2. Install

Node.js 22.18 or newer is required: templates are loaded straight from their `.ts` source.

```bash
npm install
```

### 3. Configure

Copy `.env.local.example` to `.env.local` and fill it in:

| Variable | What it is for |
|---|---|
| `DATABASE_URL` | Postgres connection string. Percent-encode special characters in the password. |
| `JWT_SECRET` | Signs login tokens. Use a long random value. |
| `SHARE_LINK_SECRET` | Signs public share links. Changing it cancels all links. |
| `MCP_TOKEN_SECRET` | Signs Claude (MCP) tokens. Without it the MCP endpoint is off; changing it disconnects everyone. |
| `AI_API_KEY`, `AI_MODEL` | AI provider key and model. |
| `FRAPPE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` | Frappe site used by template providers. |
| `FRAPPE_CRM_URL`, `FRAPPE_CRM_API_KEY`, `FRAPPE_CRM_API_SECRET` | Frappe CRM used by template prefill plugins. |
| `NEXT_PUBLIC_GRAPESJS_LICENSE_KEY` | GrapesJS Studio licence (any value works on localhost). |
| `NEXT_PUBLIC_API_URL` | Base URL of the app, e.g. `http://localhost:3000`. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Database

```bash
npm run db:migrate
```

Create the first admin user. Edit the email and password in `scripts/create-admin-user.ts` first, then:

```bash
npx tsx scripts/create-admin-user.ts
```

Template tables (if a template has a `db/` folder) have their own migrations. See [docs/database.md](docs/database.md).

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 and log in.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Lint |
| `npm run preview -- <template-id>` | Design preview of a template at http://localhost:4321/t/<template-id>, no login or database needed |
| `npm run preview:check -- <template-id>` | Validate a template (exit code 1 on errors) |
| `npm run db:generate` / `npm run db:migrate` | Create / apply engine migrations |

## How a proposal is built

1. **Form**: the app reads every `templates/<id>/form/*.json` file (one wizard step each). Plugins can prefill values.
2. **Context**: the form values are merged with each blueprint section's data source (static, manual, provider or AI), in dependency order.
3. **Expansion**: each section becomes zero, one or many slides (e.g. one slide per activity).
4. **Render**: each slide's Handlebars component is rendered with the context, then wrapped with the template's tokens and fonts.
5. **Save**: the HTML and the merged context are stored in the `proposals` table, so the proposal can be re-rendered or edited later without re-running providers or AI.

## Project structure

```
app/                 Next.js pages and API routes
  api/               REST API (templates, proposals, generate, auth, mcp, oauth)
  proposal/[id]/     Preview, values editor (edit), visual editor (design), presenter (present)
  p/[id]/            Public share page
  oauth/authorize/   "Allow Claude" approval page
  docs/              Public docs, rendered from docs/*.md
components/          React components
lib/
  engine/            Template loading, context building, expansion, rendering, AI, i18n
  forms/             Form loading and validation
  providers/         Provider loader (runs template providers)
  plugins/           Plugin loader (runs template prefill plugins)
  db/                Drizzle schema and client
  auth/              Login sessions and tokens
  mcp/               MCP server tools, tokens and OAuth
  share/             Signed public links
templates/           Git submodule: one folder per template
docs/                Guides (also served at /docs)
scripts/             Preview, admin user, skills export
```

## Templates

A template folder looks like this:

```
templates/<id>/
  manifest.json      id, name, languages, plugins, canvas size
  blueprint.yaml     the slides in order, with their data source and expansion
  tokens.css         brand colours and fonts as CSS variables
  form/*.json        form steps and fields ({ key, type, label, required })
  components/<name>/ one slide: <name>.html (Handlebars + Tailwind) and schema.json
  i18n/<lang>.json   static slide text per language
  providers/*.ts     fetch or compute data
  plugins/*.ts       prefill the form
  prompts/*.md       AI prompts (they ask for JSON)
  assets/            images and fonts
```

The full guide is [docs/creating-a-template.md](docs/creating-a-template.md). To build templates with Claude Code, use the `proposal-template` skill in `.claude/skills/`.

**Changing templates**: commit and push inside `templates/` (its own repo) first. Then commit the new pointer in this repo (`git add templates`), or the deployed app keeps the old templates.

## Connect Claude (MCP)

ProposalOS includes an MCP server at `/api/mcp`, so Claude can create and change proposals for you.

### Claude app (web, desktop, mobile)

1. In Claude, open **Settings → Connectors → Add custom connector**.
2. Name it `ProposalOS` and use the URL `https://<your-domain>/api/mcp`. Leave the advanced settings empty.
3. Click **Connect**, log in to ProposalOS if asked, and click **Allow**.

Claude then acts as you. It stays connected as long as it is used at least once every 30 days.

### Claude Code

In ProposalOS, open **Settings → Connect Claude → Generate token** and run the command it shows:

```bash
claude mcp add --transport http proposalos https://<your-domain>/api/mcp --header "Authorization: Bearer <token>"
```

Add `-s user` to use it from any folder. A token lasts 90 days. Treat it like a password.

### Tools

| Tool | What it does |
|---|---|
| `list_templates` | Templates and their languages |
| `get_template_form` | A template's form fields, languages and prefill plugins |
| `get_field_options` | Choices for fields loaded dynamically |
| `prefill_form` | Run the template's prefill plugins (e.g. from a CRM deal) |
| `create_proposal` | Generate and save a proposal; returns its links |
| `list_proposals` / `get_proposal` | Find a proposal and read its values |
| `update_proposal` | Change the title, language or values. By default it only redraws (`rerender`), keeping AI text; `regenerate` re-runs providers/AI (default for a language change) |
| `get_share_link` | Public link that expires |

Changing values rebuilds the slides from the template, which discards edits made by hand in the visual editor. Claude has to confirm that with you first.

To disconnect everyone at once, change `MCP_TOKEN_SECRET` and redeploy.

## Deployment (Vercel)

- Set every variable from the table above in the Vercel project.
- Vercel fetches the templates submodule in its Install Command, using a `GITHUB_TOKEN` environment variable with read access to the templates repo.
- Template files are loaded at runtime, so they are force-included in the build via `outputFileTracingIncludes` in `next.config.js`. If a template provider or db file imports a new package, add it there and to `serverExternalPackages`.
- `templates/package.json` and `lib/package.json` (`{"type": "module"}`) must stay in place, or templates can fail to load on Vercel even when they work locally.

## Rules for contributors

The engine's rules are in [CLAUDE.md](CLAUDE.md) (also read by Claude Code). The main ones:

- No domain logic in `app/`, `components/` or `lib/`. If swapping template ids would break engine code, it belongs in the template.
- Colours come from CSS variables only, never hex values in components.
- Engine code uses `axios` through `lib/utils/http.ts`, never `fetch()`. Template providers and plugins that call external APIs use `fetch`.
- TypeScript strict, no `any`.
- Ask before adding a dependency: the allowed list is in CLAUDE.md.
