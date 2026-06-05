# 064 — Dashboard design tokens

- **Slug**: `dashboard-design-tokens`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-064/dashboard-design-tokens`
- **Depends on**: `none`
- **Estimated PR size**: medium — ~6 files, ~500 lines.

## Notes for future you

- Six themes (default / ocean / forest / rose / amber / graphite) × three typography variants (system / serif / mono) = 18 visual combinations. Test at least one of each on a representative dashboard.
- The "polished header" wording in the row description means: left-accent strip on the page title, tighter title leading, uppercase byline.

## What this feature is

`AvaPageRootProps` gains two design tokens:

- `theme: "default" | "ocean" | "forest" | "rose" | "amber" | "graphite"`
- `typography: "system" | "serif" | "mono"`

Plus a polished header (left-accent strip, tighter title leading, uppercase byline) and a polished DataViz card.

## Steps to migrate

**Step 0** — `/deslop undrift dashboard-design-tokens`.

1. Create the refactor branch.
2. Add the token types + CSS variable definitions.
3. Apply the polished header / DataViz card.

### Files to surgically edit on `develop`

- `src/components/AvaPage/AvaPage.tsx` (and `.types.ts`) — add the `theme` / `typography` props.
- `src/components/AvaPage/themes.module.css` (new) — CSS variables per theme.
- `src/components/Dashboard/blocks/DataViz/DataVizCard.module.css` — polished card styling.

## How to mark this feature completed

Standard ritual.
