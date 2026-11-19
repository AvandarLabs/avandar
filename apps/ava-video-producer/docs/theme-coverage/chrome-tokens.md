# Atlas chrome tokens

The Motion Atlas and the showcase pages draw their chrome (navigation,
cards, dialogs, the token editor, the live player's caption toggle) from one
stylesheet: [`showcase/chrome-tokens.css`](../../showcase/chrome-tokens.css).
It declares every type, spacing, radius, colour, shadow, layer, and motion
value the chrome uses as a custom property on `:root`. Every other chrome
stylesheet reads those values with `var()`.

## Chrome tokens are not video tokens

The chrome never follows the video theme. `AtlasChromeProvider` gives the
Atlas controls their own Mantine theme, and previews get video tokens from
`GalleryItemTheme`. So the chrome scale lives under its own `--atlas-*`
prefix, outside the token catalog and `themes/*.theme.json`. A renderer must
never read an `--atlas-*` value, and a chrome stylesheet must never read a
video token.

## Where the sheet is loaded

| Page or bundle | How it gets the tokens |
| --- | --- |
| `motion.html` (Motion Atlas) | `showcase/motion.css` imports the sheet. The gallery CSS modules under `src/gallery/`, `src/continuity/gallery/`, and `src/videoThemeEditor/` render on this page, so they read the same `:root` values. |
| `index.html`, `productions.html` | `showcase/style.css` imports the sheet. `showcase/productions.css` loads after it. |
| `live.html` and the showcase film renders | `src/showcase/player.css` imports the sheet through esbuild (live player) and webpack (Remotion). |

## Scales

| Scale | Prefix | Steps |
| --- | --- | --- |
| Colour | `--atlas-color-*` | Named by role: `paper`, `line`, `tint`, `header-surface`, `danger`, `player-ground`, and so on. `ink-<percent>` mixes the product ink (`--ava-neutral-9`) into transparency. Chrome stylesheets read `muted` rather than `--muted`, which shares its name with the starter palette. |
| Shadow | `--atlas-shadow-*` | Named by role: `focus-ring`, `card-hover`, `tray`, `toast`, `dialog`, `preview-dialog`, `screening-room`. |
| Font size | `--atlas-font-size-*` | Pixel value, `6-5` for 6.5px. The fluid page titles are named by role: `atlas-title`, `showcase-title`, `productions-title`, `productions-title-narrow`. |
| Font weight | `--atlas-font-weight-*` | Numeric weight. |
| Font family | `--atlas-font-family-*` | `serif`, `mono-system`, `system`. The product face is `--ava-font` and the code face is `--mono`. |
| Letter spacing | `--atlas-tracking-*` | `tight-<px>` for negative tracking, `wide-<px>` for positive. |
| Spacing | `--atlas-space-*` | Pixel value. Padding, margin, gap, outline and underline offsets, translations. A negative offset reads `calc(var(--atlas-space-4) * -1)`. |
| Geometry | `--atlas-size-*` | Pixel value. Header and strip heights that other rules compute with, and the basis inside a `flex` shorthand. |
| Border width | `--atlas-border-*` | Pixel value. Borders and outlines. |
| Radius | `--atlas-radius-*` | Pixel value, plus `none` (0) and `round` (50%). |
| Blur | `--atlas-blur-*` | Pixel radius for `backdrop-filter: blur()`. |
| Layer | `--atlas-layer-*` | The `z-index` value. |
| Motion | `--atlas-duration-*` | Milliseconds. |

Length steps name their pixel value so a reader can check a declaration at
a glance, and so the scales reproduce the literals they replaced exactly.
Pick an existing step before adding one. A new value goes into the sheet as a
new step, never as a literal in a chrome stylesheet.

## What stays literal

Structural geometry places or sizes a box rather than styling it, so it
stays where it is used: `width`, `height`, their `min-` and `max-` forms,
`top`, `right`, `bottom`, `left`, `inset`, grid templates, and `flex-basis`.
Media query breakpoints stay literal because `var()` cannot be read there.
Unitless line heights, percentages, and CSS-wide keywords (`inherit`) are not
theme values.

## Guard

`scripts/videoTheme/__tests__/renderers-draw-no-literals.integration.test.ts`
scans every chrome stylesheet with the stylesheet patterns from the theme
coverage review and compares the count with
`scripts/videoTheme/themeLiteralBudgets/s9.json`. The budget is empty, so a
new literal fails the test. The scan skips `showcase/chrome-tokens.css`
alone, since it is the source of the values.
