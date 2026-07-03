# CLAUDE.md — Rules & Constraints

---

## Core Rule: ENGINE IS AGNOSTIC

The engine knows NOTHING about business domains.

**Test:** If you swap `/templates/tendencia-event-proposal` with `/templates/wedding-proposal`, should your engine code change? 

**Answer:** NO. If YES, you've coupled the engine to the template.

This means:
- ❌ No "if hotel" logic
- ❌ No "if event" logic
- ❌ No hardcoded concepts
- ❌ All business logic lives in the template

---

## Three Critical Decisions Locked

### 1. Forms Load From Multiple JSON Files
- `/templates/[id]/forms/client.json`
- `/templates/[id]/forms/event.json`
- `/templates/[id]/forms/selections.json`
- **NOT** a single schema file
- API route `/api/templates/[id]/forms` returns ALL of them

### 2. Component HTML: Tailwind + Tokens.css Only
No external links. No inline styles. No hardcoded colors.

Use CSS variables:
- `var(--brand-primary)` instead of `#1e40af`
- `var(--text-heading)` instead of `#1f2937`
- `var(--color-background)` instead of `#fff`

Every color is a variable from `/tokens.css`.

### 3. Form Fields Use `key` Property
```json
{"key": "destination", "type": "text", "label": "City"}
```

NOT `id` or any other property. The `key` is the context property name.

---

## What You Must Do

- ✅ Keep engine 100% agnostic (no domain logic)
- ✅ Use TypeScript (strict mode)
- ✅ Load ALL form JSON files (not one schema)
- ✅ Create providers with standard interface: `{name, description, execute()}`
- ✅ Use Handlebars for templating
- ✅ Use Claude Sonnet 4.6 for AI
- ✅ Use CSS variables for all colors
- ✅ Handle errors gracefully (fallback to defaults)
- ✅ Read files from disk (template-loader)
- ✅ Parse YAML for blueprint
- ✅ Parse JSON for forms and schemas

---

## What You Must NOT Do

- ❌ Hardcode business concepts (hotels, weddings, events, activities)
- ❌ Add database or authentication
- ❌ Build PDF export (Phase 2)
- ❌ Build PPTX export (not needed ever)
- ❌ Modify `/templates/tendencia-event-proposal` structure
- ❌ Leave inline `<style>` blocks in components
- ❌ Leave `<link>` tags in components
- ❌ Hardcode hex colors (#abc, #123456) in components
- ❌ Use decorators, experimental TypeScript, or bleeding-edge deps
- ❌ Create ad-hoc folder structures
- ❌ Use relative imports outside `lib/` (use absolute paths)
- ❌ Add unused dependencies
- ❌ Create circular dependencies
- ❌ Hardcode file paths (use variables)

---

## Three Specific Tasks

### Task 1: Form Loading
Route: `/api/templates/[id]/forms`

Must:
1. Accept templateId from URL
2. Load `/templates/{templateId}/forms/client.json`
3. Load `/templates/{templateId}/forms/event.json`
4. Load `/templates/{templateId}/forms/selections.json`
5. Return as: `{forms: [{id, title, fields}]}`

Each form field must have: `key`, `type`, `label`, `required`

### Task 2: Component HTML Cleanup
For EACH component in `/templates/tendencia-event-proposal/components/*/component.html`:

1. Remove all `<link rel="stylesheet">` tags
2. Remove all `<style>` blocks
3. Replace hardcoded colors with CSS variables
4. Convert custom CSS to Tailwind classes
5. Use Tabler icons: `<i class="ti ti-name"></i>` (no external link)
6. Keep structure clean and readable
7. Root div: `width: 1920px; height: 1080px; overflow: hidden`

### Task 3: Create Providers
Create these files in `/templates/tendencia-event-proposal/providers/`:

**hotels.ts** — returns `{hotels: [...]}`  
**activities.ts** — returns `{activities: [...]}`

Both must:
- Export `const provider` with `{name, description, async execute()}`
- Take `context` as parameter
- Return object that merges into context
- Use mock data (hardcoded arrays)

---

## Component HTML Quality Standards

### Must Be Clean
```html
<!-- ✅ GOOD -->
<div class="w-[1920px] h-[1080px] overflow-hidden bg-[var(--color-background)] p-12">
  <h1 class="text-5xl font-bold" style="color: var(--text-heading);">
    {{title}}
  </h1>
</div>
```

### Must NOT Be Cluttered
```html
<!-- ❌ BAD -->
<link rel="stylesheet" href="https://cdn...">
<style>
  .header {color: #1e40af; font-family: sans-serif;}
</style>
<div style="width: 1920px; height: 1080px; color: #333; background: #fff;">
  {{title}}
</div>
```

---

## Code Quality Rules

- **TypeScript:** Strict mode, explicit types, no `any` (unless necessary)
- **Folder structure:** Exactly as specified in PROJECT_SPEC.md
- **Module responsibility:** Single responsibility principle
- **Error handling:** Try-catch, meaningful messages
- **Logging:** Minimal in production, helpful in development
- **Testing:** Build each module standalone before wiring together

---

## Provider Interface (Strict)

Every provider MUST export:

```typescript
export const provider = {
  name: string;
  description: string;
  async execute(context: any): Promise<any>;
}
```

**NOT:**
- Default exports
- Function exports
- Class exports
- Dynamic exports

Always: `export const provider = {...}`

---

## Handlebars Usage Rules

Simple. Don't overcomplicate.

```javascript
import Handlebars from 'handlebars';

const template = Handlebars.compile(htmlString);
const rendered = template(dataObject);
```

Supported in components:
- `{{variable}}`
- `{{object.property}}`
- `{{#each array}}...{{/each}}`
- `{{#if condition}}...{{/if}}`

That's it. No custom helpers unless necessary.

---

## AI Integration Rules

### Prompt Format
Prompts live in `/templates/[id]/prompts/` as `.md` files.

**Must request JSON output:**
```markdown
Return ONLY this JSON:
{
  "field1": "value",
  "field2": ["array"]
}

Output format: Valid JSON only. No markdown.
```

### API Usage
```typescript
const anthropic = new Anthropic();
const message = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1000,
  messages: [{role: "user", content: promptWithContext}]
});
const result = JSON.parse(message.content[0].text);
```

Always:
- Use Claude Sonnet (locked)
- Limit max_tokens to reasonable values
- Expect JSON response (prompt requests it)
- Parse and handle errors

---

## File System Rules

- Templates live in `/templates/` (user responsibility)
- Engine reads from disk (no hardcoding)
- Use `fs` or dynamic imports for provider loading
- Cache template metadata if possible
- Error messages if template not found

---

## Dependency Rules

Use ONLY:
- next, react, typescript (locked)
- handlebars (locked)
- @anthropic-ai/sdk (locked)
- yaml (locked)
- zod (optional, for validation)
- tailwindcss, autoprefixer (styling)

NOT allowed:
- Custom UI libraries
- Database libraries (Prisma, Mongoose, etc.)
- Auth libraries (NextAuth, etc.)
- PDF libraries (Phase 2)
- Decorators or experimental features
- Bloated packages

---

## Testing Before Submission

Before handing code off, verify:

- [ ] `npm install` completes without warnings
- [ ] `npm run dev` starts on port 3000
- [ ] No TypeScript errors
- [ ] All modules import/export correctly
- [ ] Template loads from disk
- [ ] Blueprint parses without errors
- [ ] All form JSON files load
- [ ] Providers execute and return data
- [ ] AI integrates and parses JSON
- [ ] Pipeline runs end-to-end
- [ ] HTML renders with data injected
- [ ] No console errors
- [ ] No hardcoded business logic

---

## If You're Stuck

Ask yourself:

1. **"Is this domain-specific?"** If yes, move it to the template.
2. **"Did I hardcode data?"** If yes, make it data-driven.
3. **"Does this belong in engine?"** If no, it doesn't.
4. **"Would this work for ANY template?"** If no, reconsider.

---

## Final Check

Before you write a single line of code, answer these:

- [ ] I understand the engine is agnostic
- [ ] I know the pipeline flow completely
- [ ] I understand the three tasks (forms, components, providers)
- [ ] I know what's locked and what's flexible
- [ ] I know what NOT to do

If all are YES: Start building.