# Video themes

Every visual and animation value a motion or composition draws comes from a video theme: colours, type, strokes, corners, shadows, glows, sketch, layout, motion timing, and camera. Themes are JSON files in `themes/`. Change a look by changing a theme, never by adding a literal to a renderer. The terms are defined in [the video producer nomenclature](../../../docs/video-producer-nomenclature.md#design-tokens).

## Tiers

| Tier | Lives at | Holds | Example |
| --- | --- | --- | --- |
| Mantine | top-level keys (`colors`, `fontSizes`, `radius`, `spacing`, `headings`, `primaryShade`, ...) | Literal values, exactly where Mantine expects them | `"fontSizes": { "md": "16px" }` |
| Atomic | `other.video.atomic` | Literal scales: swatches, stroke widths, opacities, durations, curves, shadows, sketch settings | `"strokeWidth": { "sm": 2 }` |
| Semantic | `other.video.semantic` | References only, named by meaning | `"accent": "$primary"`, `"caption": { "size": "$fontSizes.lg", ... }` |
| Component | `components.<Name>.defaultProps` | A reference, or a deliberate one-off literal, per themed shape | `"ProgressBar": { "defaultProps": { "height": 3 } }` |

The token catalog in `src/videoTheme/tokenCatalog/` lists every token with its label, description, unit, bounds, and editor control. A token exists only when a renderer reads it: `scripts/videoTheme/__tests__/every-token-has-a-reader.integration.test.tsx` fails on a token nothing reads, unless a slice budget lists it as pending (see [Checks](#checks)).

## Token groups

| Group | Tokens | What reads them |
| --- | --- | --- |
| Colour roles | `color.ground`, `surface`, `elevated`, `line`, `text`, `textMuted`, `inactive`, `accent`, `accentAlt`, `highlight`, `positive`, `scrim`, `productBackdrop`, `shadowColor` | Stock shapes and the continuity stage. `positive` is the default colour of the person, object, route, cell, fragment, and membership primitives |
| Categories | `color.categorical.1` to `.9` (mint, cyan, orange, rose, lavender, sand, teal, olive, pink in `classic`) | Keys and series that give each category one colour |
| Text on the accent | `color.onAccent` | Labels drawn on an accent fill. Its `{ onDark, onLight }` pair is picked by the accent's luminance against its own threshold, 0.179, not by the ground |
| Scene palette | `color.scene.background`, `foreground`, `card`, `muted`, `mutedForeground`, `border`, `brand`, `brandSoft`, `brandStrong`, `ground`, `shadow` | Storyboard scenes, the title card, the app chrome, and the fixed compositions, through CSS names (below) |
| Text roles | `text.graphic.*` (graphic surface, measured fonts only) and `text.stage.*` (stage surface) | `Text` in graphics; the stage reads `--video-text-*` variables or the resolved role. Scene roles (`title`, `kicker`, `caption`, `sceneHeading`, `sceneBody`, `cardTitle`, `figure`, `windowHeadline`, `barLabel`, `badge`, `appTitle`, `appBody`) are checked for contrast against the scene ground |
| Line and shape | `stroke.*` (`hairline` 1 to `heavy` 4), `corner.*` (`chip` 4, `cell` 8, `card` 12, `panel` 18, `pill`), `alpha.wash`, `tint`, `ghost`, `dimmed`, `guide`, `dash.guide`, `dash.pending` | Stock shapes. Opacity roles follow meaning, not a value: a wash behind an active row, a ghost of a removed item |
| Options | `stroke.scale`, `corner.scale`, `alpha.washScale`, `elevation.strength`, `motionBlur.strength`, `motion.staggerScale` (all 1 in `classic`), `motion.easingProfile` (`authored`), `motion.entranceStyle` (`rise`) | The Look and feel rows. Each starts at its identity value, so it changes nothing until a producer moves it |
| Elevation | `elevation.flat`, `floating` (shadow geometry plus colour), `elevation.window` (the tilted window's shadow geometry) | Panels, floating labels, the tilted window. `elevation.strength` scales every shadow's opacity when the theme resolves |
| Motion | `motion.*`, `camera.*`, `motionBlur.*` | Renderers through the [themed motion](motion-vocabulary.md#themed-motion) |
| Components | `components.<Name>`, including `WindowTilt`, `WindowMotion`, `BrandLockup`, `Cursor`, and `Orb` for the scenes and chrome | The one shape each belongs to |

### The scene palette as CSS names

Scenes read `var(--brand)`, `var(--ground)`, and the other storyboard theme names. `VideoThemeProvider` emits each `color.scene.*` token under that name: `brand` as `--brand`, `mutedForeground` as `--muted-foreground`, and so on. A storyboard's plan theme or shot theme is set inside the provider, so it still overrides a name for its own film or shot. `color.scene.shadow` is optional and unset in `classic`, so no `--shadow` is emitted and the tilted window keeps its fallback (60% of the scene background).

In `classic` the scene palette points at the `starter*` swatches, which reproduce `src/theme.css`. Theme colours are hex only, so each swatch is the hex Chrome renders for the `oklch()` value in `theme.css`, measured from a rendered pixel. Solid fills match exactly; an anti-aliased edge can differ by one level, which the parity gate allows for compositions and nothing more.

## References

A reference is `$` followed by a path:

- `$atomic.<scale>.<key>` reads an atomic value, such as `$atomic.swatch.mint`.
- `$colors.primary.4`, `$fontSizes.md`, `$headings.sizes.h2.fontSize` read Mantine keys.
- `$primary` reads the `primaryColor` palette at the primary shade: `primaryShade.dark` on a dark ground, `primaryShade.light` on a light one.
- Anything else reads a semantic token, such as `$color.text` or `$sketch.profile.smooth`.

A colour may be `{ "onDark": "$...", "onLight": "$..." }`. The ground is dark when its luminance is below `luminanceThreshold`, and that picks the value. Lengths are pixels of the surface that draws them: the graphic (960 × 600) or the stage (1600 × 840). Durations are frames at 30 fps. Graphic text accepts only fonts with measured glyph widths (Arial, Courier New). Stage text may also use Figtree and the system monospace stack. Camera easing curves must keep their control points between 0 and 1 (or be the cubic in-out), so the camera stays between its framings.

## Theme files

```json
{
  "schemaVersion": 1,
  "id": "warm",
  "label": "Warm",
  "extends": "classic",
  "other": { "video": { "atomic": { "swatch": { "ground": "#201510" } } } },
  "overrides": {
    "shared-object-handoff": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.orange" } } } } }
  }
}
```

- A token whose definition is `isOptional` may be left out even by a complete theme; renderers then use their own fallback.
- An `id` is 1 to 48 lowercase letters, digits, or hyphens, and matches the file name `themes/<id>.theme.json`. A file is limited to 256 KB.
- A theme that names `extends` may be sparse. One without it must define every token.
- `overrides` holds per-item art direction keyed by Atlas id. It applies to the theme that declares it and is not inherited by themes that extend it.
- Inside a composition, a nested preset's override applies first and the composition's override wins.
- `classic` is today's look, and every other theme resolves on top of it. `avandar` is generated from the product theme by `pnpm theme:sync-avandar`. Never edit it by hand.
- `unsaved-draft` is reserved for unsaved edits to a built-in theme. No theme file may use it, and the theme store and **Save as new theme** refuse it.

## Making a theme in the Atlas

Start the showcase with `pnpm showcase` and open `http://localhost:4173/motion.html`.

1. Open a motion or composition, then the **Design tokens** tab.
2. Edit **Look and feel** first. Its rows, in order, are **Accent**, **Ground**, **Text**, **Font face · figtree** (the face the stage text uses), **Default stroke**, **Line weight**, **Panel corner**, **Corner style**, **Shadow intensity**, **Tint strength**, **Tempo**, **Easing family**, **Stagger**, **Entrance style**, **Graphic loop fade**, **Box sketch**, **Shape sketch**, **Annotation sketch**, and **Category 1** to **Category 9**. The global options (line weight, corner style, shadow intensity, tint strength, easing family, stagger, entrance style, loop fade) start at their identity values. They reach a renderer once it reads them, so items still waiting for their theme migration ignore them. The player updates as you edit, and so do motion thumbnails.
3. Switch the scope from **Whole theme** to **This motion only** or **This composition only** for art direction that belongs to one item. A dot marks an edited token: it is filled differently for a saved item override. An unsaved edit also gets a reset arrow on its row.
4. Drafts are kept in your browser (local storage) across reloads. **Save as new theme** asks for a name and writes `themes/<id>.theme.json`, with the id made from the name. **Save** updates a custom theme in place and is not offered for built-in themes, which are read-only. **Discard** drops the draft.

   - A new theme made from a built-in is sparse and extends it. It carries the draft's theme edits and item overrides, but not the built-in's own per-item overrides. A new theme made from a custom theme is a full copy with the draft folded in, overrides included.
   - Previews always show exactly what saving would produce. Edits to a custom theme preview as that theme: its saved per-item overrides still outrank theme-wide edits, as they will once saved. Edits to a built-in theme preview as the new theme **Save as new theme** would create. That theme does not inherit the built-in's per-item overrides, so a theme-wide accent edit on `classic` recolours every composition, including those whose accent `classic` sets per composition.
   - Downloads of a built-in theme's draft render the same way. Every export's `delivery.json` records the saved theme it started from as `themeId`, its resolved `themeHash`, and `"themeDraft": true` when unsaved edits were applied.
5. **Copy JSON** copies what a save would write. For a custom theme that is the theme file with the draft folded in, as **Save** writes it. For a built-in theme it is the sparse theme **Save as new theme** would create, with the same `extends`, without the built-in's own per-item overrides, under a name (`<theme> copy`) and id no loaded theme uses. If the copy fails, the status line says so, and a running save keeps its own status.
6. Downloads render with the theme the preview shows, unsaved edits included. A composition's **Download MP4** waits ("Applying design tokens…") until its live player has applied the theme, and a draft with token issues blocks the download until they are fixed. The **Captions** button downloads the `.srt` timed by the same options and the same draft theme as the MP4, because the camera tokens set caption timing. It is offered for compositions, not scene studies. The **Transcript** link and the plain `/api/films/<id>/captions.srt` link always use the saved theme.

## The tabs in the Design tokens tab

Below **Look and feel**, three tabs choose which settings the list shows. Search and **Only settings used by this preview** narrow whichever tab is open.

| Tab | Holds | Tier |
| --- | --- | --- |
| **Parts** | The defaults of one themed shape, such as a progress bar's height | Component |
| **Styles** | Settings named by what they are for, such as the accent colour or the caption style. This tab opens first | Semantic |
| **Base values** | The raw palettes and scales the styles point at: swatches, stroke widths, opacities, durations, and the Mantine palettes, type, radius, and spacing values. The atomic scales (not the Mantine values) have **Add value** for a new entry | Atomic and Mantine |

**Only settings used by this preview** lists the parts and styles the preview has read so far, so play the preview once to find the rest. It does not filter **Base values**, which always show.

## When a theme changes on disk

The showcase reloads its pages when a theme file changes, for example when you or another tool edits `themes/<id>.theme.json`. Your unsaved edits are stored with the hash of the file they were made against. When the file's hash no longer matches and you have unsaved edits, a **This theme changed on disk** notice appears under the theme bar. **Save** stays disabled until you choose one of three actions:

- **Keep my edits** applies your edits on top of the new file and clears the notice.
- **Discard my edits** drops your edits and uses the new file.
- **Reload from file** reads the file again in case it changed once more and records your edits against it. Your edits stay.

A save the server refuses because the file changed (a 409) says so in the status line. While the notice is showing, the status line points at it. Otherwise the theme bar offers **Reload from file** itself. Saving as a new theme with a name that is taken is a different refusal: it says the name exists, keeps the typed name, and offers no reload.

An edit made while a save runs is kept on top of the saved theme. A successful save followed by a new edit never shows the notice for your own save. A draft can only set a value, never remove one the file holds, so resetting a token that the running save just wrote is dropped and the saved value stays. Set it to the value you want once the save finishes.

## Making a theme with `/impeccable`

1. Read the JSON Schema at `GET /api/themes/schema.json` on the running showcase. Every token carries its title, description, editor control, and unit and surface where it has them. Literal number tokens carry their bounds as `minimum` and `maximum`.
2. Write a sparse theme that `extends: "classic"` and sets the atomic swatches, Mantine palettes and type scale, and the semantic references the design calls for. Keep graphic text on measured fonts and every text role at WCAG AA against its ground.
3. Save it with `POST /api/themes`, or as a file in `themes/`. The request must come from the showcase's own origin (an `Origin` header equal to `http://<host>`). The server rejects schema errors, broken references, and cycles, and reports each by token path. Updating a custom theme uses `PUT /api/themes/<id>` with the file's hash in `If-Match`.
4. Open the Atlas with `?theme=<id>`, review it in the Design tokens tab, and render posters with `pnpm atlas:posters --theme <id>`. Posters are written to `showcase/assets/atlas/<id>/`.

## Checks

- `pnpm theme:parity capture` records reference frames in `out/theme-parity/`, and `pnpm theme:parity compare` renders current frames and fails on any pixel difference outside the allowed regions. Both take `--theme <id>`. Capture before a renderer change, then compare, to prove `classic` still renders today's pixels. With no ids, they run every covered item (below); any Atlas motion or composition id can also be named, so items can be captured before they migrate.
- `src/videoTheme/textContrastHelpers/textContrastHelpers.test.ts` holds every `classic` and `avandar` text role to AA on dark and light grounds, each measured against what it is drawn on: the ground, or the colour its `contrastGround` names.
- `scripts/videoTheme/__tests__/renderers-draw-no-literals.integration.test.ts` scans every renderer file for theme literals (palette reads, hex and colour functions, starter `var(--…)` names, numeric type, stroke, corner, opacity, and dash values, shadows, `EASE`, `DUR`, `STAGGER`, literal `ramp()` durations, `ramp()` without a curve, stroked raw SVG shapes, and stylesheet values) and compares each file with its slice budget.
- `scripts/videoTheme/__tests__/renderers-follow-a-sentinel-theme.integration.test.tsx` renders the primitives and every covered stock preset under a theme that moves every swatch, stroke, radius, and multiplier to an improbable value, and fails if the markup still holds a `classic` value. It catches literals routed through constants, which the scan cannot see.
- `scripts/videoTheme/__tests__/animations-finish-at-the-slowest-tempo.integration.test.tsx` holds every stock preset and every continuity composition to finishing its animations at tempo 0.8.
- ESLint (`eslint/video-theme-restrictions.js`) bans `STOCK`, `EASE`, `DUR`, `STAGGER`, `STAGGER_COLUMN`, `TYPE`, `MONO`, and the gallery defaults in renderers, along with `ramp()` without a curve and numeric literals on `strokeWidth`, `rx`, `ry`, the opacities, `fontSize`, `fontWeight`, and `strokeDasharray` (fitted `FitText` sizes excepted).

### Slice budgets

The theme coverage work is split into slices that own disjoint renderer files ([the review](theme-coverage/review.md), section 8). Each slice has one budget file, `scripts/videoTheme/themeLiteralBudgets/<slice>.json`, and edits only its own:

| Field | Meaning |
| --- | --- |
| `globs` | The renderer files the slice owns. A glob starting with `!` removes files |
| `literals` | The most theme literals each owned file may hold. Lower it with `node --import tsx scripts/videoTheme/themeLiteralBudgets/lowerThemeLiteralBudgets.ts <slice>`, which never raises a budget. The target is an empty object |
| `coveredIds` | Atlas ids the slice has made theme-driven. They join the parity gate's default run, the reader audit, and the sentinel test |
| `pendingTokens` | Tokens no renderer reads until the slice lands. Remove each one when its renderer starts reading it |
| `tempoPendingIds` | Compositions the slowest-tempo test skips until a preset the slice owns settles in time |
| `enforceLint` | Turns the ESLint restrictions on for `globs`. A slice with it on must have no pending tokens or skipped compositions |
