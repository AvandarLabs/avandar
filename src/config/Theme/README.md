# Avandar theme

Mantine theme overrides and design tokens for the web app. **All brand colors
live here or in `shared/config/Theme.ts`.** Do not hardcode hex values in
components; use Mantine props, `theme.other`, or CSS variables below.

Wired in `AvandarAppProvider` via `Theme`, `cssVariablesResolver`, and types
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
| `--ava-surface-body`    | App background  | Page surface behind content                   |
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

| Token                                | Use                                                |
| ------------------------------------ | -------------------------------------------------- |
| `--ava-transition-colors`            | Text/background/border only                        |
| `--ava-transition-interactive`       | Buttons, clickable rows (includes shadow/opacity)  |
| `--ava-transition-transform`         | Scale/slide (do not animate layout properties)     |
| `--ava-transition-opacity`           | Fades                                              |
| `--ava-transition-shadow`            | Elevation changes                                  |
| `--ava-animation-duration-ooze-in`   | Ooze-in preset duration                            |
| `--ava-animation-duration-swipe-out` | Swipe-out preset duration                          |
| `--ava-animation-duration-pop-in`    | Overlay pop-in duration (modals, dropzone, NUX)    |
| `--ava-animation-easing-pop`         | Overshoot ease for overlay pop-in                  |
| `--ava-animate-pop-in-from-*`        | Hidden-state transform and blur for overlay pop-in |
| `--ava-animate-swipe-translate-x`    | Swipe-out horizontal offset (default 12px)         |
| `--ava-animate-origin-x` / `-y`      | Per-instance transform origin for ooze-in          |

**Do not** set a full `transition` shorthand on elements that use Mantine’s `FloatingIndicator` (e.g. tab pill): it overrides transform/width/height and breaks slide animation.

### Animation presets (CSS classes)

Global keyframes live in `animationPresets.css` (imported from `main.tsx`). Use with `ANIMATION_PRESET` from `AnimationTheme`:

| Preset     | Class                   | Use                                                                      |
| ---------- | ----------------------- | ------------------------------------------------------------------------ |
| `oozeIn`   | `ava-animate-ooze-in`   | Springy grow from a trigger; set origin via `buildAnimateOriginStyle`    |
| `swipeOut` | `ava-animate-swipe-out` | Fade + light slide right on dismiss                                      |
| `popIn`    | `ava-animate-pop-in`    | Scale-blur overshoot used by modals, the dropzone card, and NUX tooltips |
| `active`   | `ava-animate-active`    | `will-change` helper while a preset animation runs                       |

```tsx
import { ANIMATION_PRESET, buildAnimateOriginStyle } from "@/config/Theme";

<div
  className={ANIMATION_PRESET.oozeIn.className}
  style={buildAnimateOriginStyle(buttonRect, panelRect)}
/>;
```

`oozeIn` and `swipeOut` currently have no callers in the app. `popIn` is
applied by `NuxTooltip` on mount; Modal and the dropzone card consume the same
tokens through `MODAL_CONTENT_TRANSITION` and CSS variables.

Overlay components (Menu, Combobox, Modal, etc.) get `transitionProps` from `MANTINE_TRANSITION_PROPS` in `AnimationTheme.ts`.

## Navbar

CSS variables (not `--ava-*`):

- `--mantine-navbar-background`, `--mantine-navbar-color`
- `--mantine-navbar-hover-background`, `--mantine-navbar-active-background`
- `--navbar-transition-duration` (from `ANIMATION_DURATION.fast`)

Use in `*.module.css` under `src/components/AppShell/`, not in feature views.

## Z-index

One tier per layer, all declared in `Theme.ts`. Never write a bare number.

| Constant                       | Value | Use                                                     |
| ------------------------------ | ----- | ------------------------------------------------------- |
| (Mantine `AppShell` default)   | 100   | Shell header; its sidebar and chat aside paint at 101    |
| `APP_SLATE_Z_INDEX`            | 150   | The slate (`AppSlate` paper)                             |
| (Mantine overlay default)      | 200   | `Drawer`, `Spotlight`: not overridden                    |
| `APP_CHROME_Z_INDEX`           | 250   | Floating toolbars, mobile sidebar, chat composer overlay |
| `FLOATING_PANEL_Z_INDEX`       | 300   | Floating surfaces that must clear app chrome             |
| `MODAL_ROOT_Z_INDEX`           | 400   | Modals; `NUX_TOUR_Z_INDEX` shares this layer             |
| `NUX_CHECKLIST_Z_INDEX`        | 401   | "Get started" card, above the tour overlay               |
| `MODAL_ABOVE_NUX_TOUR_Z_INDEX` | 403   | Modals that interrupt the tour                           |
| `POPOVER_Z_INDEX`              | 500   | Menus, popovers, comboboxes, tooltips                    |
| `NOTIFICATIONS_Z_INDEX`        | 10000 | Toasts                                                   |

The slate tier is bounded on both sides: above the shell so the slate drop
shadow is not clipped at the sidebar edge, and below 200 so Mantine's own
overlay defaults still cover it. `Theme.test.ts` asserts both. See
[`docs/app-shell-nomenclature.md`](../../../docs/app-shell-nomenclature.md).

In CSS modules, read the tiers as variables: `--mantine-z-index-app-slate`,
`--mantine-z-index-app-chrome`, `--mantine-z-index-floating-panel`,
`--mantine-z-index-modal`, `--mantine-z-index-popover`,
`--mantine-z-index-notifications`.

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
| Motion timing / presets        | `AnimationTheme.ts`, `animationPresets.css`                               |
| One-off component styling      | `@avandar/ui` or local CSS module usingvariables above                    |

Avoid per-view color overrides in `src/views` or `src/components` unless there
is no token yet; add the token here first.
