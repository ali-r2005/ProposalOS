# ProposalOS — Project Specification

**Project:** ProposalOS  
**Phase:** 1 - Engine + Next.js App  
**Status:** Ready for Claude Code  
**Tech Stack:** Next.js 15+ (App Router) | TypeScript | Tailwind CSS | Handlebars | Claude Sonnet 4.6

---

## 1. Overview

A **presentation generation engine** that:
- Loads templates from `/templates/` folder
- Reads user form input
- Fetches data from providers (database calls)
- Generates content via AI (Claude)
- Merges all data into context
- Renders components using Handlebars
- Outputs HTML presentations
- **Completely agnostic** to business domain

**In Phase 1:** Load `/templates/tendencia-event-proposal`, generate HTML preview.

---

## 2. Folder Structure (What Claude Code Must Create)

```
ProposalOS/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                         # Home page
│   ├── (proposal)/
│   │   ├── new/
│   │   │   └── page.tsx                 # Form wizard
│   │   └── [proposalId]/
│   │       └── page.tsx                 # HTML preview
│   └── api/
│       ├── generate/route.ts            # POST: run engine
│       ├── templates/route.ts           # GET: list templates
│       └── templates/[id]/forms/route.ts # GET: ALL forms
│
├── lib/engine/
│   ├── core/
│   │   ├── template-loader.ts
│   │   ├── blueprint-parser.ts
│   │   ├── context-builder.ts
│   │   ├── dependency-resolver.ts
│   │   └── pipeline.ts
│   ├── sources/
│   │   ├── static-source.ts
│   │   ├── manual-source.ts
│   │   ├── database-source.ts
│   │   ├── ai-source.ts
│   │   └── index.ts
│   ├── expansion/
│   │   ├── single.ts
│   │   ├── repeat.ts
│   │   ├── chunk.ts
│   │   └── index.ts
│   ├── renderer/
│   │   ├── handlebars-engine.ts
│   │   ├── component-renderer.ts
│   │   └── theme-loader.ts
│   ├── ai/
│   │   ├── ai-provider.ts
│   │   ├── claude.ts
│   │   ├── prompt-loader.ts
│   │   └── context-builder.ts
│   ├── types/
│   │   ├── manifest.ts
│   │   ├── blueprint.ts
│   │   ├── template.ts
│   │   ├── context.ts
│   │   ├── component.ts
│   │   └── section.ts
│   └── validators/
│       └── schema-validator.ts
│
├── lib/
│   ├── providers/
│   │   ├── provider-loader.ts
│   │   ├── provider-interface.ts
│   │   └── mock-data.ts
│   ├── forms/
│   │   ├── form-generator.ts
│   │   └── form-validator.ts
│   └── utils/
│       ├── yaml-parser.ts
│       └── error-handler.ts
│
├── components/
│   ├── ProposalForm.tsx
│   ├── ProposalPreview.tsx
│   ├── TemplateSelector.tsx
│   └── common/
│
├── PROJECT_SPEC.md
├── CLAUDE.md
├── .env.local
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── .gitignore
```

---

## 3. Data Flow Pipeline

```
1. User visits / 
   → <TemplateSelector> → select tendencia-event-proposal
   
2. Redirect to /proposal/new?templateId=tendencia-event-proposal
   → GET /api/templates/[id]/forms
   → Load ALL JSON files from /templates/tendencia-event-proposal/forms/
   → Return {forms: [{id, title, fields}]}
   
3. <ProposalForm> renders each form group as wizard step
   → User fills client.json form
   → User fills event.json form
   → User fills selections.json form
   → Clicks "Generate"
   
4. POST /api/generate {templateId, formInput}
   ├─ loadTemplate(templateId)
   │  └─ Read manifest.json + blueprint.yaml
   ├─ parseBlueprint()
   │  └─ Validate structure
   ├─ buildContext()
   │  ├─ Start with formInput
   │  ├─ Call provider: hotels
   │  │  └─ Returns {hotels: [...]}
   │  ├─ Call provider: activities
   │  │  └─ Returns {activities: [...]}
   │  ├─ Call AI with prompt: destination-intro
   │  │  └─ Returns {destinationIntro: "...", ...}
   │  └─ Merge all → final context
   ├─ For each section in blueprint:
   │  ├─ resolveSource(section)
   │  │  └─ Get raw data (static/manual/database/ai)
   │  ├─ expand(section, data)
   │  │  └─ Create slide instances (single/repeat/chunk)
   │  ├─ renderComponent(component, slideData)
   │  │  └─ Handlebars inject + apply theme
   │  └─ Collect HTML
   └─ Concatenate all HTML
      └─ Inject tokens.css
      └─ Return {success, html, proposalId}
   
5. Redirect to /proposal/[proposalId]
   → GET /proposal/[proposalId]
   → <ProposalPreview> displays HTML in iframe
```

---

## 4. API Routes

### GET /api/templates
List available templates.

**Response:**
```json
[
  {
    "id": "tendencia-event-proposal",
    "name": "Tendencia Event Proposal",
    "description": "Professional event proposal template",
    "version": "1.0.0"
  }
]
```

### GET /api/templates/[id]/forms
Load ALL form groups from template.

**Response:**
```json
{
  "forms": [
    {
      "id": "client",
      "title": "Client Information",
      "fields": [
        {"key": "clientName", "type": "text", "label": "Company name", "required": true},
        {"key": "clientEmail", "type": "email", "label": "Email", "required": true}
      ]
    },
    {
      "id": "event",
      "title": "Event Details",
      "fields": [
        {"key": "destination", "type": "text", "label": "Destination", "required": true},
        {"key": "participants", "type": "number", "label": "Participants", "required": true}
      ]
    },
    {
      "id": "selections",
      "title": "Proposal Contents",
      "fields": [
        {"key": "selectedHotels", "type": "multi-select", "label": "Hotels", "required": true},
        {"key": "selectedActivities", "type": "multi-select", "label": "Activities", "required": true}
      ]
    }
  ]
}
```

### POST /api/generate
Run the engine and return HTML.

**Request:**
```json
{
  "templateId": "tendencia-event-proposal",
  "formInput": {
    "clientName": "Acme Corp",
    "clientEmail": "contact@acme.com",
    "destination": "Tangier",
    "participants": 50,
    "selectedHotels": ["h1", "h2"],
    "selectedActivities": ["a1", "a2"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "html": "<html>...</html>",
  "proposalId": "uuid-123",
  "slides": 8
}
```

---

## 5. Template Structure (User's Responsibility)

What exists in `/templates/tendencia-event-proposal/`:

```
manifest.json              # Template metadata (id, name, version, canvas)
blueprint.yaml             # Execution plan (sections, sources, expansion)
tokens.css                 # CSS variables (colors, fonts, spacing)

forms/
  ├── client.json          # Form group 1
  ├── event.json           # Form group 2
  └── selections.json      # Form group 3

providers/
  ├── hotels.ts            # Return {hotels: [...]}
  ├── activities.ts        # Return {activities: [...]}
  └── restaurants.ts       # (optional)

prompts/
  ├── destination-intro.md # AI prompt: return JSON
  └── closing.md           # AI prompt: return JSON

components/
  ├── cover/
  │   ├── component.html
  │   └── schema.json
  ├── destination-intro/
  │   ├── component.html
  │   └── schema.json
  └── hotel-comparison/
      ├── component.html
      └── schema.json

assets/
  └── logo.png
```

---

## 6. Module Responsibilities

### `lib/engine/core/template-loader.ts`
- Read `/templates/{templateId}/manifest.json`
- Parse `/templates/{templateId}/blueprint.yaml`
- Discover all subdirectories (forms/, components/, providers/, prompts/)
- Return Template object with all paths

### `lib/engine/core/blueprint-parser.ts`
- Validate blueprint structure
- Check all section/component references exist
- Return parsed Blueprint

### `lib/engine/core/context-builder.ts`
- Start with formInput
- For each section: call source resolver
- Merge all results into ONE context object
- Return BusinessContext

### `lib/engine/sources/index.ts`
Route by section.source:
- `static` → Load from template config
- `manual` → Already in formInput
- `database` → Call provider
- `ai` → Call AI

### `lib/engine/expansion/index.ts`
Based on expansion.strategy:
- `single` → 1 instance
- `repeat` → N instances (one per item)
- `chunk` → ceil(items / size) instances

### `lib/engine/renderer/component-renderer.ts`
- Load `component.html` from template
- Inject data via Handlebars
- Apply theme (tokens.css)
- Return HTML string

### `lib/engine/core/pipeline.ts`
Main orchestrator: `async generatePresentation(templateId, formInput)`
- Calls all above in sequence
- Returns final HTML

### `lib/engine/ai/claude.ts`
- Load prompt from template
- Inject context variables
- Call Anthropic API
- Parse response as JSON
- Return merged object

### `lib/providers/provider-loader.ts`
- Dynamically import `providers/{name}.ts` from template
- Call `provider.execute(context)`
- Return result

### `lib/forms/form-generator.ts`
- Load ALL JSON files from `/templates/{templateId}/forms/`
- Return as array of form groups
- Each has {id, title, fields}

---

## 7. Provider Interface

Every provider must export this:

```typescript
export const provider = {
  name: string;
  description: string;
  async execute(context: Record<string, any>): Promise<Record<string, any>>;
}
```

**Example: hotels.ts**
```typescript
export const provider = {
  name: "hotels",
  description: "Fetches hotels by destination",
  async execute(context) {
    const destination = (context.destination || "").toLowerCase();
    const data = {
      tangier: [{id: "h1", name: "Hilton", price: 280}, ...],
      marrakech: [{id: "h3", name: "Riad", price: 200}, ...]
    };
    return {hotels: data[destination] || data.tangier};
  }
};
```

---

## 8. Component HTML Requirements

**Must be:**
- Pure Tailwind CSS classes
- CSS variables only: `var(--brand-primary)`, `var(--text-heading)`, etc.
- Tabler icons via class: `<i class="ti ti-star"></i>`
- Simple, readable, maintainable
- Root div: `width: 1920px; height: 1080px; overflow: hidden`

**Must NOT have:**
- `<link>` tags (external CSS)
- `<style>` blocks (inline CSS)
- Hardcoded colors (#hex)
- Complex SVG patterns
- Decorative elements

---

## 9. AI Integration

### Prompt Location
`/templates/tendencia-event-proposal/prompts/{promptName}.md`

### Prompt Execution
1. Load prompt file
2. Inject context variables: `{{destination}}`, `{{participants}}`, etc.
3. Call Claude Sonnet 4.6
4. Parse response as JSON
5. Merge into context

### Example Prompt Format
```markdown
# Destination Introduction

Write a 100-word introduction to {{destination}} for {{participants}} people.

Return ONLY this JSON:
{
  "destinationIntro": "...",
  "destinationKeywords": ["...", "...", "..."]
}

Output format: Valid JSON only. No markdown.
```

---

## 10. Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 11. Dependencies

```json
{
  "dependencies": {
    "next": "^15.0",
    "react": "^19.0",
    "typescript": "^5.0",
    "handlebars": "^4.7",
    "@anthropic-ai/sdk": "latest",
    "yaml": "^2.3",
    "zod": "^3.22"
  },
  "devDependencies": {
    "tailwindcss": "^3.4",
    "autoprefixer": "^10.4"
  }
}
```

---

## 12. Phase 1 Success Criteria

- [ ] Template loads from disk
- [ ] Blueprint parses correctly
- [ ] All form JSON files load from `/templates/[id]/forms/`
- [ ] GET /api/templates/[id]/forms returns all form groups
- [ ] Dynamic form renders each group as wizard step
- [ ] Form submission → POST /api/generate
- [ ] Providers return mock data
- [ ] AI generates and returns JSON
- [ ] Context merges correctly
- [ ] Expansion works (single/repeat/chunk)
- [ ] Handlebars renders components
- [ ] All component HTML uses Tailwind + CSS variables
- [ ] HTML preview displays in browser
- [ ] No hardcoded colors or inline styles
- [ ] No business logic in engine code

---

## 13. What's NOT Phase 1

- ❌ PDF export (Phase 2)
- ❌ Authentication
- ❌ Database persistence
- ❌ Template visual editor
- ❌ Multi-tenant support