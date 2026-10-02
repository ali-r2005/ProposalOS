# Tendencia Event Proposal Template

A template system for generating corporate event proposal presentations.

## Structure

```
├── blueprint.yaml          # Section definitions and data sources
├── form/
│   └── destination.json    # Input form schema (user-facing)
├── components/             # Slide components with schemas
│   ├── destination-intro/
│   ├── program-cover/
│   ├── practical-info/
│   └── ...
└── propmts/
    └── destination.md      # AI prompt for destination intro
```

## Blueprint Sections

| Section | Component | Source | Description |
|---------|-----------|--------|-------------|
| welcome | welcome | static | Static welcome slide |
| program-cover | program-cover | manual | Event header with client info |
| concept-statement | concept-statement | static | Concept overview |
| destination-mosaic | destination-mosaic | static | Destination imagery |
| **destination-intro** | **destination-intro** | **ai** | **AI-generated destination intro** |
| practical-info | practical-info | manual | Logistics details |
| accommodation-options | accommodation-options | database | Hotel options |
| activity-options | activity-options | manual | Activity selection |
| dining-options | dining-options | manual | Dining options |
| invitation-model | invitation-model | manual | Invitation design |
| closing-thanks | closing-thanks | manual | Closing slide |

## AI-Generated Content

The `destination-intro` section uses an AI prompt (`propmts/destination.md`) that returns JSON:
```json
{
  "destination-paragraphs": ["Paragraph 1...", "Paragraph 2..."]
}
```

## Input Form

`form/destination.json` defines all user inputs matching `program-cover` and `practical-info` component props.

## Usage

1. User fills `form/destination.json` fields
2. System renders static/manual sections
3. AI generates `destination-intro` from prompt
4. Database sections fetch accommodation/activities
5. Output: Complete presentation
