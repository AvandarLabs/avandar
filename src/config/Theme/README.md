# Avandar theme

Mantine theme overrides and design tokens for the web app. **All brand colors
live here or in `shared/config/Theme.ts`.** Do not hardcode hex values in
components; use Mantine props, `theme.other`, or CSS variables below.

Wired in `AvandarUiProvider` via `Theme`, `cssVariablesResolver`, and types
in `src/lib/types/mantine.d.ts`.

## Files

| File                | Role                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `Theme.ts`          | Mantine `createTheme`, component defaults, `variantColorResolver`, CSS variable resolver |
| `themeElevation.ts` | Shadows, radii, borders, surface steps (light/dark)                                      |
| `AnimationTheme.ts` | Durations, easing, transition strings, overlay `transitionProps`                         |
| `index.ts`          | Public exports                                                                           |

**Shared palette (not duplicated here):** `shared/config/Theme.ts` exports
`AVANDAR_BLUE_SHADES`, `NEUTRAL_SHADES`, `PRIMARY_COLOR`. Import those only
when defining or extending palettes.

## Color tokens

Mantine color keys on `Theme.colors`:

| Key         | Semantic use                                                         |
| ----------- | -------------------------------------------------------------------- |
| `primary`   | Brand actions: primary buttons, links, focus accents, chart emphasis |
| `secondary` | Rare highlights; sparing accent only                                 |
| `neutral`   | Chrome, text hierarchy, outline controls (`color="neutral"`)         |
| `success`   | Completed, saved, positive outcomes                                  |
| `warning`   | Risky or approaching-limit states                                    |
| `danger`    | Errors, destructive actions                                          |
| `info`      | Informational callouts and tooltips                                  |

Use Mantine `color` + `variant` props (`filled`, `outline`, `light`, `subtle`, `default`). Outline buttons use palette shade 4 for borders (visible but restrained).

## Elevation

Hierarchy comes from **hairline borders first**, **tight stacked shadows
second** (not large diffuse blurs).

### Surfaces (`--ava-surface-*`)

| Token                   | Light mode      | Use                                           |
| ----------------------- | --------------- | --------------------------------------------- |
| `--ava-surface-body`    | App background  | Page canvas behind content                    |
| `--ava-surface-raised`  | White           | Cards, panels, floating tab indicator         |
| `--ava-surface-overlay` | White           | Modals, menus, dropdowns                      |
| `--ava-surface-sunken`  | Slightly darker | Inset areas, subtle hover on outline controls |

Dark mode: each step is **slightly lighter** than the layer below (see `ELEVATION_SURFACES_DARK`).

### Borders (`--ava-border-*`)

| Token                  | Use                                           |
| ---------------------- | --------------------------------------------- |
| `--ava-border-default` | Cards, inputs, dropdowns, dividers            |
| `--ava-border-strong`  | Stronger separation when default is too faint |
| `--ava-border-focus`   | Focus rings and active field borders          |

### Shadows (`theme.shadows` / `--mantine-shadow-*`)

| Size | Use                             |
| ---- | ------------------------------- |
| `xs` | Subtle lift (e.g. action icons) |
| `sm` | Default cards and `Paper`       |
| `md` | Menus, combobox dropdowns       |
| `lg` | Modals                          |
| `xl` | Rare; highest lift              |

### Radius (`theme.radius`, default `sm` ≈ 6px)

Prefer `sm` for controls and cards, `md` when slightly more rounding is needed.
Avoid Mantine’s larger default radii unless intentional.

## Motion

CSS-first; `respectReducedMotion` is enabled. Prefer `var(--ava-transition-*)`
in CSS modules over new animation libraries.

### Durations (`--ava-animation-duration-*`)

| Token              | Typical use                  |
| ------------------ | ---------------------------- |
| `instant` (50ms)   | Imperceptible feedback       |
| `fast` (120ms)     | Hovers, color changes, menus |
| `normal` (180ms)   | Modals, tab indicator travel |
| `moderate` (240ms) | Drawers, toasts              |
| `slow` (320ms)     | Large spatial moves (rare)   |

### Transition shortcuts (`--ava-transition-*`)

| Token                          | Use                                               |
| ------------------------------ | ------------------------------------------------- |
| `--ava-transition-colors`      | Text/background/border only                       |
| `--ava-transition-interactive` | Buttons, clickable rows (includes shadow/opacity) |
| `--ava-transition-transform`   | Scale/slide (do not animate layout properties)    |
| `--ava-transition-opacity`     | Fades                                             |
| `--ava-transition-shadow`      | Elevation changes                                 |

**Do not** set a full `transition` shorthand on elements that use Mantine’s `FloatingIndicator` (e.g. tab pill): it overrides transform/width/height and breaks slide animation.

Overlay components (Menu, Combobox, Modal, etc.) get `transitionProps` from `MANTINE_TRANSITION_PROPS` in `AnimationTheme.ts`.

## Navbar

CSS variables (not `--ava-*`):

- `--mantine-navbar-background`, `--mantine-navbar-color`
- `--mantine-navbar-hover-background`, `--mantine-navbar-active-background`
- `--navbar-transition-duration` (from `ANIMATION_DURATION.fast`)

Use in `*.module.css` under `src/components/AppShell/`, not in feature views.

## Z-index

| Constant                 | Value | Use                |
| ------------------------ | ----- | ------------------ |
| `APP_SHELL_MAIN_Z_INDEX` | 200   | Main content shell |
| `MODAL_ROOT_Z_INDEX`     | 300   | Modals above shell |

Anything above the main app must be **> 200**. Modals use 300 by default.

## TypeScript access

```ts
import { AnimationTheme, ELEVATION_SHADOWS, Theme } from "@/config/Theme";

const fast = Theme.other.animation.duration.fast;
const raised = Theme.other.elevation.surfaces.light.raised;
```

In CSS modules (inside `MantineProvider`):

```css
.card {
  background: var(--ava-surface-raised);
  border: 1px solid var(--ava-border-default);
  box-shadow: var(--mantine-shadow-sm);
  transition: var(--ava-transition-interactive);
}
```

## Where to change things

| Goal                           | Location                                                                  |
| ------------------------------ | ------------------------------------------------------------------------- |
| Brand / neutral palette        | `shared/config/Theme.ts`                                                  |
| Global button/input/modal look | `Theme.ts` → `components`                                                 |
| New CSS variable               | `cssVariablesResolver` in `Theme.ts` + `mantine.d.ts` if on `theme.other` |
| Shadow/border/surface math     | `themeElevation.ts`                                                       |
| Motion timing                  | `AnimationTheme.ts`                                                       |
| One-off component styling      | `@avandar/ui` or local CSS module usingvariables above                    |

Avoid per-view color overrides in `src/views` or `src/components` unless there
is no token yet; add the token here first.
