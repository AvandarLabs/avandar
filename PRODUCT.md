# Product

## Register

product

## Users

Mission-driven teams in the social sector: public-health, humanitarian, and nonprofit staff who have outgrown spreadsheets but are not running a data-engineering shop. They work in a browser (or the desktop app) inside a workspace, often under time pressure, switching between importing data, exploring it, and briefing others.

## Product Purpose

Avandar is the data platform for the social sector. It unifies datasets, queries, dashboards, maps, and case types in one workspace so a small team can clean, analyze, and report without Big Data tooling. Success looks like: a user can go from a file or open-data source to a trusted chart, map, or case record without leaving the product.

## Brand Personality

Calm, precise, mission-serious. Three words: **restrained, credible, useful**. The interface should disappear into the task. Confidence comes from familiar chrome, honest empty states, and the same nouns everywhere, not from decoration.

## Anti-references

- Generic enterprise admin: leftover "entity" jargon, info Callouts as empty states, raw object dumps as detail pages.
- A second product living inside the first: case management that does not sit on the AppLayout canvas the rest of the app uses.
- Loud SaaS: gradient text, glass cards, hero metrics, numbered section eyebrows.
- Warm cream/sand "AI default" palettes. Avandar is cool slate neutrals plus one blue.

## Design Principles

- **The canvas sits on the chrome.** App pages live in the raised AppLayout paper. They never paint onto the dark navbar shell.
- **Same vocabulary, same affordances.** If Data Sources uses a list pane + toolbar + empty Paper, Case Manager does too. Buttons, nav rows, and empty states share one component language.
- **Empty states teach the next action.** They name the thing in the user's words (a case type, a County) and offer one clear move. They never say "entity."
- **Hairline before shadow.** Elevation is a 1px token border plus a tight stacked shadow, not a floating card on a void.
- **Restrained accent.** Brand blue is for selection, primary actions, and focus. Neutral carries everything else.

## Accessibility & Inclusion

WCAG AA contrast (body text ≥4.5:1). Keyboard-complete primary flows, visible focus, labeled icon buttons, and `respectReducedMotion`. All user-facing copy goes through Lingui. Color is never the only state signal.
