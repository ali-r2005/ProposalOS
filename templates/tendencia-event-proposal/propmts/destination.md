# Destination Introduction

Generate a JSON object with a `destination-paragraphs` property containing an array of exactly 2 paragraphs introducing the destination for a corporate event proposal.

## Context
- **Destination**: {{event.destination}}
- **Event type**: {{event.eventType}}
- **Participants**: {{event.participants}} people
- **Duration**: {{event.days}} days

## Instructions
1. Generate exactly 2 paragraphs (each 80-120 words)
2. Paragraph 1: Attention-grabbing opening about why this destination is ideal for {{event.eventType}}, highlighting 2-3 unique selling points (culture, activities, climate, connectivity)
2. Paragraph 2: How the destination facilitates {{event.eventType}} objectives and a forward-looking statement about the experience ahead
3. Base content on the {{event.destination}} property

## Tone
Professional, enthusiastic, persuasive. Write for a corporate decision-maker.

## Output
JSON object only with this exact structure:
```json
{
  "destination-paragraphs": [
    "First paragraph text here...",
    "Second paragraph text here..."
  ]
}
```
No markdown, no HTML, no extra fields, no extra commentary.