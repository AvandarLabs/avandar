---
name: Avandar
description: Cool blue-gray product UI for social-sector data work. Figtree, hairline elevation, one blue accent.
colors:
  primary: "#1563fe"
  primary-soft: "#edf6ff"
  primary-active: "#2983ff"
  primary-deep: "#0b4aea"
  ink: "#102a43"
  ink-soft: "#243b53"
  body: "#f0f4f8"
  raised: "#ffffff"
  sunken: "#d9e2ec"
  chrome: "#486581"
  chrome-ink: "#ffffff"
  border: "rgba(16, 42, 67, 0.2)"
  border-strong: "rgba(16, 42, 67, 0.32)"
  border-focus: "rgba(16, 42, 67, 0.44)"
  danger: "#e53523"
  success: "#40cf5e"
  warning: "#f1c617"
  info: "#3bc9e1"
typography:
  body:
    fontFamily: "Figtree, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  title-sm:
    fontFamily: "Figtree, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "normal"
  title-lg:
    fontFamily: "Figtree, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "normal"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
spacing:
  xxxs: "2px"
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
  xxxl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.raised}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "0 18px"
  button-light:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.sm}"
    height: "26px"
    padding: "0 10px"
  button-default:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "0 18px"
  card:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "16px"
  input:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "36px"
  nav-row-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.raised}"
    rounded: "{rounded.sm}"
    typography: "{typography.title-sm}"
  slate:
    backgroundColor: "{colors.body}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  empty-state:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "48px"
    width: "720px"
---

# Design System: Avandar

## Overview

**Creative North Star: "The Public Observatory"**

A public observatory is research-grade apparatus that exists so people who could never afford one can use it. That is the whole brief. Avandar puts genuinely powerful data machinery (an ontology layer, in-browser DuckDB, query-time integration) in the hands of teams who were priced out of it, and the interface has to carry both halves at once: the precision that makes it credible, and the plainness that makes it usable by someone who is a public-health expert rather than a data engineer. Neither half may be sacrificed for the other. Cheapness of price must never read as cheapness of build.

The image is literal here. A dark surround with one brightly lit precise surface: the **slate**, a raised light view floating on the dark shell, its contents swapped as you navigate. Structure is drawn in hairlines, the way an instrument is marked, not in shadows and fills. The single blue marks only the thing you are actually looking at. And because the public is the point, every label is in the user's own nouns and every empty state teaches the next move: a visitor who is not an astronomer still has to be able to work the instrument.

Density is comfortable-compact. Motion is short and physical, never a choreographed page-load. The interface recedes so the work is visible; the brand lives in precision and restraint, not ornament.

**Key Characteristics:**

- One raised light slate on dark chrome, framed by an 8px gutter on all four sides
- Hairline borders first, tight stacked shadows second
- One family (Figtree), one accent (`#1563fe`), neutral carrying everything else
- Plain-language nouns everywhere; no internal jargon reaches the UI
- Instructional empty states, never an info Callout
- Motion in the 140-200ms band for state, with three named presets for entrances

**Confirmed rejections.** Generic enterprise admin (leftover "entity" jargon, info Callouts used as empty states, raw object dumps as detail pages). A second product living inside the first (a view that does not sit on the slate the rest of the app uses). Loud SaaS (gradient text, glass cards, hero metrics, numbered section eyebrows). Warm cream and sand "AI default" palettes: this system is cool blue-gray plus one blue.

Region names (slate, sidebar, gutter, chat aside, docked drawer) and the z-index tiers that keep them stacked are defined in [`docs/app-shell-nomenclature.md`](docs/app-shell-nomenclature.md). Use those words here and in code. "Slate" is the raised view and never a color; the shell's dark blue-gray is not "slate".

## Colors

A restrained cool palette: one brand blue against a ten-step blue-gray ramp, with four semantic ramps held in reserve for state.

### Primary

- **Brand Blue** (`#1563fe`): filled primary actions, focus rings, and the current selection. This is the official brand color (`neutral` ramp aside, it is the only hue in the system with a job).
- **Pale Blue Wash** (`#edf6ff`): the `light` button variant's fill and light `ThemeIcon` backgrounds. Reads as "primary, but quiet."
- **Deep Blue** (`#0b4aea`): text and icons sitting on Pale Blue Wash, and the primary hover state.
- **Bright Blue** (`#2983ff`): the active row fill in a master-detail list (`primary.5`, deliberately one step lighter than Brand Blue so a filled row does not shout).

### Neutral

- **Deep Blue-Gray Ink** (`#102a43`): all body text (`neutral.9`).
- **Soft Ink** (`#243b53`): text on `default`-variant buttons (`neutral.8`).
- **Muted Steel Chrome** (`#486581`): the shell background and sidebar (`neutral.6`), with white labels on top. The dark field the slate floats on.
- **Tinted Cool Paper** (`#f0f4f8`): the body surface, including the slate itself (`neutral.0`). Tinted toward the brand hue, never cream.
- **Sheet White** (`#ffffff`): raised surfaces (cards, panels, menus, empty states) sitting on Tinted Cool Paper.
- **Pale Steel** (`#d9e2ec`): sunken state, the hover fill on `subtle` and `default` controls, and panel headers (`neutral.1`).

### Semantic

Four ramps live on the theme: `success` (`#40cf5e`), `warning` (`#f1c617`), `danger` (`#e53523`), `info` (`#3bc9e1`). They signal state only. Note that `Callout` defaults to `danger`: the component was built for failures, not for information.

### Named Rules

**The One Blue Rule.** Neutral carries the interface; blue marks intent. In the current codebase `color="neutral"` outnumbers `color="primary"` by roughly six to one, and that ratio is the target, not an accident. If a screen needs a second accent to make sense, the hierarchy is wrong, not the palette.

**The No Second Accent Rule.** The theme declares a `secondary` amber ramp (`#f0b429` family) that no UI uses. It is dormant, not available. Do not reach for it to differentiate a feature area.

**The Cool Ground Rule.** Every neutral is tinted toward the brand hue. Warm grays, creams, and sands are off-system. Mantine's stock `gray` ramp is untinted and is not this system's `neutral`: `gray.0` (`#f8f9fa`) and `neutral.0` (`#f0f4f8`) are visibly different grounds. **The app contains no stock `gray` at all**, and that is worth keeping true: a `gray` appearing anywhere is a regression, not a shade choice. The two ramps do not step alike, so a `gray.N` is never converted by index. Convert by role instead: a panel ground is `--ava-surface-body`, a recessed fill is `neutral.1`, and any 1px edge is `--ava-border-default` or `--ava-border-strong`.

### Dark mode: built, not shipped

The theme defines a complete dark palette (surfaces, three border tiers, and shadow overrides in `cssVariablesResolver`). Nothing ships it: `MantineProvider` sets no color scheme, and no code calls `useMantineColorScheme`. Light is the only mode a user can reach. Keep the tokens alive and keep new surfaces token-driven so dark stays cheap to turn on, but do not design against dark, do not promise it, and do not treat a dark bug as shipping-critical until a toggle exists.

## Typography

**Body Font:** Figtree (with `sans-serif` fallback)

There is no second family. No display serif, no mono pairing, no gradient text.

**Character:** Figtree is a geometric sans with open apertures and a low-contrast, unfussy skeleton. It stays legible small and dense, which is what a data product needs, and it reads as competent rather than expressive. This is a product type scale, not an editorial one: nothing here uses fluid `clamp()` display sizing.

### Hierarchy

- **Title (large)** (650 weight, `1.625rem` / 26px at scale 1, 1.3): empty-state headings and page-level titles. The heaviest weight in the system.
- **Title (small)** (500 weight, `0.875rem` / 14px, 1.45): slate toolbar titles (`AppToolbar` renders `order={2}` at `size="sm"`) and master-detail list rows. A heading by role, not by size.
- **Body** (400 weight, `1rem` / 16px, 1.55): all reading copy. Cap around 65ch in empty states and long prose.

### Named Rules

**The Sizeless Heading Rule.** Semantic level and visual size are decoupled. `Title order={2}` is 26px in an empty state and 14px in a toolbar. Set the order for structure and screen readers, then set `size` for the context. Never pick the order to get a size.

**The Balanced Heading Rule.** `text-wrap: balance` on empty-state headings, so a two-line title breaks evenly instead of leaving one orphaned word.

## Layout

The app is a fixed full-height shell, not a scrolling page. `AppSlate` occupies `100dvh` and only the content region inside it scrolls.

**The shell.** A dark sidebar, an optional chat aside on the right ("Ask Avandar"), and the slate between them. The slate is wrapped in a `Flex` with `p="xs"`, which is the **gutter**: 8px of shell background on all four sides, and the thing that makes the slate read as a separate object rather than a pane. On the desktop build the top padding is dropped so the title-bar drag region sits flush.

**Inside the slate.** A toolbar band across the top (sidebar toggle, view title, view actions, chat toggle), then a full-bleed scrolling content container. A view may request a *floating toolbar* instead, which drops the band and overlays the controls on the view (Maps does this).

**Master-detail.** The dominant view pattern: a list pane with a 240px minimum beside a scrolling detail region. Data Sources is the spatial template; Case Manager and the ontology views follow it.

**Spacing.** A nine-step scale from 2px to 64px, every step multiplied by `--mantine-scale`. The everyday steps are `xs` (8px, the gutter), `sm` (12px), `md` (16px), and `lg` (24px). `xxl` (48px) is the empty-state panel padding.

**Breakpoints.** `xs` 36em, `sm` 48em, `md` 62em, `lg` 75em, `xl` 88em, em-based to match Mantine's convention.

### Named Rules

**The Tablet Downshift Rule.** Avandar's UI is designed for desktop. Rather than reflowing at tablet widths, the whole system shrinks: `--mantine-scale` drops to `0.8` between 48em and 75em and `0.9` between 75em and 88em, which rescales every spacing, font size, radius, shadow, and shell width in one place. Never hand-tune a component for tablet. If it is 25% oversized on an iPad, the scale is doing its job and your override will fight it.

**The Gutter Rule.** The slate keeps its 8px frame of shell background on all four sides. Taking the gutter off, or letting a parent clip it, collapses the central metaphor.

## Elevation & Depth

This is a hairline system with shadow as reinforcement, not a shadow system. A crisp 1px border is what tells the eye "this is a distinct surface"; the shadow only adds "and it is sitting above the background." Surfaces step through tonal layers (`body` to `raised` to `overlay`), and borders come in three tiers.

**Surface steps (light).** `--ava-surface-body` `#f0f4f8` (the slate and page ground) → `--ava-surface-raised` `#ffffff` (cards, panels, list panes) → `--ava-surface-overlay` `#ffffff` (menus, modals). `--ava-surface-sunken` `#d9e2ec` is the hover fill on outline and subtle controls, and also serves panel headers.

**Border tiers.** `--ava-border-default` for the everyday edge (cards, panels, inputs, dropdowns, dividers); `--ava-border-strong` only when default washes out against a tinted surface or a divider must read as a structural break; `--ava-border-focus` for focus rings and active fields, never decoratively.

### Shadow Vocabulary

Every step is a stacked pair: one tight low-offset layer plus one softer, larger layer, both tinted with `neutral.9` (`rgb(16, 42, 67)`) rather than pure black, at low alpha.

- **xs** (`0 1px 1px /.08, 0 1px 2px /.05`): small controls, `default`-variant buttons.
- **sm** (`0 1px 2px /.10, 0 2px 5px /.06`): the `Paper` and `Card` default.
- **md** (`0 2px 3px /.10, 0 4px 10px /.07`): menus, popovers, combobox dropdowns, notifications.
- **lg** (`0 3px 4px /.11, 0 8px 20px /.08`) and **xl** (`0 4px 6px /.12, 0 14px 32px /.10`): reserved; rare in current UI.

**The slate's own shadow is not from this scale.** It uses a stronger neutral.7 edge and `0 1px 2px rgb(0 0 0 / 20%), 0 8px 24px rgb(0 0 0 / 25%)` because it has to read as floating on a dark field rather than lifting off a light one. That shadow deliberately spills past the gutter onto the sidebar and the chat aside, which is why the slate is raised to `APP_SLATE_Z_INDEX` (150). Clipping it back to the gutter is a bug, not a tidy-up.

**Overlays.** Full-screen dim is `rgb(15 23 42 / 38%)` with `blur(6px) saturate(140%)`. The elevated panel on top uses a deep lift plus a 1px inset white highlight (`0 25px 50px -12px rgb(15 23 42 / 35%), 0 0 0 1px rgb(255 255 255 / 50%) inset`) at radius `xl`. This is the one place the system goes dramatic, and it is reserved for modals and the import drop overlay.

### Named Rules

**The Hairline-Before-Shadow Rule.** Elevation is a 1px token border plus a tight stacked shadow. Never a floating card on a void. If a surface is raised, it has a border.

**The Paired-Token Rule.** Always pair an `--ava-border-*` with the matching `--ava-surface-*` and an elevation step. Never hand-pick a neutral shade for an edge. This is what keeps elevation consistent across components and makes dark mode a token swap rather than a rewrite.

**The Blur Ceiling Rule.** Ordinary surfaces never pair a 1px border with a blur of 16px or more. The two documented exceptions are the slate and the overlay panel, both of which are floating on something dark and both of which are specified above. If you are writing a third one, you are inventing a tier.

## Shapes

Tighter radii than Mantine's defaults, and a rectilinear form language throughout. Nothing here is pill-shaped, circular, or clipped to a non-rectangular silhouette; the one round form is a `ThemeIcon` at `radius="xl"` in empty states.

**Radius scale:** `xs` 4px, `sm` 6px, `md` 8px, `lg` 10px, `xl` 12px, each scaled by `--mantine-scale`. `sm` (6px) is the global default and the value on nearly every control: buttons, action icons, inputs, selects, menus, popovers, tooltips, notifications, cards, and panels. Card and panel radius tops out at `sm`/`md`.

**The slate's corner is the one signature shape.** `border-radius: 8px 8px 12px` gives it 8px on both top corners and the bottom left, and 12px on the bottom right. It is asymmetric on purpose and it is the only asymmetric radius in the system.

**Borders are hairlines.** 1px, always a token, always paired with a surface (see Elevation & Depth).

### Named Rules

**The Six-Pixel Default Rule.** If you are setting a radius and have no specific reason, it is `sm` (6px). A control with a radius above `md` reads as a different product.

## Components

### Buttons

- **Shape:** gently curved (6px, `radius="sm"`), 500 weight, with `--ava-transition-interactive` on every state change.
- **Primary** (`variant="filled"`): Brand Blue fill, white label. Filled actions, one per view where possible.
- **Light** (`variant="light"`): Pale Blue Wash fill, Deep Blue label, hairline border. This is the standard slate-toolbar action at `size="compact-sm"` with a leading plus or settings icon, identical across Data Sources, Dashboards, and Case Manager.
- **Default** (`variant="default"`): white fill, Soft Ink label, `--ava-border-default` edge, `xs` shadow. The only button variant that carries a shadow at rest.
- **Outline:** transparent fill, `primary.4` border, `primary.7` label, `primary.0` hover.
- **Subtle:** transparent, no border, sunken fill on hover.

### Cards / Containers

- **Corner Style:** 6px (`radius="sm"`).
- **Background:** Sheet White on the Tinted Cool Paper ground.
- **Border:** `--ava-border-default`, applied by default (`withBorder` is on in the theme).
- **Shadow Strategy:** `sm` by default; see Elevation & Depth.

### Inputs / Fields

- **Style:** 6px radius, white fill, `--ava-border-default` edge.
- **Focus:** the border shifts to `--ava-border-focus`. No glow, no ring offset.
- **Dropdowns:** Select, MultiSelect, Autocomplete, and TagsInput all route through Combobox with `md` shadow, a hairline border, and a 140ms `pop` transition. Labels and placeholders use the user's nouns ("case type", never "profile" or "entity").

### Navigation

- **Sidebar:** Muted Steel Chrome fill with white labels, hover and active both at `neutral.7`.
- **Master-detail rows** (`NavLinkList`): 14px / 500 weight, truncated with a full-text tooltip. Active row is filled Bright Blue (`primary.5`) with a white label. Inactive hover defaults to `neutral.0`, and must be set to `neutral.1` when the pane itself is `neutral.0`, or the hover is invisible.

### Empty States

The single most important component in the system, because it is where a new user learns what a surface is for.

- A raised Paper, `p="xxl"` (48px), `maw={720}`, centered.
- An optional 64px `ThemeIcon` at `radius="xl"`, `variant="light"`, inheriting primary.
- A 650-weight heading, then one dimmed sentence, then at most one action.
- It enters with an 8px rise and fade over 200ms, and does not animate at all under `prefers-reduced-motion`.

### Callouts

`Callout` wraps Mantine `Alert` at `variant="light"` with a 32px icon and **defaults to `danger`**. It is for load failures and warnings. `Callout.Info` exists for genuine advisories, not for "nothing selected."

### Overlays

Modals are centered at radius `xl`, with a transparent Mantine overlay replaced by the shared backdrop (`rgb(15 23 42 / 38%)` + `blur(6px) saturate(140%)`), a bordered header, and the overlay panel shadow. Case Manager's expanded Ask Avandar panel uses the same backdrop and overlays the slate rather than growing the aside column.

### The Slate (signature component)

The raised view that holds the current app. A `Paper` on the Tinted Cool Paper body surface, `8px 8px 12px` corners, a `neutral.7` edge, its own two-layer shadow, and `z-index: 150`. It is the only region that changes on navigation, and every app view lives inside one.

The z-index is load-bearing. Mantine paints the navbar and aside above content left in normal flow, so an unraised slate has its shadow chopped into a hard vertical line at the sidebar edge. Raise the slate's paper and never `AppShell.Main`, whose box bleeds over the navbar and would swallow sidebar clicks.

### Motion

Five durations (`instant` 80ms, `fast` 140ms, `normal` 200ms, `moderate` 270ms, `slow` 350ms) and six easings, the default being `out` (`cubic-bezier(0.16, 1, 0.3, 1)`).

- **Interactive** (the default for anything clickable): color, background, and border at 140ms; box-shadow at 200ms; opacity at 140ms.
- **Named presets:** `ooze-in` (280ms, spring easing) for panels arriving; `swipe-out` (140ms, 12px upward travel) for dismissals; `pop-in` (380ms, `cubic-bezier(0.34, 1.56, 0.64, 1)`, from `scale(0.72) translateY(20px)` with a 10px blur) for modal content.
- **Per-surface:** menus, popovers, comboboxes, and tooltips at 140ms; drawers and notifications at 270ms.
- **Reduced motion:** the theme sets `respectReducedMotion`, and presets collapse to 120ms.

`pop-in` is the one genuinely expressive gesture in the system and it is scoped to modal content. Do not spread it.

## Do's and Don'ts

### Do:

- **Do** put every app view inside `AppSlate` so it gets the slate, the toolbar, and the gutter.
- **Do** pair an `--ava-border-*` token with the matching `--ava-surface-*` token and an elevation step, rather than picking neutral shades by hand.
- **Do** default to `radius="sm"` (6px) and `color="neutral"`, and spend Brand Blue only on filled actions, current selection, and focus.
- **Do** call a County a County and a case type a case type. Use the user's nouns in every label, placeholder, and empty state.
- **Do** use the Data Sources list pane as the spatial template for any new master-detail surface.
- **Do** keep empty states instructional: what this is, and the one next move.
- **Do** let `--mantine-scale` handle tablet sizing.
- **Do** use the shell vocabulary (slate, gutter, sidebar, chat aside) in code, comments, and design discussion.

### Don't:

- **Don't** leave `AppShell.Main` unpainted so shell background shows through where the slate should be.
- **Don't** take the gutter or the drop shadow off the slate, or let another layer clip them.
- **Don't** say "slate" when you mean a color, or "canvas" when you mean the slate. "Canvas" means a real `<canvas>` element.
- **Don't** use `Callout color="info"` for a selection or empty state. Build an empty state instead.
- **Don't** say "entity", "profile manager", "concept", or "Sync data!" in the UI, or title a list "{name} Manager".
- **Don't** give list rows a left accent stripe, or a hover color equal to the pane background.
- **Don't** introduce a second accent, reach for the dormant `secondary` amber ramp, or use a stock Mantine `gray` where the `neutral` ramp belongs.
- **Don't** pair a 1px border with a blur of 16px or more outside the two documented exceptions (the slate and the overlay panel).
- **Don't** use display serifs, gradient text, glass cards, or fluid `clamp()` display type.
- **Don't** design against dark mode or promise it: the tokens exist but no toggle ships.
