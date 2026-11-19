# Theme coverage: final state

Every Atlas item now draws from the video theme, and guards keep it that way. This page summarises where the work ended. [The review](review.md) is the audit it started from, [the plan](plan.md) records the decisions and order, [token additions](token-additions.md) maps each slice's token requests to the token that answered it, and [chrome tokens](chrome-tokens.md) describes the Atlas chrome scale. [The video theme guide](../video-theme.md) is the reference for tiers, tokens, and checks.

## What the theme reaches

| Area | Items | How it follows the theme |
| --- | ---: | --- |
| Stock motions (Atlas **Motions**) | 170 | Colour roles, graphic text roles, stroke, corner, alpha, dash, and opacity tokens, the themed motion, and the sketch-aware primitives. `src/stock/stockPalette.ts` is gone |
| Compositions and sample films | 36 | The continuity plan builder and the stage read semantic and component tokens. Storyboard content colours name `$color.*` roles. Product reenactment inside a film is exempt (below) |
| Fixed compositions | `Demo`, `MotionLab`, `TitleStudy` | The `starter` theme, which reproduces `src/theme.css`. Their showcase films default to it |
| Helper previews (Atlas **Helpers**) | 70 | `HelperVideoTheme`: the gallery's theme and draft in the Atlas (the Helpers section sits inside `GalleryVideoTheme`), the posted theme in the live player, `classic` elsewhere |
| Scenes, title card, chrome, motion components | all | Stage text roles, the scene palette, stroke and corner tokens, and themed motion |
| Atlas chrome | 70 stylesheets | Its own `--atlas-*` scale in `showcase/chrome-tokens.css`, never the video theme |

`classic` output is unchanged: each slice proved pixel parity against references captured before it, and the cleanup pass proved byte-identical SVG and stage markup at every third frame of all 170 presets and every fifth frame of all 36 compositions and films. The intended pixel changes are the ones the slices recorded: one-level glyph edges on the tilted window subtitle (sRGB alpha instead of an oklab mix), the fixed compositions in Remotion Studio drawing measured hex instead of `oklch()` (R1), and helper previews moving from the product palette to the theme (R9).

## How to add a token

1. Look for an existing token first: a semantic role for a meaning (`color.textMuted`, `dash.placeholder`, `text.graphic.value`), else an atomic step for a shape-specific value (`atomic.dash.dotted`, `atomic.opacity["35"]`).
2. If no step holds the value, add one to the atomic scale in `themes/classic.theme.json`. Name dash steps by look and opacity steps by percent. Steps are free vocabulary: the reader audit skips atomic scales.
3. If the value has a meaning several renderers share, add a semantic token: a catalog entry in `src/videoTheme/tokenCatalog/semanticTokens/semanticTokens.ts` with label and description, and a reference in `classic` (`"planned": "$atomic.dash.dense"`). A renderer must read it in the same change, or the reader audit fails.
4. A value one themed shape owns is a component token (`components.<Name>.defaultProps`). If its `classic` value equals an atomic step, write the reference, not the literal.
5. Default the new token to the literal it replaces, so `classic` draws the same pixels, then run the guards and `pnpm theme:parity compare`.

## How the guards work

| Guard | Catches |
| --- | --- |
| Literal scan (`renderers-draw-no-literals`) | A literal the patterns can see in any renderer file. Every slice budget is empty and landed, and the stock palette cannot come back |
| ESLint (`eslint/video-theme-restrictions.js`) | Banned imports and syntax in every renderer directory, and any `stockPalette` import in the app, at edit time |
| Sentinel tests (`tests/helpers/sentinelVideoTheme.ts` and the three tests that use it) | A literal hidden in a constant. Every item renders under a theme with improbable swatches, strokes, radii, dash steps, opacity steps, glow opacity, and multiplier; any `classic` value left in the markup is a literal |
| Slowest tempo (stock and continuity, fixed compositions) | An animation length that ignores tempo, or one that no longer finishes inside its loop or beat at tempo 0.8 |
| Reader audit (`every-token-has-a-reader`) | A token no renderer reads |
| Stage styles (`stage-styles-read-emitted-theme-variables`) | A stage stylesheet reading a variable the theme never sets, or a chrome token |
| `pnpm theme:parity compare` | Any pixel change. The default run covers 17 base targets; `--all` covers every Atlas item |

The renderer directories are listed once, in `scripts/videoTheme/themeLiteralBudgets/rendererGlobs.json`, which both the literal scan and ESLint read. A new renderer directory goes there, and its files under one slice budget's `globs`.

## Known exceptions

Each value below stays where it is on purpose. The literal scan does not count any of them, because each is a named constant or a computed value rather than a literal on a style attribute.

| Exception | Where | Why |
| --- | --- | --- |
| One-off dash patterns | `ArgumentBridge/argumentShape.ts` (8 7), `BatchRelease/BatchHeadings.tsx` (6 8), `ColdChainCustody/CustodyFactMark.tsx` (2 2), `EffectivePermissionGrants/GrantCandidate.tsx` (2 8), `HabitatCorridorReconnection/HabitatPlan.tsx` (7 5), `MobileClinicRelocation/ClinicMap.tsx` (5 10), `PdfNearestLabelReview/CandidateAnchorGuides.tsx` (7 4), `PdfNearestLabelReview/FigureAnchor.tsx` (2 5), `PublicWorksMeasurementCheck/MeasuredStructure.tsx` (6 5), `RecurringLeakPrevention/LeakPipe.tsx` (12 12), `RevisionRestore/RestoreImpression.tsx` (8 5) | Each pattern belongs to one drawing and recurs nowhere, so an atomic step named by look would hold one reader. Recurring patterns all read `atomic.dash` |
| Pattern sets that encode identity | `CatchmentUnionGaps/IndividualFootprints.tsx` (solid and 10 3 2 3 beside two atomic steps), `ProseMeasurementLedger/SentenceSpans.tsx` (one pattern per span role) | The patterns tell categories apart, like a categorical palette. Members that equal a step read it |
| Fractional and draw-on dashes | `StatusCycle.tsx` (`0.28 0.72` of a normalised path), every `DRAW_ON_LENGTH` | Geometry of a path length, not a dash style |
| Data-encoded tint ramps | `CarbonStorageAccounting`, `EnvironmentalObservationGaps`, `PopulationNormalizedMap`, `SpatialGridBinning`, `KernelDensitySpread` | The opacity encodes a data value. Each ramp passes through the wash scale, so Tint strength reaches it |
| Shape-specific widths, radii, tints, and lengths | Named constants across presets, passed through `scales.stroke`, `scales.corner`, `scales.wash`, or `motion.scale` | Review class (a3): art direction with no shared role, scaled by the theme so global options reach it and `classic` stays identical |
| Fitted text sizes | `FitText` sizes, `LabelSlots` tuples, measured sentence layouts | Review class (b): sizes checked against measured glyph widths |
| A 10 px ordinal | `PooledDonorAllocation/DonorToken.tsx` | No graphic text role is 10 px. It is a named size on the data role's face (review 3.2) |
| Caption band default border | `src/scenes/layout/captionLayout.ts` | The reserved caption band is measured where no theme is at hand, with `classic`'s 1 px hairline. The drawn caption passes the theme's hairline |
| Product reenactment | `avandar-adapter/`, product scenes in sample films | Real product components draw with the product's own styles. The sentinel test stands an empty box in for them |
| `src/theme.css` | The live player and the Remotion root | It keeps the upstream starter palette as `oklch()` values; `starter` reproduces it as measured hex |
| Sample frames | Sentinel and parity tests | The sentinel tests render sample frames, not every frame, and count an opacity finding only when the next frame holds it too. A literal visible only between samples can slip through until a sample lands on it |

## Tests that failed before this work

The four failures the slice reports listed were all fixed on this branch: `ShowcaseFilms` (its fixture copied a hand-kept file list), `tests/editor-controls` (its esbuild build had no YAML loader), and `tests/stock` StockScene (a bare shot rendered without the theme its film provides). `ShowcaseFilms` and `editor-controls` also fail on `develop`; `helperCatalogDrift` passes on both.
