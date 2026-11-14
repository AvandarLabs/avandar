# Video design tokens: design

Date: 2026-11-12. Branch: `feat/video-improvements`. App:
`apps/ava-video-producer`.

## Goal

Every visual and animation decision in the first five Motion Atlas motions
and the first five compositions becomes a design token. Tokens are layered
atomic → semantic → component on top of Mantine's theme system, modelled on
(never modifying) the Avandar theme in `src/config/Theme`. All of them can be
edited in the Atlas preview modal through one reusable editor. Themes are
tracked JSON files, so `/impeccable` can later produce a new look by writing
theme values instead of animation code.

Terms follow `docs/video-producer-nomenclature.md` (motion, composition,
compositing, layout, reenactment, and so on).

## Scope

In scope:

| Area | Items |
| --- | --- |
| Motions (first five in catalog order) | `network-graph`, `node-traversal`, `radial-network`, `plexus-field`, `orbital-system` |
| Compositions (first five in catalog order) | `shared-object-handoff`, `frame-to-interface`, `aperture-detail`, `spatial-continuation`, `occlusion-wipe` |
| Stock presets nested in those compositions | `data-pipeline`, `predicate-pushdown-boundary`, `code-focus`, `schema-mapping`, `query-column-cache-growth`, `source-merge`, `decision-fork` |
| Shared renderers | Stock primitives (`graphics-common.tsx`, `StockGraphic.tsx`, `StockRect`, `FitText`), the continuity renderer (`src/continuity/*`, `ContinuityScene.module.css`, `ContinuityOverlays.module.css`), `src/motion-components/` transitions and camera |
| UI | Motions modal and Compositions / Sample films modal |

Out of scope, recorded for later sub-projects: helper demos, storyboard-scene
studies and their plan / shot `theme`, the other stock presets and films,
moving stock graphic text to Figtree, generating themes with `/impeccable`, a
standalone Themes page.

Decisions already made with the user: one global theme plus per-item
overrides; tracked JSON theme files; Mantine theme shape; the 13-preset scope
above; no `Arrow` component until a preset draws an arrowhead; per-shape sketch
rendering for nodes, edges and guides.

## 1. Token architecture

### 1.1 Theme file

```text
{
  schemaVersion: 1,
  id, label,
  extends?: "<theme id>",            // sparse patch over a base theme
  ...Mantine theme override keys,    // atomic, Mantine-native
  other: { video: { atomic, semantic } },
  components: { <Name>: { defaultProps } },
  overrides: { <catalog id>: <sparse patch> }
}
```

Merge order: built-in `classic` → `extends` chain → the theme → scoped
overrides. Merging uses Mantine `mergeThemeOverrides`; the resolved theme is a
`MantineTheme` produced with `mergeMantineTheme(DEFAULT_THEME, …)`.

Per-item `overrides` belong to the theme that declares them and are **not
inherited** through `extends`. A theme that extends `classic` gets `classic`'s
values but not its per-study art direction.

When a stock preset renders inside a composition, overrides apply in this
order: theme, then the nested preset's override, then the composition's
override (the composition wins).

### 1.2 Tier rules

- **Atomic** tokens hold the only literal scalar values.
- **Semantic** tokens hold references only, written `"$<path>"`, for example
  `"$atomic.strokeWidth.sm"` or `"$colors.primary.4"`.
- **Component** tokens hold a reference or a deliberate literal one-off.
- **Enumerations are literal in any tier**: line cap and join, text
  transform, numeric font variant, sketch fill style.
- **No dead tokens.** A token exists only if an in-scope renderer reads it,
  or it is a Mantine-native key.
- **Lengths** are pixels of the surface that draws them: `graphic` is the
  stock viewBox (960 × 600) and `stage` is the continuity editorial layer
  (1600 × 840). Semantic text and layout roles are namespaced by surface.
- **Durations** are frames at 30 fps.
- **Timeline lengths are content, not tokens**: stock loop length (180),
  beat durations, transition frame counts, and fps stay authored.
- **Preset geometry is content**: node positions, ellipse radii, orbit and
  field centres, and data-driven placement stay in the preset.
- **Reenactments are never themed.** Product components keep the product
  theme; only `ProductFrame` (the backdrop around them) reads tokens.
- **Every token carries metadata**: label, description, unit, range, and
  control kind. The same schema drives the editor and an exported JSON
  Schema for `/impeccable`.

### 1.3 Atomic tier

| Category | Mantine-native keys | `other.video.atomic` additions | Seeded from |
| --- | --- | --- | --- |
| Color | `colors` (10-shade tuples: primary, neutral, secondary, success, warning, danger, info), `white`, `black`, `primaryColor`, `primaryShade`, `defaultGradient` | `swatch.*`: single named colours (`mint`, `cyan`, `orange`, `ground`, `surface`, `elevated`, `line`, `muted`, `text`, `productBackdrop`, `scrim`). A colour picked in the editor becomes a new swatch. | Avandar `Theme`, `STOCK` (`src/stock/stockPalette.ts`) |
| Typography | `fontFamily`, `fontFamilyMonospace`, `headings` (fontFamily, fontWeight, `sizes.h1`–`h6` {fontSize, fontWeight, lineHeight}), `fontSizes` (xs–xl plus 2xs, 2xl, 3xl, 4xl), `lineHeights`, `fontSmoothing` | `fontFamily.*` keyed by face (`figtree`, `arial`, `courier`), `fontWeight` (regular 400, medium 500, semibold 600, bold 700), `letterSpacing` | Avandar, audit |
| Dimension | `radius` (xs–xl plus `full`), `spacing` | `size` (shape dimensions: dots, nodes, glyphs), `strokeWidth` (xs–xl) | Avandar radius, audit |
| Paint | | `opacity` (integer percent steps) | Avandar border alphas, audit |
| Effects | `shadows` (derived, never authored) | `shadow` (Avandar `ElevationTheme` stacked sharp + soft layers: offsetY, blur, alpha, colour reference), `glow` (spread, blur, opacity), `textShadow` (x, y, blur, colour, alpha), `blur` | Avandar `ElevationTheme`, audit |
| Sketch | | `roughness`, `bowing`, `seed`, `hachureGap` | appearance defaults, `StockRect` |
| Line | | `dash` patterns, `curveTension` | audit |
| Motion | | `duration` (2xs 4, xs 6, sm 8, md 9, lg 13, xl 15, 2xl 18 frames), `easing` (bezier tuples by curve shape: `out`, `outBack`, `inOut`, `inOutCubic`, `in`, `word`, `surge`), `spring`, `stagger`, `period`, `distance`, `amplitude`, `typingRate` | `src/motion.ts` `DUR`/`EASE` (which match Avandar `ANIMATION_EASING` `out`, `pop`, `inOut`) |
| Camera and blur | | `cameraSpeed`, `shutter`, `samples`, `zoom`, `velocityBlur` | `src/motion-components/motionSettings.ts` presets |
| Contrast | `autoContrast`, `luminanceThreshold` | `ink` (light and dark) | `getEditorialInk` |

Fonts come from a **font registry**, never free text. A registry entry is
either `bundled` (a woff2 under `public/fonts`, loaded with `delayRender`) or
`system` (Arial, Courier New, as today). **Graphic text roles accept only
families with measured width tables** (Arial and Courier New today), because
stock text-fit validation (`getConservativeWidthFromText`, `FitText`, legacy
text rules) uses measured advances. Adding Figtree tables is the deferred
"stock graphics to Figtree" work.

### 1.4 Semantic tier (`other.video.semantic`)

- `color`: ground (solid or gradient fill), surface, elevated, line,
  lineStrong, text, textMuted, accent (defaults to Mantine's primary),
  accentAlt, highlight, success, warning, danger, info, scrim,
  productBackdrop, shadowColor, `series[]`. A colour token may be a single
  reference or `{ onDark, onLight }`, chosen by `luminance(ground)` against
  `luminanceThreshold`.
- `text.graphic`: eyebrow, heading, label, detail, caption, pill, code.
- `text.stage`: heading (`headings.sizes.h2`), subtitle, evidence,
  sharedObject, thesis (`headings.sizes.h1`), thesisEmphasis, floatingLabel.
- A **type style** is family, size, weight, lineHeight, letterSpacing,
  transform, numeric variant, colour paint, textShadow, glow, and stroke.
- A **paint** is `{ color, alpha }`.
- `stroke`: guide, default, emphasis, route, annotation.
- `radius`: panel, pill, card, chip, sharedObject, spotlight, label.
- `elevation`: flat, raised, floating.
- `effect`: halo, glow, depthBlur.
- `sketch` profiles: smooth, subtle, sketch, rough (roughness, bowing, seed).
- `layout.graphic`: margin, eyebrowOrigin, captionBaseline, rule.
- `layout.stage`: headingInset, graphicInset, captionBand, evidenceRow.
- `motion`: tempo; press (2xs), chip (xs), whip (sm), panel (md), sheet
  (lg), word (xl), hero (2xl), which are today's `DUR` names; entrance, exit, emphasis (spring), drawOn, travel, pulse,
  drift, packetFlow, stagger (list, edge, column), typing.
- `camera`: preset (`authored` or a motion preset), presets (speed, shutter,
  easing), push / whip / glide easings, zoom limits.
- `motionBlur`: shutter, samples, velocity factor and maximum, transition
  blur.

Colour and type roles are semantic because a theme author sets them by
meaning, even when one component reads them. Every other semantic token exists
only where two or more components share the intent; other values stay at the
component tier.

### 1.5 Component tier (`components.<Name>.defaultProps`)

Components read their defaults with Mantine `useProps`. Where one shape has
several sizes, it takes a Mantine-style `size` prop resolved through its
token map (for example a hub node is `size="xl"`).

| Surface | Component | Tokens |
| --- | --- | --- |
| graphic | `Node` | radius by size, fill, stroke, strokeWidth, ring spread and opacity, tint opacity, core radius, label and detail styles, sketch, glow |
| graphic | `Edge` | strokeWidth, paint, cap, curveTension, dash, drawOn motion, sketch |
| graphic | `Route` | strokeWidth, paint, cap |
| graphic | `Packet` | radius by size, paint, glow, period |
| graphic | `Particle` | radius by size, halo cadence and paint |
| graphic | `Halo` | spread, paint |
| graphic | `Guide` | dash, paint, strokeWidth, sketch |
| graphic | `Panel`, `Card` | radius, borderWidth, fill, stroke, sketch, elevation, padding |
| graphic | `Pill` | height, radius, fill and stroke alpha, text style |
| graphic | `Check` | size, strokeWidth, paint |
| graphic | `Rule` | strokeWidth, paint |
| graphic | `Glyph` | strokeWidth, paint |
| graphic | `Eyebrow`, `Caption` | text style, layout origin or baseline |
| stage | `Heading`, `Subtitle` | text style, layout inset |
| stage | `SharedObject` | borderWidth, radius, fill, text style, sketch |
| stage | `EvidenceChip` | radius, padding, text style |
| stage | `ProgressBar` | height, paint |
| stage | `Spotlight` | scrim, radius, padding |
| stage | `FloatingLabel` | radius, padding, elevation, text style |
| stage | `Underline` | strokeWidth, sketch, iterations |
| stage | `Bracket`, `Connector` | strokeWidth, dash, curve offset, sketch |
| stage | `ProductFrame` | backdrop |
| transition | `Morph` | start radius |
| transition | `Aperture` | overscan |
| transition | `Spatial` | blur |

The wipe transition is a plain linear inset with no style literal, so it has
no component tokens. Morph and aperture anchors and origins are geometry
(content).

`SharedObject` replaces the continuity name `Token`, which collides with
"design token".

### 1.6 Built-in themes

- **`classic`** (default): today's look and the only complete theme.
  - Stock parity baseline is the gallery defaults: accent `#51a7ff`
    (`colors.primary.4`, `DEFAULT_ACCENT`) and background `#0b1219`.
  - Continuity parity baseline is each plan's authored values.
  - Deliberate visible consolidations, the only allowed parity differences:
    1. `radial-network`, `node-traversal` and `orbital-system` captions
       share one `text.graphic.caption` (17 px, muted) at
       `layout.graphic.captionBaseline` 551, replacing 15 / 17 / 18 px at
       y 560 / 545 / 551.
    2. Halo fill opacities 0.025 and 0.035 become one `opacity.3` (0.03).
  - CLI stock renders without an explicit accent switch from mint to the
    gallery default accent. That is a visible change for CLI output only.
- **`avandar`**: the same semantics mapped onto the Avandar palette,
  surfaces, radii, shadows, and easing. It is generated by
  `pnpm theme:sync-avandar` from the read-only Avandar theme, reusing
  `scripts/read-theme.mjs`.

### 1.7 Authored colours move into `classic` overrides

Continuity plans currently author `accent` and `background` per plan (study
accents are literal mint, cyan, or orange). With tokens, the renderer reads
both from the theme, so a theme-scope edit recolours every composition.

- A one-time migration moves each continuity plan's authored `accent` and
  `background` into `classic.overrides[<catalog id>]` as swatch references,
  so `classic` renders unchanged.
- The `continuity` scene schema drops `accent` and `background`. A plan that
  still sets them fails validation with a message pointing at theme
  overrides. No private `.videos/` plan uses the `continuity` scene today.
- Stock content colour fields (for example `orbit.color`) accept a semantic
  role such as `"$color.accent"` as well as a literal. A literal is a
  documented, content-specific bypass of the theme.

## 2. Runtime architecture

### 2.1 Units (`src/videoTheme/`)

| Unit | Responsibility | Depends on |
| --- | --- | --- |
| `videoThemeSchema` | Zod schema for theme files: tiers, token types, metadata. Exports JSON Schema with `z.toJSONSchema`. | zod |
| `resolveVideoTheme(theme, scope)` | Pure and DOM-free. Merges (§1.1), resolves `$references`, rejects missing references, cycles, and literals in semantic tokens, picks `{ onDark, onLight }`, derives Mantine `shadows` strings, returns a concrete `ResolvedVideoTheme` and a content hash stable under key order. | `@mantine/core` (`mergeThemeOverrides`, `mergeMantineTheme`, `luminance`) |
| `buildVideoCssVariables(resolved)` | Flat `--video-<path>` variables for CSS modules, shaped like Avandar's `cssVariablesResolver`. | resolver |
| `VideoThemeProvider` | `MantineThemeProvider` plus a container carrying the CSS variables. Nestable for per-item scopes. | React, Mantine |
| `useVideoTokens()`, `useProps(name, …)` | Typed semantic reads; component defaults through Mantine `useProps`. Both report reads to the usage collector. | Mantine |
| `videoFontRegistry` | Registered families. `src/fonts.ts` loads bundled ones; the showcase theme CSS emits `@font-face` from the same list. | `public/fonts` |
| `VideoEffectDefs` | One SVG `<defs>` per graphic with filters for glow, text glow, text shadow, drop shadow, and depth blur, emitted only for tokens in use. HTML layers use CSS. | resolver |
| `sketchShape` | Seeded roughjs paths for nodes, edges, guides, and boxes, memoized on geometry and sketch parameters. Smooth shapes skip roughjs. Replaces the box-only path in `StockRect`. | roughjs |

### 2.2 Theme flow by context

| Context | Theme source | Path |
| --- | --- | --- |
| Gallery motion cards, stock preview modal | Active theme plus draft | One `VideoThemeProvider` at the gallery root, plus a per-item provider only where an override exists. Thumbnails update live. |
| Live player iframe (compositions, films) | Same document | New `film-control` action `theme` carrying `{ themeId, document, itemId }`. The iframe resolves with the same code and acknowledges the hash, following the appearance acknowledgement pattern. |
| MP4 exports | Theme id plus unsaved draft patch | Server validates, resolves, and freezes the snapshot into the `Film` input. `delivery.json` records `themeId` and `themeHash`. |
| CLI (`video render`, `motion render`, `atlas:posters`) | `--theme <id>`, default `classic` | Loads `themes/<id>.theme.json`. |
| Remotion Studio | `classic` | Composition default props. |
| Reenactments | Product theme only | The adapter's product `MantineProvider` (`avandar-adapter/index.tsx`) does not inherit a parent theme. A test guards this. |

### 2.3 Renderer integration

- **Stock.** Repeated shapes become themed components (§1.5). Preset-specific
  shapes read component or semantic tokens directly. The public `accent` and
  `background` props stay: a picked hex becomes `swatch.accent` /
  `swatch.ground` and the semantic colours point at them.
- **Continuity.** CSS modules switch from `--continuity-ground`, `-ink`, and
  `-font` to `--video-*` variables. Inline TSX literals become token reads.
  `getEditorialInk` is replaced by `{ onDark, onLight }` resolution.
- **Motion.** `src/motion.ts` keeps no runtime imports. Callers pass token
  values to its helpers. A test keeps `DUR` and `EASE` equal to `classic`.
  `motion.tempo` (clamped 0.8–1.5) divides animation durations inside a
  beat, so 1.5 is faster and 0.75 is slower. It never changes timeline
  lengths. Camera preset, shutter, and samples come from tokens.
- **Appearance options split.**
  - Captions, camera motion on / off, motion blur on / off, and
    annotations on / off stay as render options in
    `continuityAppearanceSchema`.
  - Accent, background, annotation roughness, box roughness, and camera
    preset become theme tokens and leave that schema.
  - The `composition-appearance` localStorage key moves to a new version
    instead of a translation shim, since nothing outside this app sends the
    old fields.

### 2.4 Errors

- Save routes and the CLI reject invalid themes and report the zod path.
- The gallery keeps the last valid resolved theme while a draft is invalid
  and marks the offending control.
- Exports refuse an invalid theme and never fall back to `classic`.

## 3. Design-token editor

### 3.1 Units

| Unit | Job |
| --- | --- |
| `useVideoThemeDraft()` | Theme list, active theme id (URL `?theme=`, else remembered per viewer), loaded document, unsaved draft patch, per-item override drafts, save and discard. Drafts survive reload. Shared by every modal. |
| `VideoThemeEditor` | Controlled, gallery-agnostic: `{ schema, document, scope, usedTokens?, onChange(patch) }`. Reusable in any producer surface. |
| `TokenControl` | Maps each token type to a control (§3.3). |
| Usage collector | Records the tokens a render reads. Gallery renders report directly; the iframe posts `film-tokens-used`. The editor shows the union seen so far, with a "play once to discover the rest" hint. |

### 3.2 Layout

- The modal's right column gains two tabs: **Details** (today's content
  editor, guide, render toggles, download) and **Design tokens**. The tokens
  tab widens the column to about 420 px; on phones it stacks below the
  player.
- **Theme bar**: theme picker, unsaved indicator, Save, Save as new theme,
  Discard, Copy theme JSON. Built-in themes (`classic`, `avandar`) show only
  Save as new theme.
- **Scope switch**: "All items (theme)" or "This motion / composition only".
  In item scope inherited values appear muted; editing creates an override
  shown with a dot and a per-token reset; a badge counts overrides.
- **Navigation**: an Essentials group (accent, ground, text, font family,
  default stroke, panel radius, tempo, sketch profile), then tier tabs
  (Components for this item, Semantic, Atomic), category accordions, search
  over label, path, and description, and a "used by this item / all"
  toggle.
- Today's palette, camera preset, and roughness controls move into token
  groups.

### 3.3 Controls

| Token type | Control |
| --- | --- |
| Colour, swatch | Mantine `ColorInput` with theme swatches, plus a WCAG AA / AAA contrast badge against the ground for text roles |
| Reference | Picker of compatible tokens with previews (colour chip, size, curve thumbnail). Component tokens also allow a custom literal. A custom colour on a semantic token creates a named swatch. |
| Length, number, opacity | `Slider` plus `NumberInput` with the schema's unit and range |
| Type style | Grouped fields with a live specimen |
| Shadow, glow, text shadow | Layer editor (x, y, blur, spread, colour reference, alpha) with a preview chip |
| Easing | Bezier editor reusing the Helpers `CurvePlot` |
| Duration | Frames with a milliseconds readout |
| Spring | Damping, stiffness, mass |
| Sketch | Roughness, bowing, seed, with a preview box |
| Dash | Presets plus a pattern field |
| Enum, boolean | `SegmentedControl`, `Switch` |

### 3.4 Behaviour

- Edits apply live, debounced about 100 ms for the iframe. Motion
  thumbnails behind the modal update too.
- Editor controls use the gallery's chrome `MantineProvider`; the preview
  subtree uses `VideoThemeProvider`, so neither theme styles the other.
- Chrome copy goes through Lingui. Token labels and descriptions come from
  the schema and are extracted into gallery messages, like helper copy.
- Every control is labelled, keyboard operable, and shows its value as text.
- The editor is a new surface, so its visual design goes through
  `impeccable` at build time.

## 4. Persistence and delivery

### 4.1 Theme files

- `apps/ava-video-producer/themes/<id>.theme.json`, tracked.
- `classic` is authored and complete. `avandar` is generated by
  `pnpm theme:sync-avandar`; a drift test fails when the Avandar theme
  changes without a re-sync. The Avandar source is never edited.
- Themes from `/impeccable` are sparse files in the same folder.

### 4.2 Showcase routes (localhost only)

| Route | Behaviour |
| --- | --- |
| `GET /api/themes` | `{ id, label, builtIn, extends }[]` |
| `GET /api/themes/:id` | Document plus content hash |
| `GET /api/themes/schema.json` | JSON Schema with every token's description |
| `POST /api/themes` | Create; 409 if the id exists |
| `PUT /api/themes/:id` | Save with `If-Match: <hash>`; 409 when the file changed on disk; built-ins refused |

Every write validates: slug id `^[a-z0-9-]{1,48}$`, 256 KB size cap, schema,
reference resolution, and cycles. Files are written to a temporary file and
renamed. A watcher on `themes/` publishes on the existing `/events` stream;
the gallery reloads, or shows a "changed on disk" banner when a draft is
unsaved.

### 4.3 Exports

- The export request body gains `theme: { id, patch }`, where the patch is
  the unsaved draft including the item's override.
- Download stays disabled until the live player acknowledges the draft's
  theme hash, so the MP4 matches the preview.

### 4.4 Posters

- Posters move to `showcase/assets/atlas/<themeId>/<id>.jpg`;
  `pnpm atlas:posters --theme <id> [ids]` renders them.
- `classic` and `avandar` posters are tracked; `atlasPosters.test.ts` checks
  both.
- A card whose active theme has no poster shows the `classic` poster with a
  "Preview in classic theme" badge. The modal's live player always shows the
  active theme.

### 4.5 Documentation

- `apps/ava-video-producer/docs/video-theme.md`: tiers, file format,
  reference syntax, making a theme, the `/impeccable` workflow.
- `docs/video-producer-nomenclature.md` gains atomic / semantic / component
  token, theme, and override.
- `apps/ava-video-producer/AGENTS.md` points at both.

### 4.6 Deferred mapping: storyboard theme

The storyboard plan and shot `theme` (`src/storyboard/schema/themeSchema.ts`)
stays unchanged here. A later sub-project maps its names to semantic colours:

| Storyboard token | Semantic colour |
| --- | --- |
| `background`, `ground` | `color.ground` |
| `foreground` | `color.text` |
| `card` | `color.surface` |
| `muted` | `color.elevated` |
| `muted-foreground` | `color.textMuted` |
| `border` | `color.line` |
| `brand` | `color.accent` |
| `brand-soft`, `brand-strong` | accent shade references |
| `shadow` | `color.shadowColor` |

## 5. Testing and migration

### 5.1 Parity gate

- `pnpm theme:parity` captures reference frames for the 13 presets (at the
  gallery default accent and background) and the five compositions (at
  authored values), at their existing preview sample frames, before any
  renderer change.
- After each migration step it re-renders with `classic` and compares per
  pixel. A step passes only when every difference is zero or listed in
  §1.6. Diff images go to ignored `out/theme-parity/`.
- The existing frame gate runs on full renders of in-scope items in both
  `classic` and `avandar`.

### 5.2 Unit tests (node:test, red / green)

| Area | Checks |
| --- | --- |
| Schema | Every token has label, description, unit, range, control kind; complete `classic` passes; sparse themes need `extends`; exported JSON Schema matches zod |
| Resolver | Merge order including nested scopes; missing references and cycles rejected; semantic literals rejected; `{ onDark, onLight }` switches at `luminanceThreshold`; derived `shadows`; hash stable under key order; overrides not inherited through `extends` |
| Drift | `DUR` / `EASE` equal `classic`; `avandar.theme.json` equals a fresh sync; font registry matches `public/fonts`; graphic text roles use measured families only |
| Contrast | Every text role in `classic` and `avandar` meets WCAG AA against its ground, on dark and light grounds |
| Isolation | A reenactment inside `VideoThemeProvider` still resolves the product theme |
| Sketch, effects | Seeded rough paths are deterministic; filter defs emitted only for used tokens |
| Migration | Every continuity catalog entry's former authored `accent` / `background` appears in `classic.overrides`; the schema rejects the removed fields |
| Server | Slug, size cap, built-in protection, `If-Match` 409, atomic write, export snapshot and `delivery.json` hash |
| Usage | Collector records component and semantic reads; iframe posts the union |
| Tempo | At tempo 0.8, every in-scope animation finishes before its beat or loop ends |

### 5.3 End-to-end (Playwright, one spec at a time, state restored in `finally`)

- Changing the accent in Essentials updates a motion thumbnail and the modal
  player.
- An item-scope override changes only that item; the per-token reset clears
  it.
- Save as new theme creates a file; the test deletes it.
- A draft survives reload.
- Download is blocked until the theme acknowledgement, then carries the
  theme in its payload (intercepted).
- Built-in themes hide Save.

### 5.4 Delivery order

Three plans, each complete and green before the next:

1. **Model**: schema, resolver, CSS variables, font registry, `classic` and
   `avandar`, `theme:sync-avandar`, showcase routes, parity harness and
   reference capture. No visible change.
2. **Renderer adoption**, parity-gated per step: shared stock primitives →
   the five network presets → the seven nested presets → continuity CSS and
   TSX plus the authored-colour migration → effect defs and per-shape sketch
   → motion and camera tokens → per-theme posters.
3. **Editor**: `useVideoThemeDraft`, `VideoThemeEditor` and controls, modal
   tabs, usage reporting, iframe theme messages, exports, i18n messages,
   docs.

### 5.5 Risks

| Risk | Mitigation |
| --- | --- |
| Sub-pixel drift when literals become computed tokens | Exact numeric parity in `classic`, enforced by the parity gate |
| Rough rendering of many edges is slow per frame | Memoize on geometry and sketch parameters; smooth shapes skip roughjs |
| A slower tempo overruns a reading hold | Clamp 0.8–1.5 and the tempo test (§5.2) |
| Theme edits leave posters stale | Per-theme posters, fallback badge, `atlas:posters --theme` |
| The schema is too large to browse | Essentials, "used by this item" filter, search |
| A theme picks a font the renderer cannot load | Registry-only families; validation rejects unknown ones |

## Appendix A: audit highlights

Representative literals the plan must tokenize (paths relative to
`apps/ava-video-producer/`). The full inventory was produced during
brainstorming; the plan re-derives exact lines when it migrates each file.

| Area | Literal | Location |
| --- | --- | --- |
| Palette | `STOCK` ground `#0b1219`, surface `#101e28`, elevated `#142632`, line `#2a404e`, muted `#728794`, text `#edf7f4`, mint, cyan, orange | `src/stock/stockPalette.ts` |
| Ground duplication | `#0b1219` in six places | `STOCK`, `continuitySchema.ts`, `continuityAppearance.ts`, `ContinuityAppearanceContext.tsx`, `ContinuityScene.module.css` (×3), `gallery/palette.ts` |
| Graphic text | size 20, weight 400, Arial / Courier New; eyebrow 14 / letterSpacing 2.4 | `src/stock/graphics-common.tsx` |
| Panel, Pill | radius 18, stroke 1.5; pill height 30, rx 15, fill .08, stroke .32 | `graphics-common.tsx` |
| Node | radius 26 (presets 22–37), ring r+9 at .25, tint .09, core 5+2, label +30 / 18 px, detail +51 / 12 px mono | `graphics-common.tsx`, network presets |
| Edge, route | DrawPath width 2, round cap, dash `0.015 0.02`, hero duration; route 3.5; plexus 1.1 | `graphics-common.tsx`, `NodeTraversal.tsx`, `PlexusField.tsx` |
| Packet, halo | radius 4 / 2.5, halo r+5 at .09, period 75; halos .025–.09 | `graphics-common.tsx`, presets |
| Guide | orbit dash `3 9` at .65; orbit stroke 1.5 at .24 | `RadialNetwork.tsx`, `OrbitalSystem.tsx` |
| Sketch | seed 17 (duplicated), maxRandomnessOffset 3; annotation 1.5, box 0 | `StockRect.tsx`, `ContinuityBoxOutline.tsx`, `continuityAppearance.ts` |
| Stage text | heading 48 / 600 / -.025em / 1.12; subtitle 25 / 1.35; evidence 17; shared object 25 / 600; thesis 63 / 500 | `ContinuityScene.module.css` |
| Stage layout | heading inset 96 / 96 / 64; graphic inset 192 / 60 / 70; progress bar 3; evidence row 16 / 32 / 20 | `ContinuityScene.module.css` |
| Shared object | border 2, radius 8, fill `#101e28` | `ContinuityScene.module.css`, `ContinuityToken.tsx` |
| Effects | drop shadow `0 16px 22px #06101455` (twice); spotlight scrim `#061019a8`; spatial blur 12 px × strength | `ContinuityDiagramLane.tsx`, `ContinuityOverlays.module.css`, `SceneTransition.tsx` |
| Motion | `DUR`, `EASE`, `STAGGER`, `STAGGER_COLUMN`, `pop` spring 14 / 120 / .8, `typed` 28 cps, loop envelope 12, wave periods 90 / 120, edge stagger `i*2`, entrance y 12 / 8 | `src/motion.ts`, presets, `ContinuityBeatView.tsx` |
| Camera, blur | presets deliberate .25 / 45° through whip 1.5 / 240°, samples 10, velocity blur .09 max 3, zoom 1–3 | `src/motion-components/motionSettings.ts`, `cameraTrack.ts` |
| Transitions | morph radius 12 × (1 − p), aperture 1.05 × diagonal | `SceneTransition.tsx` |
