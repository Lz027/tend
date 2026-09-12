# Pathlight Brand Guidelines

## Product name

**Pathlight**

A calm, directional name that suggests clarity and forward momentum for sales and lead teams.

Alternatives considered:
- Converlane
- Northlane
- Beaconlane

## Positioning

Pathlight is a lead workspace for small teams who want to turn enquiries into customers without losing momentum. It captures leads through published forms, scores and routes them automatically, creates follow-up tasks, and keeps every touchpoint visible on a timeline.

## Personality

Professional and calm.

- Clear over clever.
- Trustworthy, not flashy.
- Helpful without being chatty.
- Confident in motion: every lead is "moving forward."

## Tagline options

- "Every lead, qualified and moving forward."
- "A clearer path from enquiry to customer."
- "Turn enquiries into timely conversations."

## Color palette

Keep the existing violet-tinted workspace with mint and coral accents.

| Token | Usage |
|-------|-------|
| Violet (`#635bff` / primary) | Buttons, links, active states, brand moments |
| Mint | Success, positive signals, Hot/Warm lead accents |
| Coral | Urgent flags, overdue tasks, destructive actions |
| Warm white (`#fcfbf8`) | Page backgrounds |
| Soft slate | Body text, borders, muted labels |

The app uses semantic Tailwind tokens (`bg-primary`, `text-muted-foreground`, etc.) so the palette can be retuned in `src/styles.css` without touching components.

## Typography

- **Headings**: Georgia, serif — for page titles and major section headings.
- **Body / UI**: system sans-serif stack — clean, readable, neutral.

## Logo and iconography

- Primary mark: a spark/star icon inside a rounded square (currently `Sparkles` from Lucide).
- Use the mark consistently in the sidebar, auth panel, and favicon.
- Keep icons simple and line-based; prefer Lucide throughout.

## Voice and tone

| Do | Don't |
|----|-------|
| Use plain, action-oriented labels: "Create form", "Assign lead" | Use jargon like "pipeline velocity" or "conversion optimization" |
| Write helper text as a short sentence | Use tooltips that state the obvious |
| Confirm outcomes: "Form published. Share this link." | Over-celebrate with exclamation marks |
| Use "you" and "your team" | Use "users" or "leads" as abstract labels |

## Naming conventions in the app

- A captured enquiry is a **lead**.
- A published capture surface is a **form**.
- An entry submitted through a form is a **submission**.
- A scheduled action tied to a lead is a **task**.
- A workspace member's access level is a **role**.
- Lead temperature is a **score band**: Hot, Warm, Cold, Disqualified.

## Responsive behavior

- Desktop: fixed 240 px left sidebar rail.
- Mobile: hidden sidebar with a sheet drawer; keep header sticky.
- Touch targets minimum 44 px.
