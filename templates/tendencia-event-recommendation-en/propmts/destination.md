# Destination Introduction

Generate a JSON object with a `destination-paragraphs` property containing an array of exactly 2 paragraphs introducing the destination for a corporate event proposal.

## Context
- **Destination**: {{destination}}

## Instructions
1. Generate exactly 2 paragraphs (each 40-50 words)
3. Base content on the {{destination}} property
4. the language that you will write the paragraphes with will be {{[langue]}}

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