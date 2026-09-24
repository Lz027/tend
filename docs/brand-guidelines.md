# Tend Brand Guidelines

## Product name

**Tend**

Bright, short, friendly, easy to say and spell. It suggests something cheerful that "pops up"
— which is exactly what a new enquiry does.

Tagline: **Leads that pop up, sorted.**

## Positioning

Tend is a lead workspace for small creative teams — freelancers, web and design agencies,
studios, and local service businesses — who need to manage project enquiries without the
weight of a traditional CRM.

Core promise: **Tend turns scattered enquiries into clear next actions.**

Tend owns the lead record, qualification, routing, tasks, timeline and event history.
Make, n8n and Zapier are optional connectors for data in and events out. Tend is not an
automation builder.

## Personality

Playful, warm, confident, efficient, approachable. Clear rather than corporate.

- Organised does not have to mean cold.
- Every screen answers "what should happen next?"
- Celebrate briefly, then get out of the way.

## Colour palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | Berry violet `#5b5bd6` | Buttons, links, active nav, brand moments |
| Secondary | Violet `#8b5cf6` | Secondary actions, charts, gradients |
| Accent | Pink `#f472b6` | Hot leads, highlights, playful emphasis |
| Highlight | Warm yellow `#fde68a` | Warm band, callouts, badges |
| Success | Mint | Qualified band, healthy connections |
| Destructive | Coral red | Overdue, failed deliveries, destructive actions |
| Background | Soft off-white | Page background |
| Foreground | Charcoal violet | Body text |
| Border | Lavender grey | Cards, dividers, inputs |

All values live as semantic tokens in `src/styles.css` (oklch). Components must use
`bg-primary`, `text-muted-foreground`, `score-hot` and friends — never raw colour classes.

## Typography

- **Headings**: Fredoka — rounded display face, friendly and confident.
- **Body / UI**: Nunito Sans — clean, readable, warm.

## Shape and motion

- Rounded cards (radius `0.9rem` and up), chunky pill status badges.
- Soft shadows, generous padding, plenty of breathing room.
- Motion is purposeful: a light lift on hover, a small press-scale on click (`pop-press`).
  No decorative animation.

## Logo and iconography

- Primary mark: a simple tend bloom / spark inside a rounded square in berry violet.
- Use it in the sidebar, the auth panel, public forms and the favicon.
- Icons stay simple and line-based; Lucide throughout.

## Voice and tone

| Do | Don't |
|----|-------|
| "Your pipeline is clear. New opportunities will pop up here." | "No leads found." |
| "Connect your tools." | "Webhook configuration." |
| "This connection needs attention." | "Failed delivery." |
| "Contact Maya within 4 hours." | "SLA breach imminent." |
| Use "you" and "your team" | Use "users" and "entities" |

Friendly, but still professional enough for a business workspace. No exclamation-mark spam,
no jargon like "pipeline velocity".

## Naming conventions in the app

- A captured enquiry is a **lead**.
- A published capture surface is a **form**.
- An entry submitted through a form is a **submission**.
- A scheduled action tied to a lead is a **task**.
- A workspace member's access level is a **role**.
- Lead temperature is a **score band**: Cold, Warm, Qualified, Hot.
- Follow-up health is **engagement**: On track, At risk, Overdue.
- An external connection is a **connection** (inbound source or outbound endpoint).

## Score bands

```text
0–29    Cold
30–59   Warm
60–79   Qualified
80–100  Hot
```

## Responsive behaviour

- Desktop: fixed 240 px left sidebar rail.
- Mobile: sheet drawer navigation, sticky header.
- Touch targets minimum 44 px.
