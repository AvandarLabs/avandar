---
name: Avandar
description: Cool-slate product UI for social-sector data work. Figtree, hairline elevation, one blue accent.
colors:
  primary: "#1563fe"
  primary-soft: "#edf6ff"
  primary-deep: "#0b4aea"
  ink: "#102a43"
  body: "#f0f4f8"
  raised: "#ffffff"
  sunken: "#d9e2ec"
  chrome: "#486581"
  chrome-ink: "#ffffff"
  border: "#102a4326"
  danger: "#e53523"
  success: "#40cf5e"
  warning: "#f1c617"
  info: "#3bc9e1"
typography:
  body:
    fontFamily: "Figtree, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  title-sm:
    fontFamily: "Figtree, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  title-lg:
    fontFamily: "Figtree, sans-serif"
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.02em"
rounded:
  sm: "6px"
  md: "8px"
  xl: "12px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.raised}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-light:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  canvas:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  empty-state:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "32px"
---

## Overview

Avandar is a **product** surface: authenticated workspace tools (data sources, explorer, dashboards, maps, case manager) inside a dark slate chrome. The main scene is a raised light canvas (`AppLayout` paper) sitting on `--mantine-navbar-background`. Pages that skip that canvas look like a different product.

Identity: Figtree, cool blue-gray neutrals (`NEUTRAL_SHADES`), brand blue `#1563fe`. Hierarchy is hairline borders first, tight stacked shadows second. Density is comfortable-compact. Motion is 140–200ms ease-out, never choreographed page-load.

## Colors

Restrained strategy. Body is tinted toward brand hue (`#f0f4f8`), not cream. Ink is `neutral.9` (`#102a43`). Chrome is `neutral.6` (`#486581`) with white labels. Primary is used for filled actions, current nav selection, and focus rings only.

Semantic ramps live on the Mantine theme: `success`, `warning`, `danger`, `info`. Info callouts are for failures and warnings, not for "nothing selected." Empty canvases use a raised Paper, a light primary ThemeIcon, and dimmed body copy (`neutral` text, not washed gray-on-tint).

Do not introduce a second accent in case management. Do not paint the detail pane with the chrome color.

## Typography

One family: Figtree. Product scale, not fluid display type. Toolbar titles are `order={2}` at `size="sm"` / `fw={500}` (`AppToolbar`). Empty-state headings are `order={2}` / `fw={650}`. List rows are `sm` / `fw={500}`. Body copy caps around 65ch in empty states.

No display serifs. No gradient text. `text-wrap: balance` on empty-state headings.

## Elevation

Surfaces: `--ava-surface-body` (page inside the canvas), `--ava-surface-raised` (cards, list panes sit on body), `--ava-surface-sunken` (hover on outline controls). Borders: `--ava-border-default` on every raised edge. Shadows: `xs` on small controls, `sm` on Paper/Card, `md` on menus.

The AppLayout paper uses a stronger edge (`neutral.7` + stacked shadow) so it reads as a window on the chrome. Inner list panes use `neutral.0` fill and a 1px `neutral.2` divider, matching Data Sources.

Never pair a 1px border with a ≥16px blur shadow. Card radius tops out at `sm`/`md` (6–8px).

## Components

- **App shell:** dark navbar, optional chat aside, light AppLayout canvas with toolbar (sidebar toggle, title, compact-sm light buttons, chat toggle). Case Manager's expanded Ask Avandar panel overlays the canvas (`OverlayTheme` backdrop + panel shadow) instead of growing the aside column.
- **Master-detail:** 240px min list pane + scrolling detail. List rows are `NavLinkList` with `inactiveHoverColor="neutral.1"` on a `neutral.0` pane so hover is visible. Active row uses primary filled.
- **Toolbar actions:** `Button size="compact-sm" variant="light"` with a plus or settings icon, same as Data Sources / Dashboards.
- **Empty states:** centered-ish Paper (`p="xxl"`, `maw={560|720}`), ThemeIcon `variant="light" color="primary"`, heading + dimmed sentence + one primary button. Not an info Alert/Callout.
- **Errors:** `Callout` (Alert) is reserved for load failures.
- **Forms:** Mantine inputs, `radius="sm"`, label + placeholder in the user's nouns (case type, not profile/entity).
- **Motion:** `--ava-transition-interactive` on clickable rows; empty-state entrance 200ms ease-out; honor `prefers-reduced-motion`.

## Do's and Don'ts

**Do**

- Put every case-manager view inside `AppLayout`.
- Call a County a County. Call a case type a case type.
- Use the Data Sources list pane as the spatial template for concept and individual lists.
- Keep empty states instructional: what is this, what to do next.

**Don't**

- Leave AppShell.Main unpainted so the dark chrome shows through.
- Use `Callout color="info"` for selection/empty.
- Title a list "{name} Manager".
- Say "entity", "profile manager", or "Sync data!" in the UI.
- Give list rows a left accent stripe, or hover color equal to the pane background.
