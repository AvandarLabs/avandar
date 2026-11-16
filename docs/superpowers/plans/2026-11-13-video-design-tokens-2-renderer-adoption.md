# Video design tokens, plan 2 of 3: renderer adoption

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every in-scope renderer draw from the video theme: the twelve stock presets, the shared stock primitives, the continuity renderer, transitions, and the camera. `classic` stays pixel-identical to today (apart from the two consolidations in spec §1.6), `avandar` restyles everything, and the existing gallery controls and MP4 exports keep working through a temporary legacy bridge.

**Architecture:** Every film renders inside a `VideoThemeProvider` built from a frozen `VideoThemeSnapshot` carried on the `Film`, and every stock graphic adds its own `VideoThemeScope` (preset override plus any explicit colour props). Themed shapes read component defaults and semantic tokens through hooks; CSS modules read `--video-*` variables. Theme-dependent timing (the camera preset, motion presets, camera curves, and blur settings) is applied to the plan by `createContinuityPlanFromVideoTheme` wherever a plan meets its theme, so `motion.ts` and the motion components stay free of theme lookups. A parity gate runs after every renderer step.

**Tech stack:** TypeScript, React 19, Mantine 9.2 (`MantineThemeProvider`, `filterProps`), Remotion 4, roughjs 4.6, zod 4.4, node:test with tsx.

**Spec:** `docs/superpowers/specs/2026-11-12-video-design-tokens-design.md`, §5.4 step 2. **Depends on:** plan 1 (`docs/superpowers/plans/2026-11-13-video-design-tokens-1-model.md`), complete and green, with the parity baseline captured.

---

## Conventions for every task

- Paths are relative to `apps/ava-video-producer/`. Every command runs from that directory. A path that starts with `<repo>/` is relative to the repository root.
- Run one test file with:
  `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test <file>`
- Typecheck with `pnpm exec tsc --noEmit` (for `src/`) and `pnpm exec tsc --noEmit -p tsconfig.tools.json` (for `scripts/` and `tests/`).
- The parity gate is `pnpm theme:parity compare`. "Parity passes" means every target reports `unexplainedPixels` 0 and `missingFrames` 0. Only plan 1's allowances (the three caption bands and two halo regions) may differ.
- Follow `<repo>/docs/rules/typescript.md` and `<repo>/docs/rules/testing.md`: `type` over `interface`, no `any`, no `as unknown as`, `_`-prefixed private helpers, functions of 45 lines or fewer, a docstring on every export that says what it is for, tests named for the behavior they assert, no em dashes in comments.
- Commit after every task in this worktree. End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never edit `<repo>/src/config/Theme`. Never theme a reenactment: product components keep the product theme.
- Expected pre-existing test failures: three cases in `scripts/showcase/ShowcaseFilms/ShowcaseFilms.test.ts` (its temp copy lacks `helperCatalog`) and one in `editor-controls.test`. Every other failure is yours.

## Contract changes for plan 1

Report these to the plan 1 owner; plan 3 builds on them.

| # | Plan 1 contract | Change | Why |
| --- | --- | --- | --- |
| 1 | Themed shapes call `useVideoProps` and `useVideoTokens` | Graphic-surface shapes call `useGraphicProps`, `useGraphicTokens`, and `useGraphicMotion` (Task 7). They read the surrounding theme exactly like the plan 1 hooks, report usage the same way, merge props with Mantine's own `filterProps`, and fall back to the resolved `classic` theme when no provider is mounted. Stage components keep the plan 1 hooks. | Stock shapes render without a provider in about 40 existing unit tests, in direct renderer calls (`stockRenderers[preset](...)`), and in out-of-scope presets. The plan 1 hooks throw there by design. |
| 2 | `VideoThemeScope` and `VideoThemeProvider` signatures | Unchanged, but both now cache: equal scopes share one source object, and each source resolves once (`resolveVideoThemeFromSource`, Task 1). | A composition samples a stock graphic ten times per frame for motion blur; resolving per mount would cost tens of milliseconds a frame. |
| 3 | `classic` `fontSizes` keys `2xs`–`5xl` | Renumbered `3xs`–`9xl` so the fifteen graphic sizes stay in order (Task 7). Every `$fontSizes.*` reference in `classic` is updated in the same task. | The stock presets need 15, 16, 21, 24, and 32 px, which do not fit between the plan 1 keys. |
| 4 | `loadVideoThemeSnapshot({ id, patch? })` | Takes an optional second argument `{ directory }`, defaulting to `themes/`. | Tests load from a temporary directory. |
| 5 | Snapshot helpers | Adds `CLASSIC_VIDEO_THEME_SNAPSHOT`, `createVideoThemeSnapshot`, `resolveVideoThemeFromSnapshot`, and `addPatchesToVideoThemeSnapshot` beside the contract's `VideoThemeSnapshot` and `createVideoThemeSourceFromSnapshot`. | Plan 3 needs them to post a draft to the live player and to acknowledge it by hash. |
| 6 | "Product root wrapped in `ReenactmentThemeBoundary`" | Done through a new `avandar-adapter/ProductThemeRoot.tsx` that the adapter renders. Isolation already holds today because `scripts/build-avandar.mjs` bundles the product's own copy of `@mantine/core`, so the product's `MantineProvider` never sees the film's theme context. The boundary is defence in depth if that bundling changes. | Recorded so nobody removes the boundary believing it does nothing. |

## Spec corrections this plan makes

Plan 1's corrections still apply. These are new.

| # | Spec says | This plan does | Why |
| --- | --- | --- | --- |
| 1 | Tempo "divides animation durations inside a beat" | Tempo divides durations and staggers. It never changes cue frames (`at`), periods of repeating motion (`wave`, `loopPhase`), or timeline lengths. | Dividing a period would break the seamless 180-frame stock loop. |
| 2 | Camera preset, shutter, and samples "come from tokens" | `createContinuityPlanFromVideoTheme` (Task 30) applies the theme's camera preset, expands every authored motion `preset` into explicit `speed`, `shutterAngle`, and `easing` from the theme, turns the named camera curves into the theme's curves, clamps zoom to the theme's limits, and fills every cue's blur settings, wherever a plan meets its theme. Applying a theme twice changes nothing. | A camera preset changes beat durations, which must be known before Remotion sizes the composition. Applying the theme to the plan keeps `motionSettings`, `cameraTrack`, and `SceneTransition` free of theme lookups. |
| 3 | Component names `Bracket`, `Connector` | `Annotation` (all rough-notation marks: box, bracket, circle, highlight, underline) and `Connector`; plus `Thesis` and `FloatingDiagram`, which the spec's table omits but the continuity renderer draws. | Every continuity shape gets one owner. |
| 4 | Every value tokenized | Preset geometry stays content (positions, path data, data-driven spacing, connection thresholds that place things). Preset-specific aesthetic values (radii, opacities, stroke widths, offsets) become component tokens under a group named for the preset, such as `components.OrbitalSystem.coreRadius`. Shared values reference atomic or semantic tokens; one-offs are deliberate literals. The atomic `size` scale stays empty. | This is the spec's rule (§1.2, §1.5) applied to presets the spec only named. |
| 5 | Stock graphic text sizes come from type roles | `FitText` and `LabelSlots` sizes stay content: the stock contract validates them against measured widths (`FitTextSize`). They read family, colour, and line height from `text.graphic.data`. | Changing a fitted size without re-measuring would overflow a slot. |
| 6 | Shared primitives read tokens | Their defaults equal `classic` exactly, so the roughly 100 out-of-scope presets that still use `STOCK` constants do not change. `Packet` and `Check` default to `$atomic.swatch.mint` because those presets rely on mint when they pass no colour. | Out-of-scope presets are not parity-gated, so their safety comes from identical defaults. |
| 7 | Usage is collected from renders | Stage tokens read only by CSS modules are not seen by the collector. The dead-token audit (Task 33) finds their readers by searching the CSS modules, and finds stage TSX readers by searching for token paths and `useVideoProps` calls. | CSS cannot report reads, and continuity components need a Remotion context that unit tests do not have. |
| 8 | Transition component `Spatial` with a blur token | The spatial transition's peak blur is plan 1's `motionBlur.transitionBlur`, carried in motion options (Task 29). `Morph.startRadius` and `Aperture.overscan` are components as the spec lists. | Plan 1 already owns the value; a second token would duplicate it. |
| 9 | (not covered) | Velocity blur factor and limit and the spatial transition's blur become optional motion options (`velocityBlurFactor`, `velocityBlurLimit`, `transitionBlur`) that a storyboard may also author per cue. | Motion options already flow to every motion component, so the theme reaches them without new props. |

## File map

Created:

| File | Responsibility |
| --- | --- |
| `src/videoTheme/resolveVideoThemeFromSource/resolveVideoThemeFromSource.ts` | Resolve each source once |
| `src/videoTheme/videoThemeSnapshot/videoThemeSnapshot.ts` | `VideoThemeSnapshot` and its source, resolution, and patch helpers |
| `src/videoTheme/themePatches/themePatches.ts` | `createThemePatchFromStockColors`, `createThemePatchFromLegacyAppearance` |
| `scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.ts` | Server-side snapshot from `themes/` |
| `scripts/showcase/deliveryTheme/deliveryTheme.ts` | `themeId` and `themeHash` for `delivery.json` |
| `src/storyboard/ThemedStoryFilm/ThemedStoryFilm.tsx` | Story-film roots with a theme provider |
| `avandar-adapter/ProductThemeRoot.tsx` | Product `MantineProvider` inside `ReenactmentThemeBoundary` |
| `src/videoTheme/createVideoMotion/createVideoMotion.ts` | Tempo-scaled durations, staggers, and easing functions |
| `src/stock/theme/useGraphicTheme.ts` | `useGraphicTheme`, `useGraphicTokens`, `useGraphicProps`, `useGraphicMotion`, `GraphicIdContext`, `useGraphicFilter` |
| `src/stock/theme/resolveContentColor/resolveContentColor.ts` | Content colour fields that accept `$color.*` roles |
| `src/videoTheme/videoEffectFilters/videoEffectFilters.ts`, `src/videoTheme/VideoEffectDefs/VideoEffectDefs.tsx` | SVG filters for themed glows and shadows |
| `src/videoTheme/sketchShape/sketchShape.ts` | Memoized seeded roughjs paths for any shape |
| `src/stock/primitives/SketchedShape/SketchedShape.tsx` | A circle, ellipse, line, path, or rect drawn smooth or sketched |
| `src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.ts` | Camera preset, motion presets, camera curves and zoom, and blur settings from the theme |
| `src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx`, `src/continuity/__tests__/stage-styles-read-emitted-theme-variables.integration.test.ts` | Nested presets and stage CSS follow the theme |
| `scripts/videoTheme/__tests__/animations-finish-at-the-slowest-tempo.integration.test.tsx`, `scripts/videoTheme/__tests__/every-token-has-a-reader.integration.test.tsx` | Tempo and dead-token audits (under `scripts/` to reuse the parity target lists) |
| `showcase/assets/atlas/classic/`, `showcase/assets/atlas/avandar/` | Tracked posters per theme |

Modified: the catalog files and `themes/classic.theme.json`, every in-scope renderer, `src/motion-components/motionSettings.ts` and `SceneTransition.tsx`, `src/showcase/*`, `scripts/showcase/*`, `scripts/video.ts`, `scripts/motion.ts`, `scripts/MotionRequests/MotionRequests.ts`, the continuity schema, appearance, CSS modules, the gallery's `CompositionCard`, and the 23 continuity storyboards (one line each).

Deleted: `src/continuity/createContinuityShotFromCameraPreset.ts` (Task 30 replaces it).

---

### Task 1: Resolve each theme source once

**Files:**
- Create: `src/videoTheme/resolveVideoThemeFromSource/resolveVideoThemeFromSource.ts`
- Test: `src/videoTheme/resolveVideoThemeFromSource/resolveVideoThemeFromSource.test.ts`
- Modify: `src/videoTheme/VideoThemeScope/VideoThemeScope.tsx`
- Modify: `src/videoTheme/VideoThemeProvider/VideoThemeProvider.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { getScopedVideoThemeSource } from "../VideoThemeScope/VideoThemeScope";
import { resolveVideoThemeFromSource } from "./resolveVideoThemeFromSource";

test("one source resolves to the same theme object every time", () => {
  assert.equal(
    resolveVideoThemeFromSource(DEFAULT_VIDEO_THEME_SOURCE),
    resolveVideoThemeFromSource(DEFAULT_VIDEO_THEME_SOURCE),
  );
});

test("equal nested scopes share one source object", () => {
  const inner = { overrideIds: ["network-graph"] };
  assert.equal(
    getScopedVideoThemeSource(DEFAULT_VIDEO_THEME_SOURCE, inner),
    getScopedVideoThemeSource(DEFAULT_VIDEO_THEME_SOURCE, { overrideIds: ["network-graph"] }),
  );
});

test("different nested scopes get different sources", () => {
  assert.notEqual(
    getScopedVideoThemeSource(DEFAULT_VIDEO_THEME_SOURCE, { overrideIds: ["network-graph"] }),
    getScopedVideoThemeSource(DEFAULT_VIDEO_THEME_SOURCE, { overrideIds: ["radial-network"] }),
  );
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/resolveVideoThemeFromSource/resolveVideoThemeFromSource.test.ts`
Expected: FAIL, `Cannot find module './resolveVideoThemeFromSource'`.

- [ ] **Step 3: Implement the resolution cache**

`src/videoTheme/resolveVideoThemeFromSource/resolveVideoThemeFromSource.ts`:

```ts
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import type { ResolvedVideoTheme, VideoThemeSource } from "../videoTheme.types";

const RESOLVED_THEMES = new WeakMap<VideoThemeSource, ResolvedVideoTheme>();

/**
 * The resolved theme for a source, computed once per source object. Sources
 * are treated as immutable, so providers that share a source (for example
 * the ten motion-blur samples of one stock graphic) share the result.
 */
export function resolveVideoThemeFromSource(source: VideoThemeSource): ResolvedVideoTheme {
  const cached = RESOLVED_THEMES.get(source);
  if (cached) {
    return cached;
  }
  const theme = resolveVideoTheme(source.library, source.themeId, source.scope);
  RESOLVED_THEMES.set(source, theme);
  return theme;
}
```

- [ ] **Step 4: Share scoped sources**

In `src/videoTheme/VideoThemeScope/VideoThemeScope.tsx`, add below `createScopedVideoThemeSource`:

```ts
const SCOPED_SOURCES = new WeakMap<VideoThemeSource, Map<string, VideoThemeSource>>();

/**
 * `createScopedVideoThemeSource`, returning the same object for the same
 * outer source and inner scope, so resolution caches and memoized providers
 * see a stable identity across mounts and frames.
 */
export function getScopedVideoThemeSource(outer: VideoThemeSource, inner: Scope): VideoThemeSource {
  const key = JSON.stringify(inner);
  const byScope = SCOPED_SOURCES.get(outer) ?? new Map<string, VideoThemeSource>();
  SCOPED_SOURCES.set(outer, byScope);
  const cached = byScope.get(key);
  if (cached) {
    return cached;
  }
  const source = createScopedVideoThemeSource(outer, inner);
  byScope.set(key, source);
  return source;
}
```

and in `VideoThemeScope` replace

```ts
  const source = useMemo(
    () => createScopedVideoThemeSource(outer, JSON.parse(scopeKey) as Scope),
    [outer, scopeKey],
  );
```

with

```ts
  const source = useMemo(
    () => getScopedVideoThemeSource(outer, JSON.parse(scopeKey) as Scope),
    [outer, scopeKey],
  );
```

- [ ] **Step 5: Use the caches in the provider**

In `src/videoTheme/VideoThemeProvider/VideoThemeProvider.tsx`:
- replace the import of `resolveVideoTheme` with `import { resolveVideoThemeFromSource } from "../resolveVideoThemeFromSource/resolveVideoThemeFromSource";`
- add above `type Props`:

```ts
const CSS_STYLES = new WeakMap<ResolvedVideoTheme, CSSProperties>();

function _styleFromTheme(theme: ResolvedVideoTheme): CSSProperties {
  const cached = CSS_STYLES.get(theme);
  if (cached) {
    return cached;
  }
  const style = { display: "contents", ...buildVideoCssVariables(theme) } as CSSProperties;
  CSS_STYLES.set(theme, style);
  return style;
}
```

- add `ResolvedVideoTheme` to the type import from `../videoTheme.types`,
- replace the body's first three hooks with:

```ts
  const theme = useMemo(() => resolveVideoThemeFromSource(source), [source]);
  const value = useMemo(() => ({ theme, source }), [theme, source]);
  const style = _styleFromTheme(theme);
```

- [ ] **Step 6: Run the new and existing provider tests**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/resolveVideoThemeFromSource/resolveVideoThemeFromSource.test.ts src/videoTheme/VideoThemeProvider/VideoThemeProvider.test.tsx src/videoTheme/VideoThemeScope/VideoThemeScope.test.tsx`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/videoTheme/resolveVideoThemeFromSource src/videoTheme/VideoThemeScope src/videoTheme/VideoThemeProvider
git commit -m "perf(video-producer): resolve each video theme source once" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Theme snapshots

**Files:**
- Create: `src/videoTheme/videoThemeSnapshot/videoThemeSnapshot.ts`
- Test: `src/videoTheme/videoThemeSnapshot/videoThemeSnapshot.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createVideoThemeLibrary } from "../builtInVideoThemes/builtInVideoThemes";
import {
  addPatchesToVideoThemeSnapshot,
  CLASSIC_VIDEO_THEME_SNAPSHOT,
  createVideoThemeSnapshot,
  createVideoThemeSourceFromSnapshot,
  resolveVideoThemeFromSnapshot,
} from "./videoThemeSnapshot";
import type { VideoThemeDocument } from "../videoTheme.types";

const WARM: VideoThemeDocument = {
  schemaVersion: 1,
  id: "warm",
  label: "Warm",
  extends: "avandar",
  other: { video: { atomic: { swatch: { ground: "#201510" } } } },
  overrides: { "shared-object-handoff": { other: { video: { atomic: { swatch: { ground: "#111111" } } } } } },
};
const RED_GROUND = { other: { video: { atomic: { swatch: { ground: "#330000" } } } } };

test("an undefined snapshot means classic", () => {
  const theme = resolveVideoThemeFromSnapshot(undefined, []);
  assert.equal(theme.id, "classic");
});

test("a snapshot keeps the theme and the custom themes it extends, without built-ins", () => {
  const snapshot = createVideoThemeSnapshot(createVideoThemeLibrary([WARM]), "warm");
  assert.deepEqual(snapshot.documents.map(({ id }) => id), ["warm"]);
});

test("a snapshot resolves the item override before its patches", () => {
  const snapshot = addPatchesToVideoThemeSnapshot(
    createVideoThemeSnapshot(createVideoThemeLibrary([WARM]), "warm"),
    [RED_GROUND],
  );
  assert.equal(
    resolveVideoThemeFromSnapshot(snapshot, ["shared-object-handoff"]).semantic.color.ground,
    "#330000",
  );
});

test("the same snapshot and overrides give the same source object", () => {
  assert.equal(
    createVideoThemeSourceFromSnapshot(CLASSIC_VIDEO_THEME_SNAPSHOT, ["occlusion-wipe"]),
    createVideoThemeSourceFromSnapshot(CLASSIC_VIDEO_THEME_SNAPSHOT, ["occlusion-wipe"]),
  );
});

test("adding no patches returns the same snapshot", () => {
  assert.equal(addPatchesToVideoThemeSnapshot(CLASSIC_VIDEO_THEME_SNAPSHOT, []), CLASSIC_VIDEO_THEME_SNAPSHOT);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/videoThemeSnapshot/videoThemeSnapshot.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../builtInVideoThemes/builtInVideoThemes";
import { getExtendsChainFromThemeId } from "../mergeVideoThemeLayers/mergeVideoThemeLayers";
import { resolveVideoThemeFromSource } from "../resolveVideoThemeFromSource/resolveVideoThemeFromSource";
import type {
  ResolvedVideoTheme,
  VideoThemeDocument,
  VideoThemeLibrary,
  VideoThemePatch,
  VideoThemeSource,
} from "../videoTheme.types";

/**
 * Everything a render needs to resolve a theme without reading `themes/`:
 * the theme id, the custom documents it depends on (its `extends` chain
 * without built-ins, which every bundle carries), and unsaved draft patches,
 * lowest precedence first (the theme-scope draft, then the item override
 * draft). Frozen into a `Film` and posted to the live player.
 */
export type VideoThemeSnapshot = Readonly<{
  themeId: string;
  documents: readonly VideoThemeDocument[];
  patches: readonly VideoThemePatch[];
}>;

/** The built-in default: `classic` with no drafts. */
export const CLASSIC_VIDEO_THEME_SNAPSHOT: VideoThemeSnapshot = {
  themeId: "classic",
  documents: [],
  patches: [],
};

/**
 * A snapshot of one theme from a library, for example the themes read from
 * `themes/` on the showcase server, with optional draft patches.
 */
export function createVideoThemeSnapshot(
  library: VideoThemeLibrary,
  themeId: string,
  patches: readonly VideoThemePatch[] = [],
): VideoThemeSnapshot {
  const documents = getExtendsChainFromThemeId(library, themeId).filter(
    (document) => !BUILT_IN_VIDEO_THEMES.has(document.id),
  );
  return { themeId, documents, patches };
}

/** A snapshot with more draft patches applied after its own. */
export function addPatchesToVideoThemeSnapshot(
  snapshot: VideoThemeSnapshot,
  patches: readonly VideoThemePatch[],
): VideoThemeSnapshot {
  return patches.length === 0
    ? snapshot
    : { ...snapshot, patches: [...snapshot.patches, ...patches] };
}

const SOURCES = new WeakMap<VideoThemeSnapshot, Map<string, VideoThemeSource>>();

/**
 * The theme source for one item rendered from a snapshot: the snapshot's
 * theme with that item's overrides and the snapshot's drafts. Returns the
 * same object for the same snapshot and ids. An undefined snapshot is
 * `classic`, so films saved before themes existed still render.
 */
export function createVideoThemeSourceFromSnapshot(
  snapshot: VideoThemeSnapshot | undefined,
  overrideIds: readonly string[],
): VideoThemeSource {
  const value = snapshot ?? CLASSIC_VIDEO_THEME_SNAPSHOT;
  const key = JSON.stringify(overrideIds);
  const byIds = SOURCES.get(value) ?? new Map<string, VideoThemeSource>();
  SOURCES.set(value, byIds);
  const cached = byIds.get(key);
  if (cached) {
    return cached;
  }
  const source: VideoThemeSource = {
    library: createVideoThemeLibrary(value.documents),
    themeId: value.themeId,
    scope: { overrideIds: [...overrideIds], patches: value.patches },
  };
  byIds.set(key, source);
  return source;
}

/** The resolved theme of one item rendered from a snapshot. */
export function resolveVideoThemeFromSnapshot(
  snapshot: VideoThemeSnapshot | undefined,
  overrideIds: readonly string[],
): ResolvedVideoTheme {
  return resolveVideoThemeFromSource(createVideoThemeSourceFromSnapshot(snapshot, overrideIds));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/videoTheme/videoThemeSnapshot
git commit -m "feat(video-producer): freeze video themes into portable snapshots" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Theme patches for stock colours and legacy appearance

**Files:**
- Create: `src/videoTheme/themePatches/themePatches.ts`
- Test: `src/videoTheme/themePatches/themePatches.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import { videoThemePatchSchema } from "../videoThemeSchema/videoThemeSchema";
import {
  createThemePatchFromLegacyAppearance,
  createThemePatchFromStockColors,
} from "./themePatches";
import type { VideoThemePatch } from "../videoTheme.types";

function _classicWith(patch: VideoThemePatch) {
  return resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", { patches: [patch] });
}

test("a picked stock accent becomes the accent swatch", () => {
  assert.equal(_classicWith(createThemePatchFromStockColors({ accent: "#ff0000" })).semantic.color.accent, "#ff0000");
});

test("a picked stock background becomes the ground swatch", () => {
  assert.equal(_classicWith(createThemePatchFromStockColors({ background: "#f8fafc" })).semantic.color.ground, "#f8fafc");
});

test("no colours make an empty patch that changes nothing", () => {
  assert.equal(
    _classicWith(createThemePatchFromStockColors({})).hash,
    resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic").hash,
  );
});

test("legacy roughness sets the annotation and box sketch profiles", () => {
  const theme = _classicWith(createThemePatchFromLegacyAppearance({ annotationRoughness: 0.5, boxRoughness: 3 }));
  assert.deepEqual(
    [theme.semantic.sketch.annotation.roughness, theme.semantic.sketch.box.roughness],
    [0.5, 3],
  );
});

test("a legacy camera preset becomes the theme camera preset", () => {
  assert.equal(_classicWith(createThemePatchFromLegacyAppearance({ cameraPreset: "whip" })).semantic.camera.preset, "whip");
});

test("legacy patches are valid theme patches", () => {
  const patch = createThemePatchFromLegacyAppearance({
    accent: "#123456",
    background: "#abcdef",
    annotationRoughness: 1,
    boxRoughness: 0,
    cameraPreset: "gentle",
  });
  assert.equal(videoThemePatchSchema.safeParse(patch).success, true);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/themePatches/themePatches.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import type { VideoThemePatch } from "../videoTheme.types";

/** A camera preset name, or `authored` for the storyboard's own timing. */
export type CameraPresetName = "authored" | "deliberate" | "gentle" | "balanced" | "brisk" | "whip";

/** The appearance fields the gallery sends today, before the token editor replaces them. */
export type LegacyAppearance = Readonly<{
  accent?: string;
  background?: string;
  annotationRoughness?: number;
  boxRoughness?: number;
  cameraPreset?: CameraPresetName;
}>;

type StockColors = Readonly<{ accent?: string; background?: string }>;

function _colorParts(colors: StockColors) {
  return {
    swatch: {
      ...(colors.accent ? { accent: colors.accent } : {}),
      ...(colors.background ? { ground: colors.background } : {}),
    },
    semantic: colors.accent ? { color: { accent: "$atomic.swatch.accent" } } : {},
  };
}

/**
 * A patch that applies a stock request's explicit `accent` and `background`
 * props: each picked hex becomes a swatch (`swatch.accent`, `swatch.ground`)
 * and the accent role points at it. Used by `StockGraphic`, so a colour in
 * content or a CLI request wins over the surrounding theme.
 */
export function createThemePatchFromStockColors(colors: StockColors): VideoThemePatch {
  const { swatch, semantic } = _colorParts(colors);
  return { other: { video: { atomic: { swatch }, semantic } } };
}

function _sketchProfile(roughnessKey: string) {
  return {
    roughness: `$atomic.roughness.${roughnessKey}`,
    bowing: "$atomic.bowing.md",
    seed: "$atomic.seed.md",
    randomness: "$atomic.randomness.md",
  };
}

/**
 * A patch that carries the gallery's current palette, roughness, and camera
 * preset controls into the theme, so those controls, the live player, and
 * MP4 exports keep working until the token editor replaces them. Roughness
 * values become atomic roughness steps named `legacyAnnotation` and
 * `legacyBox`.
 */
export function createThemePatchFromLegacyAppearance(appearance: LegacyAppearance): VideoThemePatch {
  const { swatch, semantic } = _colorParts(appearance);
  const hasAnnotation = appearance.annotationRoughness !== undefined;
  const hasBox = appearance.boxRoughness !== undefined;
  return {
    other: {
      video: {
        atomic: {
          swatch,
          roughness: {
            ...(hasAnnotation ? { legacyAnnotation: appearance.annotationRoughness } : {}),
            ...(hasBox ? { legacyBox: appearance.boxRoughness } : {}),
          },
        },
        semantic: {
          ...semantic,
          sketch: {
            ...(hasAnnotation ? { annotation: _sketchProfile("legacyAnnotation") } : {}),
            ...(hasBox ? { box: _sketchProfile("legacyBox") } : {}),
          },
          ...(appearance.cameraPreset ? { camera: { preset: appearance.cameraPreset } } : {}),
        },
      },
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/videoTheme/themePatches
git commit -m "feat(video-producer): turn stock colours and legacy controls into theme patches" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Load snapshots on the server

**Files:**
- Create: `scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.ts`
- Test: `scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadVideoThemeSnapshot } from "./loadVideoThemeSnapshot";

const THEMES = fileURLToPath(new URL("../../../themes", import.meta.url));
const WARM = { schemaVersion: 1, id: "warm", label: "Warm", extends: "classic" };
const WARMER = { schemaVersion: 1, id: "warmer", label: "Warmer", extends: "warm" };

async function _withThemes(run: (directory: string) => Promise<void>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "theme-snapshot-"));
  try {
    for (const name of ["classic.theme.json", "avandar.theme.json"]) {
      await fs.copyFile(path.join(THEMES, name), path.join(directory, name));
    }
    await fs.writeFile(path.join(directory, "warm.theme.json"), JSON.stringify(WARM));
    await fs.writeFile(path.join(directory, "warmer.theme.json"), JSON.stringify(WARMER));
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("a built-in theme snapshot carries no documents", () =>
  _withThemes(async (directory) => {
    assert.deepEqual(await loadVideoThemeSnapshot({ id: "avandar" }, { directory }), {
      themeId: "avandar",
      documents: [],
      patches: [],
    });
  }));

test("a custom theme snapshot carries its extends chain, root first", () =>
  _withThemes(async (directory) => {
    const snapshot = await loadVideoThemeSnapshot({ id: "warmer" }, { directory });
    assert.deepEqual(snapshot.documents.map(({ id }) => id), ["warm", "warmer"]);
  }));

test("a draft patch travels with the snapshot", () =>
  _withThemes(async (directory) => {
    const patch = { other: { video: { atomic: { swatch: { ground: "#201510" } } } } };
    assert.deepEqual((await loadVideoThemeSnapshot({ id: "classic", patch }, { directory })).patches, [patch]);
  }));

test("an invalid draft patch is rejected", () =>
  _withThemes(async (directory) => {
    const patch = { other: { video: { semantic: { color: { accent: "#ff0000" } } } } };
    await assert.rejects(loadVideoThemeSnapshot({ id: "classic", patch }, { directory }));
  }));

test("an unknown theme is rejected", () =>
  _withThemes(async (directory) => {
    await assert.rejects(loadVideoThemeSnapshot({ id: "missing" }, { directory }), /Unknown video theme "missing"/);
  }));
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import { fileURLToPath } from "node:url";
import { createVideoThemeLibrary } from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { videoThemePatchSchema } from "../../../src/videoTheme/videoThemeSchema/videoThemeSchema";
import {
  createVideoThemeSnapshot,
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { createThemeStore } from "../../showcase/themeStore/themeStore";
import type { VideoThemePatch } from "../../../src/videoTheme/videoTheme.types";

const THEMES_DIRECTORY = fileURLToPath(new URL("../../../themes", import.meta.url));

/**
 * A snapshot of a theme in `themes/`, with an optional draft patch, checked
 * by resolving it once so an invalid theme or patch fails here rather than
 * mid-render. Used wherever a render starts on the server: showcase films,
 * exports, posters, the parity gate, and the `video` and `motion` CLIs.
 */
export async function loadVideoThemeSnapshot(
  request: Readonly<{ id: string; patch?: VideoThemePatch }>,
  options: Readonly<{ directory?: string }> = {},
): Promise<VideoThemeSnapshot> {
  const store = createThemeStore({ directory: options.directory ?? THEMES_DIRECTORY });
  const summaries = await store.list();
  const documents = await Promise.all(
    summaries.map(async ({ id }) => (await store.read(id)).document),
  );
  const library = createVideoThemeLibrary(documents);
  if (!library.has(request.id)) {
    throw new Error(`Unknown video theme "${request.id}". Themes live in themes/<id>.theme.json.`);
  }
  const patches = request.patch
    ? [videoThemePatchSchema.parse(request.patch) as VideoThemePatch]
    : [];
  const snapshot = createVideoThemeSnapshot(library, request.id, patches);
  resolveVideoThemeFromSnapshot(snapshot, []);
  return snapshot;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/videoTheme/loadVideoThemeSnapshot
git commit -m "feat(video-producer): load validated theme snapshots on the server" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Films carry a theme

**Files:**
- Modify: `src/showcase/showcase.types.ts`
- Modify: `scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts`
- Modify: `src/showcase/FilmComposition.tsx`
- Create: `scripts/showcase/deliveryTheme/deliveryTheme.ts`
- Modify: `scripts/showcase/render.ts`
- Test: `scripts/showcase/ShowcaseFilms/themedFilms.test.ts`
- Test: `scripts/showcase/deliveryTheme/deliveryTheme.test.ts`

- [ ] **Step 1: Write the failing film tests**

`scripts/showcase/ShowcaseFilms/themedFilms.test.ts` (beside the existing `helperFilms.test.ts`):

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { ShowcaseFilms } from "./ShowcaseFilms";

test("a film without a theme option carries the classic snapshot", async () => {
  const film = await ShowcaseFilms.load("occlusion-wipe");
  assert.deepEqual(film.theme, { themeId: "classic", documents: [], patches: [] });
});

test("a film carries the requested theme and its draft patch", async () => {
  const patch = { other: { video: { atomic: { swatch: { ground: "#201510" } } } } };
  const film = await ShowcaseFilms.load("stock-network-graph", { theme: { id: "avandar", patch } });
  assert.equal(film.theme?.themeId, "avandar");
  assert.deepEqual(film.theme?.patches, [patch]);
});

test("a stock film keeps its theme out of the stock request", async () => {
  const film = await ShowcaseFilms.load("stock-network-graph", { theme: { id: "avandar" } });
  assert.equal(film.kind === "stock" && film.preset, "network-graph");
});

test("an unknown theme is refused", async () => {
  await assert.rejects(ShowcaseFilms.load("occlusion-wipe", { theme: { id: "missing" } }));
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/showcase/ShowcaseFilms/themedFilms.test.ts`
Expected: FAIL. `film.theme` is undefined and `theme` is an unrecognized option.

- [ ] **Step 3: Add the theme to the film types**

In `src/showcase/showcase.types.ts`, add to the imports:

```ts
import type { VideoThemePatch } from "../videoTheme/videoTheme.types";
import type { VideoThemeSnapshot } from "../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
```

In `Film`, after `plan?: Storyboard;` add:

```ts
  /** The theme every frame resolves. Undefined renders `classic`. */
  theme?: VideoThemeSnapshot;
```

In `FilmOptions`, after `background?: string;` add:

```ts
  /** A theme from `themes/` and the unsaved draft to apply on top of it. */
  theme?: Readonly<{ id: string; patch?: VideoThemePatch }>;
```

- [ ] **Step 4: Accept and freeze the theme in `ShowcaseFilms.load`**

In `scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts`:

1. Add imports:

```ts
import {
  VIDEO_THEME_SLUG_PATTERN,
  videoThemePatchSchema,
} from "../../../src/videoTheme/videoThemeSchema/videoThemeSchema";
import { loadVideoThemeSnapshot } from "../../videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot";
```

2. In `optionsSchema`, after `background: color.optional(),` add:

```ts
    theme: z
      .object({
        id: z.string().regex(VIDEO_THEME_SLUG_PATTERN),
        patch: videoThemePatchSchema.optional(),
      })
      .strict()
      .optional(),
```

3. In `_loadFilm`, replace

```ts
    Object.keys(options).some((key) => key !== "captions")
```

with

```ts
    Object.keys(options).some((key) => key !== "captions" && key !== "theme")
```

4. In `_loadFilm`, change `const base = {` to add a first property:

```ts
  const base = {
    theme: await loadVideoThemeSnapshot(options.theme ?? { id: "classic" }),
    id,
```

5. In the stock branch, replace

```ts
            ([key, value]) => key !== "captions" && value !== undefined,
```

with

```ts
            ([key, value]) =>
              key !== "captions" && key !== "theme" && value !== undefined,
```

- [ ] **Step 5: Run the film tests to verify they pass**

Run the Step 2 command. Expected: 4 passing.

- [ ] **Step 6: Provide the theme at the film root**

In `src/showcase/FilmComposition.tsx`:

1. Add imports:

```ts
import { createVideoThemeSourceFromSnapshot } from "../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { VideoThemeProvider } from "../videoTheme/VideoThemeProvider/VideoThemeProvider";
```

2. Replace

```ts
/** Shared picture for browser playback and serial frame rendering. */
export function FilmComposition({
```

with

```ts
/** The film's picture, drawn inside its theme by `FilmComposition`. */
function FilmPicture({
```

3. Append:

```tsx
/**
 * Shared picture for browser playback and serial frame rendering, themed
 * by the film's snapshot with the film id as its override scope. A stock
 * graphic or continuity beat inside adds its own nested scope.
 */
export function FilmComposition({
  film,
  withAudio = true,
}: {
  film: Film;
  withAudio?: boolean;
}) {
  return (
    <VideoThemeProvider
      source={createVideoThemeSourceFromSnapshot(film.theme, [film.id])}
    >
      <FilmPicture film={film} withAudio={withAudio} />
    </VideoThemeProvider>
  );
}
```

The provider's wrapper is `display: contents`, so it adds no box and moves no pixel.

- [ ] **Step 7: Write the failing delivery test**

`scripts/showcase/deliveryTheme/deliveryTheme.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { resolveVideoThemeFromSnapshot } from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { getDeliveryThemeFromFilm } from "./deliveryTheme";

test("a film without a theme records classic and classic's hash", () => {
  assert.deepEqual(getDeliveryThemeFromFilm({ id: "occlusion-wipe" }), {
    themeId: "classic",
    themeHash: resolveVideoThemeFromSnapshot(undefined, ["occlusion-wipe"]).hash,
  });
});

test("a themed film records the hash of what it rendered", () => {
  const theme = { themeId: "avandar", documents: [], patches: [] };
  assert.notEqual(
    getDeliveryThemeFromFilm({ id: "occlusion-wipe", theme }).themeHash,
    getDeliveryThemeFromFilm({ id: "occlusion-wipe" }).themeHash,
  );
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/showcase/deliveryTheme/deliveryTheme.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 8: Implement and record it in `delivery.json`**

`scripts/showcase/deliveryTheme/deliveryTheme.ts`:

```ts
import { resolveVideoThemeFromSnapshot } from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { Film } from "../../../src/showcase/showcase.types";

/**
 * The theme an export rendered, for its `delivery.json`: the theme id and
 * the resolved hash, which matches the hash the live player acknowledged
 * for the same draft.
 */
export function getDeliveryThemeFromFilm(
  film: Pick<Film, "id" | "theme">,
): Readonly<{ themeId: string; themeHash: string }> {
  return {
    themeId: film.theme?.themeId ?? "classic",
    themeHash: resolveVideoThemeFromSnapshot(film.theme, [film.id]).hash,
  };
}
```

In `scripts/showcase/render.ts`, import it:

```ts
import { getDeliveryThemeFromFilm } from "./deliveryTheme/deliveryTheme";
```

and in the `delivery.json` object, after `film: film.id,` add:

```ts
        ...getDeliveryThemeFromFilm(film),
```

Run the Step 7 command. Expected: 2 passing.

- [ ] **Step 9: Typecheck, check parity, commit**

Run both typecheck commands. Expected: no errors.
Run: `pnpm theme:parity compare`. Expected: parity passes.

```bash
git add src/showcase/showcase.types.ts src/showcase/FilmComposition.tsx scripts/showcase/ShowcaseFilms scripts/showcase/deliveryTheme scripts/showcase/render.ts
git commit -m "feat(video-producer): render every showcase film inside its theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Story-film roots and `video --theme`

**Files:**
- Create: `src/storyboard/ThemedStoryFilm/ThemedStoryFilm.tsx`
- Modify: `src/Root.tsx`
- Modify: `src/avandar-entry.tsx`
- Modify: `scripts/video.ts`
- Test: `tests/video-cli.test.ts`

- [ ] **Step 1: Write the failing CLI tests**

Append to `tests/video-cli.test.ts`:

```ts
test("preview and render accept one theme", () => {
  assert.equal(parseArgs(["preview", "plan.json", "--theme", "avandar"]).theme, "avandar");
  assert.equal(parseArgs(["render", "plan.json", "--theme", "classic"]).theme, "classic");
});

test("commands that draw no picture refuse a theme", () => {
  assert.throws(() => parseArgs(["validate", "plan.json", "--theme", "avandar"]), /Invalid/);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test tests/video-cli.test.ts`
Expected: the two new tests fail with `Invalid or repeated option: --theme`.

- [ ] **Step 2: Write the themed root**

`src/storyboard/ThemedStoryFilm/ThemedStoryFilm.tsx`:

```tsx
import { createVideoThemeSourceFromSnapshot } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { StoryFilm } from "../StoryFilm/StoryFilm";
import type { VideoThemeSnapshot } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { Storyboard } from "../schema/schema";
import type { ProductSceneRenderer } from "../StoryFilm/ShotView";

type Props = Readonly<{
  plan: Storyboard;
  theme?: VideoThemeSnapshot;
  productScene?: ProductSceneRenderer;
}>;

/**
 * A storyboard film drawn inside its theme, scoped by the plan id so the
 * theme's override for that composition applies. The root of every
 * `story-film` composition the `video` CLI renders.
 */
export function ThemedStoryFilm({ plan, theme, productScene }: Props) {
  return (
    <VideoThemeProvider source={createVideoThemeSourceFromSnapshot(theme, [plan.id])}>
      <StoryFilm plan={plan} productScene={productScene} />
    </VideoThemeProvider>
  );
}
```

- [ ] **Step 3: Use it in both story-film registrations**

In `src/Root.tsx`, replace `import { StoryFilm } from "./storyboard/StoryFilm/StoryFilm";` with `import { ThemedStoryFilm } from "./storyboard/ThemedStoryFilm/ThemedStoryFilm";`, then in the `story-film` composition replace `component={StoryFilm}` with `component={ThemedStoryFilm}` and replace

```ts
            props: { plan },
```

with

```ts
            props: { plan, theme: props.theme },
```

In `src/avandar-entry.tsx`, replace

```tsx
import { StoryFilm } from "./storyboard/StoryFilm/StoryFilm";

const defaults = storyboardSchema.parse(importPlan);
function ProductFilm({ plan }: { plan: Storyboard }) {
  return <StoryFilm plan={plan} productScene={AvandarScene} />;
}
```

with

```tsx
import { ThemedStoryFilm } from "./storyboard/ThemedStoryFilm/ThemedStoryFilm";
import type { VideoThemeSnapshot } from "./videoTheme/videoThemeSnapshot/videoThemeSnapshot";

const defaults = storyboardSchema.parse(importPlan);
function ProductFilm({ plan, theme }: { plan: Storyboard; theme?: VideoThemeSnapshot }) {
  return <ThemedStoryFilm plan={plan} theme={theme} productScene={AvandarScene} />;
}
```

and in its `calculateMetadata` replace `props: { plan },` with `props: { plan, theme: props.theme },`.

- [ ] **Step 4: Parse `--theme`**

In `scripts/video.ts`:

1. Add `theme?: string;` to `type Options`.
2. In `HELP`, change the preview and render lines to:

```text
  preview [--theme ID]         Render composed-film stills and contact sheet
  render [--theme ID]          Require matching preview, render/gate, mix audio
```

3. In `parseArgs`, replace

```ts
  const allowed =
    command === "tts"
      ? ["--voice", "--rate"]
      : command === "align"
        ? ["--audio", "--srt"]
        : [];
```

with

```ts
  const allowed =
    command === "tts"
      ? ["--voice", "--rate"]
      : command === "align"
        ? ["--audio", "--srt"]
        : command === "preview" || command === "render"
          ? ["--theme"]
          : [];
```

and after `else if (flag === "--srt") options.srt = value;` add `else if (flag === "--theme") options.theme = value;`.

Run the Step 1 command. Expected: all `video-cli` tests pass.

- [ ] **Step 5: Render with the theme and bind it to the preview**

In `scripts/video.ts`:

1. Add imports:

```ts
import { resolveVideoThemeFromSnapshot, type VideoThemeSnapshot } from "../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { loadVideoThemeSnapshot } from "./videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot";
```

2. Add above `preview`:

```ts
/** The plan fingerprint plus the resolved theme hash, so a preview only unlocks a render of the same theme. */
async function _fingerprintThemedPlan(
  plan: Storyboard,
  filename: string,
  workspace: string,
  theme: VideoThemeSnapshot,
) {
  return {
    ...(await fingerprintPlan(ROOT, filename, plan, workspace)),
    themeHash: resolveVideoThemeFromSnapshot(theme, [plan.id]).hash,
  };
}
```

3. Change the signatures to `async function preview(plan: Storyboard, filename: string, workspace: string, theme: VideoThemeSnapshot)` and `async function render(plan: Storyboard, filename: string, workspace: string, theme: VideoThemeSnapshot)`.
4. In both functions replace each `await fingerprintPlan(ROOT, filename, plan, workspace)` (two in each) with `await _fingerprintThemedPlan(plan, filename, workspace, theme)`.
5. In `preview`, replace both `inputProps: { plan },` with `inputProps: { plan, theme },`.
6. In `render`, replace `await writeJson(props, { plan });` with `await writeJson(props, { plan, theme });`.
7. In `main`, replace the last two dispatch branches:

```ts
  else if (options.command === "preview")
    console.log(
      "Inspect preview:",
      await preview(plan, options.filename, workspace),
    );
  else
    console.log(
      "Finished video:",
      await render(plan, options.filename, workspace),
    );
```

with

```ts
  else {
    // Only the two commands that draw a picture load a theme.
    const theme = await loadVideoThemeSnapshot({ id: options.theme ?? "classic" });
    if (options.command === "preview")
      console.log("Inspect preview:", await preview(plan, options.filename, workspace, theme));
    else console.log("Finished video:", await render(plan, options.filename, workspace, theme));
  }
```

- [ ] **Step 6: Typecheck, check parity, and commit**

Run both typecheck commands. Expected: no errors.
Run: `pnpm video validate storyboards/explainers/study-occlusion-wipe.json`. Expected: `"valid": true`.
Run: `pnpm theme:parity compare`. Expected: parity passes.

```bash
git add src/storyboard/ThemedStoryFilm src/Root.tsx src/avandar-entry.tsx scripts/video.ts tests/video-cli.test.ts
git commit -m "feat(video-producer): theme storyboard renders and add video --theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Graphic theme hooks, tempo-aware motion, and the graphic type roles

**Files:**
- Create: `src/videoTheme/createVideoMotion/createVideoMotion.ts`
- Test: `src/videoTheme/createVideoMotion/createVideoMotion.test.ts`
- Create: `src/stock/theme/useGraphicTheme.ts`
- Test: `src/stock/theme/useGraphicTheme.test.tsx`
- Create: `src/stock/theme/resolveContentColor/resolveContentColor.ts`
- Test: `src/stock/theme/resolveContentColor/resolveContentColor.test.ts`
- Modify: `src/videoTheme/tokenCatalog/semanticTokens.ts`
- Modify: `themes/classic.theme.json`
- Modify: `tests/motion-watch.test.ts`

- [ ] **Step 1: Write the failing motion tests**

`src/videoTheme/createVideoMotion/createVideoMotion.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { DUR, EASE, STAGGER } from "../../motion";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import { createVideoMotion } from "./createVideoMotion";

function _motionAtTempo(tempo: number) {
  const patch = { other: { video: { atomic: { tempo: { md: tempo } } } } };
  return createVideoMotion(resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", { patches: [patch] }).semantic.motion);
}

test("classic motion equals today's durations and curves", () => {
  const motion = _motionAtTempo(1);
  assert.deepEqual([motion.panel, motion.hero, motion.stagger.list], [DUR.panel, DUR.hero, STAGGER]);
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    assert.equal(motion.entrance.easing(progress), EASE.out(progress));
  }
});

test("a faster tempo shortens durations and staggers", () => {
  const motion = _motionAtTempo(1.5);
  assert.deepEqual([motion.panel, motion.stagger.list, motion.scale(106)], [6, 2 / 1.5, 106 / 1.5]);
});

test("tempo never changes the period of a repeating motion", () => {
  assert.equal(_motionAtTempo(0.75).pulse.period, _motionAtTempo(1).pulse.period);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/createVideoMotion/createVideoMotion.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement `createVideoMotion`**

```ts
import { createEasingFromToken } from "../createEasingFromToken/createEasingFromToken";
import type { EasingValue, ResolvedVideoSemantic, SpringValue } from "../videoTheme.types";

type EasingFunction = (progress: number) => number;
type MotionTokens = ResolvedVideoSemantic["motion"];

/**
 * Motion a renderer can use directly: durations and staggers already divided
 * by the tempo, easing tokens turned into functions. Cue frames and loop
 * periods stay as authored, so a stock loop stays seamless at any tempo.
 */
export type VideoMotion = Readonly<{
  tempo: number;
  /** Divides an authored animation length by the tempo. Never use it on a cue frame. */
  scale: (frames: number) => number;
  curve: (easing: EasingValue) => EasingFunction;
  press: number;
  chip: number;
  whip: number;
  panel: number;
  sheet: number;
  word: number;
  hero: number;
  entrance: Readonly<{ duration: number; easing: EasingFunction; distance: number }>;
  exit: Readonly<{ duration: number; easing: EasingFunction; distance: number }>;
  drawOn: Readonly<{ duration: number; easing: EasingFunction }>;
  travel: Readonly<{ easing: EasingFunction }>;
  emphasis: Readonly<{ duration: number; spring: SpringValue }>;
  pulse: Readonly<{ period: number }>;
  drift: Readonly<{ distance: number }>;
  packetFlow: Readonly<{ period: number }>;
  typing: Readonly<{ rate: number }>;
  stagger: Readonly<{ list: number; edge: number; column: number }>;
}>;

const CURVES = new Map<string, EasingFunction>();

function _curve(easing: EasingValue): EasingFunction {
  const key = JSON.stringify(easing);
  const cached = CURVES.get(key);
  if (cached) {
    return cached;
  }
  const curve = createEasingFromToken(easing);
  CURVES.set(key, curve);
  return curve;
}

function _required<Value>(value: Value | undefined, path: string): Value {
  if (value === undefined) {
    throw new Error(`The theme is missing ${path}`);
  }
  return value;
}

function _steps(motion: MotionTokens, scale: (frames: number) => number) {
  return {
    entrance: {
      duration: scale(motion.entrance.duration ?? motion.panel),
      easing: _curve(_required(motion.entrance.easing, "motion.entrance.easing")),
      distance: _required(motion.entrance.distance, "motion.entrance.distance"),
    },
    exit: {
      duration: scale(motion.exit.duration ?? motion.chip),
      easing: _curve(_required(motion.exit.easing, "motion.exit.easing")),
      distance: _required(motion.exit.distance, "motion.exit.distance"),
    },
    drawOn: {
      duration: scale(motion.drawOn.duration ?? motion.hero),
      easing: _curve(_required(motion.drawOn.easing, "motion.drawOn.easing")),
    },
    travel: { easing: _curve(_required(motion.travel.easing, "motion.travel.easing")) },
    emphasis: {
      duration: scale(motion.emphasis.duration ?? motion.sheet),
      spring: _required(motion.emphasis.spring, "motion.emphasis.spring"),
    },
  };
}

/**
 * Builds `VideoMotion` from a theme's semantic motion tokens. Use it through
 * `useGraphicMotion` in stock shapes and `useVideoMotion` on the stage.
 */
export function createVideoMotion(motion: MotionTokens): VideoMotion {
  const scale = (frames: number) => frames / motion.tempo;
  return {
    tempo: motion.tempo,
    scale,
    curve: _curve,
    press: scale(motion.press),
    chip: scale(motion.chip),
    whip: scale(motion.whip),
    panel: scale(motion.panel),
    sheet: scale(motion.sheet),
    word: scale(motion.word),
    hero: scale(motion.hero),
    ..._steps(motion, scale),
    pulse: { period: _required(motion.pulse.period, "motion.pulse.period") },
    drift: { distance: _required(motion.drift.distance, "motion.drift.distance") },
    packetFlow: { period: _required(motion.packetFlow.period, "motion.packetFlow.period") },
    typing: { rate: _required(motion.typing.rate, "motion.typing.rate") * motion.tempo },
    stagger: {
      list: scale(motion.stagger.list),
      edge: scale(motion.stagger.edge),
      column: scale(motion.stagger.column),
    },
  };
}
```

Run the Step 1 command. Expected: 3 passing. (At tempo 1, `x / 1 === x`, and the bezier token builds the same curve as `EASE.out`, so `classic` is exact.)

- [ ] **Step 3: Add the graphic type roles and the inactive colour to the catalog**

In `src/videoTheme/tokenCatalog/semanticTokens.ts`:

1. In `color`, after `textMuted`, add:

```ts
    inactive: _color("Inactive", "Shapes that are present but not part of the current point, such as off-route nodes and closed gates."),
```

2. In `text.graphic`, after `pill`, add:

```ts
      display: _graphicType("Display", "The large heading of a graphic that states its subject."),
      title: _graphicType("Title", "The name on a hub or destination at the centre of a graphic."),
      panelTitle: _graphicType("Panel title", "The heading at the top of a panel."),
      cardTitle: _graphicType("Card title", "The name on a stage card in a pipeline or sequence."),
      itemLabel: _graphicType("Item label", "The name of a source or item in a list."),
      choice: _graphicType("Choice", "The wording of an option or outcome in a decision."),
      question: _graphicType("Question", "The question a decision answers."),
      secondary: _graphicType("Secondary text", "Supporting lines under a title, scenario, or selection."),
      note: _graphicType("Note", "Small supporting text such as a stage detail or a short caption."),
      meta: _graphicType("Meta", "Small monospace labels for inputs, outputs, and similar metadata."),
      footnote: _graphicType("Footnote", "Monospace counts and notes along the edge of a graphic or window."),
      field: _graphicType("Field", "Monospace field and column names."),
      lineNumber: _graphicType("Line number", "Line numbers beside code."),
      code: _graphicType("Code", "Code and other monospace text. Also the face of any text drawn as monospace."),
      data: _graphicType("Data", "Exact data values and text fitted into fixed slots. Fitted text keeps its own size."),
```

- [ ] **Step 4: Renumber `fontSizes` and add the role values to `classic`**

In `themes/classic.theme.json`:

1. Replace the `"fontSizes"` line with:

```json
  "fontSizes": { "3xs": "12px", "2xs": "13px", "xs": "14px", "sm": "15px", "md": "16px", "lg": "17px", "xl": "18px", "2xl": "20px", "3xl": "21px", "4xl": "22px", "5xl": "23px", "6xl": "24px", "7xl": "25px", "8xl": "30px", "9xl": "32px" },
```

2. Replace `"strokeWidth": { "2xs": 1.1, ...` with:

```json
        "strokeWidth": { "3xs": 1, "2xs": 1.1, "xs": 1.5, "sm": 2, "md": 2.5, "lg": 3, "xl": 3.5 },
```

3. In `semantic.color`, after the `"textMuted"` line add `"inactive": "$atomic.swatch.muted",`.

4. Replace the whole `"text": { ... }` block in `semantic` with:

```json
        "text": {
          "graphic": {
            "eyebrow": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.xs", "weight": "$atomic.fontWeight.regular", "letterSpacing": "$atomic.letterSpacing.wide", "color": "$color.textMuted" },
            "heading": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.4xl", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "body": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.2xl", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "label": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.xl", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "detail": { "family": "$atomic.fontFamily.courier", "size": "$fontSizes.3xs", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" },
            "caption": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.lg", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" },
            "pill": { "family": "$atomic.fontFamily.courier", "size": "$fontSizes.2xs", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" },
            "display": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.9xl", "weight": "$atomic.fontWeight.semibold", "color": "$color.text" },
            "title": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.7xl", "weight": "$atomic.fontWeight.semibold", "color": "$color.text" },
            "panelTitle": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.5xl", "weight": "$atomic.fontWeight.semibold", "color": "$color.text" },
            "cardTitle": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.4xl", "weight": "$atomic.fontWeight.semibold", "color": "$color.text" },
            "itemLabel": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.3xl", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "choice": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.lg", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "question": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.6xl", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "secondary": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.md", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" },
            "note": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.sm", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" },
            "meta": { "family": "$atomic.fontFamily.courier", "size": "$fontSizes.sm", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" },
            "footnote": { "family": "$atomic.fontFamily.courier", "size": "$fontSizes.xs", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" },
            "field": { "family": "$atomic.fontFamily.courier", "size": "$fontSizes.lg", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "lineNumber": { "family": "$atomic.fontFamily.courier", "size": "$fontSizes.lg", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" },
            "code": { "family": "$atomic.fontFamily.courier", "size": "$fontSizes.3xl", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "data": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.3xs", "weight": "$atomic.fontWeight.regular", "lineHeight": "$lineHeights.md", "color": "$color.text" }
          },
          "stage": {
            "heading": { "family": "$atomic.fontFamily.figtree", "size": "$headings.sizes.h2.fontSize", "weight": "$headings.sizes.h2.fontWeight", "lineHeight": "$headings.sizes.h2.lineHeight", "letterSpacing": "$atomic.letterSpacing.tight", "color": "$color.text" },
            "subtitle": { "family": "$atomic.fontFamily.figtree", "size": "$fontSizes.7xl", "weight": "$atomic.fontWeight.regular", "lineHeight": "$lineHeights.lg", "color": "$color.text" },
            "evidence": { "family": "$atomic.fontFamily.figtree", "size": "$fontSizes.lg", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "sharedObject": { "family": "$atomic.fontFamily.figtree", "size": "$fontSizes.7xl", "weight": "$atomic.fontWeight.semibold", "color": "$color.accent" },
            "thesis": { "family": "$atomic.fontFamily.figtree", "size": "$headings.sizes.h1.fontSize", "weight": "$headings.sizes.h1.fontWeight", "lineHeight": "$headings.sizes.h1.lineHeight", "letterSpacing": "$atomic.letterSpacing.tight", "color": "$color.text" },
            "thesisEmphasis": { "family": "$atomic.fontFamily.figtree", "size": "$fontSizes.8xl", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "floatingLabel": { "family": "$atomic.fontFamily.figtree", "size": "$fontSizes.5xl", "weight": "$atomic.fontWeight.regular", "lineHeight": "$lineHeights.sm", "color": "$color.text" }
          }
        },
```

Every existing role keeps its pixel size: only the key names behind it changed.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/videoThemeSchema/videoThemeSchema.test.ts src/videoTheme/textContrast/textContrast.test.ts src/videoTheme/buildVideoCssVariables/buildVideoCssVariables.test.ts`
Expected: all pass (classic is complete again, every new role meets AA, and the stage heading variables are unchanged).

- [ ] **Step 5: Write the failing graphic hook tests**

`src/stock/theme/useGraphicTheme.test.tsx`:

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createTokenUsageCollector, VideoTokenUsageContext } from "../../videoTheme/tokenUsage/tokenUsage";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "./useGraphicTheme";

function AccentProbe() {
  return <span>{useGraphicTokens().color.accentAlt}</span>;
}

function BarProbe({ height }: { height?: number }) {
  return <span>{useGraphicProps("ProgressBar", { height }).height}</span>;
}

function PanelDurationProbe() {
  return <span>{useGraphicMotion().panel}</span>;
}

test("outside any provider a shape draws with classic", () => {
  assert.equal(renderToStaticMarkup(<AccentProbe />), "<span>#82c8f2</span>");
});

test("inside a scope a shape draws with that scope", () => {
  const patch = { other: { video: { atomic: { swatch: { cyan: "#123456" } } } } };
  assert.equal(
    renderToStaticMarkup(
      <VideoThemeScope patches={[patch]}>
        <AccentProbe />
      </VideoThemeScope>,
    ),
    "<span>#123456</span>",
  );
});

test("a given prop wins over the component default", () => {
  assert.equal(renderToStaticMarkup(<BarProbe height={6} />), "<span>6</span>");
});

test("only the defaults a shape relies on are reported", () => {
  const collector = createTokenUsageCollector();
  renderToStaticMarkup(
    <VideoTokenUsageContext.Provider value={collector.report}>
      <BarProbe height={6} />
    </VideoTokenUsageContext.Provider>,
  );
  assert.deepEqual(collector.getPaths(), ["components.ProgressBar.paint"]);
});

test("graphic motion follows the theme tempo", () => {
  const patch = { other: { video: { atomic: { tempo: { md: 1.5 } } } } };
  assert.equal(
    renderToStaticMarkup(
      <VideoThemeScope patches={[patch]}>
        <PanelDurationProbe />
      </VideoThemeScope>,
    ),
    "<span>6</span>",
  );
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/theme/useGraphicTheme.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 6: Implement the graphic hooks**

`src/stock/theme/useGraphicTheme.ts`:

```ts
import { filterProps } from "@mantine/core";
import { createContext, useContext, useMemo } from "react";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { createVideoMotion, type VideoMotion } from "../../videoTheme/createVideoMotion/createVideoMotion";
import { resolveVideoThemeFromSource } from "../../videoTheme/resolveVideoThemeFromSource/resolveVideoThemeFromSource";
import { SEMANTIC_TOKENS } from "../../videoTheme/tokenCatalog/semanticTokens";
import { createTokenUsageProxy, VideoTokenUsageContext } from "../../videoTheme/tokenUsage/tokenUsage";
import { useVideoThemeContext } from "../../videoTheme/useVideoTheme/useVideoTheme";
import type {
  ResolvedVideoComponents,
  ResolvedVideoSemantic,
  ResolvedVideoTheme,
  VideoComponentName,
} from "../../videoTheme/videoTheme.types";

/**
 * The SVG id of the stock graphic being drawn, so shapes can reference the
 * graphic's own `<defs>` (filters, gradients). Set by `StockGraphic`.
 */
export const GraphicIdContext = createContext("stock-graphic");

function _useGraphicTheme(): ResolvedVideoTheme {
  return useVideoThemeContext()?.theme ?? resolveVideoThemeFromSource(DEFAULT_VIDEO_THEME_SOURCE);
}

/**
 * Semantic tokens for a stock shape: the surrounding theme, or `classic`
 * when the shape renders with no provider (unit tests and direct renderer
 * calls). Reads are reported like `useVideoTokens`.
 */
export function useGraphicTokens(): ResolvedVideoSemantic {
  const theme = _useGraphicTheme();
  const report = useContext(VideoTokenUsageContext);
  return useMemo(
    () =>
      report
        ? createTokenUsageProxy({ value: theme.semantic, catalog: SEMANTIC_TOKENS, basePath: [], report })
        : theme.semantic,
    [theme, report],
  );
}

/**
 * A stock shape's props: its component defaults under the props it was
 * given, merged with Mantine's own `filterProps` the way `useProps` does.
 * Falls back to `classic` like `useGraphicTokens`, and reports each default
 * the shape relied on.
 */
export function useGraphicProps<
  Name extends VideoComponentName,
  Props extends Partial<ResolvedVideoComponents[Name]>,
>(name: Name, props: Props): ResolvedVideoComponents[Name] & Props {
  const defaults = _useGraphicTheme().components[name];
  const report = useContext(VideoTokenUsageContext);
  const given: Readonly<Record<string, unknown>> = filterProps(props);
  if (report) {
    for (const key of Object.keys(defaults)) {
      if (!(key in given)) {
        report(`components.${name}.${key}`);
      }
    }
  }
  return { ...defaults, ...given } as ResolvedVideoComponents[Name] & Props;
}

/** Tempo-scaled motion for a stock shape. See `VideoMotion`. */
export function useGraphicMotion(): VideoMotion {
  const { motion } = useGraphicTokens();
  return useMemo(() => createVideoMotion(motion), [motion]);
}
```

Run the Step 5 command. Expected: 5 passing.

- [ ] **Step 7: Write the failing content-colour tests**

`src/stock/theme/resolveContentColor/resolveContentColor.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../../../videoTheme/resolveVideoTheme/resolveVideoTheme";
import { contentColorSchema, resolveContentColor } from "./resolveContentColor";

const tokens = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic").semantic;

test("a colour role in content resolves through the theme", () => {
  assert.equal(resolveContentColor("$color.accentAlt", { tokens, accent: "#51a7ff" }), "#82c8f2");
});

test("the legacy accent keyword resolves to the graphic's accent", () => {
  assert.equal(resolveContentColor("accent", { tokens, accent: "#ff0000" }), "#ff0000");
});

test("a literal hex is a deliberate bypass of the theme", () => {
  assert.equal(resolveContentColor("#123456", { tokens, accent: "#51a7ff" }), "#123456");
});

test("content accepts colour roles but not other references", () => {
  assert.equal(contentColorSchema.safeParse("$color.highlight").success, true);
  assert.equal(contentColorSchema.safeParse("$atomic.swatch.mint").success, false);
  assert.equal(contentColorSchema.safeParse("$color.groundFill").success, false);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/theme/resolveContentColor/resolveContentColor.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 8: Implement**

`src/stock/theme/resolveContentColor/resolveContentColor.ts`:

```ts
import { z } from "zod";
import { SEMANTIC_TOKENS } from "../../../videoTheme/tokenCatalog/semanticTokens";
import { legacyColorSchema } from "../../presets/legacy/legacyColorSchema.constants";
import type { ResolvedVideoSemantic } from "../../../videoTheme/videoTheme.types";

const COLOR_ROLES = Object.entries(SEMANTIC_TOKENS.color)
  .filter(([, definition]) => definition.kind === "color")
  .map(([role]) => role);

/** A content colour that follows the theme, such as `$color.accentAlt`. */
export const contentColorRoleSchema = z
  .string()
  .regex(new RegExp(`^\\$color\\.(?:${COLOR_ROLES.join("|")})$`), "Expected a colour role such as $color.accent");

/**
 * A colour field in stock content: a semantic colour role that follows the
 * theme, or a literal hex that deliberately bypasses the theme for that
 * one piece of content.
 */
export const contentColorSchema = z.union([legacyColorSchema, contentColorRoleSchema]);

/**
 * The colour a content colour field draws with. `accent` is the legacy
 * keyword some content uses for the graphic's accent.
 */
export function resolveContentColor(
  value: string,
  options: Readonly<{ tokens: ResolvedVideoSemantic; accent: string }>,
): string {
  if (value === "accent") {
    return options.accent;
  }
  const role = /^\$color\.([A-Za-z]+)$/.exec(value)?.[1];
  const color = role && COLOR_ROLES.includes(role)
    ? (options.tokens.color as Readonly<Record<string, unknown>>)[role]
    : undefined;
  return typeof color === "string" ? color : value;
}
```

Run the Step 7 command. Expected: 4 passing.

- [ ] **Step 9: Keep the watch fixture complete**

Stock code now imports `themes/*.theme.json` through the built-in themes. In `tests/motion-watch.test.ts`, add `"themes",` to `_createWatchFixture`'s `files` list after `"src/videoTheme",`.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test tests/motion-watch.test.ts`
Expected: passes.

- [ ] **Step 10: Typecheck and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.

```bash
git add src/videoTheme/createVideoMotion src/stock/theme src/videoTheme/tokenCatalog/semanticTokens.ts themes/classic.theme.json tests/motion-watch.test.ts
git commit -m "feat(video-producer): add graphic theme hooks, tempo-aware motion, and graphic type roles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Stock graphics scope their theme; `motion` and `theme:parity` take `--theme`

**Files:**
- Modify: `src/stock/StockGraphic.tsx`
- Modify: `src/stock/StockCompositions.tsx`, `src/stock/StockClip.tsx`
- Modify: `scripts/MotionRequests/MotionRequests.ts`, `scripts/motion.ts`
- Modify: `scripts/stock/StockFingerprintModule/StockFingerprintModule.ts`
- Modify: `scripts/videoTheme/themeParity/themeParity.ts`
- Modify: `src/continuity/camera/stockTransparency.test.ts`
- Test: `src/stock/StockGraphic.test.tsx`
- Test: `scripts/MotionRequests/MotionRequests.test.ts`

- [ ] **Step 1: Write the failing stock graphic tests**

`src/stock/StockGraphic.test.tsx`:

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeScope } from "../videoTheme/VideoThemeScope/VideoThemeScope";
import { StockGraphic } from "./StockGraphic";

const LIGHT_GROUND = { other: { video: { atomic: { swatch: { ground: "#f8fafc" } } } } };

test("a stock graphic with no colours draws the theme's accent", () => {
  const markup = renderToStaticMarkup(<StockGraphic preset="network-graph" frame={120} />);
  assert.match(markup, /#51a7ff/);
  assert.doesNotMatch(markup, /#9fefca/);
});

test("an explicit accent prop wins over the theme", () => {
  const markup = renderToStaticMarkup(<StockGraphic preset="network-graph" frame={120} accent="#ff0000" />);
  assert.match(markup, /#ff0000/);
});

test("the surrounding theme's ground reaches the graphic", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeScope patches={[LIGHT_GROUND]}>
      <StockGraphic preset="network-graph" frame={120} />
    </VideoThemeScope>,
  );
  assert.match(markup, /<rect width="960" height="600" fill="#f8fafc"/);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/StockGraphic.test.tsx`
Expected: the first and third tests fail (default accent is mint; the ground ignores the theme).

- [ ] **Step 2: Scope the stock graphic**

Replace `src/stock/StockGraphic.tsx` with:

```tsx
import { useId } from "react";
import { loopEnvelope } from "../motion";
import { fillToCss } from "../videoTheme/cssValues/cssValues";
import { createThemePatchFromStockColors } from "../videoTheme/themePatches/themePatches";
import { VideoThemeScope } from "../videoTheme/VideoThemeScope/VideoThemeScope";
import { stockRequestEnvelopeSchema } from "./contracts/stockRequestSchema/stockRequestSchema";
import { getStockDisplayCopyFromDescriptor } from "./i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { STOCK_GRAPHIC_COPY } from "./i18n/stockGraphicCopy";
import { stockRenderers } from "./registry/stockRenderers/stockRenderers";
import { GraphicIdContext, useGraphicTokens } from "./theme/useGraphicTheme";
import type { StockRequest } from "./contracts/StockContract.types";

/** Preset-discriminated content with explicit local frame and display size. */
export type Props = StockRequest & {
  /** Local frame at 30 fps. The authored loop spans frames 0 through 179. */
  frame: number;
  width?: number;
  height?: number;
  /** Omit the stage ground when compositing the diagram above another surface. */
  transparent?: boolean;
};

type CanvasProps = Omit<Props, "accent" | "background" | "schemaVersion"> & { id: string };

function GroundFill({ id }: { id: string }) {
  const { color } = useGraphicTokens();
  const fill = color.groundFill;
  if (fill.type === "solid") {
    return <rect width={960} height={600} fill={fill.color} />;
  }
  return (
    <>
      <defs>
        <linearGradient id={`${id}-ground`} gradientTransform={`rotate(${fill.deg - 90} 0.5 0.5)`}>
          <stop offset="0" stopColor={fill.from} />
          <stop offset="1" stopColor={fill.to} />
        </linearGradient>
      </defs>
      <rect width={960} height={600} fill={`url(#${id}-ground)`} />
    </>
  );
}

function StockCanvas({ preset, frame, width = 960, height = 600, input, transparent = false, id }: CanvasProps) {
  const tokens = useGraphicTokens();
  const localFrame = Math.max(0, Math.min(179, Number.isFinite(frame) ? frame : 0));
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 960 600"
      role="img"
      aria-label={getStockDisplayCopyFromDescriptor({
        descriptor: STOCK_GRAPHIC_COPY,
        values: { preset: preset.replaceAll("-", " ") },
      })}
      style={{
        display: "block",
        background: transparent ? "transparent" : fillToCss(tokens.color.groundFill),
        fontFamily: tokens.text.graphic.body.fontFamily,
      }}
    >
      {!transparent && <GroundFill id={id} />}
      <GraphicIdContext.Provider value={id}>
        <g opacity={loopEnvelope(localFrame, 180)}>
          {stockRenderers[preset](
            { frame: localFrame, accent: tokens.color.accent, background: tokens.color.ground, id },
            input,
          )}
        </g>
      </GraphicIdContext.Provider>
    </svg>
  );
}

/**
 * Shared browser/video renderer. Pure SVG, explicit frame time, no Remotion
 * dependency. Presets are conceptual illustrations with fictional example
 * data. The graphic draws inside the surrounding video theme (classic when
 * there is none) plus its preset's override; explicit `accent` and
 * `background` props are content and win over both. A fixed viewBox
 * preserves the layout at every display size, and the authored 180-frame
 * envelope returns both loop ends to the ground.
 */
export function StockGraphic({ accent, background, schemaVersion, ...canvas }: Props) {
  const id = `stock-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  stockRequestEnvelopeSchema.parse({ preset: canvas.preset, schemaVersion, accent, background });
  const patches = accent || background ? [createThemePatchFromStockColors({ accent, background })] : [];
  return (
    <VideoThemeScope overrideIds={[canvas.preset]} patches={patches}>
      <StockCanvas {...canvas} id={id} />
    </VideoThemeScope>
  );
}
```

`GraphicIdContext` and `useGraphicTokens` come from Task 7.

The SVG `gradientTransform` rotates around the box centre so `deg` matches CSS `linear-gradient` (0deg points up, so SVG's left-to-right axis is rotated by `deg - 90`).

- [ ] **Step 3: Drop the mint default from the stock compositions**

In `src/stock/StockCompositions.tsx`, delete `import { STOCK } from "./graphics-common";`, and replace

```ts
          defaultProps={stockRequestSchema.parse({
            preset: entry.id,
            accent: STOCK.mint,
            background: STOCK.ground,
          })}
          calculateMetadata={({ props }) => ({
            props: stockRequestSchema.parse(props),
          })}
```

with

```ts
          defaultProps={stockRequestSchema.parse({ preset: entry.id })}
          calculateMetadata={({ props }) => {
            const { theme, ...request } = props as StockClipProps;
            return {
              props: { ...stockRequestSchema.parse(request), ...(theme ? { theme } : {}) },
            };
          }}
```

and add `import type { Props as StockClipProps } from "./StockClip";`.

Replace `src/stock/StockClip.tsx` with:

```tsx
import { useCurrentFrame } from "remotion";
import { createVideoThemeSourceFromSnapshot } from "../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { VideoThemeProvider } from "../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { StockGraphic } from "./StockGraphic";
import type { VideoThemeSnapshot } from "../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { StockRequest } from "./contracts/StockContract.types";
import type { ReactNode } from "react";

/** A stock request and the theme the `motion` CLI renders it in. */
export type Props = StockRequest & { theme?: VideoThemeSnapshot };

/**
 * Standalone composition picture shares the gallery's validated SVG renderer.
 */
export function StockClip({ theme, ...request }: Props): ReactNode {
  return (
    <VideoThemeProvider source={createVideoThemeSourceFromSnapshot(theme, [request.preset])} element="none">
      <StockGraphic {...request} frame={useCurrentFrame()} width={1280} height={800} />
    </VideoThemeProvider>
  );
}
```

This is the spec §1.6 change: a CLI stock render with no explicit accent now uses the theme accent (`#51a7ff` in `classic`) instead of mint.

- [ ] **Step 4: Write the failing motion CLI tests**

Append to `scripts/MotionRequests/MotionRequests.test.ts`:

```ts
test("motion CLI accepts one theme for any selection", () => {
  assert.equal(MotionRequests.parseArgs(["render", "all", "--theme", "avandar"]).themeId, "avandar");
  assert.equal(MotionRequests.parseArgs(["preview", "network-graph"]).themeId, "classic");
});

test("motion CLI refuses a theme when listing", () => {
  assert.throws(() => MotionRequests.parseArgs(["list", "all", "--theme", "avandar"]), /Usage/);
});

test("default motion requests carry no colours so the theme decides", async () => {
  const [request] = await MotionRequests.fromArgs({ args: MotionRequests.parseArgs(["preview", "network-graph"]) });
  assert.equal(request.request.accent, undefined);
  assert.equal(request.theme.themeId, "classic");
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/MotionRequests/MotionRequests.test.ts`
Expected: the three new tests fail.

- [ ] **Step 5: Parse and load the theme in `MotionRequests`**

In `scripts/MotionRequests/MotionRequests.ts`:

1. Delete `import { STOCK } from "../../src/stock/stockPalette";` and add:

```ts
import { loadVideoThemeSnapshot } from "../videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot";
import type { VideoThemeSnapshot } from "../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
```

2. Add `theme: VideoThemeSnapshot;` to `MotionRequest`.
3. Replace `_parseMotionArgs` with:

```ts
const MOTION_USAGE =
  "Usage: pnpm motion -- list | preview [all|preset-id] [--input file.json] [--theme id] | render [all|preset-id] [--input file.json] [--theme id]";

function _parseFlags(extra: readonly string[]): Readonly<Record<string, string>> {
  const flags: Record<string, string> = {};
  for (let index = 0; index < extra.length; index += 2) {
    const [flag, value] = [extra[index], extra[index + 1]];
    if (!["--input", "--theme"].includes(flag) || !value || flag in flags) {
      throw new Error(MOTION_USAGE);
    }
    flags[flag] = value;
  }
  return flags;
}

/** Resolve stable CLI selections, the optional complete-input file, and the theme. */
function _parseMotionArgs(args: readonly string[]): {
  command: string;
  entries: StockEntry[];
  inputFile: string | undefined;
  themeId: string;
} {
  const [command, selection = "all", ...extra] = args[0] === "--" ? args.slice(1) : args;
  const flags = _parseFlags(extra);
  const hasInput = "--input" in flags;
  if (
    !["list", "preview", "render"].includes(command) ||
    (command === "list" && extra.length > 0) ||
    (hasInput && selection === "all")
  ) {
    throw new Error(MOTION_USAGE);
  }
  const entries = selection === "all" ? [...STOCK_CATALOG] : [stockEntry(selection)];
  return { command, entries, inputFile: flags["--input"], themeId: flags["--theme"] ?? "classic" };
}
```

4. In `_makeMotionRequestsFromArgs`, after `const contracts = await buildStockContracts(root);` add `const theme = await loadVideoThemeSnapshot({ id: args.themeId });`, replace `: { preset: entry.id, accent: STOCK.mint, background: STOCK.ground },` with `: { preset: entry.id },`, and add `theme,` to the returned object after `sourceHash: contracts.sourceHash,`.

Run the Step 4 command. Expected: all `MotionRequests` tests pass, including the existing usage cases.

- [ ] **Step 6: Render and fingerprint with the theme**

In `scripts/motion.ts`, in both `_preview` and `_render`, destructure `theme` alongside `entry, request, sourceHash` in the loop, and:
- pass `request: { ...request, theme }` to every `StockFingerprintModule.fromRequest` call,
- in `_preview`, use `inputProps: { ...request, theme }` in `selectComposition` and `renderStill`,
- in `_render`, replace `await fs.writeFile(propsFile, JSON.stringify(request));` with `await fs.writeFile(propsFile, JSON.stringify({ ...request, theme }));`, and in `record` add after `request,`:

```ts
      themeId: theme.themeId,
      themeHash: resolveVideoThemeFromSnapshot(theme, [entry.id]).hash,
```

with `import { resolveVideoThemeFromSnapshot } from "../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";`.

The `_render` validation block destructures `{ entry, request, sourceHash }` too; add `theme` there and pass `request: { ...request, theme }` to its `fromRequest` call so the preview gate matches.

In `scripts/stock/StockFingerprintModule/StockFingerprintModule.ts`, add `"src/videoTheme",` and `"themes",` to `SOURCE_DIRECTORIES`, so a theme or token change invalidates stock previews.

- [ ] **Step 7: Add `--theme` to the parity gate**

In `scripts/videoTheme/themeParity/themeParity.ts`:

1. Replace `const PARITY_DIRECTORY = path.join(appRoot, "out/theme-parity");` with:

```ts
const PARITY_ROOT = path.join(appRoot, "out/theme-parity");
let PARITY_DIRECTORY = PARITY_ROOT;
```

2. In `_loadTargets`, add a `themeId: string` parameter and load with `ShowcaseFilms.load(target.filmId, { ...target.options, theme: { id: themeId } })`.
3. Replace the argument handling at the bottom with:

```ts
const argv = process.argv.slice(2);
const themeIndex = argv.indexOf("--theme");
const themeId = themeIndex < 0 ? "classic" : argv[themeIndex + 1];
const [mode, ...ids] = themeIndex < 0 ? argv : argv.filter((_, index) => index !== themeIndex && index !== themeIndex + 1);
PARITY_DIRECTORY = themeId === "classic" ? PARITY_ROOT : path.join(PARITY_ROOT, themeId);
if ((mode === "capture" || mode === "compare") && themeId) {
  await runThemeParity(mode, ids, themeId);
} else {
  console.error("Usage: pnpm theme:parity <capture|compare> [target ids...] [--theme id]");
  process.exitCode = 2;
}
```

4. Add `themeId: string` as the third parameter of `runThemeParity` and pass it to `_loadTargets(ids, themeId)`.

`classic` keeps plan 1's paths, so the captured baseline stays valid.

- [ ] **Step 8: Sketch boxes from the theme's box profile**

Replace `src/stock/primitives/StockRect/StockRect.tsx` with:

```tsx
import rough from "roughjs";
import { useGraphicTokens } from "../../theme/useGraphicTheme";
import type { SVGProps } from "react";

/**
 * A box drawn with the theme's box sketch profile (`sketch.box`): the plain
 * SVG rect while the profile is smooth, seeded roughjs outlines otherwise.
 * Text is never sketched. Used by panels, pills, and preset boxes.
 */
export function StockRect(props: SVGProps<SVGRectElement>) {
  const profile = useGraphicTokens().sketch.box;
  const {
    x = 0,
    y = 0,
    width,
    height,
    stroke,
    fill = "none",
    strokeWidth = 1,
    rx: _rx,
    ry: _ry,
    children,
    ...attributes
  } = props;
  if (
    !profile.roughness ||
    !stroke ||
    stroke === "none" ||
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    return <rect {...props} />;
  }
  const generator = rough.generator();
  const paths = generator.toPaths(
    generator.rectangle(x, y, width, height, {
      roughness: profile.roughness,
      bowing: profile.bowing,
      seed: profile.seed,
      stroke,
      fill,
      fillStyle: "solid",
      strokeWidth: Number(strokeWidth),
      maxRandomnessOffset: profile.randomness,
    }),
  );
  return (
    <g {...attributes} data-rough-box={profile.roughness}>
      {paths.map((path, index) => (
        <path key={index} {...path} />
      ))}
      {children}
    </g>
  );
}
```

`StockBoxRoughnessContext` is gone; `StockGraphic` (Step 2) was its only user. `classic` passes `bowing: 1`, roughjs's default, so sketched output is unchanged too. Task 28 later moves the roughjs call into `sketchShape`.

- [ ] **Step 9: Move the transparency test off the removed prop**

`StockGraphic` no longer takes `boxRoughness`; box sketching comes from `sketch.box`. In `src/continuity/camera/stockTransparency.test.ts`, add:

```ts
import { createThemePatchFromLegacyAppearance } from "../../videoTheme/themePatches/themePatches";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";

function _withBoxRoughness(boxRoughness: number, element: ReturnType<typeof createElement>) {
  return createElement(VideoThemeScope, {
    patches: [createThemePatchFromLegacyAppearance({ boxRoughness })],
    children: element,
  });
}
```

and replace every `createElement(StockGraphic, { ...request, boxRoughness: N })` with `_withBoxRoughness(N, createElement(StockGraphic, request))`, and the third test's element with `_withBoxRoughness(1.5, createElement(StockGraphic, { preset: "data-pipeline", frame: 120 }))`.

- [ ] **Step 10: Run the tests, typecheck, check parity, commit**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/StockGraphic.test.tsx src/continuity/camera/stockTransparency.test.ts scripts/MotionRequests/MotionRequests.test.ts`
Expected: all pass.
Run both typecheck commands. Expected: no errors.
Run: `pnpm theme:parity compare`. Expected: parity passes. (Parity targets pass the gallery colours explicitly, so the CLI default change does not show.)

```bash
git add src/stock/StockGraphic.tsx src/stock/StockGraphic.test.tsx src/stock/primitives/StockRect/StockRect.tsx src/stock/StockCompositions.tsx src/stock/StockClip.tsx scripts/MotionRequests scripts/motion.ts scripts/stock/StockFingerprintModule scripts/videoTheme/themeParity/themeParity.ts src/continuity/camera/stockTransparency.test.ts
git commit -m "feat(video-producer): scope each stock graphic's theme and add motion --theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Keep reenactments on the product theme

**Files:**
- Create: `avandar-adapter/ProductThemeRoot.tsx`
- Test: `avandar-adapter/ProductThemeRoot.test.tsx`
- Modify: `avandar-adapter/index.tsx`

- [ ] **Step 1: Write the failing test**

`avandar-adapter/ProductThemeRoot.test.tsx`:

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_THEME, useMantineTheme } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { VideoThemeProvider } from "../src/videoTheme/VideoThemeProvider/VideoThemeProvider";
import { ProductThemeRoot } from "./ProductThemeRoot";

function ProductProbe() {
  const theme = useMantineTheme();
  return <span>{`${String(theme.other.video === undefined)}|${theme.fontSizes.md}|${theme.primaryColor}`}</span>;
}

test("a reenactment inside a themed film resolves only the product theme", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
      <ProductThemeRoot theme={{ primaryColor: "grape" }} withCssVariables={false}>
        <ProductProbe />
      </ProductThemeRoot>
    </VideoThemeProvider>,
  );
  assert.equal(markup, `<span>true|${DEFAULT_THEME.fontSizes.md}|grape</span>`);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test avandar-adapter/ProductThemeRoot.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement**

`avandar-adapter/ProductThemeRoot.tsx`:

```tsx
import { MantineProvider, type MantineProviderProps } from "@mantine/core";
import { ReenactmentThemeBoundary } from "../src/videoTheme/ReenactmentThemeBoundary/ReenactmentThemeBoundary";

/**
 * The product's `MantineProvider`, behind a boundary that hides any video
 * theme above it, so a reenactment renders exactly as the product does. The
 * root of every reenactment the adapter renders; it passes every prop
 * through unchanged.
 */
export function ProductThemeRoot(props: MantineProviderProps) {
  return (
    <ReenactmentThemeBoundary>
      <MantineProvider {...props} />
    </ReenactmentThemeBoundary>
  );
}
```

In the Step 1 test, add `withGlobalClasses={false}` beside `withCssVariables={false}` so server rendering emits no style tags.

- [ ] **Step 3: Render the adapter through it**

In `avandar-adapter/index.tsx`, replace `MantineProvider,` in the `@mantine/core` import list with nothing (delete that line), add `import { ProductThemeRoot } from "./ProductThemeRoot";`, and replace the opening `<MantineProvider` and closing `</MantineProvider>` with `<ProductThemeRoot` and `</ProductThemeRoot>`. The props stay as they are.

- [ ] **Step 4: Verify and commit**

Run the Step 1 command. Expected: 1 passing.
Run: `node scripts/build-avandar.mjs`. Expected: the product bundle builds.
Run: `pnpm theme:parity compare frame-to-interface`. Expected: parity passes (its second beat is a reenactment).

```bash
git add avandar-adapter/ProductThemeRoot.tsx avandar-adapter/ProductThemeRoot.test.tsx avandar-adapter/index.tsx
git commit -m "test(video-producer): guard reenactments against inheriting the video theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: Fitted and data text read the data role

**Files:**
- Modify: `src/stock/primitives/FitText/FitText.tsx`, `src/stock/primitives/FitText/FitText.test.ts`
- Modify: `src/stock/primitives/LiteralDataText/LiteralDataText.tsx`, `src/stock/primitives/LiteralDataText/LiteralDataText.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/stock/primitives/FitText/FitText.test.ts` (add `import { VideoThemeScope } from "../../../videoTheme/VideoThemeScope/VideoThemeScope";` to the imports):

```ts
test("fitted text takes its colour and line spacing from the data role", () => {
  const patch = { lineHeights: { md: "1.5" }, other: { video: { atomic: { swatch: { text: "#ffeedd" } } } } };
  const markup = renderToStaticMarkup(
    createElement(VideoThemeScope, {
      patches: [patch],
      children: createElement(FitText, { text: "one two three four", x: 0, y: 0, width: 40, fontSize: 12, maxLines: 4 }),
    }),
  );
  assert.match(markup, /fill="#ffeedd"/);
  assert.match(markup, /dy="18"/);
});
```

Append to `src/stock/primitives/LiteralDataText/LiteralDataText.test.ts` (same import, path `../../../videoTheme/VideoThemeScope/VideoThemeScope`):

```ts
test("whitespace marks use the theme's highlight colour", () => {
  const patch = { other: { video: { atomic: { swatch: { orange: "#00ff00" } } } } };
  const markup = renderToStaticMarkup(
    createElement(VideoThemeScope, {
      patches: [patch],
      children: createElement(LiteralDataText, { value: "a b", x: 0, y: 0 }),
    }),
  );
  assert.match(markup, /fill="#00ff00"/);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/primitives/FitText/FitText.test.ts src/stock/primitives/LiteralDataText/LiteralDataText.test.ts`
Expected: the two new tests fail; the existing ones pass.

- [ ] **Step 2: Read the data role in `FitText`**

Replace `src/stock/primitives/FitText/FitText.tsx` with:

```tsx
import { useGraphicTokens } from "../../theme/useGraphicTheme";
import { type TextBounds, wrapTextToLines } from "./wrapTextToLines";
import type { ReactNode } from "react";

/** Data for Props. */
type PropsResult = {
  x: number;
  y: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
};

type Props = TextBounds & PropsResult;

/**
 * Renders every authored word at one fixed size or fails before drawing.
 * The size is content, validated against measured widths; the family,
 * colour, and line spacing come from the `text.graphic.data` role.
 */
export function FitText({
  text,
  width,
  fontSize,
  maxLines,
  breakLongWords = false,
  normalizeWhitespace = false,
  x,
  y,
  color,
  anchor = "start",
}: Readonly<Props>): ReactNode {
  const data = useGraphicTokens().text.graphic.data;
  const lineHeight = data.lineHeight ?? 1.3;
  const lines = wrapTextToLines({
    text,
    width,
    fontSize,
    maxLines,
    breakLongWords,
    normalizeWhitespace,
  });
  return (
    <text
      aria-label={normalizeWhitespace ? text : undefined}
      x={x}
      y={y}
      fill={color ?? data.color}
      fontSize={fontSize}
      fontFamily={data.fontFamily}
      textAnchor={anchor}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index ? fontSize * lineHeight : 0}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
```

`classic`'s data role has `lineHeight` 1.3, so `fontSize * lineHeight` equals today's `fontSize * 1.3` exactly. The `?? 1.3` covers a custom role that omits it.

- [ ] **Step 3: Read the data role in `LiteralDataText`**

In `src/stock/primitives/LiteralDataText/LiteralDataText.tsx`:

1. Replace `import { STOCK } from "../../stockPalette";` with `import { useGraphicTokens } from "../../theme/useGraphicTheme";`.
2. Replace the docstring's first line with `Exact data at the data role's size (12 px in classic). Callers own the full single-line width.`
3. Replace the function head and `<text ...>` opening with:

```tsx
export function LiteralDataText({ value, x, y, color }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const data = tokens.text.graphic.data;
  return (
    <text
      aria-label={value}
      data-literal-value={value}
      x={x}
      y={y}
      fontSize={data.fontSize}
      fontFamily={data.fontFamily}
      xmlSpace="preserve"
      fill={color ?? data.color}
    >
```

4. Replace `fill={isWhitespace ? STOCK.orange : undefined}` with `fill={isWhitespace ? tokens.color.highlight : undefined}`.

- [ ] **Step 4: Run the tests, check parity, commit**

Run the Step 1 command. Expected: all pass.
Run: `pnpm theme:parity compare`. Expected: parity passes.

```bash
git add src/stock/primitives/FitText src/stock/primitives/LiteralDataText
git commit -m "feat(video-producer): draw fitted and data text from the data role" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Shared stock shapes become themed components

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`
- Modify: `themes/classic.theme.json`
- Modify: `src/stock/graphics-common.tsx`
- Test: `src/stock/graphics-common.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/stock/graphics-common.test.tsx`:

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeScope } from "../videoTheme/VideoThemeScope/VideoThemeScope";
import { Caption, CircleNode, Eyebrow, Guide, Panel, Pill, Text } from "./graphics-common";
import type { ReactElement } from "react";

function _svg(element: ReactElement, patch?: object): string {
  const svg = <svg>{element}</svg>;
  return renderToStaticMarkup(patch ? <VideoThemeScope patches={[patch]}>{svg}</VideoThemeScope> : svg);
}

test("a pill draws today's classic shape", () => {
  const markup = _svg(<Pill x={0} y={0} text="05 nodes" />);
  assert.match(markup, /rx="15"[^>]*fill-opacity="0.08"[^>]*stroke-opacity="0.32"/);
  assert.match(markup, /font-size="13"[^>]*font-family="&#x27;Courier New&#x27;, monospace"/);
});

test("a node draws today's classic radii and outline", () => {
  const markup = _svg(<CircleNode x={100} y={100} label="Hub" frame={60} accent="#51a7ff" size="xl" />);
  assert.match(markup, /r="46"/);
  assert.match(markup, /r="37"[^>]*fill="#101e28"[^>]*stroke="#2a404e"[^>]*stroke-width="1.5"/);
});

test("a theme's panel corner reaches every panel", () => {
  const markup = _svg(<Panel x={0} y={0} width={10} height={10} />, { radius: { xl: "6px" } });
  assert.match(markup, /rx="6"/);
});

test("the eyebrow sits at the theme's eyebrow origin", () => {
  assert.match(_svg(<Eyebrow>Label</Eyebrow>, { spacing: { xl: "40px" } }), /x="40" y="40"/);
});

test("the caption sits on the caption baseline", () => {
  assert.match(_svg(<Caption>Caption</Caption>), /x="480" y="551"/);
});

test("monospace text uses the code face", () => {
  const patch = { other: { video: { atomic: { fontFamily: { courier: "arial" } } } } };
  assert.match(_svg(<Text x={0} y={0} mono>a</Text>, patch), /font-family="Arial, sans-serif"/);
});

test("a guide draws its dash pattern at the guide opacity", () => {
  assert.match(_svg(<Guide cx={0} cy={0} rx={10} ry={5} />), /stroke-dasharray="3 9"[^>]*opacity="0.65"/);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/graphics-common.test.tsx`
Expected: FAIL. `Caption` and `Guide` do not exist yet and `CircleNode` has no `size`.

- [ ] **Step 2: Add the shared component tokens**

In `src/videoTheme/tokenCatalog/componentTokens.ts`, add above `COMPONENT_TOKENS`:

```ts
import type { TokenSurface } from "../videoTheme.types";

const CAPS = ["butt", "round", "square"] as const;
const JOINS = ["miter", "round", "bevel"] as const;

function _length(label: string, description: string, surface: TokenSurface = "graphic") {
  return token({ kind: "length", surface, unit: "px", min: 0, max: 400, step: 0.5, label, description });
}
function _offset(label: string, description: string, surface: TokenSurface = "graphic") {
  return token({ kind: "length", surface, unit: "px", min: -200, max: 200, step: 0.5, label, description });
}
function _stroke(label: string, description: string, surface: TokenSurface = "graphic") {
  return token({ kind: "length", surface, unit: "px", min: 0, max: 12, step: 0.1, label, description });
}
function _alpha(label: string, description: string, surface: TokenSurface = "graphic") {
  return token({ kind: "opacity", surface, unit: "%", min: 0, max: 1, step: 0.005, label, description });
}
function _color(label: string, description: string, surface: TokenSurface = "graphic") {
  return token({ kind: "color", surface, label, description });
}
function _duration(label: string, description: string, surface: TokenSurface = "graphic") {
  return token({ kind: "duration", surface, unit: "frames", min: 0, max: 240, step: 1, label, description });
}
function _easing(label: string, description: string, surface: TokenSurface = "graphic") {
  return token({ kind: "easing", surface, label, description });
}
function _number(label: string, description: string, range: Readonly<{ min: number; max: number; step: number }>) {
  return token({ kind: "number", surface: "graphic", ...range, label, description });
}
function _enum<const Options extends readonly string[]>(label: string, description: string, options: Options) {
  return token({ kind: "enum", surface: "graphic", options, label, description });
}
function _dash(label: string, description: string) {
  return token({ kind: "dash", surface: "graphic", label, description });
}
function _glow(label: string, description: string) {
  return token({ kind: "glow", surface: "graphic", label, description });
}

const NODE_TOKENS = {
  radiusXs: _length("Extra-small node radius", "Radius of the smallest nodes, such as the spokes of a radial network."),
  radiusSm: _length("Small node radius", "Radius of small nodes, such as the outer nodes of a network graph."),
  radiusMd: _length("Node radius", "Radius of a standard node."),
  radiusLg: _length("Large node radius", "Radius of large nodes, such as the stops of a traversal."),
  radiusXl: _length("Hub node radius", "Radius of a hub node at the centre of a network."),
  fill: _color("Node fill", "Fill behind a node's tint."),
  stroke: _color("Node outline colour", "Colour of a node's resting outline."),
  strokeWidth: _stroke("Node outline width", "Width of a node's outlines."),
  ringSpread: _length("Node ring spread", "How far the active ring sits outside a node."),
  ringAlpha: _alpha("Node ring opacity", "Opacity of the active ring at full activity."),
  tintAlpha: _alpha("Node tint opacity", "Opacity of the accent tint inside a node at full activity."),
  outlineAlpha: _alpha("Node accent outline opacity", "Opacity of the accent outline at rest; it rises to full as the node activates."),
  coreRadius: _length("Node core radius", "Radius of the dot at a node's centre at rest."),
  coreGrowth: _length("Node core growth", "How much the centre dot grows at full activity."),
  labelOffset: _offset("Node label offset", "Distance from a node's edge to its label baseline."),
  detailOffset: _offset("Node detail offset", "Distance from a node's edge to its detail baseline."),
} as const;

const SHARED_GRAPHIC_TOKENS = {
  Node: NODE_TOKENS,
  Edge: {
    color: _color("Edge colour", "Colour of an edge that names no colour of its own."),
    strokeWidth: _stroke("Edge width", "Width of edges and drawn paths."),
    cap: _enum("Edge cap", "How edge ends are drawn.", CAPS),
    dash: _dash("Edge dash", "Dash pattern of dashed edges, in fractions of the path length."),
    drawDuration: _duration("Edge draw duration", "How long an edge takes to draw itself in."),
    drawEasing: _easing("Edge draw curve", "The curve of an edge drawing itself in."),
    curveTension: _number("Edge curve tension", "Where a curved edge places its control points.", { min: 0, max: 1, step: 0.01 }),
  },
  Route: {
    strokeWidth: _stroke("Route width", "Width of a highlighted route."),
    cap: _enum("Route cap", "How route ends are drawn.", CAPS),
    fadeIn: _duration("Route fade-in", "How long a route takes to appear."),
  },
  Packet: {
    color: _color("Packet colour", "Colour of a packet that names no colour of its own."),
    radius: _length("Packet radius", "Radius of a packet."),
    radiusSm: _length("Small packet radius", "Radius of a packet on a secondary edge."),
    period: _duration("Packet period", "Frames for a packet to travel its edge once."),
    curveTension: _number("Packet curve tension", "Where a packet's curved path places its control points.", { min: 0, max: 1, step: 0.01 }),
    fadeIn: _duration("Packet fade-in", "How long packets take to appear."),
  },
  Halo: {
    glow: _glow("Halo glow", "The soft disc around a packet."),
  },
  Particle: {
    radius: _length("Particle radius", "Radius of an ambient particle."),
    radiusLg: _length("Large particle radius", "Radius of an emphasised particle."),
    haloRadius: _length("Particle halo radius", "Radius of the halo around an emphasised particle."),
    haloAlpha: _alpha("Particle halo opacity", "Opacity of the halo around an emphasised particle."),
    twinklePeriod: _duration("Particle twinkle period", "Frames for one particle twinkle cycle."),
    twinkleFloor: _alpha("Particle twinkle floor", "The lowest opacity a twinkling particle reaches."),
  },
  Guide: {
    color: _color("Guide colour", "Colour of orbit guides and construction lines."),
    alpha: _alpha("Guide opacity", "Opacity of guides."),
    strokeWidth: _stroke("Guide width", "Width of dashed guides."),
    dash: _dash("Guide dash", "Dash pattern of guides, in pixels."),
  },
  Panel: {
    fill: _color("Panel fill", "Fill of a panel."),
    stroke: _color("Panel outline colour", "Outline colour of a panel."),
    radius: _length("Panel radius", "Corner radius of a panel."),
    strokeWidth: _stroke("Panel outline width", "Outline width of a panel."),
  },
  Card: {
    radius: _length("Card radius", "Corner radius of a tinted summary card."),
    fillAlpha: _alpha("Card fill opacity", "Opacity of a card's tint."),
    strokeAlpha: _alpha("Card outline opacity", "Opacity of a card's outline."),
    padding: _length("Card padding", "Space between a card's edge and its text."),
    textBaseline: _length("Card text baseline", "Distance from a card's top to its first text baseline."),
    baseHeight: _length("Card base height", "A card's height before its text lines are added."),
  },
  Pill: {
    color: _color("Pill colour", "Colour of a pill that names no colour of its own."),
    width: _length("Pill width", "Width of a pill that names no width of its own."),
    height: _length("Pill height", "Height of a pill."),
    radius: _length("Pill radius", "Corner radius of a pill, limited to half its height."),
    fillAlpha: _alpha("Pill fill opacity", "Opacity of a pill's tint."),
    strokeAlpha: _alpha("Pill outline opacity", "Opacity of a pill's outline."),
    textBaseline: _length("Pill text baseline", "Distance from a pill's top to its text baseline."),
  },
  Check: {
    color: _color("Check colour", "Colour of a check mark that names no colour of its own."),
    size: _length("Check size", "Size of a check mark that names no size of its own."),
    strokeWidth: _stroke("Check width", "Stroke width of a check mark."),
    cap: _enum("Check cap", "How a check mark's ends are drawn.", CAPS),
    join: _enum("Check join", "How a check mark's corner is drawn.", JOINS),
  },
  Rule: {
    color: _color("Rule colour", "Colour of a divider rule."),
    strokeWidth: _stroke("Rule width", "Width of a divider rule."),
  },
  Glyph: {
    strokeWidth: _stroke("Glyph width", "Stroke width of icon glyphs drawn inside shapes."),
  },
} as const;
```

and change `COMPONENT_TOKENS` to start with `...SHARED_GRAPHIC_TOKENS,`:

```ts
export const COMPONENT_TOKENS = {
  ...SHARED_GRAPHIC_TOKENS,
  ProgressBar: {
```

Later tasks add more groups the same way: a `const <NAME>_TOKENS = { ... } as const;` block above `COMPONENT_TOKENS`, spread into it.

- [ ] **Step 3: Add the classic values**

In `themes/classic.theme.json`, in `"components"`, before `"ProgressBar"` add:

```json
    "Node": { "defaultProps": { "radiusXs": 22, "radiusSm": 25, "radiusMd": 26, "radiusLg": 29, "radiusXl": 37, "fill": "$color.surface", "stroke": "$color.line", "strokeWidth": "$stroke.outline", "ringSpread": 9, "ringAlpha": "$atomic.opacity.25", "tintAlpha": "$atomic.opacity.9", "outlineAlpha": "$atomic.opacity.28", "coreRadius": 5, "coreGrowth": 2, "labelOffset": 30, "detailOffset": 51 } },
    "Edge": { "defaultProps": { "color": "$color.line", "strokeWidth": "$stroke.default", "cap": "round", "dash": "$atomic.dash.fine", "drawDuration": "$motion.drawOn.duration", "drawEasing": "$motion.drawOn.easing", "curveTension": "$atomic.curveTension.md" } },
    "Route": { "defaultProps": { "strokeWidth": "$stroke.route", "cap": "round", "fadeIn": "$motion.chip" } },
    "Packet": { "defaultProps": { "color": "$atomic.swatch.mint", "radius": 4, "radiusSm": 2.5, "period": "$motion.packetFlow.period", "curveTension": "$atomic.curveTension.md", "fadeIn": "$motion.sheet" } },
    "Halo": { "defaultProps": { "glow": "$effect.halo" } },
    "Particle": { "defaultProps": { "radius": 2.7, "radiusLg": 4.5, "haloRadius": 14, "haloAlpha": "$atomic.opacity.6", "twinklePeriod": "$motion.pulse.period", "twinkleFloor": 0.45 } },
    "Guide": { "defaultProps": { "color": "$color.line", "alpha": "$atomic.opacity.65", "strokeWidth": "$atomic.strokeWidth.3xs", "dash": "$atomic.dash.orbit" } },
    "Panel": { "defaultProps": { "fill": "$color.surface", "stroke": "$color.line", "radius": "$corner.panel", "strokeWidth": "$stroke.outline" } },
    "Card": { "defaultProps": { "radius": "$corner.card", "fillAlpha": "$atomic.opacity.8", "strokeAlpha": "$atomic.opacity.32", "padding": 16, "textBaseline": 21, "baseHeight": 24 } },
    "Pill": { "defaultProps": { "color": "$color.textMuted", "width": 114, "height": 30, "radius": "$corner.pill", "fillAlpha": "$atomic.opacity.8", "strokeAlpha": "$atomic.opacity.32", "textBaseline": 20 } },
    "Check": { "defaultProps": { "color": "$atomic.swatch.mint", "size": 12, "strokeWidth": "$atomic.strokeWidth.md", "cap": "round", "join": "round" } },
    "Rule": { "defaultProps": { "color": "$color.line", "strokeWidth": "$atomic.strokeWidth.3xs" } },
    "Glyph": { "defaultProps": { "strokeWidth": "$stroke.default" } },
```

References reach into composite tokens (`$motion.drawOn.duration`), which the resolver follows like any path. `Packet` and `Check` default to mint so out-of-scope presets that pass no colour stay as they are.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/videoThemeSchema/videoThemeSchema.test.ts src/videoTheme/tokenCatalog/tokenCatalog.test.ts`
Expected: all pass (classic is complete; every new token has metadata and a range).

- [ ] **Step 4: Rewrite the shared shapes**

Replace `src/stock/graphics-common.tsx` with:

```tsx
import { loopPhase, mix, ramp, wave } from "../motion";
import { StockRect } from "./primitives/StockRect/StockRect";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "./theme/useGraphicTheme";
import type { ResolvedTypeStyle, ResolvedVideoSemantic } from "../videoTheme/videoTheme.types";
import type { CSSProperties, ReactNode } from "react";

export { STOCK } from "./stockPalette";

export type GraphicProps = {
  frame: number;
  accent: string;
  background?: string;
  id: string;
};
export type Point = { x: number; y: number };

/** Width of the stock viewBox. Right margins and centred text measure from it. */
export const GRAPHIC_WIDTH = 960;
/** Height of the stock viewBox. The caption baseline measures from it. */
export const GRAPHIC_HEIGHT = 600;

/** A graphic text role, such as `label` or `caption`. */
export type GraphicTextRole = keyof ResolvedVideoSemantic["text"]["graphic"];

/** Node sizes, each resolved through the `Node` radius tokens. */
export type NodeSize = "xs" | "sm" | "md" | "lg" | "xl";

const NODE_RADIUS_KEYS = {
  xs: "radiusXs",
  sm: "radiusSm",
  md: "radiusMd",
  lg: "radiusLg",
  xl: "radiusXl",
} as const;
const PACKET_FADE_IN_AT = 34;
const PACKET_EDGE_FADE = 10;

function _letterSpacing(style: ResolvedTypeStyle, fontSize: number): number | undefined {
  return style.letterSpacing === undefined
    ? undefined
    : Number((style.letterSpacing * fontSize).toFixed(4));
}

function _textStyle(style: ResolvedTypeStyle): CSSProperties | undefined {
  if (!style.textTransform && !style.fontVariantNumeric) {
    return undefined;
  }
  return { textTransform: style.textTransform, fontVariantNumeric: style.fontVariantNumeric };
}

/**
 * SVG text in a graphic type role (`body` unless named). `size`, `fill`,
 * `weight`, and `spacing` are content overrides; `mono` draws in the code
 * role's face. Out-of-scope presets still pass sizes; in-scope presets name
 * a role.
 */
export function Text({
  x,
  y,
  children,
  role = "body",
  size,
  fill,
  anchor = "start",
  mono = false,
  weight,
  spacing,
}: {
  x: number;
  y: number;
  children: ReactNode;
  role?: GraphicTextRole;
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  weight?: number;
  spacing?: number;
}) {
  const text = useGraphicTokens().text.graphic;
  const style = text[role];
  const fontSize = size ?? style.fontSize;
  return (
    <text
      x={x}
      y={y}
      fill={fill ?? style.color}
      fillOpacity={style.alpha < 1 ? style.alpha : undefined}
      fontSize={fontSize}
      fontWeight={weight ?? style.fontWeight}
      textAnchor={anchor}
      fontFamily={mono ? text.code.fontFamily : style.fontFamily}
      letterSpacing={spacing ?? _letterSpacing(style, fontSize)}
      stroke={style.strokeWidth ? (fill ?? style.color) : undefined}
      strokeWidth={style.strokeWidth}
      paintOrder={style.strokeWidth ? "stroke" : undefined}
      style={_textStyle(style)}
    >
      {children}
    </text>
  );
}

/** The small tracked label at the theme's eyebrow origin. */
export function Eyebrow({
  children,
  x,
  y,
  fill,
}: {
  children: ReactNode;
  x?: number;
  y?: number;
  fill?: string;
}) {
  const origin = useGraphicTokens().layout.graphic.eyebrowOrigin;
  return (
    <Text role="eyebrow" x={x ?? origin.x ?? 0} y={y ?? origin.y ?? 0} fill={fill}>
      {children}
    </Text>
  );
}

/** The one-line caption, centred on the canvas at the theme's caption baseline. */
export function Caption({
  children,
  x = GRAPHIC_WIDTH / 2,
  anchor = "middle",
}: {
  children: ReactNode;
  x?: number;
  anchor?: "start" | "middle" | "end";
}) {
  const baseline = useGraphicTokens().layout.graphic.captionBaseline;
  return (
    <Text role="caption" x={x} y={GRAPHIC_HEIGHT - baseline} anchor={anchor}>
      {children}
    </Text>
  );
}

/** A themed panel; `stroke`, `fill`, and `radius` are content overrides. */
export function Panel({
  x,
  y,
  width,
  height,
  children,
  stroke,
  fill,
  radius,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ReactNode;
  stroke?: string;
  fill?: string;
  radius?: number;
}) {
  const panel = useGraphicProps("Panel", { stroke, fill, radius });
  return (
    <g>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={panel.radius}
        fill={panel.fill}
        stroke={panel.stroke}
        strokeWidth={panel.strokeWidth}
      />
      {children}
    </g>
  );
}

/** A tinted summary card for labels that outgrow a pill. */
export function Card({
  x,
  y,
  width,
  height,
  color,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  children?: ReactNode;
}) {
  const card = useGraphicProps("Card", {});
  return (
    <g>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={card.radius}
        fill={color}
        fillOpacity={card.fillAlpha}
        stroke={color}
        strokeOpacity={card.strokeAlpha}
      />
      {children}
    </g>
  );
}

/** A themed pill-shaped tag; `color` and `width` are content overrides. */
export function Pill({
  x,
  y,
  text,
  color,
  width,
}: {
  x: number;
  y: number;
  text: string;
  color?: string;
  width?: number;
}) {
  const pill = useGraphicProps("Pill", { color, width });
  return (
    <g>
      <StockRect
        x={x}
        y={y}
        width={pill.width}
        height={pill.height}
        rx={Math.min(pill.radius, pill.height / 2)}
        fill={pill.color}
        fillOpacity={pill.fillAlpha}
        stroke={pill.color}
        strokeOpacity={pill.strokeAlpha}
      />
      <Text role="pill" x={x + pill.width / 2} y={y + pill.textBaseline} fill={pill.color} anchor="middle">
        {text}
      </Text>
    </g>
  );
}

/** Fades and rises children in with the theme's entrance motion. */
export function Arrive({
  frame,
  at = 12,
  index = 0,
  children,
}: {
  frame: number;
  at?: number;
  index?: number;
  children: ReactNode;
}) {
  const motion = useGraphicMotion();
  const t = ramp(frame, at + index * motion.stagger.list, motion.entrance.duration, motion.entrance.easing);
  return (
    <g opacity={t} transform={`translate(0 ${mix(t, motion.entrance.distance, 0)})`}>
      {children}
    </g>
  );
}

/**
 * A curved path between two points. `tension` places the control points;
 * themed shapes pass their `curveTension` token. Pure, so out-of-scope
 * presets can keep calling it for `d` strings.
 */
export function Curve({
  from,
  to,
  bend = 0,
  tension = 0.45,
}: {
  from: Point;
  to: Point;
  bend?: number;
  tension?: number;
}) {
  return `M${from.x},${from.y} C${mix(tension, from.x, to.x)},${from.y + bend} ${mix(1 - tension, from.x, to.x)},${to.y + bend} ${to.x},${to.y}`;
}

/**
 * A themed edge that draws itself in. Give `d`, or `curve` to curve with the
 * theme's tension. `duration` is a content length that tempo still scales.
 */
export function DrawPath({
  d,
  curve,
  frame,
  at = 20,
  duration,
  color,
  width,
  opacity = 1,
  dashed = false,
}: {
  d?: string;
  curve?: Readonly<{ from: Point; to: Point; bend?: number }>;
  frame: number;
  at?: number;
  duration?: number;
  color?: string;
  width?: number;
  opacity?: number;
  dashed?: boolean;
}) {
  const edge = useGraphicProps("Edge", { color, strokeWidth: width });
  const motion = useGraphicMotion();
  const path = d ?? (curve ? Curve({ ...curve, tension: edge.curveTension }) : "");
  const t = ramp(frame, at, motion.scale(duration ?? edge.drawDuration), motion.curve(edge.drawEasing));
  return (
    <path
      d={path}
      pathLength={1}
      fill="none"
      stroke={edge.color}
      strokeWidth={edge.strokeWidth}
      strokeLinecap={edge.cap}
      strokeDasharray={dashed ? edge.dash.join(" ") : 1}
      strokeDashoffset={dashed ? 0 : 1 - t}
      opacity={opacity * (dashed ? t : 1)}
    />
  );
}

/** Geometry only: the shared frame helpers supply the motion. */
export function cubicPoint(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u ** 3 * a.x + 3 * u ** 2 * t * b.x + 3 * u * t ** 2 * c.x + t ** 3 * d.x,
    y: u ** 3 * a.y + 3 * u ** 2 * t * b.y + 3 * u * t ** 2 * c.y + t ** 3 * d.y,
  };
}

/** The theme's soft disc around a point, such as a packet's halo. */
export function Halo({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const { glow } = useGraphicProps("Halo", {});
  return <circle cx={cx} cy={cy} r={r + glow.spread} fill={color} fillOpacity={glow.opacity} />;
}

/** A themed packet looping along a curved edge, with its halo. */
export function Packet({
  frame,
  from,
  to,
  color,
  delay = 0,
  period,
  size = "md",
  radius,
  bend = 0,
}: {
  frame: number;
  from: Point;
  to: Point;
  color?: string;
  delay?: number;
  period?: number;
  size?: "sm" | "md";
  /** A content override that out-of-scope presets may pass. */
  radius?: number;
  bend?: number;
}) {
  const packet = useGraphicProps("Packet", { color, period });
  const motion = useGraphicMotion();
  const r = radius ?? (size === "sm" ? packet.radiusSm : packet.radius);
  const t = loopPhase(frame, packet.period, delay);
  const point = cubicPoint(
    from,
    { x: mix(packet.curveTension, from.x, to.x), y: from.y + bend },
    { x: mix(1 - packet.curveTension, from.x, to.x), y: to.y + bend },
    to,
    t,
  );
  const opacity =
    ramp(frame, PACKET_FADE_IN_AT, motion.scale(packet.fadeIn)) *
    Math.min(1, t * PACKET_EDGE_FADE, (1 - t) * PACKET_EDGE_FADE);
  return (
    <g opacity={opacity}>
      <Halo cx={point.x} cy={point.y} r={r} color={packet.color} />
      <circle cx={point.x} cy={point.y} r={r} fill={packet.color} />
    </g>
  );
}

/** A themed highlighted route segment that grows with `progress`. */
export function Route({
  from,
  to,
  progress,
  frame,
  at,
  color,
}: {
  from: Point;
  to: Point;
  progress: number;
  frame: number;
  at: number;
  color: string;
}) {
  const route = useGraphicProps("Route", {});
  const motion = useGraphicMotion();
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={mix(progress, from.x, to.x)}
      y2={mix(progress, from.y, to.y)}
      stroke={color}
      strokeWidth={route.strokeWidth}
      strokeLinecap={route.cap}
      opacity={ramp(frame, at, motion.scale(route.fadeIn))}
    />
  );
}

/** A themed dashed guide ellipse, such as an orbit. */
export function Guide({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  const guide = useGraphicProps("Guide", {});
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="none"
      stroke={guide.color}
      strokeWidth={guide.strokeWidth}
      strokeDasharray={guide.dash.length ? guide.dash.join(" ") : undefined}
      opacity={guide.alpha}
    />
  );
}

/** A themed horizontal divider. */
export function Rule({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const rule = useGraphicProps("Rule", {});
  return <line x1={x1} y1={y} x2={x2} y2={y} stroke={rule.color} strokeWidth={rule.strokeWidth} />;
}

/** A themed icon glyph outline drawn inside a shape. */
export function Glyph({ d, color }: { d: string; color: string }) {
  const glyph = useGraphicProps("Glyph", {});
  return <path d={d} fill="none" stroke={color} strokeWidth={glyph.strokeWidth} />;
}

/** A themed, twinkling ambient particle with an optional halo. */
export function Particle({
  x,
  y,
  frame,
  phase,
  color,
  haloColor,
  isLarge,
}: {
  x: number;
  y: number;
  frame: number;
  phase: number;
  color: string;
  haloColor: string;
  isLarge: boolean;
}) {
  const particle = useGraphicProps("Particle", {});
  const floor = particle.twinkleFloor;
  return (
    <g opacity={floor + wave(frame, particle.twinklePeriod, phase) * (1 - floor)}>
      {isLarge ? (
        <circle cx={x} cy={y} r={particle.haloRadius} fill={haloColor} fillOpacity={particle.haloAlpha} />
      ) : null}
      <circle cx={x} cy={y} r={isLarge ? particle.radiusLg : particle.radius} fill={color} />
    </g>
  );
}

/**
 * A themed node: active ring, outline, accent tint, centre dot, label, and
 * optional detail. `size` picks a themed radius; `radius` is a content
 * override that out-of-scope presets still pass.
 */
export function CircleNode({
  x,
  y,
  label,
  detail,
  frame,
  index = 0,
  accent,
  active = 0,
  size = "md",
  radius,
}: {
  x: number;
  y: number;
  label: string;
  detail?: string;
  frame: number;
  index?: number;
  accent: string;
  active?: number;
  size?: NodeSize;
  radius?: number;
}) {
  const node = useGraphicProps("Node", {});
  const r = radius ?? node[NODE_RADIUS_KEYS[size]];
  return (
    <Arrive frame={frame} index={index}>
      <circle cx={x} cy={y} r={r + node.ringSpread} fill="none" stroke={accent} strokeOpacity={active * node.ringAlpha} />
      <circle cx={x} cy={y} r={r} fill={node.fill} stroke={node.stroke} strokeWidth={node.strokeWidth} />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={accent}
        fillOpacity={active * node.tintAlpha}
        stroke={accent}
        strokeOpacity={node.outlineAlpha + active * (1 - node.outlineAlpha)}
        strokeWidth={node.strokeWidth}
      />
      <circle cx={x} cy={y} r={node.coreRadius + active * node.coreGrowth} fill={accent} />
      <Text role="label" x={x} y={y + r + node.labelOffset} anchor="middle">
        {label}
      </Text>
      {detail ? (
        <Text role="detail" x={x} y={y + r + node.detailOffset} anchor="middle">
          {detail}
        </Text>
      ) : null}
    </Arrive>
  );
}

/** A themed check mark; `color` and `size` are content overrides. */
export function Check({ x, y, color, size }: { x: number; y: number; color?: string; size?: number }) {
  const check = useGraphicProps("Check", { color, size });
  const s = check.size;
  return (
    <path
      d={`M${x - s * 0.5} ${y} l${s * 0.35} ${s * 0.36} l${s * 0.7} ${-s * 0.8}`}
      fill="none"
      stroke={check.color}
      strokeWidth={check.strokeWidth}
      strokeLinecap={check.cap}
      strokeLinejoin={check.join}
    />
  );
}
```

Parity notes, all checked in Node: `1 - 0.45 === 0.55`, `1 - 0.28 === 0.72`, `1 - 0.45` for the particle floor equals `0.55`, and `0.17142857142857143 * 14` rounds to `2.4`.

- [ ] **Step 5: Run the tests**

Run the Step 1 command. Expected: 7 passing.
Run: `pnpm test`. Expected: only the pre-existing failures.

- [ ] **Step 6: Typecheck, check parity, commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.
Run: `pnpm theme:parity compare`. Expected: parity passes.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/graphics-common.tsx src/stock/graphics-common.test.tsx
git commit -m "feat(video-producer): theme the shared stock shapes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 12: `network-graph`

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/stock/graphics-networks/NetworkGraph.tsx`
- Test: `src/stock/graphics-networks/graphics-networks.test.tsx` (shared by Tasks 12 to 16)

- [ ] **Step 1: Write the failing test**

`src/stock/graphics-networks/graphics-networks.test.tsx`:

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { StockGraphic } from "../StockGraphic";
import type { StockPresetId } from "../contracts/StockContract.types";

/** Renders a preset at frame 120 inside a theme patch. */
function renderPresetWithPatch(preset: StockPresetId, patch: object): string {
  return renderToStaticMarkup(
    <VideoThemeScope patches={[patch]}>
      <StockGraphic preset={preset} frame={120} />
    </VideoThemeScope>,
  );
}

function _componentPatch(name: string, defaultProps: object) {
  return { components: { [name]: { defaultProps } } };
}

test("network-graph draws its highlighted edges at the themed opacity", () => {
  assert.match(
    renderPresetWithPatch("network-graph", _componentPatch("NetworkGraph", { highlightEdgeAlpha: 0.37 })),
    /opacity="0.37"/,
  );
});
```

Later tasks append one test each to this file; keep the helpers at the top.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/graphics-networks/graphics-networks.test.tsx`
Expected: FAIL; `0.37` never appears.

- [ ] **Step 2: Add the tokens**

In `componentTokens.ts`, add above `COMPONENT_TOKENS` and spread `NetworkGraph: NETWORK_GRAPH_TOKENS,` into it:

```ts
const NETWORK_GRAPH_TOKENS = {
  highlightEdgeAlpha: _alpha("Highlighted edge opacity", "Opacity of the first edges of a network graph, drawn in the accent."),
  edgeAlpha: _alpha("Network edge opacity", "Opacity of the remaining edges of a network graph."),
  hubPulsePeriod: _duration("Hub pulse period", "Frames for one breath of the hub node."),
  hubPulseFloor: _alpha("Hub pulse floor", "The hub's lowest activity while it breathes."),
  hubPulseSwing: _alpha("Hub pulse swing", "How far the hub's activity rises above its floor."),
  nodePulsePeriod: _duration("Outer node pulse period", "Frames for one breath of an outer node."),
  nodePulseSwing: _alpha("Outer node pulse swing", "How high an outer node's activity rises at the top of a breath."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "NetworkGraph": { "defaultProps": { "highlightEdgeAlpha": "$atomic.opacity.34", "edgeAlpha": "$atomic.opacity.65", "hubPulsePeriod": "$motion.pulse.period", "hubPulseFloor": 0.65, "hubPulseSwing": 0.3, "nodePulsePeriod": "$atomic.period.lg", "nodePulseSwing": 0.5 } },
```

- [ ] **Step 3: Rewrite the preset**

Replace `src/stock/graphics-networks/NetworkGraph.tsx` with:

```tsx
import { wave } from "../../motion";
import {
  CircleNode,
  DrawPath,
  Eyebrow,
  GRAPHIC_WIDTH,
  Packet,
  Pill,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import type { NetworkGraphInput } from "../presets/NetworkGraph/NetworkGraph.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: NetworkGraphInput };

const HIGHLIGHTED_EDGES = 6;
const EDGE_CUE = 22;
const PACKET_PHASE_STEP = 13;
const NODE_PHASE_STEP = 16;
const COUNT_PILL_TOP = 44;
const COUNT_PILL_WIDTH = 113;

/** Draws the bounded authored network-graph study at an explicit frame. */
export function NetworkGraph({ input, frame, accent }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("NetworkGraph", {});
  const { color, layout } = useGraphicTokens();
  const motion = useGraphicMotion();
  const nodes = input.nodes;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["network-graph"].relationshipNetwork,
        })}
      </Eyebrow>
      <Pill
        x={GRAPHIC_WIDTH - layout.graphic.margin - COUNT_PILL_WIDTH}
        y={COUNT_PILL_TOP}
        width={COUNT_PILL_WIDTH}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["network-graph"].nodeCount,
          values: { count: String(input.nodes.length).padStart(2, "0") },
        })}
        color={accent}
      />
      {input.edges.map(([a, b], i) => (
        <g key={i}>
          <DrawPath
            curve={{ from: nodes[a], to: nodes[b] }}
            frame={frame}
            at={EDGE_CUE + i * motion.stagger.edge}
            color={i < HIGHLIGHTED_EDGES ? accent : color.line}
            opacity={i < HIGHLIGHTED_EDGES ? style.highlightEdgeAlpha : style.edgeAlpha}
          />
          {input.showPackets ? (
            <Packet
              frame={frame}
              from={nodes[a]}
              to={nodes[b]}
              delay={i * PACKET_PHASE_STEP}
              color={i % 3 === 0 ? color.accentAlt : accent}
              size={i < HIGHLIGHTED_EDGES ? "md" : "sm"}
            />
          ) : null}
        </g>
      ))}
      {nodes.map((node, i) => (
        <CircleNode
          key={node.label}
          {...node}
          frame={frame}
          index={i}
          accent={accent}
          size={i === 0 ? "xl" : "sm"}
          active={
            i === 0
              ? style.hubPulseFloor + wave(frame, style.hubPulsePeriod) * style.hubPulseSwing
              : wave(frame, style.nodePulsePeriod, i * NODE_PHASE_STEP) * style.nodePulseSwing
          }
        />
      ))}
    </g>
  );
}
```

The count pill lands at `960 - 64 - 113 = 783`, today's x.

- [ ] **Step 4: Verify and commit**

Run the Step 1 command. Expected: 1 passing.
Run: `pnpm theme:parity compare network-graph aperture-detail`. Expected: parity passes.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/graphics-networks/NetworkGraph.tsx src/stock/graphics-networks/graphics-networks.test.tsx
git commit -m "feat(video-producer): theme the network-graph preset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: `node-traversal`

**Files:**
- Modify: `src/stock/graphics-networks/NodeTraversal.tsx`
- Modify: `src/stock/presets/NodeTraversal/TraversalRouteSummary.tsx`
- Test: `src/stock/graphics-networks/graphics-networks.test.tsx`

`node-traversal` uses only shared components (`Node`, `Route`, `Card`, `Pill`, `Caption`), so it adds no tokens of its own. Its caption moves to the shared caption style (spec §1.6): plan 1's allowance covers that band.

- [ ] **Step 1: Write the failing test**

Append to `graphics-networks.test.tsx`:

```tsx
test("node-traversal draws off-route nodes in the inactive colour", () => {
  assert.match(
    renderPresetWithPatch("node-traversal", { other: { video: { atomic: { swatch: { muted: "#a1b2c3" } } } } }),
    /stroke="#a1b2c3"/,
  );
});
```

Run the test file. Expected: the new test fails (the off-route colour is the `STOCK.muted` literal).

- [ ] **Step 2: Rewrite the preset**

Replace `src/stock/graphics-networks/NodeTraversal.tsx` with:

```tsx
import { ramp } from "../../motion";
import {
  Caption,
  CircleNode,
  DrawPath,
  Eyebrow,
  Route,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { TraversalRouteSummary } from "../presets/NodeTraversal/TraversalRouteSummary";
import { useGraphicMotion, useGraphicTokens } from "../theme/useGraphicTheme";
import type { NodeTraversalInput } from "../presets/NodeTraversal/NodeTraversal.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: NodeTraversalInput };

const ROUTE_CUE = 24;
const ROUTE_DRAW_FRAMES = 106;
const EDGE_CUE = 14;
const ROUTE_LINE_CUE = 25;
const CAPTION_CUE = 80;

function _clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Draws the bounded authored node-traversal study at an explicit frame. */
export function NodeTraversal({ input, frame, accent }: Readonly<Props>): ReactNode {
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const { nodes, edges, route } = input;
  const progress =
    ramp(frame, ROUTE_CUE, motion.scale(ROUTE_DRAW_FRAMES), motion.travel.easing) * (route.length - 1);
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["node-traversal"].directedTraversal,
        })}
      </Eyebrow>
      {input.showRouteLabel ? (
        <TraversalRouteSummary label={route.map((index) => nodes[index].label).join(" → ")} accent={accent} />
      ) : null}
      {edges.map(([a, b], i) => (
        <DrawPath
          key={i}
          d={`M${nodes[a].x} ${nodes[a].y} L${nodes[b].x} ${nodes[b].y}`}
          frame={frame}
          at={EDGE_CUE + i * motion.stagger.edge}
        />
      ))}
      {route.slice(0, -1).map((a, i) => (
        <Route
          key={i}
          from={nodes[a]}
          to={nodes[route[i + 1]]}
          progress={_clampUnit(progress - i)}
          frame={frame}
          at={ROUTE_LINE_CUE}
          color={accent}
        />
      ))}
      {nodes.map((node, i) => {
        const routeIndex = route.indexOf(i);
        return (
          <CircleNode
            key={node.label}
            {...node}
            frame={frame}
            index={i}
            accent={routeIndex < 0 ? color.inactive : accent}
            active={routeIndex < 0 ? 0 : _clampUnit(progress - routeIndex + 1)}
            size="lg"
          />
        );
      })}
      <g opacity={ramp(frame, CAPTION_CUE, motion.sheet)}>
        <Caption>
          {getStockDisplayCopyFromDescriptor({
            descriptor: LEGACY_DISPLAY_COPY["node-traversal"].aSelectedPathThroughAConnectedSystem,
          })}
        </Caption>
      </g>
    </g>
  );
}
```

The edge's explicit `width={2}` is gone: `Edge.strokeWidth` is `$stroke.default`, which is 2.

- [ ] **Step 3: Rewrite the route summary**

Replace `src/stock/presets/NodeTraversal/TraversalRouteSummary.tsx` with:

```tsx
import { Card, GRAPHIC_WIDTH, Pill } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { wrapTextToLines } from "../../primitives/FitText/wrapTextToLines";
import { useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";
import { getLegacyWidthFromText } from "../legacy/getLegacyWidthFromText/getLegacyWidthFromText";
import type { ReactNode } from "react";

type Props = { label: string; accent: string };

const SUMMARY_TOP = 44;
const SHORT_PILL_WIDTH = 152;
const SHORT_TEXT_LIMIT = 140;
const LONG_TEXT_LIMIT = 356;
const PILL_TEXT_PADDING = 20;
const CARD_WIDTH = 376;
const CARD_FONT_SIZE = 12;
const CARD_MAX_LINES = 4;

/**
 * Keeps short route badges compact and long authored summaries in the header.
 * Widths are measured at the pill role's size, so the badge fits the text
 * the theme draws.
 */
export function TraversalRouteSummary({ label, accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const card = useGraphicProps("Card", {});
  const right = GRAPHIC_WIDTH - tokens.layout.graphic.margin;
  const textWidth = getLegacyWidthFromText({ text: label, fontSize: tokens.text.graphic.pill.fontSize, mono: true });
  if (textWidth <= SHORT_TEXT_LIMIT) {
    return <Pill x={right - SHORT_PILL_WIDTH} y={SUMMARY_TOP} width={SHORT_PILL_WIDTH} text={label} color={accent} />;
  }
  if (textWidth <= LONG_TEXT_LIMIT) {
    const width = Math.ceil(textWidth + PILL_TEXT_PADDING - 1e-9);
    return <Pill x={right - width} y={SUMMARY_TOP} width={width} text={label} color={accent} />;
  }
  const innerWidth = CARD_WIDTH - card.padding * 2;
  const lines = wrapTextToLines({ text: label, width: innerWidth, fontSize: CARD_FONT_SIZE, maxLines: CARD_MAX_LINES });
  const lineStep = Number((CARD_FONT_SIZE * (tokens.text.graphic.data.lineHeight ?? 1.3)).toFixed(4));
  const x = right - CARD_WIDTH;
  return (
    <Card x={x} y={SUMMARY_TOP} width={CARD_WIDTH} height={card.baseHeight + lines.length * lineStep} color={accent}>
      <FitText
        x={x + card.padding}
        y={SUMMARY_TOP + card.textBaseline}
        width={innerWidth}
        fontSize={CARD_FONT_SIZE}
        maxLines={CARD_MAX_LINES}
        text={label}
      />
    </Card>
  );
}
```

In `classic` every value matches today's: `x = 960 - 64 - 376 = 520`, padding 16 gives `536` and an inner width of `344`, the baseline is `44 + 21 = 65`, and the line step rounds `12 × 1.3` to `15.6`. The card's box is now a `StockRect`, so it sketches with the other boxes; at roughness 0 it renders the same `<rect>`.

- [ ] **Step 4: Verify and commit**

Run the test file. Expected: 2 passing.
Run: `pnpm theme:parity compare node-traversal`. Expected: parity passes; only the caption band differs.

```bash
git add src/stock/graphics-networks/NodeTraversal.tsx src/stock/presets/NodeTraversal/TraversalRouteSummary.tsx src/stock/graphics-networks/graphics-networks.test.tsx
git commit -m "feat(video-producer): theme the node-traversal preset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: `radial-network` and the hairline stroke

**Files:**
- Modify: `src/videoTheme/tokenCatalog/semanticTokens.ts`, `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/stock/graphics-networks/RadialNetwork.tsx`
- Test: `src/stock/graphics-networks/graphics-networks.test.tsx`

Many preset shapes stroke at the SVG default of 1 px with no `strokeWidth` attribute. They now share one semantic role, `stroke.hairline`, and pass it explicitly; an explicit `1` draws the same pixels as the default.

- [ ] **Step 1: Write the failing test**

Append:

```tsx
test("radial-network draws its hub glow at the themed opacity", () => {
  assert.match(
    renderPresetWithPatch("radial-network", _componentPatch("RadialNetwork", { hubGlowAlpha: 0.21 })),
    /fill-opacity="0.21"/,
  );
});
```

Run the test file. Expected: the new test fails.

- [ ] **Step 2: Add the tokens**

In `semanticTokens.ts`, in `stroke`, add after `guide`:

```ts
    hairline: _stroke("Hairline stroke", "The thinnest outline, for hub rims, rows, and fine dividers."),
```

In `classic.theme.json`, in `semantic.stroke`, add `"hairline": "$atomic.strokeWidth.3xs",`.

In `componentTokens.ts`, add and spread `RadialNetwork: RADIAL_NETWORK_TOKENS,`:

```ts
const RADIAL_NETWORK_TOKENS = {
  spokeAlpha: _alpha("Spoke opacity", "Opacity of the spokes from the hub to each node."),
  spokePulsePeriod: _duration("Spoke node pulse period", "Frames for one breath of a spoke node."),
  spokePulseSwing: _alpha("Spoke node pulse swing", "How high a spoke node's activity rises at the top of a breath."),
  hubRadius: _length("Hub radius", "Radius of the hub disc at the centre of a radial network."),
  hubStrokeAlpha: _alpha("Hub rim opacity", "Opacity of the hub's accent rim."),
  hubStrokeWidth: _stroke("Hub rim width", "Width of the hub's accent rim."),
  hubGlowRadius: _length("Hub glow radius", "Radius of the soft glow inside the hub."),
  hubGlowAlpha: _alpha("Hub glow opacity", "Opacity of the soft glow inside the hub."),
  hubLabelOffset: _offset("Hub label offset", "Vertical distance from the hub centre to its label baseline."),
  hubDetailOffset: _offset("Hub detail offset", "Vertical distance from the hub centre to its detail baseline."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "RadialNetwork": { "defaultProps": { "spokeAlpha": "$atomic.opacity.30", "spokePulsePeriod": "$motion.pulse.period", "spokePulseSwing": 0.6, "hubRadius": 70, "hubStrokeAlpha": "$atomic.opacity.40", "hubStrokeWidth": "$stroke.hairline", "hubGlowRadius": 59, "hubGlowAlpha": "$atomic.opacity.3", "hubLabelOffset": -2, "hubDetailOffset": 22 } },
```

`hubGlowAlpha` is the spec §1.6 consolidation: 0.035 becomes 0.03, inside plan 1's allowance region.

- [ ] **Step 3: Rewrite the preset**

Replace `src/stock/graphics-networks/RadialNetwork.tsx` with:

```tsx
import { wave } from "../../motion";
import {
  Arrive,
  Caption,
  CircleNode,
  DrawPath,
  Eyebrow,
  Guide,
  Packet,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import type { RadialNetworkInput } from "../presets/RadialNetwork/RadialNetwork.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: RadialNetworkInput };

const CENTER = { x: 480, y: 295 };
const ORBIT = { rx: 278, ry: 181 };
const SPOKE_CUE = 20;
const PACKET_PHASE_STEP = 12;
const NODE_PHASE_STEP = 10;

/** Draws the bounded authored radial-network study at an explicit frame. */
export function RadialNetwork({ input, frame, accent }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("RadialNetwork", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const spokes = input.spokes;
  const nodes = spokes.map((label, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / spokes.length;
    return { label, x: CENTER.x + Math.cos(angle) * ORBIT.rx, y: CENTER.y + Math.sin(angle) * ORBIT.ry };
  });
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["radial-network"].hubSpoke })}
      </Eyebrow>
      {input.showOrbit ? <Guide cx={CENTER.x} cy={CENTER.y} rx={ORBIT.rx} ry={ORBIT.ry} /> : null}
      {nodes.map((node, i) => (
        <g key={node.label}>
          <DrawPath
            curve={{ from: CENTER, to: node }}
            frame={frame}
            at={SPOKE_CUE + i * motion.stagger.edge}
            color={accent}
            opacity={style.spokeAlpha}
          />
          <Packet
            frame={frame}
            from={i % 2 ? CENTER : node}
            to={i % 2 ? node : CENTER}
            delay={i * PACKET_PHASE_STEP}
            color={i % 2 ? accent : color.accentAlt}
          />
          <CircleNode
            {...node}
            frame={frame}
            index={i}
            accent={i % 2 ? accent : color.accentAlt}
            size="xs"
            active={wave(frame, style.spokePulsePeriod, i * NODE_PHASE_STEP) * style.spokePulseSwing}
          />
        </g>
      ))}
      <Arrive frame={frame}>
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={style.hubRadius}
          fill={color.surface}
          stroke={accent}
          strokeOpacity={style.hubStrokeAlpha}
          strokeWidth={style.hubStrokeWidth}
        />
        <circle cx={CENTER.x} cy={CENTER.y} r={style.hubGlowRadius} fill={accent} fillOpacity={style.hubGlowAlpha} />
        <Text role="title" x={CENTER.x} y={CENTER.y + style.hubLabelOffset} anchor="middle">
          {input.hub.label}
        </Text>
        <Text role="detail" x={CENTER.x} y={CENTER.y + style.hubDetailOffset} anchor="middle">
          {input.hub.detail}
        </Text>
      </Arrive>
      <Caption>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["radial-network"].manyEndpointsOneSharedCenter,
        })}
      </Caption>
    </g>
  );
}
```

- [ ] **Step 4: Verify and commit**

Run the test file. Expected: 3 passing.
Run: `pnpm theme:parity compare radial-network`. Expected: parity passes; only the caption band and the hub glow region differ.

```bash
git add src/videoTheme/tokenCatalog themes/classic.theme.json src/stock/graphics-networks/RadialNetwork.tsx src/stock/graphics-networks/graphics-networks.test.tsx
git commit -m "feat(video-producer): theme the radial-network preset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: `plexus-field`

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/stock/graphics-networks/PlexusField.tsx`
- Test: `src/stock/graphics-networks/graphics-networks.test.tsx`

- [ ] **Step 1: Write the failing test**

Append:

```tsx
test("plexus-field draws links at the themed width", () => {
  assert.match(
    renderPresetWithPatch("plexus-field", _componentPatch("PlexusField", { linkWidth: 2.25 })),
    /stroke-width="2.25"/,
  );
});
```

Run the test file. Expected: the new test fails.

- [ ] **Step 2: Add the tokens**

In `componentTokens.ts`, add and spread `PlexusField: PLEXUS_FIELD_TOKENS,`:

```ts
const PLEXUS_FIELD_TOKENS = {
  linkDistance: _length("Link distance", "Particles closer than this are joined by a line."),
  linkAlpha: _alpha("Link opacity", "Opacity of a link between touching particles; it fades out with distance."),
  linkWidth: _stroke("Link width", "Width of a link between particles."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "PlexusField": { "defaultProps": { "linkDistance": 148, "linkAlpha": 0.62, "linkWidth": "$atomic.strokeWidth.2xs" } },
```

- [ ] **Step 3: Rewrite the preset**

Replace `src/stock/graphics-networks/PlexusField.tsx` with:

```tsx
import { loopPhase } from "../../motion";
import { Eyebrow, GRAPHIC_WIDTH, Particle, Rule, Text, type GraphicProps } from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import type { PlexusFieldInput } from "../presets/PlexusField/PlexusField.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: PlexusFieldInput };

const LOOP_FRAMES = 180;
const HEADING_Y = 101;
const RULE_Y = 529;
const FOOTER_Y = 560;
const TWINKLE_PHASE_STEP = 9;

/** Draws the bounded authored plexus-field study at an explicit frame. */
export function PlexusField({ input, frame, accent }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("PlexusField", {});
  const { color, layout } = useGraphicTokens();
  const motion = useGraphicMotion();
  const margin = layout.graphic.margin;
  const right = GRAPHIC_WIDTH - margin;
  const drift = motion.drift.distance;
  const points = Array.from({ length: input.particleCount }, (_, i) => {
    const angle = loopPhase(frame, LOOP_FRAMES, i * 11 + input.seed) * Math.PI * 2;
    return {
      x: 76 + ((i * 173 + i * i * 11 + input.seed * 37) % 808) + Math.cos(angle) * (drift + (i % 9)),
      y: 128 + ((i * 97 + i * i * 7 + input.seed * 53) % 350) + Math.sin(angle) * (drift + (i % 13)),
    };
  });
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["plexus-field"].ambientConnections })}
      </Eyebrow>
      <Text role="heading" x={margin} y={HEADING_Y}>
        {input.heading}
      </Text>
      {input.showConnections
        ? points.flatMap((a, i) =>
            points.slice(i + 1).map((b, j) => {
              const distance = Math.hypot(a.x - b.x, a.y - b.y);
              return distance < style.linkDistance ? (
                <line
                  key={`${i}-${j}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={(i + j) % 4 === 0 ? color.accentAlt : accent}
                  opacity={(1 - distance / style.linkDistance) * style.linkAlpha}
                  strokeWidth={style.linkWidth}
                />
              ) : null;
            }),
          )
        : null}
      {points.map((point, i) => (
        <Particle
          key={i}
          x={point.x}
          y={point.y}
          frame={frame}
          phase={i * TWINKLE_PHASE_STEP}
          color={i % 4 === 0 ? color.accentAlt : accent}
          haloColor={accent}
          isLarge={i % 7 === 0}
        />
      ))}
      <Rule x1={margin} x2={right} y={RULE_Y} />
      <Text role="footnote" x={margin} y={FOOTER_Y}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["plexus-field"].particleCount,
          values: { count: input.particleCount },
        })}
      </Text>
      <Text role="footnote" x={right} y={FOOTER_Y} anchor="end">
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["plexus-field"].deterministicField })}
      </Text>
    </g>
  );
}
```

The field placement (76, 808, 128, 350, and the hash constants) stays content. Each coordinate is the same left-to-right sum as today (base position, then drift), so it evaluates to the same double.

- [ ] **Step 4: Verify and commit**

Run the test file. Expected: 4 passing.
Run: `pnpm theme:parity compare plexus-field`. Expected: parity passes.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/graphics-networks/PlexusField.tsx src/stock/graphics-networks/graphics-networks.test.tsx
git commit -m "feat(video-producer): theme the plexus-field preset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: `orbital-system` and content colour roles

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/stock/presets/OrbitalSystem/OrbitalSystem.schema.ts`
- Modify: `src/stock/graphics-networks/OrbitalSystem.tsx`
- Test: `src/stock/graphics-networks/graphics-networks.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append:

```tsx
test("orbital-system draws its core at the themed radius", () => {
  assert.match(renderPresetWithPatch("orbital-system", _componentPatch("OrbitalSystem", { coreRadius: 44 })), /r="44"/);
});

test("an orbit colour can follow the theme through a colour role", async () => {
  const { orbitalSystemInputSchema } = await import("../presets/OrbitalSystem/OrbitalSystem.schema");
  const bodies = [{ rx: 120, ry: 80, angle: 0, color: "$color.highlight", phase: 0, label: "Body" }];
  assert.equal(orbitalSystemInputSchema.shape.bodies.element.safeParse(bodies[0]).success, true);
});
```

Run the test file. Expected: both new tests fail.

- [ ] **Step 2: Add the tokens**

In `componentTokens.ts`, add and spread `OrbitalSystem: ORBITAL_SYSTEM_TOKENS,`:

```ts
const ORBITAL_SYSTEM_TOKENS = {
  orbitAlpha: _alpha("Orbit opacity", "Opacity of an orbit's path."),
  orbitWidth: _stroke("Orbit width", "Width of an orbit's path."),
  bodyRadius: _length("Body radius", "Radius of an orbiting body's shell."),
  bodyCoreRadius: _length("Body core radius", "Radius of the dot inside an orbiting body."),
  bodyAlpha: _alpha("Body rim opacity", "Opacity of an orbiting body's rim."),
  bodyStrokeWidth: _stroke("Body rim width", "Width of an orbiting body's rim."),
  bodyLabelOffset: _length("Body label offset", "Distance from a body's centre up to its label baseline."),
  coreRadius: _length("Core radius", "Radius of the central core."),
  coreStrokeAlpha: _alpha("Core rim opacity", "Opacity of the central core's accent rim."),
  coreStrokeWidth: _stroke("Core rim width", "Width of the central core's accent rim."),
  pulsePeriod: _duration("Core pulse period", "Frames for one breath of the glow around the core."),
  pulseRadius: _length("Core pulse radius", "Radius of the glow around the core at rest."),
  pulseSwing: _length("Core pulse swing", "How far the glow around the core grows at the top of a breath."),
  pulseAlpha: _alpha("Core pulse opacity", "Opacity of the glow around the core."),
  pulseStrokeAlpha: _alpha("Core pulse rim opacity", "Opacity of the glow's rim."),
  pulseStrokeWidth: _stroke("Core pulse rim width", "Width of the glow's rim."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "OrbitalSystem": { "defaultProps": { "orbitAlpha": "$atomic.opacity.24", "orbitWidth": "$stroke.guide", "bodyRadius": 17, "bodyCoreRadius": 7, "bodyAlpha": "$atomic.opacity.24", "bodyStrokeWidth": "$stroke.hairline", "bodyLabelOffset": 27, "coreRadius": 49, "coreStrokeAlpha": "$atomic.opacity.70", "coreStrokeWidth": "$stroke.hairline", "pulsePeriod": "$motion.pulse.period", "pulseRadius": 71, "pulseSwing": 5, "pulseAlpha": "$atomic.opacity.3", "pulseStrokeAlpha": "$atomic.opacity.10", "pulseStrokeWidth": "$stroke.hairline" } },
```

`pulseAlpha` is the spec §1.6 consolidation: 0.025 becomes 0.03, inside plan 1's allowance region.

- [ ] **Step 3: Accept colour roles in orbit content**

In `src/stock/presets/OrbitalSystem/OrbitalSystem.schema.ts`, replace `import { legacyColorSchema } from "../legacy/legacyColorSchema.constants";` with `import { contentColorSchema } from "../../theme/resolveContentColor/resolveContentColor";` and replace `color: z.union([legacyColorSchema, z.literal("accent")]),` with `color: z.union([contentColorSchema, z.literal("accent")]),`.

- [ ] **Step 4: Rewrite the preset**

Replace `src/stock/graphics-networks/OrbitalSystem.tsx` with:

```tsx
import { loopPhase, wave } from "../../motion";
import { Caption, Eyebrow, Glyph, Text, type GraphicProps } from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { resolveContentColor } from "../theme/resolveContentColor/resolveContentColor";
import { useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import type { OrbitalSystemInput } from "../presets/OrbitalSystem/OrbitalSystem.schema";

type Props = GraphicProps & { input: OrbitalSystemInput };

const CENTER = { x: 480, y: 298 };
const LOOP_FRAMES = 180;
const CUBE_GLYPH =
  "M480 272 L503 285 L503 311 L480 324 L457 311 L457 285 Z M480 272 V298 L503 311 M480 298 L457 311";

function OrbitingBody({
  orbit,
  frame,
  color,
  showOrbit,
}: {
  orbit: OrbitalSystemInput["bodies"][number];
  frame: number;
  color: string;
  showOrbit: boolean;
}) {
  const style = useGraphicProps("OrbitalSystem", {});
  const tokens = useGraphicTokens();
  const angle = loopPhase(frame, LOOP_FRAMES, orbit.phase) * Math.PI * 2;
  const rotation = (orbit.angle * Math.PI) / 180;
  const x = orbit.rx * Math.cos(angle);
  const y = orbit.ry * Math.sin(angle);
  const px = CENTER.x + x * Math.cos(rotation) - y * Math.sin(rotation);
  const py = CENTER.y + x * Math.sin(rotation) + y * Math.cos(rotation);
  return (
    <g>
      {showOrbit ? (
        <ellipse
          cx={CENTER.x}
          cy={CENTER.y}
          rx={orbit.rx}
          ry={orbit.ry}
          fill="none"
          stroke={color}
          strokeOpacity={style.orbitAlpha}
          strokeWidth={style.orbitWidth}
          transform={`rotate(${orbit.angle} ${CENTER.x} ${CENTER.y})`}
        />
      ) : null}
      <circle
        cx={px}
        cy={py}
        r={style.bodyRadius}
        fill={tokens.color.ground}
        stroke={color}
        strokeOpacity={style.bodyAlpha}
        strokeWidth={style.bodyStrokeWidth}
      />
      <circle cx={px} cy={py} r={style.bodyCoreRadius} fill={color} />
      <Text role="data" x={px} y={py - style.bodyLabelOffset} fill={color} anchor="middle">
        {orbit.label}
      </Text>
    </g>
  );
}

/** Draws the bounded authored orbital-system study at an explicit frame. */
export function OrbitalSystem({ input, frame, accent }: Readonly<Props>) {
  const style = useGraphicProps("OrbitalSystem", {});
  const tokens = useGraphicTokens();
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["orbital-system"].orbitalSystem })}
      </Eyebrow>
      {input.bodies.map((orbit, i) => (
        <OrbitingBody
          key={i}
          orbit={orbit}
          frame={frame}
          color={resolveContentColor(orbit.color, { tokens, accent })}
          showOrbit={input.showOrbits}
        />
      ))}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={style.pulseRadius + wave(frame, style.pulsePeriod) * style.pulseSwing}
        fill={accent}
        fillOpacity={style.pulseAlpha}
        stroke={accent}
        strokeOpacity={style.pulseStrokeAlpha}
        strokeWidth={style.pulseStrokeWidth}
      />
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={style.coreRadius}
        fill={tokens.color.surface}
        stroke={accent}
        strokeOpacity={style.coreStrokeAlpha}
        strokeWidth={style.coreStrokeWidth}
      />
      <Glyph d={CUBE_GLYPH} color={accent} />
      <Caption>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["orbital-system"].independentMotionSharedGravity,
        })}
      </Caption>
    </g>
  );
}
```

The body's ground fill was the `background` prop; it is now `color.ground`, which `StockGraphic` sets from the same prop. The body label was a raw `<text>` at 12 px Arial with no weight; the `data` role draws it at 12 px Arial weight 400, the browser default, so the pixels match.

- [ ] **Step 5: Verify and commit**

Run the test file. Expected: 6 passing.
Run: `pnpm stock:messages` (the schema changed, so stock contracts rebuild), then `pnpm theme:parity compare orbital-system`. Expected: parity passes; only the caption band and the pulse region differ.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/presets/OrbitalSystem/OrbitalSystem.schema.ts src/stock/graphics-networks/OrbitalSystem.tsx src/stock/graphics-networks/graphics-networks.test.tsx
git commit -m "feat(video-producer): theme the orbital-system preset and accept colour roles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 17: `data-pipeline`

The seven presets nested in the compositions share one integration test file. Each task adds one test.

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/stock/graphics-data/DataPipeline.tsx`
- Test: `src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx`:

```tsx
/*
 * The presets nested in the in-scope compositions draw from the theme: a
 * component token patched in a scope reaches the rendered SVG.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { StockGraphic } from "../StockGraphic";
import type { StockPresetId } from "../contracts/StockContract.types";

function _render(preset: StockPresetId, name: string, defaultProps: object): string {
  const patch = { components: { [name]: { defaultProps } } };
  return renderToStaticMarkup(
    <VideoThemeScope patches={[patch]}>
      <StockGraphic preset={preset} frame={120} />
    </VideoThemeScope>,
  );
}

test("data-pipeline draws its stage icons at the themed radius", () => {
  assert.match(_render("data-pipeline", "DataPipeline", { iconRadius: 23 }), /r="23"/);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Add the tokens**

In `componentTokens.ts`, add and spread `DataPipeline: DATA_PIPELINE_TOKENS,`:

```ts
const DATA_PIPELINE_TOKENS = {
  activeTintAlpha: _alpha("Active stage tint", "Opacity of the accent tint on a completed stage."),
  activeStrokeAlpha: _alpha("Active stage outline", "Opacity of the accent outline on a completed stage."),
  activeStrokeWidth: _stroke("Active stage outline width", "Width of the accent outline on a completed stage."),
  iconRadius: _length("Stage icon radius", "Radius of the disc behind a stage's check."),
  iconFillAlpha: _alpha("Stage icon fill", "Opacity of the disc behind a stage's check."),
  iconStrokeAlpha: _alpha("Stage icon rim", "Opacity of the rim of the disc behind a stage's check."),
  iconStrokeWidth: _stroke("Stage icon rim width", "Width of the rim of the disc behind a stage's check."),
  checkSize: _length("Stage check size", "Size of the check on a completed stage."),
  dotRadius: _length("Stage dot radius", "Radius of the dot on a stage that has not finished."),
  trackHeight: _length("Progress track height", "Thickness of the pipeline's progress track."),
  packetPeriod: _duration("Pipeline packet period", "Frames for a packet to cross between two stages."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "DataPipeline": { "defaultProps": { "activeTintAlpha": 0.04, "activeStrokeAlpha": 0.6, "activeStrokeWidth": "$stroke.hairline", "iconRadius": 25, "iconFillAlpha": "$atomic.opacity.8", "iconStrokeAlpha": 0.35, "iconStrokeWidth": "$stroke.hairline", "checkSize": 19, "dotRadius": 5, "trackHeight": 3, "packetPeriod": 64 } },
```

- [ ] **Step 3: Rewrite the preset**

Replace `src/stock/graphics-data/DataPipeline.tsx` with:

```tsx
import { ramp } from "../../motion";
import { Arrive, Check, Eyebrow, GRAPHIC_WIDTH, Packet, Panel, Text, type GraphicProps } from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { StockRect } from "../primitives/StockRect/StockRect";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import type { DataPipelineInput } from "../presets/DataPipeline/DataPipeline.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: DataPipelineInput };
type Stage = DataPipelineInput["stages"][number] & { x: number };

const STAGE_SPACING = 220;
const STAGE_WIDTH = 172;
const STAGE_HEIGHT = 205;
const STAGE_TOP = 206;
const STAGE_CUE = 16;
const ICON_OFFSET_X = 86;
const ICON_Y = 284;
const CONNECTOR_Y = 303;
const PACKET_PHASE_STEP = 17;
const PROGRESS_CUE = 30;
const PROGRESS_FRAMES = 92;
const HEADING_Y = 115;
const TRACK_Y = 464;
const FOOTER_Y = 506;

function PipelineStage({
  stage,
  index,
  frame,
  accent,
  active,
}: {
  stage: Stage;
  index: number;
  frame: number;
  accent: string;
  active: number;
}) {
  const style = useGraphicProps("DataPipeline", {});
  const panel = useGraphicProps("Panel", {});
  const iconX = stage.x + ICON_OFFSET_X;
  return (
    <Arrive frame={frame} index={index} at={STAGE_CUE}>
      <Panel x={stage.x} y={STAGE_TOP} width={STAGE_WIDTH} height={STAGE_HEIGHT}>
        <StockRect
          x={stage.x}
          y={STAGE_TOP}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          rx={panel.radius}
          fill={accent}
          fillOpacity={active * style.activeTintAlpha}
          stroke={accent}
          strokeOpacity={active * style.activeStrokeAlpha}
          strokeWidth={style.activeStrokeWidth}
        />
        <Text role="pill" x={stage.x + 22} y={239}>
          0{index + 1}
        </Text>
        <circle
          cx={iconX}
          cy={ICON_Y}
          r={style.iconRadius}
          fill={accent}
          fillOpacity={style.iconFillAlpha}
          stroke={accent}
          strokeOpacity={style.iconStrokeAlpha}
          strokeWidth={style.iconStrokeWidth}
        />
        <g opacity={active}>
          <Check x={iconX} y={ICON_Y} color={accent} size={style.checkSize} />
        </g>
        <g opacity={1 - active}>
          <circle cx={iconX} cy={ICON_Y} r={style.dotRadius} fill={accent} />
        </g>
        <Text role="cardTitle" x={iconX} y={341} anchor="middle">
          {stage.label}
        </Text>
        <Text role="note" x={iconX} y={371} anchor="middle">
          {stage.detail}
        </Text>
      </Panel>
    </Arrive>
  );
}

/** Draws the bounded authored data-pipeline study at an explicit frame. */
export function DataPipeline({ input, frame, accent }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("DataPipeline", {});
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const margin = tokens.layout.graphic.margin;
  const trackWidth = GRAPHIC_WIDTH - margin * 2;
  const stages = input.stages.map((stage, index) => ({ ...stage, x: margin + index * STAGE_SPACING }));
  const progress = ramp(frame, PROGRESS_CUE, motion.scale(PROGRESS_FRAMES), motion.travel.easing) * stages.length;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].dataPipeline })}
      </Eyebrow>
      <Text role="display" x={margin} y={HEADING_Y}>
        {input.heading}
      </Text>
      {stages.slice(0, -1).map((stage, i) => (
        <g key={stage.label}>
          <path
            d={`M${stage.x + STAGE_WIDTH} ${CONNECTOR_Y} H${stage.x + STAGE_SPACING}`}
            stroke={tokens.color.line}
            strokeWidth={tokens.stroke.default}
          />
          <Packet
            frame={frame}
            from={{ x: stage.x + STAGE_WIDTH, y: CONNECTOR_Y }}
            to={{ x: stage.x + STAGE_SPACING, y: CONNECTOR_Y }}
            period={style.packetPeriod}
            delay={i * PACKET_PHASE_STEP}
            color={accent}
          />
        </g>
      ))}
      {stages.map((stage, i) => (
        <PipelineStage
          key={stage.label}
          stage={stage}
          index={i}
          frame={frame}
          accent={accent}
          active={Math.min(1, Math.max(0, progress - i))}
        />
      ))}
      {input.showProgress ? (
        <>
          <StockRect
            x={margin}
            y={TRACK_Y}
            width={trackWidth}
            height={style.trackHeight}
            rx={style.trackHeight / 2}
            fill={tokens.color.line}
          />
          <StockRect
            x={margin}
            y={TRACK_Y}
            width={trackWidth * Math.min(1, progress / stages.length)}
            height={style.trackHeight}
            rx={style.trackHeight / 2}
            fill={accent}
          />
        </>
      ) : null}
      <Text role="meta" x={margin} y={FOOTER_Y}>
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].input })}
      </Text>
      <Text role="meta" x={margin + trackWidth} y={FOOTER_Y} fill={accent} anchor="end">
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].output })}
      </Text>
    </g>
  );
}
```

In `classic`, `margin` is 64, so stages start at 64, the track spans 64 to 896 (width 832), and the output label sits at 896, all as today.

- [ ] **Step 4: Verify and commit**

Run the Step 1 command. Expected: 1 passing.
Run: `pnpm theme:parity compare data-pipeline shared-object-handoff`. Expected: parity passes.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/graphics-data/DataPipeline.tsx src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx
git commit -m "feat(video-producer): theme the data-pipeline preset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: `predicate-pushdown-boundary`

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/stock/presets/PredicatePushdownBoundary/PredicatePushdownBoundary.tsx`, `PushdownPredicate.tsx`, `PushdownRow.tsx`, `PushdownRows.tsx`
- Test: `src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx`

`PushdownCount` and `PushdownLedger` draw only `LabelSlots`, which already read the data role, so they do not change.

- [ ] **Step 1: Write the failing test**

Append:

```tsx
test("predicate-pushdown-boundary dashes its boundary with the themed pattern", () => {
  assert.match(
    _render("predicate-pushdown-boundary", "PredicatePushdownBoundary", { boundaryDash: [4, 4] }),
    /stroke-dasharray="4 4"/,
  );
});
```

Run the test file. Expected: the new test fails.

- [ ] **Step 2: Add the tokens**

In `componentTokens.ts`, add and spread `PredicatePushdownBoundary: PREDICATE_PUSHDOWN_TOKENS,`:

```ts
const PREDICATE_PUSHDOWN_TOKENS = {
  boundaryWidth: _stroke("Boundary width", "Width of the dashed transfer boundary."),
  boundaryDash: _dash("Boundary dash", "Dash pattern of the transfer boundary, in pixels."),
  predicateRadius: _length("Predicate card radius", "Corner radius of the predicate card."),
  predicateStrokeWidth: _stroke("Predicate card outline width", "Width of the predicate card's accent outline."),
  rowRadius: _length("Row radius", "Corner radius of a data row."),
  rowStrokeWidth: _stroke("Row outline width", "Width of a data row's outline."),
  gateWidth: _stroke("Gate width", "Width of the gate that stops a row at the source."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "PredicatePushdownBoundary": { "defaultProps": { "boundaryWidth": "$stroke.default", "boundaryDash": [5, 7], "predicateRadius": 10, "predicateStrokeWidth": "$stroke.hairline", "rowRadius": 5, "rowStrokeWidth": "$stroke.hairline", "gateWidth": "$atomic.strokeWidth.lg" } },
```

- [ ] **Step 3: Rewrite the four components**

`src/stock/presets/PredicatePushdownBoundary/PredicatePushdownBoundary.tsx`:

```tsx
import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";
import { PushdownLedger } from "./PushdownLedger";
import { PushdownPredicate } from "./PushdownPredicate";
import { PushdownRows } from "./PushdownRows";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };

const INTRO_FRAMES = 12;

/** Source gates filter row copies before they cross a transfer boundary. */
export function PredicatePushdownBoundary({ frame, input, accent }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("PredicatePushdownBoundary", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <g opacity={ramp(frame, 0, motion.scale(INTRO_FRAMES))}>
      <LabelSlots
        labels={[
          [input.copy.context, 48, 28, 864, 14, 1],
          [input.copy.source, 48, 55, 400, 12, 3],
          [input.copy.result, 564, 55, 348, 12, 3],
          [input.labels.source, 48, 188, 348, 12, 3],
          [input.labels.destination, 564, 188, 348, 12, 3],
        ]}
      />
      <PushdownPredicate {...{ frame, input, accent }} />
      <path
        data-boundary="true"
        d="M500 192 V572"
        stroke={color.line}
        strokeWidth={style.boundaryWidth}
        strokeDasharray={style.boundaryDash.join(" ")}
      />
      <PushdownRows {...{ frame, input, accent }} />
      <PushdownLedger {...{ input, frame }} />
    </g>
  );
}
```

`src/stock/presets/PredicatePushdownBoundary/PushdownPredicate.tsx`:

```tsx
import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };

const TRAVEL_CUE = 13;
const TRAVEL_FRAMES = 37;
const CONDITION_CUE = 50;
const CONDITION_FADE_FRAMES = 12;

/** The typed numeric condition arrives at the source before gates close. */
export function PushdownPredicate({ frame, input, accent }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("PredicatePushdownBoundary", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const predicateX = mix(ramp(frame, TRAVEL_CUE, motion.scale(TRAVEL_FRAMES), motion.travel.easing), 300, 64);
  return (
    <g data-predicate="true" data-unit={input.metric.unit} data-x={predicateX}>
      <StockRect
        x={predicateX - 8}
        y={92}
        width={364}
        height={82}
        rx={style.predicateRadius}
        fill={color.elevated}
        stroke={accent}
        strokeWidth={style.predicateStrokeWidth}
      />
      <LabelSlots
        labels={[
          [input.metric.label, predicateX, 109, 346, 12, 2],
          [`${input.predicate.operator} ${input.predicate.threshold}`, predicateX, 139, 160, 12, 3],
          [input.metric.unit, predicateX + 174, 139, 172, 12, 3],
        ]}
      />
      {frame >= CONDITION_CUE ? (
        <g opacity={ramp(frame, CONDITION_CUE, motion.scale(CONDITION_FADE_FRAMES))}>
          <LabelSlots labels={[[input.labels.condition, 516, 109, 396, 12, 2]]} />
        </g>
      ) : undefined}
    </g>
  );
}
```

`src/stock/presets/PredicatePushdownBoundary/PushdownRow.tsx`: replace `import { STOCK } from "../../stockPalette";` with `import { useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";`, and replace the `<StockRect ... />` and the line before `return` with:

```tsx
  const style = useGraphicProps("PredicatePushdownBoundary", {});
  const { color } = useGraphicTokens();
  return (
    <g
      data-source-row={source ? row.id : undefined}
      data-transfer-row={source ? undefined : row.id}
      data-x={x}
      data-y={y}
      data-value={row.value}
      opacity={opacity}
    >
      <StockRect
        x={x - 8}
        y={y - 18}
        width={332}
        height={32}
        rx={style.rowRadius}
        fill={color.surface}
        stroke={source ? color.line : accent}
        strokeWidth={style.rowStrokeWidth}
      />
```

(the `<LiteralDataText>`, `<LabelSlots>`, and closing tags stay).

`src/stock/presets/PredicatePushdownBoundary/PushdownRows.tsx`:

```tsx
import { mix, ramp } from "../../../motion";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";
import { PushdownRow } from "./PushdownRow";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };

const ROWS_CUE = 13;
const ROWS_FADE_FRAMES = 20;
const GATE_CUE = 51;
const GATE_FRAMES = 44;
const TRAVEL_CUE = 96;
const TRAVEL_FRAMES = 28;
const COPY_FADE_FRAMES = 4;
const SETTLE_CUE = 124;
const SETTLE_FRAMES = 15;

/** All originals remain visible while matching copies move as complete rows. */
export function PushdownRows({ frame, input, accent }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("PredicatePushdownBoundary", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const matches = input.rows.filter((row) =>
    input.predicate.operator === ">=" ? row.value >= input.predicate.threshold : row.value <= input.predicate.threshold,
  );
  const travel = ramp(frame, TRAVEL_CUE, motion.scale(TRAVEL_FRAMES), motion.travel.easing);
  const gates = ramp(frame, GATE_CUE, motion.scale(GATE_FRAMES), motion.travel.easing);
  const settle = ramp(frame, SETTLE_CUE, motion.scale(SETTLE_FRAMES), motion.travel.easing);
  return (
    <g opacity={ramp(frame, ROWS_CUE, motion.scale(ROWS_FADE_FRAMES))}>
      {matches.map((row, index) => (
        <PushdownRow
          key={row.id}
          row={row}
          x={mix(travel, 64, 580)}
          y={mix(settle, 246 + input.rows.indexOf(row) * 32, 246 + index * 32)}
          source={false}
          opacity={ramp(frame, TRAVEL_CUE, motion.scale(COPY_FADE_FRAMES))}
          accent={accent}
        />
      ))}
      {input.rows.map((row, index) => (
        <g key={row.id}>
          <PushdownRow row={row} x={64} y={246 + index * 32} source accent={accent} />
          {!matches.includes(row) ? (
            <path
              data-gate={row.id}
              d={`M${438 - 18 * gates} ${228 + index * 32} v32`}
              stroke={color.highlight}
              strokeWidth={style.gateWidth}
            />
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
```

`travel`, `gates`, and `settle` used `EASE.inOut`, which is `classic`'s travel curve; the three default-curve fades keep `ramp`'s default (`EASE.out`).

- [ ] **Step 4: Verify and commit**

Run the test file. Expected: 2 passing. Run `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/presets/PredicatePushdownBoundary/PredicatePushdownBoundary.test.ts`. Expected: passes.
Run: `pnpm theme:parity compare predicate-pushdown-boundary shared-object-handoff spatial-continuation`. Expected: parity passes.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/presets/PredicatePushdownBoundary src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx
git commit -m "feat(video-producer): theme the predicate-pushdown-boundary preset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: `code-focus`

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/stock/graphics-code/CodeWindow.tsx`, `src/stock/graphics-code/CodeFocus.tsx`
- Modify: `src/stock/presets/CodeFocus/CodeFocus.schema.ts`
- Test: `src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx`

- [ ] **Step 1: Write the failing test**

Append:

```tsx
test("code-focus draws its window at the themed radius", () => {
  assert.match(_render("code-focus", "CodeWindow", { radius: 21 }), /rx="21"/);
});
```

Run the test file. Expected: the new test fails.

- [ ] **Step 2: Add the tokens**

In `componentTokens.ts`, add and spread `CodeWindow: CODE_WINDOW_TOKENS, CodeFocus: CODE_FOCUS_TOKENS,`:

```ts
const CODE_WINDOW_TOKENS = {
  radius: _length("Code window radius", "Corner radius of the editor window."),
  dividerWidth: _stroke("Code window divider width", "Width of the line under the window's title bar."),
  dotRadius: _length("Window dot radius", "Radius of the three dots in the title bar."),
  dotAlpha: _alpha("Window dot opacity", "Opacity of the three dots in the title bar."),
} as const;

const CODE_FOCUS_TOKENS = {
  highlightRadius: _length("Line highlight radius", "Corner radius of the highlight behind the focused line."),
  highlightAlpha: _alpha("Line highlight opacity", "Opacity of the highlight behind the focused line."),
  markerWidth: _length("Line marker width", "Width of the accent bar beside the focused line."),
  dividerWidth: _stroke("Footer divider width", "Width of the line above the window's footer."),
  footerDotRadius: _length("Footer dot radius", "Radius of the accent dot in the footer."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "CodeWindow": { "defaultProps": { "radius": 19, "dividerWidth": "$stroke.hairline", "dotRadius": 4.5, "dotAlpha": 0.45 } },
    "CodeFocus": { "defaultProps": { "highlightRadius": 7, "highlightAlpha": 0.065, "markerWidth": 3, "dividerWidth": "$stroke.hairline", "footerDotRadius": 3.5 } },
```

- [ ] **Step 3: Accept colour roles in code tokens**

In `src/stock/presets/CodeFocus/CodeFocus.schema.ts`, replace `import { legacyColorSchema } from "../legacy/legacyColorSchema.constants";` with `import { contentColorSchema } from "../../theme/resolveContentColor/resolveContentColor";`, and replace `color: legacyColorSchema,` with `color: contentColorSchema,`. If the file declares an explicit schema type with `color: z.ZodString` for that field, change it to `color: typeof contentColorSchema`.

- [ ] **Step 4: Rewrite the window and the preset**

Replace `src/stock/graphics-code/CodeWindow.tsx` with:

```tsx
import { Panel, Text } from "../graphics-common";
import { useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import type { ReactNode } from "react";

const DOT_COUNT = 3;
const DOT_SPACING = 20;

/** Shared terminal/editor frame. Exclusive to this directory's preset components. */
export function CodeWindow({ title, children }: { title: string; children: ReactNode }) {
  const style = useGraphicProps("CodeWindow", {});
  const { color } = useGraphicTokens();
  return (
    <Panel x={70} y={111} width={820} height={411} radius={style.radius}>
      <path d="M70 164 H890" stroke={color.line} strokeWidth={style.dividerWidth} />
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <circle
          key={i}
          cx={95 + i * DOT_SPACING}
          cy={138}
          r={style.dotRadius}
          fill={color.inactive}
          fillOpacity={style.dotAlpha}
        />
      ))}
      <Text role="footnote" x={480} y={144} anchor="middle">
        {title}
      </Text>
      {children}
    </Panel>
  );
}
```

Replace `src/stock/graphics-code/CodeFocus.tsx` with:

```tsx
import { ramp } from "../../motion";
import { Eyebrow, GRAPHIC_WIDTH, Pill, Text, type GraphicProps } from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { StockRect } from "../primitives/StockRect/StockRect";
import { STOCK } from "../stockPalette";
import { resolveContentColor } from "../theme/resolveContentColor/resolveContentColor";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import { CodeWindow } from "./CodeWindow";
import type { CodeFocusInput } from "../presets/CodeFocus/CodeFocus.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: CodeFocusInput };

const BADGE_TOP = 44;
const BADGE_WIDTH = 156;
const HIGHLIGHT_CUE = 43;
const HIGHLIGHT_STEP = 38;
const HIGHLIGHT_FRAMES = 13;
const FIRST_LINE_Y = 189;
const LINE_STEP = 46;

/** Draws the bounded authored code-focus study at an explicit frame. */
export function CodeFocus({ input, frame, accent }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("CodeFocus", {});
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const code = tokens.text.graphic.code;
  const line = input.highlight
    .slice(1)
    .reduce(
      (offset, lineIndex, index) =>
        offset +
        ramp(frame, HIGHLIGHT_CUE + index * HIGHLIGHT_STEP, motion.scale(HIGHLIGHT_FRAMES), motion.travel.easing) *
          (lineIndex - input.highlight[index]),
      input.highlight[0],
    );
  const y = FIRST_LINE_Y + line * LINE_STEP;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["code-focus"].codeFocus })}
      </Eyebrow>
      <Pill
        x={GRAPHIC_WIDTH - tokens.layout.graphic.margin - BADGE_WIDTH}
        y={BADGE_TOP}
        width={BADGE_WIDTH}
        text={getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["code-focus"].exampleCode })}
        color={accent}
      />
      <CodeWindow title={input.title}>
        {input.showHighlight ? (
          <>
            <StockRect x={84} y={y - 23} width={792} height={40} rx={style.highlightRadius} fill={accent} fillOpacity={style.highlightAlpha} />
            <StockRect x={84} y={y - 23} width={style.markerWidth} height={40} rx={style.markerWidth / 2} fill={accent} />
          </>
        ) : null}
        {input.lines.map((codeTokens, i) => (
          <g key={i}>
            <Text role="lineNumber" x={111} y={FIRST_LINE_Y + i * LINE_STEP} anchor="end">
              {i + 1}
            </Text>
            <text x={144} y={FIRST_LINE_Y + i * LINE_STEP} fontSize={code.fontSize} fontFamily={code.fontFamily} xmlSpace="preserve">
              {codeTokens.map((token, j) => (
                <tspan
                  key={j}
                  fill={resolveContentColor(token.color === STOCK.mint ? "accent" : token.color, { tokens, accent })}
                >
                  {token.text}
                </tspan>
              ))}
            </text>
          </g>
        ))}
        <path d="M84 478 H876" stroke={tokens.color.line} strokeWidth={style.dividerWidth} />
        <circle cx={107} cy={500} r={style.footerDotRadius} fill={accent} />
        <Text role="pill" x={122} y={505}>
          {input.footer}
        </Text>
      </CodeWindow>
    </g>
  );
}
```

A code token authored in mint keeps meaning "the accent", as today; any other literal stays a deliberate colour, and a `$color.*` role now follows the theme.

- [ ] **Step 5: Verify and commit**

Run the test file. Expected: 3 passing.
Run: `pnpm stock:messages`, then `pnpm theme:parity compare code-focus frame-to-interface`. Expected: parity passes.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/graphics-code src/stock/presets/CodeFocus/CodeFocus.schema.ts src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx
git commit -m "feat(video-producer): theme the code-focus preset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: `schema-mapping`

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/stock/graphics-data/SchemaMapping.tsx`
- Test: `src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx`

- [ ] **Step 1: Write the failing test**

Append:

```tsx
test("schema-mapping draws its match rings at the themed radius", () => {
  assert.match(_render("schema-mapping", "SchemaMapping", { ringRadius: 11 }), /r="11"/);
});
```

Run the test file. Expected: the new test fails.

- [ ] **Step 2: Add the tokens**

In `componentTokens.ts`, add and spread `SchemaMapping: SCHEMA_MAPPING_TOKENS,`:

```ts
const SCHEMA_MAPPING_TOKENS = {
  fieldRadius: _length("Field row radius", "Corner radius of a field row."),
  dividerWidth: _stroke("Panel divider width", "Width of the line under a panel title."),
  dotRadius: _length("Field port radius", "Radius of the dot where a mapping leaves or enters a field."),
  edgeAlpha: _alpha("Mapping opacity", "Opacity of a mapping line between two fields."),
  ringRadius: _length("Match ring radius", "Radius of the ring that confirms a mapping."),
  ringAlpha: _alpha("Match ring opacity", "Opacity of the confirming ring's outline."),
  ringStrokeWidth: _stroke("Match ring width", "Width of the confirming ring's outline."),
  checkSize: _length("Match check size", "Size of the check inside the confirming ring."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "SchemaMapping": { "defaultProps": { "fieldRadius": 8, "dividerWidth": "$stroke.hairline", "dotRadius": 5, "edgeAlpha": "$atomic.opacity.70", "ringRadius": 13, "ringAlpha": 0.6, "ringStrokeWidth": "$stroke.hairline", "checkSize": 10 } },
```

- [ ] **Step 3: Rewrite the preset**

Replace `src/stock/graphics-data/SchemaMapping.tsx` with:

```tsx
import { prop } from "@avandar/utils";
import { ramp } from "../../motion";
import { Arrive, Check, DrawPath, Eyebrow, GRAPHIC_WIDTH, Panel, Text, type GraphicProps } from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { StockRect } from "../primitives/StockRect/StockRect";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import type { SchemaMappingInput } from "../presets/SchemaMapping/SchemaMapping.schema";

type Props = GraphicProps & { input: SchemaMappingInput };

const PANEL_TOP = 133;
const PANEL_WIDTH = 298;
const PANEL_HEIGHT = 373;
const TITLE_INSET = 26;
const TITLE_Y = 177;
const DIVIDER_Y = 202;
const FIRST_ROW_Y = 242;
const ROW_STEP = 68;
const ROW_INSET = 18;
const ROW_WIDTH = 262;
const ROW_HEIGHT = 46;
const FIELD_INSET = 14;
const TYPE_INSET = 16;
const SOURCE_ROW_CUE = 18;
const TARGET_ROW_CUE = 22;
const LINK_CUE = 26;
const LINK_STEP = 13;
const CAPTION_Y = 553;

function SchemaPanel({ x, title, frame, index }: { x: number; title: string; frame: number; index: number }) {
  const style = useGraphicProps("SchemaMapping", {});
  const { color } = useGraphicTokens();
  return (
    <Arrive frame={frame} index={index}>
      <Panel x={x} y={PANEL_TOP} width={PANEL_WIDTH} height={PANEL_HEIGHT}>
        <Text role="panelTitle" x={x + TITLE_INSET} y={TITLE_Y}>
          {title}
        </Text>
        <line x1={x} y1={DIVIDER_Y} x2={x + PANEL_WIDTH} y2={DIVIDER_Y} stroke={color.line} strokeWidth={style.dividerWidth} />
      </Panel>
    </Arrive>
  );
}

type RowProps = {
  label: string;
  target: string;
  type: string;
  index: number;
  frame: number;
  accent: string;
  left: number;
  right: number;
  showChecks: boolean;
};

function MappingRow({ label, target, type, index, frame, accent, left, right, showChecks }: RowProps) {
  const style = useGraphicProps("SchemaMapping", {});
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const y = FIRST_ROW_Y + index * ROW_STEP;
  const color = index % 2 ? tokens.color.accentAlt : accent;
  const from = { x: left + PANEL_WIDTH, y };
  const to = { x: right, y };
  const cue = LINK_CUE + index * LINK_STEP;
  const t = ramp(frame, cue, motion.hero, motion.entrance.easing);
  return (
    <g>
      <Arrive frame={frame} at={SOURCE_ROW_CUE} index={index}>
        <StockRect x={left + ROW_INSET} y={y - 22} width={ROW_WIDTH} height={ROW_HEIGHT} rx={style.fieldRadius} fill={tokens.color.elevated} />
        <Text role="field" x={left + ROW_INSET + FIELD_INSET} y={y + 6}>
          {label}
        </Text>
        <circle cx={from.x} cy={y} r={style.dotRadius} fill={color} />
      </Arrive>
      <DrawPath curve={{ from, to }} frame={frame} at={cue} color={color} opacity={style.edgeAlpha} />
      <g opacity={t}>
        <circle
          cx={GRAPHIC_WIDTH / 2}
          cy={y}
          r={style.ringRadius}
          fill={tokens.color.ground}
          stroke={color}
          strokeOpacity={style.ringAlpha}
          strokeWidth={style.ringStrokeWidth}
        />
        {showChecks ? <Check x={GRAPHIC_WIDTH / 2} y={y} color={color} size={style.checkSize} /> : null}
      </g>
      <Arrive frame={frame} at={TARGET_ROW_CUE} index={index}>
        <StockRect x={right + ROW_INSET} y={y - 22} width={ROW_WIDTH} height={ROW_HEIGHT} rx={style.fieldRadius} fill={tokens.color.elevated} />
        <circle cx={right} cy={y} r={style.dotRadius} fill={color} />
        <Text role="field" x={right + ROW_INSET + FIELD_INSET} y={y + 6}>
          {target}
        </Text>
        <Text role="detail" x={right + ROW_INSET + ROW_WIDTH - TYPE_INSET} y={y + 5} anchor="end">
          {type}
        </Text>
      </Arrive>
    </g>
  );
}

/** Draws the bounded authored schema-mapping study at an explicit frame. */
export function SchemaMapping({ input, frame, accent }: Readonly<Props>) {
  const { layout } = useGraphicTokens();
  const left = layout.graphic.margin;
  const right = GRAPHIC_WIDTH - layout.graphic.margin - PANEL_WIDTH;
  const targets = input.mappings.map(prop("target"));
  const types = input.mappings.map(prop("type"));
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["schema-mapping"].schemaMapping })}
      </Eyebrow>
      <SchemaPanel x={left} title={input.sourceLabel} frame={frame} index={0} />
      <SchemaPanel x={right} title={input.targetLabel} frame={frame} index={1} />
      {input.mappings.map(prop("source")).map((label, i) => (
        <MappingRow
          key={label}
          label={label}
          target={targets[i]}
          type={types[i]}
          index={i}
          frame={frame}
          accent={accent}
          left={left}
          right={right}
          showChecks={input.showChecks}
        />
      ))}
      <Text role="note" x={GRAPHIC_WIDTH / 2} y={CAPTION_Y} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["schema-mapping"].differentNamesExplicitConnections,
        })}
      </Text>
    </g>
  );
}
```

In `classic` the right panel sits at `960 - 64 - 298 = 598`, so every position matches today's. The mapping lines kept `duration={DUR.hero}`, which is the `Edge` draw default, so the prop is gone. The bottom line keeps 15 px at y 553: spec §1.6 only moves three presets to the shared caption.

- [ ] **Step 4: Verify and commit**

Run the test file. Expected: 4 passing.
Run: `pnpm theme:parity compare schema-mapping aperture-detail`. Expected: parity passes.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/graphics-data/SchemaMapping.tsx src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx
git commit -m "feat(video-producer): theme the schema-mapping preset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 21: `query-column-cache-growth`

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: in `src/stock/presets/QueryColumnCacheGrowth/`: `QueryColumnCacheGrowth.tsx`, `getCacheSceneFromFrame.ts`, `CachedRelation.tsx`, `CacheColumn.tsx`, `MissingCacheColumns.tsx`, `CacheRequests.tsx`, `CacheRequestCards.tsx`, `CacheRequestRoutes.tsx`
- Test: `src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx`

`CacheCell` draws only `LiteralDataText` and does not change.

- [ ] **Step 1: Write the failing test**

Append:

```tsx
test("query-column-cache-growth dashes missing columns with the themed pattern", () => {
  assert.match(
    _render("query-column-cache-growth", "QueryColumnCacheGrowth", { missingDash: [6, 2] }),
    /stroke-dasharray="6 2"/,
  );
});
```

Frame 120 falls inside the missing-column window (61 to 138). Run the test file. Expected: the new test fails.

- [ ] **Step 2: Add the tokens**

In `componentTokens.ts`, add and spread `QueryColumnCacheGrowth: QUERY_CACHE_TOKENS,`:

```ts
const QUERY_CACHE_TOKENS = {
  tableRadius: _length("Cache table radius", "Corner radius of the cached relation."),
  tableStrokeWidth: _stroke("Cache table outline width", "Width of the cached relation's outline."),
  gridStrokeWidth: _stroke("Cache grid width", "Width of the row and column lines inside the cached relation."),
  missingDash: _dash("Missing column dash", "Dash pattern of a column the cache does not hold yet."),
  missingStrokeWidth: _stroke("Missing column outline width", "Width of a missing column's dashed outline."),
  cardRadius: _length("Request card radius", "Corner radius of a query request card."),
  cardStrokeWidth: _stroke("Request card outline width", "Width of a request card's outline."),
  checkWidth: _stroke("Covered check width", "Width of the check on a request the cache covers."),
  routeStrokeWidth: _stroke("Request route width", "Width of the routes from a request to its columns."),
  portRadius: _length("Column port radius", "Radius of the ring where a request route meets a column."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "QueryColumnCacheGrowth": { "defaultProps": { "tableRadius": 5, "tableStrokeWidth": "$stroke.default", "gridStrokeWidth": "$stroke.hairline", "missingDash": [5, 3], "missingStrokeWidth": "$stroke.hairline", "cardRadius": 10, "cardStrokeWidth": "$stroke.hairline", "checkWidth": "$atomic.strokeWidth.lg", "routeStrokeWidth": "$stroke.hairline", "portRadius": 5 } },
```

- [ ] **Step 3: Pass motion into the scene function**

In `getCacheSceneFromFrame.ts`:
1. Replace `import { EASE, ramp } from "../../../motion";` with:

```ts
import { ramp } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
```

2. Add below the imports: `const GROWTH_CUE = 106;` and `const GROWTH_FRAMES = 33;`.
3. Replace the signature with:

```ts
export function getCacheSceneFromFrame({
  frame,
  input,
  motion,
}: Readonly<{
  frame: number;
  input: Input;
  motion: Pick<VideoMotion, "scale" | "travel">;
}>): GetCacheSceneFromFrameResult {
```

4. Replace `const growth = ramp(frame, 106, 33, EASE.inOut);` with `const growth = ramp(frame, GROWTH_CUE, motion.scale(GROWTH_FRAMES), motion.travel.easing);`.

In `QueryColumnCacheGrowth.tsx`, add `import { useGraphicMotion } from "../../theme/useGraphicTheme";` and replace `const scene = getCacheSceneFromFrame({ frame, input });` with:

```ts
  const motion = useGraphicMotion();
  const scene = getCacheSceneFromFrame({ frame, input, motion });
```

- [ ] **Step 4: Theme the shapes**

In each file below, replace `import { STOCK } from "../../stockPalette";` with `import { useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";` and add `const style = useGraphicProps("QueryColumnCacheGrowth", {});` and `const { color } = useGraphicTokens();` as the first lines of the component body.

`CachedRelation.tsx`: the table `StockRect` becomes

```tsx
      <StockRect
        data-cache-table="one"
        x={60}
        y={260}
        width={scene.width}
        height={74 + scene.rowCount * 44}
        rx={style.tableRadius}
        fill={color.surface}
        stroke={color.line}
        strokeWidth={style.tableStrokeWidth}
      />
```

and each row strip's `stroke={STOCK.line}` becomes `stroke={color.line}` with `strokeWidth={style.gridStrokeWidth}` added.

`CacheColumn.tsx`: the column line becomes

```tsx
      <path
        d={`M${60 + index * 168} 260 V${334 + rowCount * 44}`}
        stroke={isAdded ? accent : color.line}
        strokeWidth={style.gridStrokeWidth}
      />
```

`MissingCacheColumns.tsx`: the dashed box becomes

```tsx
            <StockRect
              x={60 + index * 168}
              y={191}
              width={158}
              height={60}
              fill="none"
              stroke={color.highlight}
              strokeDasharray={style.missingDash.join(" ")}
              strokeWidth={style.missingStrokeWidth}
            />
```

and the plus mark becomes `<path d={`M${198 + index * 168} 238 h10 m-5 -5 v10`} stroke={color.highlight} strokeWidth={style.missingStrokeWidth} />`. (`MissingCacheColumns` is called once per frame, so `style` is read once.)

`CacheRequestCards.tsx`: the card becomes

```tsx
          <StockRect
            x={60 + index * 440}
            y={54}
            width={400}
            height={124}
            rx={style.cardRadius}
            fill={color.elevated}
            stroke={index === 0 && frame >= 40 ? accent : color.line}
            strokeWidth={style.cardStrokeWidth}
          />
```

and the check's `strokeWidth={3}` becomes `strokeWidth={style.checkWidth}`.

`CacheRequestRoutes.tsx`: also import `useGraphicMotion` from the same module; replace `import { EASE, ramp } from "../../../motion";` with `import { ramp } from "../../../motion";`; add `const motion = useGraphicMotion();`, constants `const ROUTE_CUE = 13;` and `const ROUTE_FRAMES = 27;` above the component; replace `const progress = ramp(frame, 13, 27, EASE.inOut);` with `const progress = ramp(frame, ROUTE_CUE, motion.scale(ROUTE_FRAMES), motion.travel.easing);`; add `strokeWidth={style.routeStrokeWidth}` to the requested route `<path>`; make the port `<circle cx={x} cy={252} r={style.portRadius} fill="none" stroke={accent} strokeWidth={style.routeStrokeWidth} />`; and make the missing route `stroke={color.highlight}` with `strokeWidth={style.routeStrokeWidth}`.

`CacheRequests.tsx`: no `STOCK` import exists. Add `import { useGraphicTokens } from "../../theme/useGraphicTheme";`, `const { text } = useGraphicTokens();` in the body, and make the set notation:

```tsx
        <text
          data-set-notation="true"
          x={60}
          y={32}
          fill={accent}
          fontSize={text.graphic.label.fontSize}
          fontFamily={text.graphic.label.fontFamily}
          fontWeight={text.graphic.label.fontWeight}
        >
```

The notation inherited Arial 400 from the SVG root before; it now states the label role's Arial 400 explicitly. It stays a raw `<text>` because tests read its `data-set-notation` attribute.

- [ ] **Step 5: Verify and commit**

Run the test file. Expected: 5 passing.
Run: `pnpm theme:parity compare query-column-cache-growth spatial-continuation`. Expected: parity passes.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/presets/QueryColumnCacheGrowth src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx
git commit -m "feat(video-producer): theme the query-column-cache-growth preset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: `source-merge`

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/stock/presets/SourceMerge/SourceMerge.schema.ts`
- Modify: `src/stock/graphics-data/SourceMerge.tsx`
- Test: `src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx`

- [ ] **Step 1: Write the failing test**

Append:

```tsx
test("source-merge draws its merge node at the themed radius", () => {
  assert.match(_render("source-merge", "SourceMerge", { mergeRadius: 41 }), /r="41"/);
});
```

Run the test file. Expected: the new test fails.

- [ ] **Step 2: Add the tokens**

In `componentTokens.ts`, add and spread `SourceMerge: SOURCE_MERGE_TOKENS,`:

```ts
const SOURCE_MERGE_TOKENS = {
  edgeAlpha: _alpha("Source edge opacity", "Opacity of an edge from a source to the merge."),
  chipRadius: _length("Source chip radius", "Corner radius of a source's kind chip."),
  chipFillAlpha: _alpha("Source chip fill", "Opacity of a source chip's tint."),
  chipStrokeAlpha: _alpha("Source chip outline", "Opacity of a source chip's outline."),
  chipStrokeWidth: _stroke("Source chip outline width", "Width of a source chip's outline."),
  outEdgeAlpha: _alpha("Output edge opacity", "Opacity of the edge from the merge to the destination."),
  outEdgeWidth: _stroke("Output edge width", "Width of the edge from the merge to the destination."),
  outPacketPeriod: _duration("Output packet period", "Frames for a packet to cross from the merge to the destination."),
  mergeRadius: _length("Merge node radius", "Radius of the merge node."),
  mergeStrokeAlpha: _alpha("Merge node rim opacity", "Opacity of the merge node's accent rim."),
  mergeStrokeWidth: _stroke("Merge node rim width", "Width of the merge node's accent rim."),
  glyphWidth: _stroke("Merge glyph width", "Stroke width of the merge glyph."),
  barHeight: _length("Destination bar height", "Thickness of the accent bar on the destination panel."),
  barAlpha: _alpha("Destination bar opacity", "Opacity of the accent bar on the destination panel."),
  slotRadius: _length("Destination slot radius", "Corner radius of a slot on the destination panel."),
  slotFillAlpha: _alpha("Destination slot fill", "Opacity of a destination slot's tint."),
  slotStrokeAlpha: _alpha("Destination slot line opacity", "Opacity of the line inside a destination slot."),
  slotStrokeWidth: _stroke("Destination slot line width", "Width of the line inside a destination slot."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "SourceMerge": { "defaultProps": { "edgeAlpha": 0.42, "chipRadius": 10, "chipFillAlpha": 0.07, "chipStrokeAlpha": "$atomic.opacity.30", "chipStrokeWidth": "$stroke.hairline", "outEdgeAlpha": 0.5, "outEdgeWidth": "$atomic.strokeWidth.lg", "outPacketPeriod": 60, "mergeRadius": 39, "mergeStrokeAlpha": "$atomic.opacity.65", "mergeStrokeWidth": "$stroke.hairline", "glyphWidth": "$atomic.strokeWidth.md", "barHeight": 6, "barAlpha": 0.8, "slotRadius": 5, "slotFillAlpha": 0.12, "slotStrokeAlpha": 0.6, "slotStrokeWidth": "$stroke.default" } },
```

- [ ] **Step 3: Accept colour roles in source content**

In `src/stock/presets/SourceMerge/SourceMerge.schema.ts`, replace `import { legacyColorSchema } from "../legacy/legacyColorSchema.constants";` with `import { contentColorSchema } from "../../theme/resolveContentColor/resolveContentColor";`, replace `color: legacyColorSchema,` with `color: contentColorSchema,`, and in the explicit type annotation replace `{ name: z.ZodString; kind: z.ZodString; color: z.ZodString },` with `{ name: z.ZodString; kind: z.ZodString; color: typeof contentColorSchema },`.

- [ ] **Step 4: Rewrite the preset**

Replace `src/stock/graphics-data/SourceMerge.tsx` with:

```tsx
import { Arrive, DrawPath, Eyebrow, GRAPHIC_WIDTH, Packet, Panel, Text, type GraphicProps } from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { StockRect } from "../primitives/StockRect/StockRect";
import { resolveContentColor } from "../theme/resolveContentColor/resolveContentColor";
import { useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import type { SourceMergeInput } from "../presets/SourceMerge/SourceMerge.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: SourceMergeInput };
type Source = SourceMergeInput["sources"][number];

const SOURCE_TOP = 148;
const SOURCE_STEP = 132;
const SOURCE_WIDTH = 226;
const SOURCE_HEIGHT = 86;
const SOURCE_EDGE_CUE = 24;
const SOURCE_EDGE_STEP = 3;
const SOURCE_PACKET_STEP = 22;
const MERGE = { x: 508, y: 323 };
const MERGE_INPUT_X = 491;
const OUTPUT = { from: { x: 525, y: 323 }, to: { x: 662, y: 323 } };
const DESTINATION = { y: 233, width: 234, height: 180 };
const MERGE_GLYPH = "M493 314 L508 329 L523 314 M508 300 V329 M508 329 V344";

function SourceRow({ source, index, frame, color, showPackets }: { source: Source; index: number; frame: number; color: string; showPackets: boolean }) {
  const style = useGraphicProps("SourceMerge", {});
  const { layout } = useGraphicTokens();
  const x = layout.graphic.margin;
  const y = SOURCE_TOP + index * SOURCE_STEP;
  const from = { x: x + SOURCE_WIDTH, y: y + 43 };
  const to = { x: MERGE_INPUT_X, y: MERGE.y };
  return (
    <g>
      <DrawPath curve={{ from, to }} frame={frame} at={SOURCE_EDGE_CUE + index * SOURCE_EDGE_STEP} color={color} opacity={style.edgeAlpha} />
      {showPackets ? <Packet frame={frame} from={from} to={to} color={color} delay={index * SOURCE_PACKET_STEP} /> : null}
      <Arrive frame={frame} index={index}>
        <Panel x={x} y={y} width={SOURCE_WIDTH} height={SOURCE_HEIGHT}>
          <StockRect
            x={x + 17}
            y={y + 20}
            width={46}
            height={46}
            rx={style.chipRadius}
            fill={color}
            fillOpacity={style.chipFillAlpha}
            stroke={color}
            strokeOpacity={style.chipStrokeAlpha}
            strokeWidth={style.chipStrokeWidth}
          />
          <Text role="pill" x={x + 40} y={y + 49} fill={color} anchor="middle">
            {source.kind}
          </Text>
          <Text role="itemLabel" x={x + 79} y={y + 49}>
            {source.name}
          </Text>
        </Panel>
      </Arrive>
    </g>
  );
}

function MergeNode({ frame, accent }: { frame: number; accent: string }) {
  const style = useGraphicProps("SourceMerge", {});
  const { color } = useGraphicTokens();
  return (
    <Arrive frame={frame} at={24}>
      <circle
        cx={MERGE.x}
        cy={MERGE.y}
        r={style.mergeRadius}
        fill={color.surface}
        stroke={accent}
        strokeOpacity={style.mergeStrokeAlpha}
        strokeWidth={style.mergeStrokeWidth}
      />
      <path d={MERGE_GLYPH} fill="none" stroke={accent} strokeWidth={style.glyphWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Text role="note" x={MERGE.x} y={394} anchor="middle">
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["source-merge"].merge })}
      </Text>
    </Arrive>
  );
}

function Destination({ input, frame, accent }: { input: SourceMergeInput; frame: number; accent: string }) {
  const style = useGraphicProps("SourceMerge", {});
  const { layout } = useGraphicTokens();
  const x = GRAPHIC_WIDTH - layout.graphic.margin - DESTINATION.width;
  const center = x + DESTINATION.width / 2;
  return (
    <Arrive frame={frame} at={34}>
      <Panel x={x} y={DESTINATION.y} width={DESTINATION.width} height={DESTINATION.height} stroke={accent}>
        <StockRect x={x + 20} y={252} width={194} height={style.barHeight} rx={style.barHeight / 2} fill={accent} fillOpacity={style.barAlpha} />
        <Text role="title" x={center} y={305} anchor="middle">
          {input.destination.label}
        </Text>
        <Text role="secondary" x={center} y={336} anchor="middle">
          {input.destination.detail}
        </Text>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <StockRect x={x + 33 + i * 59} y={361} width={45} height={26} rx={style.slotRadius} fill={accent} fillOpacity={style.slotFillAlpha} />
            <path d={`M${x + 44 + i * 59} 374 h23`} stroke={accent} strokeOpacity={style.slotStrokeAlpha} strokeWidth={style.slotStrokeWidth} />
          </g>
        ))}
      </Panel>
    </Arrive>
  );
}

/** Draws the bounded authored source-merge study at an explicit frame. */
export function SourceMerge({ input, frame, accent }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("SourceMerge", {});
  const tokens = useGraphicTokens();
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["source-merge"].unifyTheInputs })}
      </Eyebrow>
      {input.sources.map((source, i) => (
        <SourceRow
          key={source.name}
          source={source}
          index={i}
          frame={frame}
          color={i === 1 ? accent : resolveContentColor(source.color, { tokens, accent })}
          showPackets={input.showPackets}
        />
      ))}
      <DrawPath d="M525 323 H662" frame={frame} at={40} color={accent} opacity={style.outEdgeAlpha} width={style.outEdgeWidth} />
      {input.showPackets ? (
        <Packet frame={frame} from={OUTPUT.from} to={OUTPUT.to} color={accent} period={style.outPacketPeriod} delay={31} />
      ) : null}
      <MergeNode frame={frame} accent={accent} />
      <Destination input={input} frame={frame} accent={accent} />
      <Text role="pill" x={GRAPHIC_WIDTH - tokens.layout.graphic.margin} y={552} anchor="end">
        {getStockDisplayCopyFromDescriptor({ descriptor: LEGACY_DISPLAY_COPY["source-merge"].conceptualDataFlow })}
      </Text>
    </g>
  );
}
```

In `classic` (margin 64): sources at x 64 with chips at 81 and names at 143, the destination at `960 - 64 - 234 = 662` with its bar at 682, slots at 695 and lines at 706, and the label centre at 779. These are today's coordinates. The element order matches today's: per source the edge, packet, then the panel; then the output edge, its packet, the merge node, the destination, and the footnote.

- [ ] **Step 5: Verify and commit**

Run the test file. Expected: 6 passing.
Run: `pnpm stock:messages`, then `pnpm theme:parity compare source-merge occlusion-wipe`. Expected: parity passes.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/presets/SourceMerge/SourceMerge.schema.ts src/stock/graphics-data/SourceMerge.tsx src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx
git commit -m "feat(video-producer): theme the source-merge preset and accept colour roles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: `decision-fork`

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: in `src/stock/presets/DecisionFork/`: `DecisionFork.tsx`, `DecisionHeading.tsx`, `DecisionBranch.tsx`, `DecisionCondition.tsx`, `DecisionGate.tsx`, `DecisionMarker.tsx`, `DecisionOutcome.tsx`, `ForkLabel/ForkLabel.tsx`
- Test: `src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx`

- [ ] **Step 1: Write the failing test**

Append:

```tsx
test("decision-fork draws its marker at the themed radius", () => {
  assert.match(_render("decision-fork", "DecisionFork", { markerRadius: 15 }), /r="15"/);
});
```

Run the test file. Expected: the new test fails.

- [ ] **Step 2: Add the tokens**

In `componentTokens.ts`, add and spread `DecisionFork: DECISION_FORK_TOKENS,`:

```ts
const DECISION_FORK_TOKENS = {
  selectedWidth: _stroke("Chosen path width", "Width of the accent path along the chosen branch."),
  conditionRadius: _length("Condition box radius", "Corner radius of a branch's condition box."),
  conditionStrokeWidth: _stroke("Condition outline width", "Width of the accent outline on the chosen condition."),
  outcomeRadius: _length("Outcome box radius", "Corner radius of a branch's outcome box."),
  outcomeStrokeWidth: _stroke("Outcome outline width", "Width of an outcome box's outline."),
  gateWidth: _stroke("Gate width", "Width of the cross that closes an untaken branch."),
  gateSpread: _length("Gate spread", "Half the width of the cross that closes an untaken branch."),
  markerRadius: _length("Marker halo radius", "Radius of the halo around the scenario marker."),
  markerAlpha: _alpha("Marker halo opacity", "Opacity of the halo around the scenario marker."),
  markerCoreRadius: _length("Marker radius", "Radius of the scenario marker."),
  lineGap: _length("Label line gap", "Space added between wrapped lines of a decision label."),
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "DecisionFork": { "defaultProps": { "selectedWidth": "$atomic.strokeWidth.lg", "conditionRadius": 10, "conditionStrokeWidth": "$stroke.hairline", "outcomeRadius": 14, "outcomeStrokeWidth": "$stroke.hairline", "gateWidth": "$stroke.default", "gateSpread": 9, "markerRadius": 13, "markerAlpha": 0.12, "markerCoreRadius": 5, "lineGap": 4 } },
```

- [ ] **Step 3: Give `ForkLabel` a type role**

Replace `src/stock/presets/DecisionFork/ForkLabel/ForkLabel.tsx` with:

```tsx
import { Text } from "../../../graphics-common";
import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";
import { useGraphicProps, useGraphicTokens } from "../../../theme/useGraphicTheme";
import type { ReactNode } from "react";

const GRAPHEME_SEGMENTER: Intl.Segmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

type Props = {
  text: string;
  x: number;
  y: number;
  /** The decision type role; `size` overrides its size, for example in width tests. */
  role?: "choice" | "question";
  size?: number;
  width?: number;
  fill?: string;
};

function _append({ lines, text, width, size }: AppendOptions): string[] {
  const candidate = `${lines.at(-1) ?? ""}${text}`;
  return lines.length &&
    getConservativeWidthFromText({
      text: candidate.trimEnd(),
      fontSize: size,
    }) <= width
    ? [...lines.slice(0, -1), candidate]
    : [...lines, text];
}

/** Stable, bounded SVG lines preserve every authored character. */
export function ForkLabel({ text, x, y, role = "choice", size, width = 168, fill }: Readonly<Props>): ReactNode {
  const roleStyle = useGraphicTokens().text.graphic[role];
  const fontSize = size ?? roleStyle.fontSize;
  const { lineGap } = useGraphicProps("DecisionFork", {});
  const tokens = text.match(/\S+\s*|\s+/g) ?? [""];
  const lines = tokens.reduce<string[]>((result, token) => {
    return getConservativeWidthFromText({ text: token.trimEnd(), fontSize }) > width
      ? Array.from(GRAPHEME_SEGMENTER.segment(token)).reduce(
          (chunks, { segment }) => _append({ lines: chunks, text: segment, width, size: fontSize }),
          result,
        )
      : _append({ lines: result, text: token, width, size: fontSize });
  }, []);
  return (
    <g aria-label={text}>
      {lines.map((line, index) => (
        <Text key={index} role={role} x={x} y={y + index * (fontSize + lineGap)} size={fontSize} anchor="middle" fill={fill}>
          {line}
        </Text>
      ))}
    </g>
  );
}
/** Inputs for append. */
type AppendOptions = {
  lines: readonly string[];
  text: string;
  width: number;
  size: number;
};
```

The existing `ForkLabel.test.ts` passes `size` explicitly, so its wrapping assertions are unchanged.

- [ ] **Step 4: Rewrite the decision components**

`DecisionFork.tsx`: replace `import { DUR, ramp } from "../../../motion";` with `import { ramp } from "../../../motion";`, replace `import { DrawPath, STOCK, Text } from "../../graphics-common";` with `import { DrawPath, Text } from "../../graphics-common";` plus `import { useGraphicMotion } from "../../theme/useGraphicTheme";`, add `const motion = useGraphicMotion();` at the top of the body, and replace

```tsx
      <g opacity={ramp(frame, 120, DUR.chip)}>
        <Text x={480} y={557} size={16} anchor="middle" fill={STOCK.muted}>
```

with

```tsx
      <g opacity={ramp(frame, 120, motion.chip)}>
        <Text role="secondary" x={480} y={557} anchor="middle">
```

`DecisionHeading.tsx`: replace `import { Arrive, STOCK, Text } from "../../graphics-common";` with `import { Arrive, Text } from "../../graphics-common";`, and replace the two children with:

```tsx
      <ForkLabel role="question" text={input.prompt} x={480} y={72} width={800} />
      <Text role="secondary" x={480} y={154} anchor="middle">
        {input.scenarioLabel}
      </Text>
```

`DecisionBranch.tsx`: replace `import { DrawPath, STOCK } from "../../graphics-common";` with `import { DrawPath } from "../../graphics-common";` plus `import { useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";`; add `const style = useGraphicProps("DecisionFork", {});` and `const { color } = useGraphicTokens();` at the top of the body; replace `color={STOCK.line}` with `color={color.line}` and the selected path's `width={3}` with `width={style.selectedWidth}`.

`DecisionCondition.tsx`:

```tsx
import { ramp } from "../../../motion";
import { Arrive } from "../../graphics-common";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";
import { ForkLabel } from "./ForkLabel/ForkLabel";
import type { Props as BranchProps } from "./DecisionBranch";
import type { ReactNode } from "react";

type Props = Pick<BranchProps, "branch" | "x" | "frame" | "index" | "accent" | "isSelected">;

const SELECTION_CUE = 46;

/**
 * Branch conditions remain readable while the selected condition gains focus.
 */
export function DecisionCondition({ branch, x, frame, index, accent, isSelected }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("DecisionFork", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const selected = isSelected ? ramp(frame, SELECTION_CUE, motion.sheet) : 0;
  return (
    <Arrive frame={frame} at={20} index={index}>
      <StockRect x={x - 96} y={302} width={192} height={72} rx={style.conditionRadius} fill={color.ground} />
      <ForkLabel text={branch.condition} x={x} y={321} />
      <StockRect
        x={x - 96}
        y={302}
        width={192}
        height={72}
        rx={style.conditionRadius}
        fill="none"
        stroke={accent}
        strokeOpacity={selected}
        strokeWidth={style.conditionStrokeWidth}
      />
    </Arrive>
  );
}
```

`DecisionGate.tsx`:

```tsx
import { mix, ramp } from "../../../motion";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";
import type { Props as BranchProps } from "./DecisionBranch";
import type { ReactNode } from "react";

type Props = Pick<BranchProps, "branch" | "x" | "frame" | "isSelected">;

const CLOSE_CUE = 60;

/** Untaken alternatives close gently before the marker leaves the junction. */
export function DecisionGate({ branch, x, frame, isSelected }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("DecisionFork", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const closed = isSelected ? 0 : ramp(frame, CLOSE_CUE, motion.sheet);
  const spread = mix(closed, 0, style.gateSpread);
  return (
    <g opacity={closed} stroke={color.inactive} strokeWidth={style.gateWidth} data-closed-gate={branch.id}>
      <path d={`M${x - spread} 382 L${x + spread} 400 M${x + spread} 382 L${x - spread} 400`} />
    </g>
  );
}
```

`DecisionMarker.tsx`:

```tsx
import { mix, ramp } from "../../../motion";
import { cubicPoint } from "../../graphics-common";
import { useGraphicMotion, useGraphicProps } from "../../theme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { frame: number; x: number; accent: string; branchId: string };

const DEPART_CUE = 74;
const DEPART_FRAMES = 40;
const DROP_CUE = 18;
const DROP_FRAMES = 18;
const APPEAR_CUE = 12;
const APPEAR_FRAMES = 6;

/** The single scenario marker pauses at the junction then takes one branch. */
export function DecisionMarker({ frame, x, accent, branchId }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("DecisionFork", {});
  const motion = useGraphicMotion();
  const progress = ramp(frame, DEPART_CUE, motion.scale(DEPART_FRAMES), motion.travel.easing);
  const point = cubicPoint({ x: 480, y: 235 }, { x: 480, y: 280 }, { x, y: 280 }, { x, y: 408 }, progress);
  const markerY =
    frame < DEPART_CUE
      ? mix(ramp(frame, DROP_CUE, motion.scale(DROP_FRAMES), motion.travel.easing), 174, 235)
      : point.y;
  return (
    <g data-marker-branch={branchId} opacity={ramp(frame, APPEAR_CUE, motion.scale(APPEAR_FRAMES))}>
      <circle cx={point.x} cy={markerY} r={style.markerRadius} fill={accent} fillOpacity={style.markerAlpha} />
      <circle cx={point.x} cy={markerY} r={style.markerCoreRadius} fill={accent} />
    </g>
  );
}
```

`DecisionOutcome.tsx`:

```tsx
import { ramp } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicMotion, useGraphicProps, useGraphicTokens } from "../../theme/useGraphicTheme";
import { ForkLabel } from "./ForkLabel/ForkLabel";
import type { Props as BranchProps } from "./DecisionBranch";
import type { ReactNode } from "react";

type Props = Pick<BranchProps, "branch" | "x" | "frame" | "accent" | "isSelected" | "showUnchosenOutcomes">;

const SELECTION_CUE = 46;
const HOLD_CUE = 114;

/**
 * The chosen outcome opens into the hold while alternatives may stay subdued.
 */
export function DecisionOutcome({ branch, x, frame, accent, isSelected, showUnchosenOutcomes }: Readonly<Props>): ReactNode {
  const style = useGraphicProps("DecisionFork", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const selected = isSelected ? ramp(frame, SELECTION_CUE, motion.sheet) : 0;
  const opacity = isSelected ? ramp(frame, HOLD_CUE, motion.chip) : 1;
  if (!isSelected && !showUnchosenOutcomes) {
    return null;
  }
  return (
    <g opacity={opacity}>
      <StockRect
        x={x - 104}
        y={424}
        width={208}
        height={94}
        rx={style.outcomeRadius}
        fill={color.surface}
        stroke={color.line}
        strokeWidth={style.outcomeStrokeWidth}
      />
      <StockRect
        x={x - 104}
        y={424}
        width={208}
        height={94}
        rx={style.outcomeRadius}
        fill="none"
        stroke={accent}
        strokeOpacity={selected}
        strokeWidth={style.outcomeStrokeWidth}
      />
      <ForkLabel text={branch.outcome} x={x} y={449} width={184} />
    </g>
  );
}
```

The hooks now run before the early `return null`, as React requires.

- [ ] **Step 5: Verify and commit**

Run the test file. Expected: 7 passing.
Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/presets/DecisionFork/DecisionFork.test.ts src/stock/presets/DecisionFork/ForkLabel/ForkLabel.test.ts`. Expected: passes.
Run: `pnpm theme:parity compare decision-fork occlusion-wipe`. Expected: parity passes.

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/stock/presets/DecisionFork src/stock/__tests__/nested-presets-follow-the-theme.integration.test.tsx
git commit -m "feat(video-producer): theme the decision-fork preset" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 24: Continuity colours and sketch come from the theme

This task moves every authored continuity colour into `classic` (spec §1.7), removes the colour and roughness fields from the continuity scene, switches every reader to tokens, and adds the legacy bridge so today's gallery controls and exports keep working. It is one task because the schema change and its readers must land together.

**Files:**
- Modify: `themes/classic.theme.json` (`overrides`)
- Modify: the 23 continuity storyboards under `storyboards/explainers/` (one line each)
- Modify: `src/continuity/continuitySchema.ts`, `src/continuity/continuitySchema.test.ts`
- Modify: `src/continuity/ContinuityAppearanceContext.tsx`, `src/continuity/continuityAppearance.ts`, `src/continuity/continuityAppearance.test.ts`
- Modify: `src/continuity/ContinuityScene.tsx`, `ContinuityScene.module.css`, `ContinuityToken.tsx`, `ContinuityBoxOutline.tsx`, `ContinuityThesis.tsx`, `ContinuityAnnotation.tsx`, `ContinuityDiagramLane.tsx`, `camera/ContinuityGraphicObjects.tsx`
- Modify: `src/showcase/LivePlayer.tsx`, `scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts`
- Test: `src/videoTheme/builtInVideoThemes/builtInVideoThemes.test.ts`

- [ ] **Step 1: Write the failing migration tests**

Append to `src/videoTheme/builtInVideoThemes/builtInVideoThemes.test.ts` (add `import { CONTINUITY_CATALOG, isSceneEntry } from "../../continuity/continuityCatalog";` and `import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";`):

```ts
/** Each continuity plan's accent before it moved into classic's overrides. */
const AUTHORED_ACCENTS = {
  "qetl-motion": "mint",
  "qetl-to-product": "cyan",
  "product-to-qetl": "orange",
  "qetl-composite": "mint",
  "ontology-motion": "cyan",
  "ontology-to-product": "orange",
  "product-to-ontology": "mint",
  "ontology-composite": "cyan",
  "plugin-ecosystem": "orange",
  "right-sized-data": "mint",
  "shared-object-handoff": "mint",
  "frame-to-interface": "cyan",
  "aperture-detail": "cyan",
  "spatial-continuation": "mint",
  "occlusion-wipe": "orange",
  "graphic-match": "cyan",
  "causal-signal": "cyan",
  "field-grouping": "cyan",
  "focus-handoff": "cyan",
  "teaching-underline": "mint",
  "model-to-workspace": "orange",
  "record-to-relationships": "mint",
  "controls-and-meaning": "cyan",
} as const;

test("every continuity composition keeps its authored accent through classic's overrides", () => {
  for (const [id, swatch] of Object.entries(AUTHORED_ACCENTS)) {
    const theme = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", { overrideIds: [id] });
    assert.equal(theme.semantic.color.accent, STOCK[swatch], id);
  }
});

test("every continuity entry in the Atlas has a classic override", () => {
  assert.deepEqual(
    CONTINUITY_CATALOG.filter((entry) => !isSceneEntry(entry)).map((entry) => entry.id).sort(),
    Object.keys(AUTHORED_ACCENTS).sort(),
  );
});
```

Append to `src/continuity/continuitySchema.test.ts`:

```ts
test("a plan that still authors an accent is pointed at the theme", async () => {
  const plan = JSON.parse(
    await fs.readFile(new URL("../../storyboards/explainers/study-occlusion-wipe.json", import.meta.url), "utf8"),
  );
  const props = { ...plan.shots[0].props, accent: "#f0ba83" };
  const result = continuitySchema.safeParse(props);
  assert.equal(result.success, false);
  assert.match(result.error?.issues[0]?.message ?? "", /theme/);
});
```

(Add `import fs from "node:fs/promises";` and `import { continuitySchema } from "./continuitySchema";` if the file lacks them.)

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/builtInVideoThemes/builtInVideoThemes.test.ts src/continuity/continuitySchema.test.ts`
Expected: the accent test fails (classic has no overrides yet) and the schema test fails (the schema still accepts `accent`).

- [ ] **Step 2: Move the authored accents into `classic`**

In `themes/classic.theme.json`, replace `"overrides": {}` with:

```json
  "overrides": {
    "qetl-motion": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.mint" } } } } },
    "qetl-to-product": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.cyan" } } } } },
    "product-to-qetl": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.orange" } } } } },
    "qetl-composite": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.mint" } } } } },
    "ontology-motion": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.cyan" } } } } },
    "ontology-to-product": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.orange" } } } } },
    "product-to-ontology": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.mint" } } } } },
    "ontology-composite": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.cyan" } } } } },
    "plugin-ecosystem": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.orange" } } } } },
    "right-sized-data": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.mint" } } } } },
    "shared-object-handoff": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.mint" } } } } },
    "frame-to-interface": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.cyan" } } } } },
    "aperture-detail": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.cyan" } } } } },
    "spatial-continuation": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.mint" } } } } },
    "occlusion-wipe": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.orange" } } } } },
    "graphic-match": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.cyan" } } } } },
    "causal-signal": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.cyan" } } } } },
    "field-grouping": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.cyan" } } } } },
    "focus-handoff": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.cyan" } } } } },
    "teaching-underline": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.mint" } } } } },
    "model-to-workspace": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.orange" } } } } },
    "record-to-relationships": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.mint" } } } } },
    "controls-and-meaning": { "other": { "video": { "semantic": { "color": { "accent": "$atomic.swatch.cyan" } } } } }
  }
```

No plan authored a background, so none needs an override: they all used today's default ground, `#0b1219`, which is `classic`'s.

- [ ] **Step 3: Remove the fields from the storyboards and the schema**

Run:

```bash
perl -ni -e 'print unless /^\s{8}"accent": "#[0-9a-fA-F]{6}",$/' storyboards/explainers/film-*.json storyboards/explainers/study-*.json
grep -c '"accent"' storyboards/explainers/*.json | grep -v ':0$'
```

Expected: the `grep` prints nothing.

In `src/continuity/continuitySchema.ts`, add above `continuitySchema`:

```ts
/** Why a continuity plan can no longer set its own palette or sketch. */
const THEMED_FIELD_MESSAGE =
  "Colours and sketch roughness come from the video theme. Set them in the theme's overrides for this composition (themes/<theme>.theme.json, overrides.<composition id>).";
```

and replace

```ts
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#0b1219"),
```

with

```ts
    accent: z.never({ error: THEMED_FIELD_MESSAGE }).optional(),
    background: z.never({ error: THEMED_FIELD_MESSAGE }).optional(),
```

and replace

```ts
    annotationRoughness: z.number().min(0).max(3).default(1.5),
    boxRoughness: z.number().min(0).max(3).default(0),
```

with

```ts
    annotationRoughness: z.never({ error: THEMED_FIELD_MESSAGE }).optional(),
    boxRoughness: z.never({ error: THEMED_FIELD_MESSAGE }).optional(),
```

- [ ] **Step 4: Keep only render options in the appearance context**

Replace `src/continuity/ContinuityAppearanceContext.tsx` with:

```tsx
import { createContext, useContext } from "react";
import type { ContinuityPlan } from "./continuitySchema";

/**
 * The render switches a continuity film was played with: camera travel,
 * motion blur, and annotations. Colours and sketch come from the video
 * theme instead.
 */
export type ContinuityAppearance = Pick<ContinuityPlan, "cameraMotion" | "motionBlur" | "annotations">;

/** Shared render switches for camera, notation and editorial layers. */
export const ContinuityAppearanceContext = createContext<ContinuityAppearance>({
  cameraMotion: true,
  motionBlur: true,
  annotations: true,
});

/** Read the current film's live/export render switches. */
export function useContinuityAppearance() {
  return useContext(ContinuityAppearanceContext);
}
```

In `src/continuity/continuityAppearance.ts`, replace `  const { captions: _captions, cameraPreset, ...appearance } = options;` with:

```ts
  // Palette and roughness reach the renderer through the theme (see
  // createThemePatchFromLegacyAppearance), never through shot props.
  const {
    captions: _captions,
    cameraPreset,
    accent: _accent,
    background: _background,
    annotationRoughness: _annotationRoughness,
    boxRoughness: _boxRoughness,
    ...appearance
  } = options;
```

- [ ] **Step 5: Read colour and sketch from tokens in the continuity renderer**

`src/continuity/ContinuityScene.tsx`:
1. Delete the imports of `TYPE`, `getEditorialInk`, and `CSSProperties`; replace the `ContinuityAppearanceContext, getEditorialInk` import with `import { ContinuityAppearanceContext } from "./ContinuityAppearanceContext";`; add:

```ts
import { buildColorWithAlpha } from "../videoTheme/cssValues/cssValues";
import { useVideoProps, useVideoTokens } from "../videoTheme/useVideoTheme/useVideoTheme";
```

2. After `const translate = useContinuityCopy();` add:

```ts
  const { color } = useVideoTokens();
  const bar = useVideoProps("ProgressBar", {});
```

3. Replace the stage `<div className={css.continuityStage} style={...}>` opening with `<div className={css.continuityStage}>`.
4. Replace `accent={plan.accent}` with `accent={color.accent}`.
5. Replace the progress bar's style with:

```tsx
          style={{
            width: `${Math.min(1, frame / (duration - 1)) * 100}%`,
            height: bar.height,
            background: buildColorWithAlpha(bar.paint.color, bar.paint.alpha),
          }}
```

6. Update the docstring to: `/** Overlap-aware sequence of motions, product demonstrations and explanatory composites, drawn in the surrounding video theme. */`

`src/continuity/ContinuityScene.module.css`:
- `.continuityStage`: `background: var(--video-color-ground-fill);`, `color: var(--video-color-text);`, `font-family: var(--video-text-stage-heading-font-family);`
- `.continuityBeat`: `background: var(--video-color-ground-fill);`
- `.continuityHeading p`: `color: var(--video-text-stage-subtitle-color);`
- `.continuityEvidence`: `color: var(--video-text-stage-evidence-color);`
- `.continuityEvidence span`: `background: var(--video-color-ground);`
- `.continuityEmphasis`: `color: var(--video-text-stage-thesis-emphasis-color);`
- `.continuityProgress`: delete `height: 3px;` (the bar now sets its themed height inline).

`src/continuity/ContinuityToken.tsx`: add `import { useVideoTokens } from "../videoTheme/useVideoTheme/useVideoTheme";`, add `const tokens = useVideoTokens();` and `const isSketched = tokens.sketch.box.roughness > 0;` after `const translate = useContinuityCopy();`, and replace the three style lines with:

```tsx
        color: tokens.text.stage.sharedObject.color,
        borderColor: isSketched ? "transparent" : undefined,
        borderRadius: isSketched ? 0 : undefined,
```

`src/continuity/ContinuityBoxOutline.tsx`:

```tsx
import { Box } from "@remotion/rough-notation";
import { useVideoTokens } from "../videoTheme/useVideoTheme/useVideoTheme";
import css from "./ContinuityOverlays.module.css";

/** A stationary sketch border for the enclosing editorial card or token, in the theme's box sketch profile. */
export function ContinuityBoxOutline() {
  const { sketch, stroke } = useVideoTokens();
  const profile = sketch.box;
  if (profile.roughness === 0) return null;
  return (
    <div className={css.boxOutline}>
      <Box
        progress={1}
        roughness={profile.roughness}
        seed={profile.seed}
        padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        strokeWidth={stroke.default}
        style={{ width: "100%", height: "100%" }}
      >
        <div className={css.boxOutlineSize} />
      </Box>
    </div>
  );
}
```

`src/continuity/ContinuityThesis.tsx`: add `import { useVideoTokens } from "../videoTheme/useVideoTheme/useVideoTheme";`, replace `const { annotations, annotationRoughness } = useContinuityAppearance();` with `const { annotations } = useContinuityAppearance();` and `const { sketch } = useVideoTokens();`, and replace `roughness={annotationRoughness}` with `roughness={sketch.annotation.roughness}`.

`src/continuity/ContinuityAnnotation.tsx`: add the same import, add `const { sketch } = useVideoTokens();` after `const appearance = useContinuityAppearance();`, and replace `roughness={appearance.annotationRoughness}` with `roughness={sketch.annotation.roughness}`.

`src/continuity/ContinuityDiagramLane.tsx`:
1. Replace the `useContinuityAppearance, getEditorialInk` import with `import { useContinuityAppearance } from "./ContinuityAppearanceContext";` and add `import { useVideoTokens } from "../videoTheme/useVideoTheme/useVideoTheme";`.
2. Change `type DiagramProps = Props & { diagram: Content["diagrams"][number] };` to `type DiagramProps = Omit<Props, "accent"> & { diagram: Content["diagrams"][number] };` and the `FloatingDiagram` signature to `function FloatingDiagram({ content, diagram, frame }: DiagramProps)`.
3. In `FloatingDiagram`, add `const tokens = useVideoTokens();` and `const isSketched = tokens.sketch.box.roughness > 0;`; make the overlay style `{ color: tokens.color.text, filter: "drop-shadow(0 16px 22px #06101455)" }` (Task 26 moves the filter to its token); make the label style `{ background: tokens.color.ground, borderColor: isSketched ? "transparent" : undefined, borderRadius: isSketched ? 0 : undefined }`; and delete the `accent={accent}` and `boxRoughness={appearance.boxRoughness}` props from `<StockGraphic>`.
4. In `ContinuityDiagramLane`, delete `accent={appearance.accent}` from `<FloatingDiagram>`. If `appearance` is then unused in `ContinuityDiagramLane`, delete its `useContinuityAppearance()` line.

`src/continuity/camera/ContinuityGraphicObjects.tsx`: replace

```ts
  const { accent, background, cameraMotion, boxRoughness } =
    useContinuityAppearance();
```

with `const { cameraMotion } = useContinuityAppearance();`, and delete `accent,`, `background,`, and `boxRoughness,` from `props`. The nested stock graphic now inherits the composition's theme and adds its preset override.

- [ ] **Step 6: Bridge the gallery's controls through the theme**

`src/showcase/LivePlayer.tsx`:
1. Add `useMemo` to the `react` import and add:

```ts
import { createThemePatchFromLegacyAppearance } from "../videoTheme/themePatches/themePatches";
import {
  addPatchesToVideoThemeSnapshot,
  CLASSIC_VIDEO_THEME_SNAPSHOT,
} from "../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
```

2. Replace the initial appearance's object (the `continuity?.scene === "continuity" ? { accent: ..., boxRoughness: ... } : {}` argument) with:

```ts
      continuity?.scene === "continuity"
        ? {
            cameraMotion: continuity.props.cameraMotion,
            motionBlur: continuity.props.motionBlur,
            annotations: continuity.props.annotations,
          }
        : {},
```

3. After `previewFrames`, add:

```ts
  // The gallery's palette and roughness controls apply as the last theme patch.
  const theme = useMemo(
    () =>
      addPatchesToVideoThemeSnapshot(
        film.theme ?? CLASSIC_VIDEO_THEME_SNAPSHOT,
        continuity ? [createThemePatchFromLegacyAppearance(appearance)] : [],
      ),
    [film.theme, continuity, appearance],
  );
```

4. In the `Player`'s `film` input, add `theme,` after `showCaptions: captions,`.

`scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts`:
1. Add imports:

```ts
import { createThemePatchFromLegacyAppearance } from "../../../src/videoTheme/themePatches/themePatches";
import { addPatchesToVideoThemeSnapshot } from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { VideoThemePatch } from "../../../src/videoTheme/videoTheme.types";
```

2. Add above `_loadFilm`:

```ts
/** The gallery's palette and roughness controls for a continuity film, as theme patches. */
function _legacyThemePatches(options: z.infer<typeof optionsSchema>): VideoThemePatch[] {
  const { accent, background, annotationRoughness, boxRoughness } = options;
  const legacy = { accent, background, annotationRoughness, boxRoughness };
  return Object.values(legacy).some((value) => value !== undefined)
    ? [createThemePatchFromLegacyAppearance(legacy)]
    : [];
}
```

3. Replace the `theme: await loadVideoThemeSnapshot(options.theme ?? { id: "classic" }),` line from Task 5 with:

```ts
    theme: addPatchesToVideoThemeSnapshot(
      await loadVideoThemeSnapshot(options.theme ?? { id: "classic" }),
      continuity ? _legacyThemePatches(options) : [],
    ),
```

Stock films keep `accent` and `background` in their request, where `StockGraphic` applies them, so they get no legacy patch.

- [ ] **Step 7: Update the appearance tests**

In `src/continuity/continuityAppearance.test.ts`, replace the first test with:

```ts
test("appearance copies render options without mutating product beats or timing", () => {
  const plan = _readFirstPlan();
  const before = structuredClone(plan);
  const options = { cameraMotion: false };
  const copy = createContinuityPlanFromOptions(plan, options);
  assert.deepEqual(plan, before);
  assert.deepEqual(copy.narration, plan.narration);
  copy.shots.forEach((shot, index) => {
    const original = plan.shots[index];
    if (shot.scene !== "continuity") return assert.equal(shot, original);
    assert.equal(shot.props.cameraMotion, false);
    if (original.scene === "continuity") assert.equal(shot.props.beats, original.props.beats);
  });
});

test("palette and roughness never reach shot props", () => {
  const copy = createContinuityPlanFromOptions(_readFirstPlan(), { accent: "#123456", boxRoughness: 3 });
  const shot = copy.shots.find((candidate) => candidate.scene === "continuity");
  assert.equal(shot?.scene === "continuity" && "accent" in shot.props, false);
  assert.equal(shot?.scene === "continuity" && "boxRoughness" in shot.props, false);
});
```

replace the third test with:

```ts
test("omitted appearance values preserve authored flags", () => {
  const authored = createContinuityPlanFromOptions(_readFirstPlan(), {
    cameraMotion: false,
    motionBlur: false,
    annotations: false,
  });
  assert.deepEqual(createContinuityPlanFromOptions(authored, {}), authored);
  const shot = authored.shots.find((candidate) => candidate.scene === "continuity");
  assert.equal(shot?.scene === "continuity" && shot.props.annotations, false);
  assert.equal(shot?.scene === "continuity" && shot.props.motionBlur, false);
  assert.equal(shot?.scene === "continuity" && shot.props.cameraMotion, false);
});
```

and add above the first test:

```ts
function _readFirstPlan() {
  return storyboardSchema.parse(
    JSON.parse(
      fs.readFileSync(new URL(`../../storyboards/${CONTINUITY_CATALOG[0].path}.json`, import.meta.url), "utf8"),
    ),
  );
}
```

The roughness range tests stay: the gallery still sends those values, and the appearance schema still validates them.

- [ ] **Step 8: Verify and commit**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/builtInVideoThemes/builtInVideoThemes.test.ts src/continuity/continuitySchema.test.ts src/continuity/continuityAppearance.test.ts src/continuity/camera/stockTransparency.test.ts`
Expected: all pass.
Run both typecheck commands. Expected: no errors. Fix any remaining reader of `plan.accent`, `plan.background`, `annotationRoughness`, or `boxRoughness` in `src/` the same way (`grep -rn "\.accent\b\|\.background\b\|Roughness" src/continuity src/showcase`).
Run: `pnpm theme:parity compare shared-object-handoff frame-to-interface aperture-detail spatial-continuation occlusion-wipe`. Expected: parity passes.

```bash
git add themes/classic.theme.json storyboards/explainers src/continuity src/showcase/LivePlayer.tsx scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts src/videoTheme/builtInVideoThemes/builtInVideoThemes.test.ts
git commit -m "feat(video-producer)!: move continuity colours and sketch into the video theme" -m "BREAKING CHANGE: continuity scenes no longer accept accent, background, annotationRoughness, or boxRoughness. Set them in a theme's overrides." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 25: Stage layout and stage components

**Files:**
- Create: `src/videoTheme/useVideoMotion/useVideoMotion.ts`
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/continuity/ContinuityScene.module.css`, `src/continuity/ContinuityBeatView.tsx`, `src/continuity/ContinuityToken.tsx`
- Test: `src/continuity/__tests__/stage-styles-read-emitted-theme-variables.integration.test.ts`

- [ ] **Step 1: Write the variable guard**

`src/continuity/__tests__/stage-styles-read-emitted-theme-variables.integration.test.ts`:

```ts
/*
 * The continuity CSS modules read only `--video-*` variables the theme
 * actually emits, so a typo or a renamed token cannot silently fall back to
 * the browser default.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { buildVideoCssVariables } from "../../videoTheme/buildVideoCssVariables/buildVideoCssVariables";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../../videoTheme/resolveVideoTheme/resolveVideoTheme";

const STYLE_FILES = ["../ContinuityScene.module.css", "../ContinuityOverlays.module.css"];

test("every required theme variable in the stage styles is emitted by every built-in theme", async () => {
  const css = (
    await Promise.all(STYLE_FILES.map((file) => fs.readFile(new URL(file, import.meta.url), "utf8")))
  ).join("\n");
  const required = new Set([...css.matchAll(/var\((--video-[a-z0-9-]+)\)/g)].map((match) => match[1]));
  for (const themeId of BUILT_IN_VIDEO_THEMES.keys()) {
    const emitted = buildVideoCssVariables(resolveVideoTheme(BUILT_IN_VIDEO_THEMES, themeId));
    assert.deepEqual([...required].filter((name) => !(name in emitted)), [], themeId);
  }
});
```

A variable written with a fallback, such as `var(--video-text-stage-heading-text-shadow, none)`, is optional and not checked.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/continuity/__tests__/stage-styles-read-emitted-theme-variables.integration.test.ts`
Expected: passes for Task 24's variables. It guards every variable this task and the next add.

- [ ] **Step 2: Add the stage component tokens**

In `componentTokens.ts`, add and spread `...STAGE_TOKENS,` into `COMPONENT_TOKENS`:

```ts
const STAGE_TOKENS = {
  Heading: {
    entranceDuration: _duration("Heading entrance duration", "How long a beat heading takes to arrive.", "stage"),
    entranceEasing: _easing("Heading entrance curve", "The curve of a beat heading arriving.", "stage"),
    entranceDistance: _length("Heading rise", "How far a beat heading rises as it arrives.", "stage"),
  },
  Subtitle: {
    gap: _length("Subtitle gap", "Space between a beat heading and its subtitle.", "stage"),
  },
  SharedObject: {
    borderWidth: _stroke("Shared object border", "Border width of an object that travels between motions.", "stage"),
    fill: _color("Shared object fill", "Fill of an object that travels between motions.", "stage"),
    fadeIn: _duration("Shared object fade-in", "How long a shared object takes to appear.", "stage"),
    outlineFade: _duration("Outline fade", "How long an outline-only shared object takes to fade after it lands.", "stage"),
  },
  EvidenceChip: {
    padding: token({
      kind: "box",
      surface: "stage",
      label: "Evidence chip padding",
      description: "Space inside an evidence chip: x on the sides and y above and below.",
    }),
  },
  ProductFrame: {
    backdrop: _color("Reenactment backdrop", "The backdrop drawn around a reenactment on the stage.", "stage"),
  },
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "Heading": { "defaultProps": { "entranceDuration": "$motion.hero", "entranceEasing": "$atomic.easing.out", "entranceDistance": "$atomic.distance.sm" } },
    "Subtitle": { "defaultProps": { "gap": 18 } },
    "SharedObject": { "defaultProps": { "borderWidth": "$stroke.default", "fill": "$color.surface", "fadeIn": "$motion.hero", "outlineFade": 20 } },
    "EvidenceChip": { "defaultProps": { "padding": { "x": 12, "y": 7 } } },
    "ProductFrame": { "defaultProps": { "backdrop": "$color.productBackdrop" } },
```

- [ ] **Step 3: Add the stage motion hook**

`src/videoTheme/useVideoMotion/useVideoMotion.ts`:

```ts
import { useMemo } from "react";
import { createVideoMotion, type VideoMotion } from "../createVideoMotion/createVideoMotion";
import { useVideoTokens } from "../useVideoTheme/useVideoTheme";

/**
 * Tempo-scaled motion for stage components inside a video theme provider,
 * for example a beat heading's entrance. See `VideoMotion`.
 */
export function useVideoMotion(): VideoMotion {
  const { motion } = useVideoTokens();
  return useMemo(() => createVideoMotion(motion), [motion]);
}
```

- [ ] **Step 4: Read layout and type from variables**

In `src/continuity/ContinuityScene.module.css`, replace these rules:

```css
.continuityHeading {
  left: var(--video-layout-stage-heading-inset-x);
  position: absolute;
  right: var(--video-layout-stage-heading-inset-x);
  top: var(--video-layout-stage-heading-inset-top);
}

.continuityHeading h1 {
  color: var(--video-text-stage-heading-color);
  font-family: var(--video-text-stage-heading-font-family);
  font-size: var(--video-text-stage-heading-font-size);
  font-weight: var(--video-text-stage-heading-font-weight);
  letter-spacing: var(--video-text-stage-heading-letter-spacing);
  line-height: var(--video-text-stage-heading-line-height);
  margin: 0;
  text-shadow: var(--video-text-stage-heading-text-shadow, none);
}

.continuityHeading p {
  color: var(--video-text-stage-subtitle-color);
  font-family: var(--video-text-stage-subtitle-font-family);
  font-size: var(--video-text-stage-subtitle-font-size);
  font-weight: var(--video-text-stage-subtitle-font-weight);
  line-height: var(--video-text-stage-subtitle-line-height);
  margin: var(--video-component-subtitle-gap) 0 0;
  text-shadow: var(--video-text-stage-subtitle-text-shadow, none);
}

.continuityGraphic {
  inset: var(--video-layout-stage-graphic-inset-top) var(--video-layout-stage-graphic-inset-x)
    var(--video-layout-stage-graphic-inset-bottom);
  position: absolute;
}

.continuityEvidence {
  bottom: var(--video-layout-stage-evidence-row-bottom);
  color: var(--video-text-stage-evidence-color);
  display: flex;
  font-family: var(--video-text-stage-evidence-font-family);
  font-size: var(--video-text-stage-evidence-font-size);
  font-weight: var(--video-text-stage-evidence-font-weight);
  gap: var(--video-layout-stage-evidence-row-gap);
  justify-content: space-between;
  left: var(--video-layout-stage-evidence-row-x);
  pointer-events: none;
  position: absolute;
  right: var(--video-layout-stage-evidence-row-x);
  z-index: 30;
}

.continuityEvidence span {
  background: var(--video-color-ground);
  border-radius: var(--video-corner-chip);
  padding: var(--video-component-evidence-chip-padding-y) var(--video-component-evidence-chip-padding-x);
}

.continuityToken {
  align-items: center;
  background: var(--video-component-shared-object-fill);
  border: var(--video-component-shared-object-border-width) solid currentcolor;
  border-radius: var(--video-corner-shared-object);
  box-sizing: border-box;
  color: var(--video-text-stage-shared-object-color);
  display: flex;
  font-family: var(--video-text-stage-shared-object-font-family);
  font-size: var(--video-text-stage-shared-object-font-size);
  font-weight: var(--video-text-stage-shared-object-font-weight);
  justify-content: center;
  position: absolute;
  z-index: 22;
}
```

and in `.continuityProduct` replace `background: #eaeef2;` with `background: var(--video-component-product-frame-backdrop);`.

Every value equals today's in `classic`: the heading inset is 96/64, the graphic inset 192/60/70, the evidence row 16/32/20 with 7×12 chips, and the shared object a 2 px border, radius 8, `#101e28` fill, 25 px at 600. The explicit `font-weight` 400 on the subtitle and evidence matches the `normal` they inherited.

- [ ] **Step 5: Theme the heading entrance and the shared object's fades**

`src/continuity/ContinuityBeatView.tsx`: add

```ts
import { useVideoMotion } from "../videoTheme/useVideoMotion/useVideoMotion";
import { useVideoProps } from "../videoTheme/useVideoTheme/useVideoTheme";
```

add `const heading = useVideoProps("Heading", {});` and `const motion = useVideoMotion();` after `const translate = useContinuityCopy();`, and replace `style={enter(frame, 0, { y: 8, dur: 18 })}` with:

```tsx
          style={enter(frame, 0, {
            y: heading.entranceDistance,
            dur: motion.scale(heading.entranceDuration),
            easing: motion.curve(heading.entranceEasing),
          })}
```

`src/continuity/ContinuityToken.tsx`: add the same two imports, add `const sharedObject = useVideoProps("SharedObject", {});` and `const motion = useVideoMotion();` after `const tokens = useVideoTokens();`, delete the `color: tokens.text.stage.sharedObject.color,` style line (the CSS module sets it), and replace the opacity expression with:

```tsx
        opacity:
          ramp(frame, 12, motion.scale(sharedObject.fadeIn)) *
          (beat.token.appearance === "outline"
            ? 1 - ramp(frame, timing[index].start + 60, motion.scale(sharedObject.outlineFade))
            : 1),
```

- [ ] **Step 6: Verify and commit**

Run the Step 1 command. Expected: passes.
Run: `pnpm exec tsc --noEmit`. Expected: no errors.
Run: `pnpm theme:parity compare shared-object-handoff frame-to-interface aperture-detail spatial-continuation occlusion-wipe`. Expected: parity passes.

```bash
git add src/videoTheme/useVideoMotion src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/continuity/ContinuityScene.module.css src/continuity/ContinuityBeatView.tsx src/continuity/ContinuityToken.tsx src/continuity/__tests__
git commit -m "feat(video-producer): theme the continuity stage layout and its components" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 26: Thesis, annotations, and overlays

None of the five compositions in scope uses a thesis, a composite, or annotations, but they are part of the shared continuity renderer, so they are themed too. The parity gate cannot see them; their tests and the variable guard can.

**Files:**
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/continuity/overlayMotion.ts`, `src/continuity/overlayMotion.test.ts`
- Modify: `src/continuity/ContinuityScene.module.css`, `src/continuity/ContinuityOverlays.module.css`
- Modify: `src/continuity/ContinuityThesis.tsx`, `src/continuity/ContinuityAnnotation.tsx`, `src/continuity/ContinuityDiagramLane.tsx`

- [ ] **Step 1: Write the failing motion tests**

Append to `src/continuity/overlayMotion.test.ts` (add `getAnnotationProgress` and `getConnectorProgress` to its imports if missing):

```ts
test("a longer themed draw-in slows an annotation's arrival", () => {
  const cue = { at: 0, until: 200 };
  assert.ok(getAnnotationProgress(9, cue, 36) < getAnnotationProgress(9, cue, 18));
});

test("a connector's themed timing sets its draw-in", () => {
  const linear = (progress: number) => progress;
  assert.equal(getConnectorProgress(15, "signal", 0, { duration: 30, easing: linear }), 0.5);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/continuity/overlayMotion.test.ts`
Expected: the two new tests fail (the functions take no timing).

- [ ] **Step 2: Let the overlay timing take themed values**

Replace `src/continuity/overlayMotion.ts` with:

```ts
import { EASE, ramp } from "../motion";

type Interval = { at: number; until: number };

/**
 * Draw and retract notation only within its authored interval, each over
 * `duration` frames (the theme's annotation draw-in; 18 when unthemed).
 */
export function getAnnotationProgress(frame: number, cue: Interval, duration = 18): number {
  return ramp(frame, cue.at, duration) * (1 - ramp(frame, cue.until - duration, duration));
}

/** Compatibility export for the reusable measured-region overlay. */
export { getOverlayPose } from "../motion-components/AnchoredOverlay";

/**
 * Only a causal treatment draws a connector, after its authored signal cue,
 * over the theme's connector timing (30 frames in-out when unthemed).
 */
export function getConnectorProgress(
  frame: number,
  effect: "signal" | "bracket" | "focus",
  signalAt: number,
  timing: Readonly<{ duration: number; easing: (progress: number) => number }> = {
    duration: 30,
    easing: EASE.inOut,
  },
): number {
  return effect === "signal" ? ramp(frame, signalAt, timing.duration, timing.easing) : 0;
}
```

Run the Step 1 command. Expected: all pass, including the existing cases.

- [ ] **Step 3: Add the overlay tokens**

In `componentTokens.ts`, add and spread `...OVERLAY_TOKENS,`:

```ts
const OVERLAY_TOKENS = {
  Thesis: {
    gap: _length("Thesis line gap", "Space between thesis lines.", "stage"),
    inset: token({
      kind: "box",
      surface: "stage",
      label: "Thesis inset",
      description: "Where the thesis block sits: top, x from both sides, and bottom.",
    }),
    emphasisGap: _length("Thesis emphasis gap", "Space above the thesis's supporting line.", "stage"),
    lineStagger: token({
      kind: "number",
      surface: "stage",
      unit: "frames",
      min: 0,
      max: 60,
      step: 1,
      label: "Thesis line stagger",
      description: "Frames between thesis lines starting to arrive.",
    }),
    lineDuration: _duration("Thesis line duration", "How long a thesis line takes to arrive.", "stage"),
    lineEasing: _easing("Thesis line curve", "The curve of a thesis line arriving.", "stage"),
    lineDistance: _length("Thesis line rise", "How far a thesis line rises as it arrives.", "stage"),
  },
  Underline: {
    strokeWidth: _stroke("Underline width", "Width of the hand-drawn teaching underline.", "stage"),
    seed: token({
      kind: "number",
      surface: "stage",
      min: 0,
      max: 9999,
      step: 1,
      label: "Underline seed",
      description: "Fixes the wobble of the teaching underline so every frame draws the same line.",
    }),
    drawIn: _duration("Underline draw-in", "How long the teaching underline takes to draw.", "stage"),
  },
  Annotation: {
    strokeWidth: _stroke("Annotation width", "Width of hand-drawn boxes, brackets, and circles on the product stage.", "stage"),
    highlightAlpha: _alpha("Highlight opacity", "Opacity of a hand-drawn highlight on the product stage.", "stage"),
    drawIn: _duration("Annotation draw-in", "How long a hand-drawn mark takes to draw and to retract.", "stage"),
  },
  Spotlight: {
    padding: _length("Spotlight padding", "Space between a spotlit region and the edge of its cut-out.", "stage"),
    scrimSpread: _length("Scrim spread", "How far the scrim around a spotlight extends.", "stage"),
  },
  Connector: {
    strokeWidth: _stroke("Connector width", "Width of the dashed connector from a source to its explanation.", "stage"),
    dash: token({ kind: "dash", surface: "stage", label: "Connector dash", description: "Dash pattern of a connector, in pixels." }),
    bend: _offset("Connector bend", "How far past its target a connector's end swings sideways.", "stage"),
    drop: _offset("Connector drop", "How far below its target a connector ends.", "stage"),
    drawIn: _duration("Connector draw-in", "How long a connector takes to draw.", "stage"),
    easing: _easing("Connector curve", "The curve of a connector drawing in.", "stage"),
  },
  FloatingLabel: {
    padding: token({
      kind: "box",
      surface: "stage",
      label: "Floating label padding",
      description: "Space inside a floating label: x on the sides and y above and below.",
    }),
    offset: _length("Floating label offset", "Space between a floating label and the artwork it names.", "stage"),
    borderWidth: _stroke("Floating label border", "Border width of a floating label.", "stage"),
  },
  FloatingDiagram: {
    elevation: token({
      kind: "elevation",
      surface: "stage",
      label: "Floating diagram elevation",
      description: "The shadow under artwork lifted off the product stage.",
    }),
  },
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "Thesis": { "defaultProps": { "gap": 26, "inset": { "top": 235, "x": 110, "bottom": 80 }, "emphasisGap": 20, "lineStagger": 24, "lineDuration": 24, "lineEasing": "$atomic.easing.out", "lineDistance": 16 } },
    "Underline": { "defaultProps": { "strokeWidth": "$stroke.annotation", "seed": "$atomic.seed.sm", "drawIn": 28 } },
    "Annotation": { "defaultProps": { "strokeWidth": "$stroke.annotation", "highlightAlpha": "$atomic.opacity.40", "drawIn": "$motion.hero" } },
    "Spotlight": { "defaultProps": { "padding": 10, "scrimSpread": 1800 } },
    "Connector": { "defaultProps": { "strokeWidth": "$stroke.default", "dash": "$atomic.dash.connector", "bend": 30, "drop": 60, "drawIn": 30, "easing": "$atomic.easing.inOut" } },
    "FloatingLabel": { "defaultProps": { "padding": { "x": 18, "y": 12 }, "offset": 12, "borderWidth": "$stroke.hairline" } },
    "FloatingDiagram": { "defaultProps": { "elevation": "$elevation.floating" } },
```

- [ ] **Step 4: Read the thesis and overlay styles from variables**

In `src/continuity/ContinuityScene.module.css`, replace the thesis rules with:

```css
.continuityThesis {
  display: flex;
  flex-direction: column;
  gap: var(--video-component-thesis-gap);
  inset: var(--video-component-thesis-inset-top) var(--video-component-thesis-inset-x)
    var(--video-component-thesis-inset-bottom);
  justify-content: center;
  position: absolute;
}

.continuityThesisLine {
  color: var(--video-text-stage-thesis-color);
  font-family: var(--video-text-stage-thesis-font-family);
  font-size: var(--video-text-stage-thesis-font-size);
  font-weight: var(--video-text-stage-thesis-font-weight);
  letter-spacing: var(--video-text-stage-thesis-letter-spacing);
  line-height: var(--video-text-stage-thesis-line-height);
}

.continuityEmphasis {
  color: var(--video-text-stage-thesis-emphasis-color);
  font-family: var(--video-text-stage-thesis-emphasis-font-family);
  font-size: var(--video-text-stage-thesis-emphasis-font-size);
  font-weight: var(--video-text-stage-thesis-emphasis-font-weight);
  margin-top: var(--video-component-thesis-emphasis-gap);
}
```

In `src/continuity/ContinuityOverlays.module.css`, replace `.floating`, `.label`, and `.spotlight` with:

```css
.floating {
  color: var(--video-color-text);
  pointer-events: none;
  position: absolute;
  z-index: 20;
}

.label {
  background: var(--video-color-ground);
  border: var(--video-component-floating-label-border-width) solid currentcolor;
  border-radius: var(--video-corner-label);
  bottom: calc(100% + var(--video-component-floating-label-offset));
  display: inline-block;
  font-family: var(--video-text-stage-floating-label-font-family);
  font-size: var(--video-text-stage-floating-label-font-size);
  line-height: var(--video-text-stage-floating-label-line-height);
  margin: 0;
  max-width: 90%;
  padding: var(--video-component-floating-label-padding-y) var(--video-component-floating-label-padding-x);
  position: absolute;
}

.spotlight {
  border-radius: var(--video-corner-spotlight);
  box-shadow: 0 0 0 var(--video-component-spotlight-scrim-spread) var(--video-color-scrim);
  pointer-events: none;
  position: absolute;
  z-index: 10;
}
```

The floating diagram's drop shadow moves inline (Step 5) because `AnchoredOverlay` composes the inline `filter` with its motion blur, and an inline filter replaces any CSS filter.

- [ ] **Step 5: Theme the thesis, annotations, and diagram lane**

`src/continuity/ContinuityThesis.tsx`: add `import { useVideoMotion } from "../videoTheme/useVideoMotion/useVideoMotion";` and `useVideoProps` to the `useVideoTheme` import; add a constant `const UNDERLINE_CUE = 95;` above the component; add after `const { sketch } = useVideoTokens();`:

```ts
  const thesis = useVideoProps("Thesis", {});
  const underline = useVideoProps("Underline", {});
  const motion = useVideoMotion();
```

replace `style={enter(frame, index * 24, { y: 16, dur: 24 })}` with:

```tsx
          style={enter(frame, index * motion.scale(thesis.lineStagger), {
            y: thesis.lineDistance,
            dur: motion.scale(thesis.lineDuration),
            easing: motion.curve(thesis.lineEasing),
          })}
```

and replace the `<Underline ...>` props with:

```tsx
        <Underline
          disabled={!annotations}
          progress={ramp(frame, UNDERLINE_CUE, motion.scale(underline.drawIn))}
          color={accent}
          roughness={sketch.annotation.roughness}
          seed={underline.seed}
          strokeWidth={underline.strokeWidth}
        >
```

`src/continuity/ContinuityAnnotation.tsx`: add the `useVideoMotion` import and `useVideoProps`; add `const annotation = useVideoProps("Annotation", {});` and `const motion = useVideoMotion();` after `const { sketch } = useVideoTokens();`; replace `const progress = getAnnotationProgress(frame, cue);` with `const progress = getAnnotationProgress(frame, cue, motion.scale(annotation.drawIn));`; replace `opacity: cue.kind === "highlight" ? 0.4 : 1,` with `opacity: cue.kind === "highlight" ? annotation.highlightAlpha : 1,`; and replace `strokeWidth={3}` with `strokeWidth={annotation.strokeWidth}`.

`src/continuity/ContinuityDiagramLane.tsx`:
1. Add imports:

```ts
import { elevationToDropShadowFilter } from "../videoTheme/cssValues/cssValues";
import { useVideoMotion } from "../videoTheme/useVideoMotion/useVideoMotion";
```

and add `useVideoProps` to the `useVideoTheme` import.
2. In `FloatingDiagram`, add `const floating = useVideoProps("FloatingDiagram", {});` and replace the overlay style with `style={{ filter: elevationToDropShadowFilter(floating.elevation) }}` (the colour now comes from the CSS module).
3. In the label's style, delete `background: tokens.color.ground,` (the CSS module sets it).
4. In `ContinuityDiagramLane`, add after `const { source } = content;`:

```ts
  const spotlight = useVideoProps("Spotlight", {});
  const connector = useVideoProps("Connector", {});
  const motion = useVideoMotion();
```

replace `const signal = getConnectorProgress(frame, content.effect, content.signalAt);` (move it below the new lines) with:

```ts
  const signal = getConnectorProgress(frame, content.effect, content.signalAt, {
    duration: motion.scale(connector.drawIn),
    easing: motion.curve(connector.easing),
  });
```

make the spotlight style `{ left: source.x - spotlight.padding, top: source.y - spotlight.padding, width: source.width + spotlight.padding * 2, height: source.height + spotlight.padding * 2, opacity }`, and make the connector path:

```tsx
          <path
            d={`M ${source.x + source.width / 2} ${source.y + source.height / 2} Q ${active.overlay.target.x} ${source.y + source.height / 2} ${active.overlay.target.x + connector.bend} ${active.overlay.target.y + connector.drop}`}
            fill="none"
            stroke={accent}
            strokeWidth={connector.strokeWidth}
            strokeDasharray={connector.dash.join(" ")}
          />
```

- [ ] **Step 6: Verify and commit**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/continuity/overlayMotion.test.ts src/continuity/__tests__/stage-styles-read-emitted-theme-variables.integration.test.ts`
Expected: all pass.
Run: `pnpm exec tsc --noEmit`. Expected: no errors.
Run: `pnpm theme:parity compare`. Expected: parity passes.
Render one composite study to check the overlays by eye, since parity does not cover them: `pnpm atlas:posters causal-signal` then open `showcase/assets/atlas/causal-signal.jpg`; restore it with `git checkout showcase/assets/atlas` afterwards (Task 32 re-renders posters per theme).

```bash
git add src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/continuity
git commit -m "feat(video-producer): theme the thesis, annotations, and diagram overlays" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 27: SVG effect filters for themed glows and shadows

`classic` sets no text shadow, text glow, blurred halo, or panel shadow, so this task changes no pixel. It makes those tokens work when a theme sets them.

**Files:**
- Create: `src/videoTheme/videoEffectFilters/videoEffectFilters.ts`
- Test: `src/videoTheme/videoEffectFilters/videoEffectFilters.test.ts`
- Create: `src/videoTheme/VideoEffectDefs/VideoEffectDefs.tsx`
- Test: `src/videoTheme/VideoEffectDefs/VideoEffectDefs.test.tsx`
- Modify: `src/stock/theme/useGraphicTheme.ts`, `src/stock/StockGraphic.tsx`, `src/stock/graphics-common.tsx`
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json` (`Panel.elevation`)

- [ ] **Step 1: Write the failing filter tests**

`src/videoTheme/videoEffectFilters/videoEffectFilters.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import { listVideoEffectFilters } from "./videoEffectFilters";

const SHADOWED_LABEL = {
  other: {
    video: {
      atomic: { textShadow: { soft: { offsetX: 0, offsetY: 2, blur: 4, alpha: 0.5 } } },
      semantic: { text: { graphic: { label: { textShadow: "$atomic.textShadow.soft" } } } },
    },
  },
};

test("classic needs no SVG filters", () => {
  assert.deepEqual(listVideoEffectFilters(resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic")), []);
});

test("a text shadow on a graphic role becomes a drop-shadow filter", () => {
  const theme = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", { patches: [SHADOWED_LABEL] });
  assert.deepEqual(listVideoEffectFilters(theme), [
    {
      path: "text.graphic.label",
      primitives: [{ kind: "dropShadow", dx: 0, dy: 2, stdDeviation: 2, color: "#edf7f4", opacity: 0.5 }],
    },
  ]);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/videoEffectFilters/videoEffectFilters.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement the filter list**

```ts
import { getResolvedTokenValue } from "../getResolvedTokenValue/getResolvedTokenValue";
import { listTokenDefinitions } from "../tokenCatalog/tokenCatalog";
import type {
  GlowValue,
  ResolvedElevation,
  ResolvedTypeStyle,
  ResolvedVideoTheme,
  TokenKind,
} from "../videoTheme.types";

/** One SVG filter step. */
export type EffectPrimitive =
  | Readonly<{ kind: "dropShadow"; dx: number; dy: number; stdDeviation: number; color: string; opacity: number }>
  | Readonly<{ kind: "glow"; stdDeviation: number; color: string; opacity: number }>
  | Readonly<{ kind: "blur"; stdDeviation: number }>;

/** A filter a graphic shape references, keyed by the token that defines it. */
export type VideoEffectFilter = Readonly<{ path: string; primitives: readonly EffectPrimitive[] }>;

const FILTERS = new WeakMap<ResolvedVideoTheme, readonly VideoEffectFilter[]>();

/** The SVG id of a token's filter inside one stock graphic. */
export function buildEffectFilterId(graphicId: string, path: string): string {
  return `${graphicId}-fx-${path.replaceAll(".", "-")}`;
}

function _typeStylePrimitives(style: ResolvedTypeStyle): EffectPrimitive[] {
  const shadow = style.textShadow;
  const glow = style.glow;
  return [
    ...(shadow && shadow.alpha > 0
      ? [{ kind: "dropShadow" as const, dx: shadow.offsetX, dy: shadow.offsetY, stdDeviation: shadow.blur / 2, color: shadow.color, opacity: shadow.alpha }]
      : []),
    ...(glow && glow.opacity > 0
      ? [{ kind: "glow" as const, stdDeviation: glow.blur / 2, color: glow.color, opacity: glow.opacity }]
      : []),
  ];
}

function _primitivesFromValue(kind: TokenKind, value: unknown): EffectPrimitive[] {
  if (kind === "typeStyle") {
    return _typeStylePrimitives(value as ResolvedTypeStyle);
  }
  if (kind === "elevation") {
    const elevation = value as ResolvedElevation;
    return elevation.layers.map((layer) => ({
      kind: "dropShadow" as const,
      dx: layer.offsetX,
      dy: layer.offsetY,
      stdDeviation: layer.blur / 2,
      color: elevation.color,
      opacity: layer.alpha,
    }));
  }
  if (kind === "glow") {
    const glow = value as GlowValue;
    return glow.blur > 0 ? [{ kind: "blur" as const, stdDeviation: glow.blur / 2 }] : [];
  }
  return [];
}

/**
 * The SVG filters a theme needs on the graphic surface: text shadows and
 * glows on graphic type roles, graphic elevations, and blurred glows. Only
 * tokens that set an effect produce a filter, so `classic` produces none.
 * Stage effects use CSS instead. Cached per resolved theme.
 */
export function listVideoEffectFilters(theme: ResolvedVideoTheme): readonly VideoEffectFilter[] {
  const cached = FILTERS.get(theme);
  if (cached) {
    return cached;
  }
  const filters = listTokenDefinitions()
    .filter(({ definition, isScale }) => !isScale && definition.surface === "graphic")
    .flatMap(({ path, definition }) => {
      const primitives = _primitivesFromValue(definition.kind, getResolvedTokenValue(theme, path));
      return primitives.length > 0 ? [{ path, primitives }] : [];
    });
  FILTERS.set(theme, filters);
  return filters;
}
```

Run the Step 1 command. Expected: 2 passing.

- [ ] **Step 3: Write the failing defs test**

`src/videoTheme/VideoEffectDefs/VideoEffectDefs.test.tsx`:

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoEffectDefs } from "./VideoEffectDefs";

test("no filters render nothing", () => {
  assert.equal(renderToStaticMarkup(<svg><VideoEffectDefs graphicId="g" filters={[]} /></svg>), "<svg></svg>");
});

test("a drop shadow becomes an feDropShadow under the token's id", () => {
  const markup = renderToStaticMarkup(
    <svg>
      <VideoEffectDefs
        graphicId="g"
        filters={[{ path: "text.graphic.label", primitives: [{ kind: "dropShadow", dx: 0, dy: 2, stdDeviation: 2, color: "#000000", opacity: 0.5 }] }]}
      />
    </svg>,
  );
  assert.match(markup, /<filter id="g-fx-text-graphic-label"/);
  assert.match(markup, /<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/VideoEffectDefs/VideoEffectDefs.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement the defs**

`src/videoTheme/VideoEffectDefs/VideoEffectDefs.tsx`:

```tsx
import { Fragment, type ReactNode } from "react";
import { buildEffectFilterId, type EffectPrimitive, type VideoEffectFilter } from "../videoEffectFilters/videoEffectFilters";

type Props = Readonly<{ graphicId: string; filters: readonly VideoEffectFilter[] }>;

function _primitive(primitive: EffectPrimitive, index: number): ReactNode {
  const input = index === 0 ? "SourceGraphic" : `fx${index - 1}`;
  const result = `fx${index}`;
  if (primitive.kind === "dropShadow") {
    return (
      <feDropShadow
        key={index}
        dx={primitive.dx}
        dy={primitive.dy}
        stdDeviation={primitive.stdDeviation}
        floodColor={primitive.color}
        floodOpacity={primitive.opacity}
        in={input}
        result={result}
      />
    );
  }
  if (primitive.kind === "blur") {
    return <feGaussianBlur key={index} in={input} stdDeviation={primitive.stdDeviation} result={result} />;
  }
  return (
    <Fragment key={index}>
      <feGaussianBlur in="SourceAlpha" stdDeviation={primitive.stdDeviation} result={`${result}-blur`} />
      <feFlood floodColor={primitive.color} floodOpacity={primitive.opacity} result={`${result}-flood`} />
      <feComposite in={`${result}-flood`} in2={`${result}-blur`} operator="in" result={`${result}-glow`} />
      <feMerge result={result}>
        <feMergeNode in={`${result}-glow`} />
        <feMergeNode in={input} />
      </feMerge>
    </Fragment>
  );
}

/**
 * One SVG `<defs>` holding the filters a stock graphic's theme defines, each
 * under `buildEffectFilterId(graphicId, tokenPath)`. Renders nothing when the
 * theme defines none. Steps chain in order, so a glow wraps a drop shadow.
 */
export function VideoEffectDefs({ graphicId, filters }: Props) {
  if (filters.length === 0) {
    return null;
  }
  return (
    <defs>
      {filters.map((filter) => (
        <filter
          key={filter.path}
          id={buildEffectFilterId(graphicId, filter.path)}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          {filter.primitives.map(_primitive)}
        </filter>
      ))}
    </defs>
  );
}
```

The test's expected `feDropShadow` attributes list `dx`, `dy`, `stdDeviation`, `flood-color`, `flood-opacity` first; React keeps prop order, so `in` and `result` follow and the regex still matches.

Run the Step 3 command. Expected: 2 passing.

- [ ] **Step 5: Reference the filters from themed shapes**

In `src/stock/theme/useGraphicTheme.ts`:
1. Add imports:

```ts
import { buildEffectFilterId, listVideoEffectFilters } from "../../videoTheme/videoEffectFilters/videoEffectFilters";
```

2. Rename `_useGraphicTheme` to `useGraphicTheme`, export it with this docstring, and update its three call sites:

```ts
/**
 * The resolved theme a stock shape draws with: the surrounding theme, or
 * `classic` with no provider. Prefer `useGraphicTokens` and
 * `useGraphicProps`; use this only for whole-theme work such as effect defs.
 */
export function useGraphicTheme(): ResolvedVideoTheme {
```

3. Add:

```ts
/**
 * `url(#…)` for a token's SVG filter in the current graphic, or undefined
 * when the theme sets no effect for that token. For example, `Text` passes
 * `text.graphic.<role>`.
 */
export function useGraphicFilter(path: string): string | undefined {
  const theme = useGraphicTheme();
  const graphicId = useContext(GraphicIdContext);
  return listVideoEffectFilters(theme).some((filter) => filter.path === path)
    ? `url(#${buildEffectFilterId(graphicId, path)})`
    : undefined;
}
```

In `src/stock/StockGraphic.tsx`, import `VideoEffectDefs`, `listVideoEffectFilters`, and `useGraphicTheme`; in `StockCanvas` add `const theme = useGraphicTheme();` and render `<VideoEffectDefs graphicId={id} filters={listVideoEffectFilters(theme)} />` as the first child of `<svg>`.

In `src/stock/graphics-common.tsx`:
- import `useGraphicFilter`;
- in `Text`, add `filter={useGraphicFilter(`text.graphic.${role}`)}` to the `<text>` (call the hook at the top of the body as `const filter = useGraphicFilter(...)` and pass `filter={filter}`);
- in `Halo`, add `const filter = useGraphicFilter("components.Halo.glow");` and `filter={filter}` on its circle;
- in `Panel`, add `const filter = useGraphicFilter("components.Panel.elevation");` and change the outer `<g>` to `<g filter={filter}>`.

In `componentTokens.ts`, add a helper and a `Panel` token:

```ts
function _elevation(label: string, description: string) {
  return token({ kind: "elevation", surface: "graphic", label, description });
}
```

and in `SHARED_GRAPHIC_TOKENS.Panel` add `elevation: _elevation("Panel elevation", "The shadow under a panel. Flat panels cast none."),`. In `classic.theme.json`, add `"elevation": "$elevation.flat"` to `Panel.defaultProps`.

- [ ] **Step 6: Prove a theme effect reaches the SVG**

Append to `src/stock/graphics-common.test.tsx`:

```tsx
test("a raised panel references the theme's elevation filter", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeScope patches={[{ components: { Panel: { defaultProps: { elevation: "$elevation.floating" } } } }]}>
      <StockGraphic preset="data-pipeline" frame={120} />
    </VideoThemeScope>,
  );
  assert.match(markup, /<filter id="stock-[^"]*-fx-components-Panel-elevation"/);
  assert.match(markup, /filter="url\(#stock-[^"]*-fx-components-Panel-elevation\)"/);
});
```

(import `StockGraphic` from `./StockGraphic`).

- [ ] **Step 7: Verify and commit**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/videoEffectFilters/videoEffectFilters.test.ts src/videoTheme/VideoEffectDefs/VideoEffectDefs.test.tsx src/stock/graphics-common.test.tsx`
Expected: all pass.
Run: `pnpm theme:parity compare`. Expected: parity passes (classic emits no defs and no filter attributes).

```bash
git add src/videoTheme/videoEffectFilters src/videoTheme/VideoEffectDefs src/stock/theme/useGraphicTheme.ts src/stock/StockGraphic.tsx src/stock/graphics-common.tsx src/stock/graphics-common.test.tsx src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json
git commit -m "feat(video-producer): draw themed glows and shadows as SVG filters" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 28: Per-shape sketch for nodes, edges, guides, and boxes

**Files:**
- Create: `src/videoTheme/sketchShape/sketchShape.ts`
- Test: `src/videoTheme/sketchShape/sketchShape.test.ts`
- Create: `src/stock/primitives/SketchedShape/SketchedShape.tsx`
- Modify: `src/stock/primitives/StockRect/StockRect.tsx`, `src/stock/graphics-common.tsx`
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json` (`sketch` on `Node`, `Edge`, `Guide`)
- Test: `src/stock/graphics-common.test.tsx`

- [ ] **Step 1: Write the failing sketch tests**

`src/videoTheme/sketchShape/sketchShape.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getSketchPathsFromShape } from "./sketchShape";

const PROFILE = { roughness: 1.5, bowing: 1, seed: 17, randomness: 3 };
const PAINT = { stroke: "#2a404e", strokeWidth: 1.5 };
const CIRCLE = { kind: "circle", cx: 100, cy: 100, r: 26 } as const;

test("a smooth profile draws no sketch paths", () => {
  assert.deepEqual(getSketchPathsFromShape(CIRCLE, { ...PROFILE, roughness: 0 }, PAINT), []);
});

test("the same shape, profile, and paint reuse one computed result", () => {
  assert.equal(getSketchPathsFromShape(CIRCLE, PROFILE, PAINT), getSketchPathsFromShape(CIRCLE, PROFILE, PAINT));
});

test("the seed fixes the wobble", () => {
  const first = getSketchPathsFromShape(CIRCLE, PROFILE, PAINT);
  const reseeded = getSketchPathsFromShape(CIRCLE, { ...PROFILE, seed: 18 }, PAINT);
  assert.notDeepEqual(first, reseeded);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/sketchShape/sketchShape.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement `sketchShape`**

```ts
import rough from "roughjs";
import { buildCanonicalJsonFromValue } from "../hashVideoTheme/hashVideoTheme";
import type { ResolvedSketchProfile } from "../videoTheme.types";

/** A shape to sketch, in the SVG coordinates of the graphic that draws it. */
export type SketchShape =
  | Readonly<{ kind: "rect"; x: number; y: number; width: number; height: number }>
  | Readonly<{ kind: "circle"; cx: number; cy: number; r: number }>
  | Readonly<{ kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }>
  | Readonly<{ kind: "line"; x1: number; y1: number; x2: number; y2: number }>
  | Readonly<{ kind: "path"; d: string }>;

/** The stroke and fill a sketched shape is drawn with. */
export type SketchPaint = Readonly<{ stroke: string; strokeWidth: number; fill?: string }>;

/** One roughjs output path. */
export type SketchPath = Readonly<{ d: string; stroke: string; strokeWidth: number; fill?: string }>;

const CACHE_LIMIT = 4000;
const CACHE = new Map<string, readonly SketchPath[]>();

type Generator = ReturnType<typeof rough.generator>;
type Options = Parameters<Generator["rectangle"]>[4];

function _drawable(generator: Generator, shape: SketchShape, options: Options) {
  switch (shape.kind) {
    case "rect":
      return generator.rectangle(shape.x, shape.y, shape.width, shape.height, options);
    case "circle":
      return generator.circle(shape.cx, shape.cy, shape.r * 2, options);
    case "ellipse":
      return generator.ellipse(shape.cx, shape.cy, shape.rx * 2, shape.ry * 2, options);
    case "line":
      return generator.line(shape.x1, shape.y1, shape.x2, shape.y2, options);
    case "path":
      return generator.path(shape.d, options);
  }
}

/**
 * Seeded hand-drawn outlines for a shape, memoized on the shape, profile,
 * and paint so every frame and every motion-blur sample reuse one
 * computation. Returns no paths for a smooth profile; callers then draw the
 * plain shape. Used by boxes, nodes, edges, and guides.
 */
export function getSketchPathsFromShape(
  shape: SketchShape,
  profile: ResolvedSketchProfile,
  paint: SketchPaint,
): readonly SketchPath[] {
  if (profile.roughness === 0) {
    return [];
  }
  const key = buildCanonicalJsonFromValue({ shape, profile, paint });
  const cached = CACHE.get(key);
  if (cached) {
    return cached;
  }
  const generator = rough.generator();
  const paths = generator.toPaths(
    _drawable(generator, shape, {
      roughness: profile.roughness,
      bowing: profile.bowing,
      seed: profile.seed,
      maxRandomnessOffset: profile.randomness,
      stroke: paint.stroke,
      strokeWidth: paint.strokeWidth,
      fill: paint.fill,
      fillStyle: "solid",
    }),
  );
  const oldest = CACHE.keys().next();
  if (CACHE.size >= CACHE_LIMIT && !oldest.done) {
    CACHE.delete(oldest.value);
  }
  CACHE.set(key, paths);
  return paths;
}
```

Run the Step 1 command. Expected: 3 passing.

- [ ] **Step 3: Draw boxes through it**

In `src/stock/primitives/StockRect/StockRect.tsx`, replace `import rough from "roughjs";` with `import { getSketchPathsFromShape } from "../../../videoTheme/sketchShape/sketchShape";`, and replace the generator block:

```ts
  const generator = rough.generator();
  const paths = generator.toPaths(
    generator.rectangle(x, y, width, height, {
      roughness: profile.roughness,
      bowing: profile.bowing,
      seed: profile.seed,
      stroke,
      fill,
      fillStyle: "solid",
      strokeWidth: Number(strokeWidth),
      maxRandomnessOffset: profile.randomness,
    }),
  );
```

with

```ts
  const paths = getSketchPathsFromShape(
    { kind: "rect", x, y, width, height },
    profile,
    { stroke, strokeWidth: Number(strokeWidth), fill },
  );
```

The roughjs options are the same set, so sketched boxes keep their exact paths (`stockTransparency.test.ts` compares two renders).

- [ ] **Step 4: Add the shared sketched-shape primitive**

`src/stock/primitives/SketchedShape/SketchedShape.tsx`:

```tsx
import { getSketchPathsFromShape, type SketchShape } from "../../../videoTheme/sketchShape/sketchShape";
import type { ResolvedSketchProfile } from "../../../videoTheme/videoTheme.types";
import type { SVGProps } from "react";

type PathAttributes = Pick<
  SVGProps<SVGPathElement>,
  "pathLength" | "strokeDasharray" | "strokeDashoffset" | "strokeLinecap" | "strokeLinejoin"
>;

type Props = Readonly<
  {
    shape: SketchShape;
    profile: ResolvedSketchProfile;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    fillOpacity?: number;
    strokeOpacity?: number;
    opacity?: number;
  } & PathAttributes
>;

function _plainShape({ shape, profile: _profile, ...attributes }: Props) {
  switch (shape.kind) {
    case "rect":
      return <rect {...shape} {...attributes} />;
    case "circle":
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...attributes} />;
    case "ellipse":
      return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...attributes} />;
    case "line":
      return <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...attributes} />;
    case "path":
      return <path d={shape.d} {...attributes} />;
  }
}

/**
 * A circle, ellipse, line, path, or rect drawn smooth, exactly as the plain
 * SVG element, or as seeded hand-drawn paths when the profile is rough. Path
 * attributes such as a draw-on dash apply to every sketched path.
 */
export function SketchedShape(props: Props) {
  const { shape, profile, stroke, strokeWidth, fill, fillOpacity, strokeOpacity, opacity, ...pathAttributes } = props;
  const paths =
    stroke && stroke !== "none"
      ? getSketchPathsFromShape(shape, profile, { stroke, strokeWidth: strokeWidth ?? 1, fill })
      : [];
  if (paths.length === 0) {
    return _plainShape(props);
  }
  return (
    <g fillOpacity={fillOpacity} strokeOpacity={strokeOpacity} opacity={opacity} data-rough-shape={profile.roughness}>
      {paths.map((path, index) => (
        <path key={index} {...path} {...pathAttributes} />
      ))}
    </g>
  );
}
```

`_plainShape` passes every attribute it received through unchanged, so a smooth profile renders the same element and attributes as today.

- [ ] **Step 5: Give nodes, edges, and guides a sketch token**

In `componentTokens.ts`, add a helper:

```ts
function _sketch(label: string, description: string) {
  return token({ kind: "sketchProfile", surface: "graphic", label, description });
}
```

and add `sketch: _sketch("Node sketch", "The sketch profile node outlines use."),` to `NODE_TOKENS`, `sketch: _sketch("Edge sketch", "The sketch profile edges use."),` to `Edge`, and `sketch: _sketch("Guide sketch", "The sketch profile guides use."),` to `Guide`. In `classic.theme.json`, add `"sketch": "$sketch.shape"` to the `defaultProps` of `Node`, `Edge`, and `Guide`.

In `src/stock/graphics-common.tsx`, import `SketchedShape` and:
- in `DrawPath`, replace the `<path ... />` with:

```tsx
    <SketchedShape
      shape={{ kind: "path", d: path }}
      profile={edge.sketch}
      pathLength={1}
      fill="none"
      stroke={edge.color}
      strokeWidth={edge.strokeWidth}
      strokeLinecap={edge.cap}
      strokeDasharray={dashed ? edge.dash.join(" ") : 1}
      strokeDashoffset={dashed ? 0 : 1 - t}
      opacity={opacity * (dashed ? t : 1)}
    />
```

- in `Guide`, replace the `<ellipse ... />` with `<SketchedShape shape={{ kind: "ellipse", cx, cy, rx, ry }} profile={guide.sketch} fill="none" stroke={guide.color} strokeWidth={guide.strokeWidth} strokeDasharray={guide.dash.length ? guide.dash.join(" ") : undefined} opacity={guide.alpha} />`;
- in `CircleNode`, replace the first three `<circle>` elements with:

```tsx
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r: r + node.ringSpread }}
        profile={node.sketch}
        fill="none"
        stroke={accent}
        strokeOpacity={active * node.ringAlpha}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r }}
        profile={node.sketch}
        fill={node.fill}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r }}
        profile={node.sketch}
        fill={accent}
        fillOpacity={active * node.tintAlpha}
        stroke={accent}
        strokeOpacity={node.outlineAlpha + active * (1 - node.outlineAlpha)}
        strokeWidth={node.strokeWidth}
      />
```

- [ ] **Step 6: Write the sketch test**

Append to `src/stock/graphics-common.test.tsx`:

```tsx
test("the shape sketch profile turns nodes, edges, and guides into hand-drawn paths", () => {
  const patch = { other: { video: { semantic: { sketch: { shape: "$sketch.profile.rough" } } } } };
  const markup = _svg(
    <>
      <CircleNode x={100} y={100} label="A" frame={60} accent="#51a7ff" />
      <DrawPath d="M0 0 L100 0" frame={60} />
      <Guide cx={0} cy={0} rx={10} ry={5} />
    </>,
    patch,
  );
  assert.equal(markup.match(/data-rough-shape="3"/g)?.length, 5);
});
```

(import `DrawPath`).

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/stock/graphics-common.test.tsx src/continuity/camera/stockTransparency.test.ts`
Expected: all pass. Five sketched shapes: three node circles, one edge, one guide.

- [ ] **Step 7: Verify and commit**

Run: `pnpm theme:parity compare`. Expected: parity passes (classic's shape profile is smooth).

```bash
git add src/videoTheme/sketchShape src/stock/primitives/SketchedShape src/stock/primitives/StockRect/StockRect.tsx src/stock/graphics-common.tsx src/stock/graphics-common.test.tsx src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json
git commit -m "feat(video-producer): sketch nodes, edges, guides, and boxes per shape" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 29: Blur limits and transition shapes read tokens

The spatial transition's peak blur and the velocity blur factor and limit become motion options, so Task 30 can fill them from the theme when a plan is built. The morph's start radius and the aperture's overscan become stage components that `ContinuityScene` reads. Every default equals today's literal.

**Files:**
- Modify: `src/motion-components/motionSettings.ts`, `src/motion-components/SceneTransition.tsx`
- Test: `src/motion-components/motionComponents.test.ts`
- Modify: `src/videoTheme/tokenCatalog/componentTokens.ts`, `themes/classic.theme.json`
- Modify: `src/continuity/ContinuityScene.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `src/motion-components/motionComponents.test.ts`:

```ts
test("velocity blur reads its factor and limit from the motion options", () => {
  assert.equal(getVelocityBlur(10, { velocityBlurFactor: 0.05 }), 0.5);
  assert.equal(getVelocityBlur(100, { velocityBlurFactor: 0.05, velocityBlurLimit: 2 }), 2);
});

test("a spatial transition's peak blur comes from the motion options", () => {
  const style = getSceneTransitionStyle(0.5, true, { kind: "spatial", motion: { transitionBlur: 24 } });
  assert.equal(style.filter, "blur(24px)");
});

test("a morph starts from its themed radius and an aperture opens to its themed overscan", () => {
  const morph = getSceneTransitionStyle(0.5, true, { kind: "morph", morphRadius: 24 });
  assert.match(String(morph.clipPath), /round 12px\)$/);
  const aperture = getSceneTransitionStyle(1, true, { kind: "aperture", apertureOverscan: 1 });
  assert.equal(aperture.clipPath, `circle(${Math.hypot(1600, 840)}px at 800px 420px)`);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/motion-components/motionComponents.test.ts`
Expected: the three new tests fail. The strict motion schema rejects the new keys, and the transition ignores `morphRadius` and `apertureOverscan`.

- [ ] **Step 2: Add the blur options**

In `src/motion-components/motionSettings.ts`:

1. In `motionOptionsSchema`, after `blurStrength: z.number().min(0).max(2).optional(),` add:

```ts
    velocityBlurFactor: z.number().min(0).max(1).optional(),
    velocityBlurLimit: z.number().min(0).max(20).optional(),
    transitionBlur: z.number().min(0).max(48).optional(),
```

2. In `resolveMotionSettings`, after `blurStrength: parsed.blurStrength ?? 1,` add:

```ts
    velocityBlurFactor: parsed.velocityBlurFactor ?? 0.09,
    velocityBlurLimit: parsed.velocityBlurLimit ?? 3,
    transitionBlur: parsed.transitionBlur ?? 12,
```

3. Replace `getVelocityBlur` with:

```ts
/**
 * Bounded screen-space blur for single-instance overlays and scene movement:
 * the travel per frame times the blur factor, capped at the limit (the
 * motion options' `velocityBlurLimit` unless `maximum` is given).
 */
export function getVelocityBlur(
  distancePerFrame: number,
  options?: MotionOptions,
  maximum?: number,
): number {
  const settings = resolveMotionSettings(options);
  return (
    (Math.min(
      maximum ?? settings.velocityBlurLimit,
      Math.abs(distancePerFrame) * settings.velocityBlurFactor,
    ) *
      settings.blurStrength *
      settings.shutterAngle) /
    180
  );
}
```

The arithmetic keeps today's order, so `0.09` and `3` give the same floats.

- [ ] **Step 3: Give the transition its shape props**

In `src/motion-components/SceneTransition.tsx`:

1. In `SceneTransitionProps`, after `motion?: MotionOptions;` add:

```ts
  /** Corner radius a morph starts from, in stage pixels. 12 when unthemed. */
  morphRadius?: number;
  /** How far past the frame's diagonal an aperture opens. 1.05 when unthemed. */
  apertureOverscan?: number;
```

2. In `getSceneTransitionStyle`, add `morphRadius = 12,` and `apertureOverscan = 1.05,` after `motionBlur = true,` in the destructuring.
3. Replace `` `circle(${progress * Math.hypot(width, height) * 1.05}px at ${origin.x}px ${origin.y}px)` `` with `` `circle(${progress * Math.hypot(width, height) * apertureOverscan}px at ${origin.x}px ${origin.y}px)` ``.
4. Replace `round ${12 * (1 - progress)}px)` with `round ${morphRadius * (1 - progress)}px)`.
5. Replace `` ? `blur(${(Math.sin(progress * Math.PI) * 12 * settings.blurStrength * settings.shutterAngle) / 180}px)` `` with `` ? `blur(${(Math.sin(progress * Math.PI) * settings.transitionBlur * settings.blurStrength * settings.shutterAngle) / 180}px)` ``.

Run the Step 1 command. Expected: all pass, including the existing transition and blur cases.

- [ ] **Step 4: Add the transition components**

In `componentTokens.ts`, add and spread `...TRANSITION_TOKENS,` into `COMPONENT_TOKENS`:

```ts
const TRANSITION_TOKENS = {
  Morph: {
    startRadius: _length(
      "Morph start radius",
      "Corner radius a morph transition starts from before it opens to the full frame.",
      "stage",
    ),
  },
  Aperture: {
    overscan: token({
      kind: "number",
      surface: "stage",
      unit: "×",
      min: 1,
      max: 1.5,
      step: 0.01,
      label: "Aperture overscan",
      description: "How far past the frame's diagonal an aperture transition opens, so its edge clears the corners.",
    }),
  },
} as const;
```

In `classic.theme.json` `components`, add:

```json
    "Morph": { "defaultProps": { "startRadius": 12 } },
    "Aperture": { "defaultProps": { "overscan": 1.05 } },
```

Both are deliberate one-off literals. The spatial transition's blur is plan 1's `motionBlur.transitionBlur` (spec correction 8), so there is no `Spatial` component.

- [ ] **Step 5: Pass the themed shapes to every transition**

In `src/continuity/ContinuityScene.tsx`, after `const bar = useVideoProps("ProgressBar", {});` add:

```ts
  const morph = useVideoProps("Morph", {});
  const aperture = useVideoProps("Aperture", {});
```

and in the `createSceneTransition({ ... })` argument, after `motionBlur: plan.motionBlur,` add:

```ts
                      morphRadius: morph.startRadius,
                      apertureOverscan: aperture.overscan,
```

- [ ] **Step 6: Verify and commit**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/motion-components/motionComponents.test.ts src/continuity/__tests__/stage-styles-read-emitted-theme-variables.integration.test.ts`
Expected: all pass.
Run both typecheck commands. Expected: no errors.
Run: `pnpm theme:parity compare aperture-detail spatial-continuation shared-object-handoff`. Expected: parity passes (the aperture and spatial transitions draw the same pixels).

```bash
git add src/motion-components/motionSettings.ts src/motion-components/SceneTransition.tsx src/motion-components/motionComponents.test.ts src/videoTheme/tokenCatalog/componentTokens.ts themes/classic.theme.json src/continuity/ContinuityScene.tsx
git commit -m "feat(video-producer): theme transition shapes and blur limits" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 30: Camera and motion presets come from the theme

`createContinuityPlanFromVideoTheme` fits a plan's continuity shots to a theme wherever a plan meets its theme: the server counting an export's frames, its preview frames, audio mix, and captions, the live player, `FilmComposition`, the story-film roots, and the `video` CLI. A `Film` keeps its authored plan, because re-theming an already themed plan with a different theme cannot undo the first theme's camera timing, and the live player re-themes on every draft. It applies the theme's camera preset, expands authored motion presets from the theme's camera presets, turns the named camera curves into the theme's curves, clamps camera zoom to the theme's limits, and gives every motion cue the theme's blur settings. Under `classic` the camera follows its authored timing and every value equals today's default, so nothing moves.

Applying the same theme twice changes nothing, so a plan that is already themed can pass through a composition that themes it again.

**Files:**
- Create: `src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.ts`
- Test: `src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.test.ts`
- Delete: `src/continuity/createContinuityShotFromCameraPreset.ts`
- Modify: `src/motion-components/motionSettings.ts` (docstring only)
- Modify: `src/continuity/continuityAppearance.ts`, `src/continuity/continuityAppearance.test.ts`
- Modify: `scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts`, `scripts/showcase/ShowcaseFilms/ShowcaseFilms.test.ts`, `scripts/showcase/render.ts`, `scripts/showcase/server.ts`
- Modify: `src/showcase/showcase.types.ts`, `src/showcase/LivePlayer.tsx`, `src/showcase/FilmComposition.tsx`
- Modify: `src/storyboard/ThemedStoryFilm/ThemedStoryFilm.tsx`, `src/Root.tsx`, `src/avandar-entry.tsx`, `scripts/video.ts`

- [ ] **Step 1: Write the failing tests**

`src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.test.ts`:

```ts
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { getCameraPose } from "../../motion-components/cameraTrack";
import { getMotionEasing, resolveMotionSettings } from "../../motion-components/motionSettings";
import { storyboardSchema } from "../../storyboard/schema/schema";
import { durationInFrames } from "../../storyboard/schema/timeline";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../../videoTheme/resolveVideoTheme/resolveVideoTheme";
import { createThemePatchFromLegacyAppearance } from "../../videoTheme/themePatches/themePatches";
import { createContinuityPlanFromOptions } from "../continuityAppearance";
import { CONTINUITY_CATALOG } from "../continuityCatalog";
import {
  createContinuityPlanFromVideoTheme,
  createMotionOptionsFromTheme,
} from "./createContinuityPlanFromVideoTheme";
import type { MotionOptions } from "../../motion-components/motionSettings";
import type { Storyboard } from "../../storyboard/schema/schema";
import type { CameraPresetName } from "../../videoTheme/themePatches/themePatches";
import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";

const PRESETS = ["deliberate", "gentle", "balanced", "brisk", "whip"] as const;
const CLASSIC = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic");
const CLASSIC_BLUR = { samples: 10, velocityBlurFactor: 0.09, velocityBlurLimit: 3, transitionBlur: 12 };

function _classicWith(patch: VideoThemePatch) {
  return resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", { patches: [patch] });
}

function _classicWithCamera(cameraPreset: CameraPresetName) {
  return _classicWith(createThemePatchFromLegacyAppearance({ cameraPreset }));
}

function _readPlan(path: string): Storyboard {
  return storyboardSchema.parse(
    JSON.parse(fs.readFileSync(new URL(`../../../storyboards/${path}.json`, import.meta.url), "utf8")),
  );
}

const PLANS = CONTINUITY_CATALOG.map((entry) => ({ id: entry.id, plan: _readPlan(entry.path) }));
const HANDOFF = _readPlan("explainers/study-shared-object-handoff");

function _cameraKeys(plan: Storyboard) {
  return plan.shots.flatMap((shot) =>
    shot.scene !== "continuity"
      ? []
      : shot.props.beats.flatMap((beat) => (beat.content.kind === "stock" ? (beat.content.camera ?? []) : [])),
  );
}

/** Every camera pose of every stock beat, frame by frame, with the beat's options or the given ones. */
function _cameraPoses(plan: Storyboard, options?: MotionOptions) {
  return plan.shots.flatMap((shot) =>
    shot.scene !== "continuity"
      ? []
      : shot.props.beats.flatMap((beat) => {
          const content = beat.content;
          return content.kind === "stock" && content.camera
            ? Array.from({ length: beat.duration }, (_, frame) =>
                getCameraPose(content.camera, frame, true, options ?? content.cameraOptions),
              )
            : [];
        }),
  );
}

test("a motion preset expands from the theme's camera presets", () => {
  assert.deepEqual(createMotionOptionsFromTheme({ preset: "whip" }, CLASSIC.semantic), {
    speed: 1.5,
    shutterAngle: 240,
    easing: "ease-in-out-cubic",
    ...CLASSIC_BLUR,
  });
});

test("authored motion values win over the theme", () => {
  const options = createMotionOptionsFromTheme({ preset: "whip", speed: 2, samples: 4 }, CLASSIC.semantic);
  assert.deepEqual([options.speed, options.samples, options.shutterAngle], [2, 4, 240]);
});

test("a cue without a preset keeps its own timing and curve and takes the theme's blur", () => {
  assert.deepEqual(createMotionOptionsFromTheme(undefined, CLASSIC.semantic), { shutterAngle: 180, ...CLASSIC_BLUR });
});

test("a theme's preset speed reaches the motion", () => {
  const theme = _classicWith({ other: { video: { atomic: { cameraSpeed: { whip: 2 } } } } });
  assert.equal(createMotionOptionsFromTheme({ preset: "whip" }, theme.semantic).speed, 2);
});

test("the unthemed motion presets and blur defaults equal classic's", () => {
  for (const preset of PRESETS) {
    const themed = createMotionOptionsFromTheme({ preset }, CLASSIC.semantic);
    const unthemed = resolveMotionSettings({ preset });
    assert.deepEqual([themed.speed, themed.shutterAngle], [unthemed.speed, unthemed.shutterAngle], preset);
    for (const progress of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      assert.equal(getMotionEasing({ easing: themed.easing })(progress), getMotionEasing({ preset })(progress), preset);
    }
  }
  const { shutterAngle, samples, velocityBlurFactor, velocityBlurLimit, transitionBlur } = resolveMotionSettings();
  assert.deepEqual(createMotionOptionsFromTheme(undefined, CLASSIC.semantic), {
    shutterAngle,
    samples,
    velocityBlurFactor,
    velocityBlurLimit,
    transitionBlur,
  });
});

test("classic keeps every catalog film's timing and camera path", () => {
  for (const { id, plan } of PLANS) {
    const themed = createContinuityPlanFromVideoTheme(plan, CLASSIC);
    assert.equal(durationInFrames(themed), durationInFrames(plan), id);
    assert.deepEqual(_cameraPoses(themed), _cameraPoses(plan), id);
    assert.equal(storyboardSchema.safeParse(themed).success, true, id);
  }
});

test("a theme camera preset lengthens travel without truncating holds or modifying the plan", () => {
  const before = structuredClone(HANDOFF);
  const themed = createContinuityPlanFromVideoTheme(HANDOFF, _classicWithCamera("deliberate"));
  assert.deepEqual(HANDOFF, before);
  assert.ok(themed.shots[0].durationInFrames > HANDOFF.shots[0].durationInFrames);
  assert.deepEqual(themed.narration, HANDOFF.narration);
  const shot = themed.shots[0];
  const content = shot.scene === "continuity" ? shot.props.beats[0].content : undefined;
  assert.deepEqual(content?.kind === "stock" ? content.cameraOptions : undefined, {
    speed: 0.25,
    shutterAngle: 45,
    easing: [0.45, 0, 0.55, 1],
    ...CLASSIC_BLUR,
  });
});

test("every theme camera preset moves the camera exactly as the matching motion preset", () => {
  for (const preset of PRESETS) {
    const themed = createContinuityPlanFromVideoTheme(HANDOFF, _classicWithCamera(preset));
    assert.deepEqual(_cameraPoses(themed), _cameraPoses(themed, { preset }), preset);
  }
});

test("every catalog film stays valid with every theme camera preset, which camera motion off ignores", () => {
  for (const { id, plan } of PLANS) {
    const still = createContinuityPlanFromOptions(plan, { cameraMotion: false });
    for (const preset of PRESETS) {
      const result = storyboardSchema.safeParse(createContinuityPlanFromVideoTheme(plan, _classicWithCamera(preset)));
      assert.equal(result.success, true, `${id}: ${preset}: ${result.error?.message}`);
      assert.deepEqual(
        createContinuityPlanFromVideoTheme(still, _classicWithCamera(preset)),
        createContinuityPlanFromVideoTheme(still, CLASSIC),
        `${id}: ${preset}`,
      );
    }
  }
});

test("applying the same theme twice changes nothing", () => {
  const theme = _classicWithCamera("gentle");
  const once = createContinuityPlanFromVideoTheme(HANDOFF, theme);
  assert.deepEqual(createContinuityPlanFromVideoTheme(once, theme), once);
});

test("the theme's zoom limit keeps every camera key inside it and inside the diagram", () => {
  const theme = _classicWith({ other: { video: { atomic: { zoom: { max: 1.5 } } } } });
  assert.ok(_cameraKeys(HANDOFF).some((key) => key.zoom > 1.5));
  for (const { id, plan } of PLANS) {
    const themed = createContinuityPlanFromVideoTheme(plan, theme);
    assert.ok(_cameraKeys(themed).every((key) => key.zoom <= 1.5), id);
    assert.equal(storyboardSchema.safeParse(themed).success, true, id);
  }
});

test("a camera curve that overshoots its framings is refused", () => {
  const theme = _classicWith({ other: { video: { semantic: { camera: { easing: { push: "$atomic.easing.outBack" } } } } } });
  assert.throws(() => createContinuityPlanFromVideoTheme(HANDOFF, theme), /camera\.easing\.push/);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement the module**

`src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.ts`:

```ts
import { retimeCameraTrack } from "../../motion-components/cameraTrack";
import { motionOptionsSchema } from "../../motion-components/motionSettings";
import { resolveVideoThemeFromSnapshot } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { getContinuityTimeline } from "../continuityTimeline";
import { isCameraSafeEasing } from "../../videoTheme/cameraEasing/cameraEasing";
import type { MotionEasing, MotionOptions } from "../../motion-components/motionSettings";
import type { Storyboard } from "../../storyboard/schema/schema";
import type { EasingValue, ResolvedRange, ResolvedVideoTheme } from "../../videoTheme/videoTheme.types";
import type { VideoThemeSnapshot } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { ContinuityBeat } from "../continuitySchema";

type ThemeSemantic = ResolvedVideoTheme["semantic"];
type MotionPresetName = NonNullable<MotionOptions["preset"]>;
type ContinuityShot = Extract<Storyboard["shots"][number], { scene: "continuity" }>;
type BeatContent = ContinuityBeat["content"];
type CameraKey = NonNullable<Extract<BeatContent, { kind: "stock" }>["camera"]>[number];
type CameraCurveName = "glide" | "push" | "whip";
type CameraTheme = Readonly<{
  curves: Readonly<Record<CameraCurveName, MotionEasing>>;
  zoom: ResolvedRange;
  presetOptions: MotionOptions | undefined;
}>;

/** The stock diagram a continuity camera frames. */
const STOCK_CANVAS = { width: 960, height: 600 };
const CAMERA_CURVE_NAMES: ReadonlySet<string> = new Set(["glide", "push", "whip"]);
const presetNameSchema = motionOptionsSchema.shape.preset.unwrap();

/**
 * A theme curve as a camera curve. The resolver already rejects curves that
 * are not camera-safe, so the throw only guards a theme that skipped it.
 */
function _toMotionEasing(easing: EasingValue, tokenPath: string): MotionEasing {
  if (!isCameraSafeEasing(easing)) {
    throw new Error(`${tokenPath}: a camera curve must keep its control points between 0 and 1, or be the cubic in-out`);
  }
  if ("powerInOut" in easing) {
    return "ease-in-out-cubic";
  }
  const [x1, y1, x2, y2] = easing;
  return [x1, y1, x2, y2];
}

function _presetMotionOptions(preset: MotionPresetName, semantic: ThemeSemantic): MotionOptions {
  const camera = semantic.camera.presets[preset];
  return {
    speed: camera.speed,
    shutterAngle: camera.shutter,
    easing: _toMotionEasing(camera.easing, `camera.presets.${preset}.easing`),
  };
}

/**
 * Motion options with the theme filled in. A named preset becomes the
 * theme's speed, shutter, and curve for that preset, and every cue gets the
 * theme's blur samples and limits. Values the storyboard authored win.
 * Without a preset, speed and curve stay unset, so the cue keeps its
 * authored timing and its own fallback curve.
 */
export function createMotionOptionsFromTheme(
  options: MotionOptions | undefined,
  semantic: ThemeSemantic,
): MotionOptions {
  const { preset, ...authored }: MotionOptions = options ?? {};
  const blur = semantic.motionBlur;
  return {
    ...(preset ? _presetMotionOptions(preset, semantic) : { shutterAngle: blur.shutter }),
    samples: blur.samples,
    velocityBlurFactor: blur.velocityFactor,
    velocityBlurLimit: blur.velocityMax,
    transitionBlur: blur.transitionBlur,
    ...authored,
  };
}

/** Reads every camera token once, so a plan's shots share one conversion. */
function _cameraTheme(semantic: ThemeSemantic): CameraTheme {
  const { easing, zoom, preset } = semantic.camera;
  const presetName = presetNameSchema.safeParse(preset);
  return {
    curves: {
      glide: _toMotionEasing(easing.glide, "camera.easing.glide"),
      push: _toMotionEasing(easing.push, "camera.easing.push"),
      whip: _toMotionEasing(easing.whip, "camera.easing.whip"),
    },
    zoom,
    presetOptions: presetName.success ? createMotionOptionsFromTheme({ preset: presetName.data }, semantic) : undefined,
  };
}

function _isCameraCurveName(ease: string): ease is CameraCurveName {
  return CAMERA_CURVE_NAMES.has(ease);
}

/**
 * A camera key with the theme's curve for its named ease and its zoom inside
 * the theme's limits. A clamped key moves its centre just enough to keep the
 * wider or tighter view inside the diagram.
 */
function _themeCameraKey(key: CameraKey, camera: CameraTheme): CameraKey {
  const ease = key.ease;
  const curve = typeof ease === "string" && _isCameraCurveName(ease) ? camera.curves[ease] : ease;
  const zoom = Math.min(camera.zoom.max, Math.max(camera.zoom.min, key.zoom));
  if (zoom === key.zoom) {
    return { ...key, ease: curve };
  }
  const halfWidth = STOCK_CANVAS.width / 2 / zoom;
  const halfHeight = STOCK_CANVAS.height / 2 / zoom;
  return {
    ...key,
    ease: curve,
    zoom,
    x: Math.min(STOCK_CANVAS.width - halfWidth, Math.max(halfWidth, key.x)),
    y: Math.min(STOCK_CANVAS.height - halfHeight, Math.max(halfHeight, key.y)),
  };
}

function _themeContent(
  content: BeatContent,
  semantic: ThemeSemantic,
  camera: CameraTheme,
  presetOptions: MotionOptions | undefined,
): BeatContent {
  if (content.kind === "composite") {
    return {
      ...content,
      diagrams: content.diagrams.map((diagram) => ({
        ...diagram,
        overlay: { ...diagram.overlay, motion: createMotionOptionsFromTheme(diagram.overlay.motion, semantic) },
      })),
    };
  }
  if (content.kind !== "stock") {
    return content;
  }
  const { camera: keys, cameraOptions, flight } = content;
  return {
    ...content,
    ...(keys
      ? {
          camera: keys.map((key) => _themeCameraKey(key, camera)),
          cameraOptions: presetOptions ?? createMotionOptionsFromTheme(cameraOptions, semantic),
        }
      : {}),
    // A flight blurs only when its motion is authored, so absent motion stays absent.
    ...(flight?.motion ? { flight: { ...flight, motion: createMotionOptionsFromTheme(flight.motion, semantic) } } : {}),
  };
}

/** Frames a themed camera route needs beyond the authored one, so reading holds keep their length. */
function _addedCameraFrames(authored: BeatContent, themed: BeatContent): number {
  if (authored.kind !== "stock" || themed.kind !== "stock" || !authored.camera?.length || !themed.camera?.length) {
    return 0;
  }
  const before = retimeCameraTrack(authored.camera, authored.cameraOptions);
  const after = retimeCameraTrack(themed.camera, themed.cameraOptions);
  return Math.max(0, after[after.length - 1].at - before[before.length - 1].at);
}

function _themeBeat(
  beat: ContinuityBeat,
  semantic: ThemeSemantic,
  camera: CameraTheme,
  presetOptions: MotionOptions | undefined,
): ContinuityBeat {
  const content = _themeContent(beat.content, semantic, camera, presetOptions);
  return {
    ...beat,
    duration: beat.duration + _addedCameraFrames(beat.content, content),
    transition: { ...beat.transition, motion: createMotionOptionsFromTheme(beat.transition.motion, semantic) },
    content,
  };
}

function _themeShot(shot: ContinuityShot, semantic: ThemeSemantic, camera: CameraTheme): ContinuityShot {
  const presetOptions = shot.props.cameraMotion ? camera.presetOptions : undefined;
  const beats = shot.props.beats.map((beat) => _themeBeat(beat, semantic, camera, presetOptions));
  const isRetimed = beats.some((beat, index) => beat.duration !== shot.props.beats[index].duration);
  if (!isRetimed) {
    return { ...shot, props: { ...shot.props, beats } };
  }
  const timeline = getContinuityTimeline(beats);
  return { ...shot, durationInFrames: timeline[timeline.length - 1].end, props: { ...shot.props, beats } };
}

/**
 * A storyboard with its continuity shots fitted to a video theme. The
 * theme's camera preset retimes camera travel where camera motion is on,
 * authored motion presets take the theme's speed, shutter, and curve, camera
 * curves and zoom limits come from the theme, and every motion cue gets the
 * theme's blur settings. Reading holds keep their length, other shots are
 * returned as they are, and the plan is not modified. Applying the same
 * theme twice changes nothing.
 */
export function createContinuityPlanFromVideoTheme(
  plan: Storyboard,
  theme: Pick<ResolvedVideoTheme, "semantic">,
): Storyboard {
  const { semantic } = theme;
  const camera = _cameraTheme(semantic);
  return {
    ...plan,
    shots: plan.shots.map((shot) => (shot.scene === "continuity" ? _themeShot(shot, semantic, camera) : shot)),
  };
}

/**
 * `createContinuityPlanFromVideoTheme` with a snapshot's theme, resolved for
 * `overrideIds` (the film or plan id). Use it wherever a themed film's frames
 * are counted, so the count matches the picture.
 */
export function createContinuityPlanFromVideoThemeSnapshot(
  plan: Storyboard,
  snapshot: VideoThemeSnapshot | undefined,
  overrideIds: readonly string[],
): Storyboard {
  return createContinuityPlanFromVideoTheme(plan, resolveVideoThemeFromSnapshot(snapshot, overrideIds));
}
```

Why `classic` changes nothing:
- `transition.motion`, `cameraOptions`, and overlay motion gain `shutterAngle` 180, `samples` 10, and the blur defaults, which equal `resolveMotionSettings` without options. A cue without a preset gets no `speed` or `easing`, so `getMotionDuration` keeps the authored frames and `getMotionEasing` keeps each call site's fallback curve.
- The named camera eases become `[0.45, 0, 0.55, 1]` (glide), `[0.16, 1, 0.3, 1]` (push), and `"ease-in-out-cubic"` (whip). `getCameraPose` builds them with `bezier(...)` and `EASE.inOutCubic`, the same functions `EASE.inOut`, `EASE.out`, and `EASE.inOutCubic` are, so every pose is the same float.
- Every authored zoom lies inside 1 to 3, so no key is clamped, and with no preset no beat gains frames, so each shot keeps its authored `durationInFrames`.

Run the Step 1 command. Expected: 12 passing.

- [ ] **Step 3: Say where the blur options come from**

In `src/motion-components/motionSettings.ts`, replace the docstring above `motionOptionsSchema`:

```ts
/** Serializable overrides shared by JSX components and storyboard motion cues. */
```

with

```ts
/**
 * Serializable overrides shared by JSX components and storyboard motion
 * cues. In a continuity shot, `createContinuityPlanFromVideoTheme` expands a
 * preset and fills the shutter, samples, and blur fields from the video
 * theme; a value the storyboard authors overrides the theme for that cue.
 */
```

- [ ] **Step 4: Stop retiming in the appearance options**

In `src/continuity/continuityAppearance.ts`:
1. Delete `import { createContinuityShotFromCameraPreset } from "./createContinuityShotFromCameraPreset";`.
2. Replace `/** Apply editorial options and camera timing without mutating authored inputs. */` with `/** Apply the render switches without mutating authored inputs. Values the video theme owns are ignored here. */`.
3. Replace the block Task 24 wrote:

```ts
  // Palette and roughness reach the renderer through the theme (see
  // createThemePatchFromLegacyAppearance), never through shot props.
  const {
    captions: _captions,
    cameraPreset,
```

with

```ts
  // Palette, roughness, and the camera preset reach the renderer through the
  // theme (see createThemePatchFromLegacyAppearance), never through shot props.
  const {
    captions: _captions,
    cameraPreset: _cameraPreset,
```

4. Replace

```ts
      const styled = { ...shot, props: { ...shot.props, ...appearance } };
      return cameraPreset &&
        cameraPreset !== "authored" &&
        styled.props.cameraMotion
        ? createContinuityShotFromCameraPreset(styled, cameraPreset)
        : styled;
```

with

```ts
      return { ...shot, props: { ...shot.props, ...appearance } };
```

Then delete the old module: `git rm src/continuity/createContinuityShotFromCameraPreset.ts`.

In `src/continuity/continuityAppearance.test.ts`, delete the tests `camera presets extend travel without truncating holds or mutating authored plans` and `every catalog film remains valid with every camera preset` (the new module's tests replace them), and add:

```ts
test("the camera preset option leaves timing to the video theme", () => {
  const plan = _readFirstPlan();
  assert.deepEqual(
    createContinuityPlanFromOptions(plan, { cameraPreset: "deliberate" }),
    createContinuityPlanFromOptions(plan, {}),
  );
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/continuity/continuityAppearance.test.ts`
Expected: all pass.

- [ ] **Step 5: Theme the plan where a film meets its theme**

`scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts`:
1. Add `import { createContinuityPlanFromVideoThemeSnapshot } from "../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";`.
2. In `_legacyThemePatches`, replace

```ts
  const { accent, background, annotationRoughness, boxRoughness } = options;
  const legacy = { accent, background, annotationRoughness, boxRoughness };
```

with

```ts
  const { accent, background, annotationRoughness, boxRoughness, cameraPreset } = options;
  const legacy = { accent, background, annotationRoughness, boxRoughness, cameraPreset };
```

and change its docstring to `/** The gallery's palette, roughness, and camera preset controls for a continuity film, as theme patches. */`.
3. In the storyboard branch, replace `    frames: durationInFrames(configuredPlan),` with:

```ts
    // The film keeps the authored plan; FilmComposition applies the theme,
    // whose camera preset can lengthen beats.
    frames: durationInFrames(createContinuityPlanFromVideoThemeSnapshot(configuredPlan, base.theme, [id])),
```

In `scripts/showcase/ShowcaseFilms/ShowcaseFilms.test.ts`, in `camera preset exports include the complete extended timeline`, replace

```ts
  assert.ok(adjusted.frames > original.frames);
  assert.equal(
    adjusted.frames,
    adjusted.plan!.shots.reduce(
      (total, shot) => total + shot.durationInFrames,
      0,
    ),
  );
  const shot = adjusted.plan!.shots[0];
  assert.equal(
    shot.scene === "continuity" &&
      shot.props.beats[0].content.kind === "stock" &&
      shot.props.beats[0].content.cameraOptions?.preset,
    "deliberate",
  );
```

with

```ts
  assert.ok(adjusted.frames > original.frames);
  const drawn = createContinuityPlanFromVideoThemeSnapshot(adjusted.plan!, adjusted.theme, [adjusted.id]);
  assert.equal(
    adjusted.frames,
    drawn.shots.reduce((total, shot) => total + shot.durationInFrames, 0),
  );
  const shot = drawn.shots[0];
  assert.equal(
    shot.scene === "continuity" &&
      shot.props.beats[0].content.kind === "stock" &&
      shot.props.beats[0].content.cameraOptions?.speed,
    0.25,
  );
```

and add the same `createContinuityPlanFromVideoThemeSnapshot` import (from `../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme`). The film now keeps its authored plan, and the camera preset reaches it through the theme.

`src/showcase/showcase.types.ts`: replace `  plan?: Storyboard;` in `Film` with:

```ts
  /**
   * The authored plan with the viewer's render switches applied. Draw it and
   * count its frames through `createContinuityPlanFromVideoThemeSnapshot(plan,
   * theme, [id])`, because the theme's camera preset can lengthen beats.
   */
  plan?: Storyboard;
```

`scripts/showcase/render.ts`:
1. Add `import { createContinuityPlanFromVideoThemeSnapshot } from "../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";`.
2. After `const inputProps = { film, withAudio: false };` add:

```ts
  // Preview frames and the audio mix follow the plan the film draws.
  const plan = film.plan
    ? createContinuityPlanFromVideoThemeSnapshot(film.plan, film.theme, [film.id])
    : undefined;
```

3. Replace

```ts
    const samples = film.plan
      ? previewFrames(film.plan)
```

with

```ts
    const samples = plan
      ? previewFrames(plan)
```

4. Replace

```ts
  if (film.plan) {
    await mixAudio(film.plan, directory, picture, final);
```

with

```ts
  if (plan) {
    await mixAudio(plan, directory, picture, final);
```

`scripts/showcase/server.ts`: add `import { createContinuityPlanFromVideoThemeSnapshot } from "../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";` and replace `    const files = captionFiles(film.plan);` with:

```ts
    // Caption timing follows the theme's camera preset.
    const files = captionFiles(createContinuityPlanFromVideoThemeSnapshot(film.plan, film.theme, [film.id]));
```

`src/showcase/LivePlayer.tsx`:
1. Add `import { createContinuityPlanFromVideoThemeSnapshot } from "../continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";`.
2. Replace the block from `const previewPlan =` through the end of the `theme` memo that Task 24 added:

```ts
  const previewPlan =
    film.plan && continuity
      ? createContinuityPlanFromOptions(film.plan, appearance)
      : film.plan;
  const previewFrames = previewPlan
    ? durationInFrames(previewPlan)
    : film.frames;
  // The gallery's palette and roughness controls apply as the last theme patch.
  const theme = useMemo(
    () =>
      addPatchesToVideoThemeSnapshot(
        film.theme ?? CLASSIC_VIDEO_THEME_SNAPSHOT,
        continuity ? [createThemePatchFromLegacyAppearance(appearance)] : [],
      ),
    [film.theme, continuity, appearance],
  );
```

with

```ts
  // The gallery's palette, roughness, and camera preset controls apply as
  // the last theme patch.
  const theme = useMemo(
    () =>
      addPatchesToVideoThemeSnapshot(
        film.theme ?? CLASSIC_VIDEO_THEME_SNAPSHOT,
        continuity ? [createThemePatchFromLegacyAppearance(appearance)] : [],
      ),
    [film.theme, continuity, appearance],
  );
  const previewPlan = useMemo(
    () =>
      film.plan && continuity
        ? createContinuityPlanFromOptions(film.plan, appearance)
        : film.plan,
    [film.plan, continuity, appearance],
  );
  // Count frames with the theme applied: its camera preset can lengthen beats.
  const previewFrames = useMemo(
    () =>
      previewPlan
        ? durationInFrames(createContinuityPlanFromVideoThemeSnapshot(previewPlan, theme, [film.id]))
        : film.frames,
    [previewPlan, theme, film.id, film.frames],
  );
```

`src/showcase/FilmComposition.tsx`:
1. Add `import { useMemo } from "react";` and `import { createContinuityPlanFromVideoThemeSnapshot } from "../continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";`.
2. In `FilmComposition`, add before `return (`:

```tsx
  // The picture and its audio cues follow the themed plan, the same plan the
  // film's frame count came from.
  const themedFilm = useMemo(
    () =>
      film.plan
        ? { ...film, plan: createContinuityPlanFromVideoThemeSnapshot(film.plan, film.theme, [film.id]) }
        : film,
    [film],
  );
```

and replace `<FilmPicture film={film} withAudio={withAudio} />` with `<FilmPicture film={themedFilm} withAudio={withAudio} />`.

`src/storyboard/ThemedStoryFilm/ThemedStoryFilm.tsx`:
1. Add `import { useMemo } from "react";` and `import { createContinuityPlanFromVideoThemeSnapshot } from "../../continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";`.
2. Add as the first line of `ThemedStoryFilm`:

```tsx
  const themedPlan = useMemo(() => createContinuityPlanFromVideoThemeSnapshot(plan, theme, [plan.id]), [plan, theme]);
```

and replace `<StoryFilm plan={plan} productScene={productScene} />` with `<StoryFilm plan={themedPlan} productScene={productScene} />`.

`src/Root.tsx` and `src/avandar-entry.tsx`: add `import { createContinuityPlanFromVideoThemeSnapshot } from "./continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";`, and in the story-film `calculateMetadata` replace `durationInFrames: durationInFrames(plan),` with:

```ts
            durationInFrames: durationInFrames(createContinuityPlanFromVideoThemeSnapshot(plan, props.theme, [plan.id])),
```

`scripts/video.ts`: add `import { createContinuityPlanFromVideoThemeSnapshot } from "../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";`, and replace the block Task 6 wrote at the end of `main`:

```ts
  else {
    // Only the two commands that draw a picture load a theme.
    const theme = await loadVideoThemeSnapshot({ id: options.theme ?? "classic" });
    if (options.command === "preview")
      console.log("Inspect preview:", await preview(plan, options.filename, workspace, theme));
    else console.log("Finished video:", await render(plan, options.filename, workspace, theme));
  }
```

with

```ts
  else {
    // Only the two commands that draw a picture load a theme. Its camera
    // preset can lengthen beats, so the stills, the audio mix, and the gates
    // use the themed plan. The composition themes it again, which changes
    // nothing.
    const theme = await loadVideoThemeSnapshot({ id: options.theme ?? "classic" });
    const themedPlan = createContinuityPlanFromVideoThemeSnapshot(plan, theme, [plan.id]);
    if (options.command === "preview")
      console.log("Inspect preview:", await preview(themedPlan, options.filename, workspace, theme));
    else console.log("Finished video:", await render(themedPlan, options.filename, workspace, theme));
  }
```

- [ ] **Step 6: Verify and commit**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.test.ts src/continuity/continuityAppearance.test.ts scripts/showcase/ShowcaseFilms/themedFilms.test.ts scripts/showcase/ShowcaseFilms/ShowcaseFilms.test.ts tests/video-cli.test.ts`
Expected: all pass except the three known `ShowcaseFilms.test.ts` failures.
Run both typecheck commands. Expected: no errors. `grep -rn "createContinuityShotFromCameraPreset" src scripts` prints nothing.
Run: `pnpm theme:parity compare`. Expected: parity passes.
Run: `pnpm video validate storyboards/explainers/study-shared-object-handoff.json`. Expected: `"valid": true`.

```bash
git add src/continuity src/motion-components/motionSettings.ts scripts/showcase/ShowcaseFilms scripts/showcase/render.ts scripts/showcase/server.ts src/showcase/showcase.types.ts src/showcase/LivePlayer.tsx src/showcase/FilmComposition.tsx src/storyboard/ThemedStoryFilm/ThemedStoryFilm.tsx src/Root.tsx src/avandar-entry.tsx scripts/video.ts
git commit -m "feat(video-producer): take camera and motion presets from the video theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 31: Animations finish at the slowest tempo

Spec §5.2: at tempo 0.75, every in-scope animation finishes before its loop or beat ends. Tempo stretches only one-shot animations (durations and staggers), never cue frames or repeating motion, so a stock graphic has finished exactly when its picture at tempo 0.75 equals its picture at tempo 1. The test lives under `scripts/` so it can reuse plan 1's parity target lists.

**Files:**
- Test: `scripts/videoTheme/__tests__/animations-finish-at-the-slowest-tempo.integration.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
/*
 * At the slowest tempo (0.75) every in-scope animation still finishes
 * before its stock loop or continuity beat ends. Tempo stretches only
 * one-shot animations, never cue frames or repeating motion, so a stock
 * graphic has finished when its picture at the slowest tempo equals its
 * picture at tempo 1.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CONTINUITY_CATALOG } from "../../../src/continuity/continuityCatalog";
import { sampleStockFrame } from "../../../src/continuity/continuityTimeline";
import { getMotionDuration } from "../../../src/motion-components/motionSettings";
import { StockGraphic } from "../../../src/stock/StockGraphic";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";
import { BUILT_IN_VIDEO_THEMES } from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { createVideoMotion } from "../../../src/videoTheme/createVideoMotion/createVideoMotion";
import { resolveVideoTheme } from "../../../src/videoTheme/resolveVideoTheme/resolveVideoTheme";
import { VideoThemeScope } from "../../../src/videoTheme/VideoThemeScope/VideoThemeScope";
import { PARITY_COMPOSITION_IDS, PARITY_STOCK_PRESET_IDS } from "../themeParity/parityTargets/parityTargets";
import type { ContinuityBeat } from "../../../src/continuity/continuitySchema";
import type { ComponentProps } from "react";

type GraphicRequest = Omit<ComponentProps<typeof StockGraphic>, "frame">;

const SLOWEST_TEMPO = { other: { video: { atomic: { tempo: { md: 0.75 } } } } };
/** The last frame of a 180-frame stock loop. */
const LAST_LOOP_FRAME = 179;
/** Cue frames from `ContinuityToken`: the shared object fades in at 12 and an outline starts fading 60 frames into its beat. */
const SHARED_OBJECT_FADE_IN_AT = 12;
const OUTLINE_FADE_AT = 60;

const slowest = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", { patches: [SLOWEST_TEMPO] });
const motion = createVideoMotion(slowest.semantic.motion);

function _picture(request: GraphicRequest, frame: number, isSlowest: boolean): string {
  const graphic = <StockGraphic {...request} frame={frame} />;
  return renderToStaticMarkup(
    isSlowest ? <VideoThemeScope patches={[SLOWEST_TEMPO]}>{graphic}</VideoThemeScope> : graphic,
  );
}

function _readContinuityShots(id: string): readonly (readonly ContinuityBeat[])[] {
  const entry = CONTINUITY_CATALOG.find((candidate) => candidate.id === id);
  assert.ok(entry, id);
  const plan = storyboardSchema.parse(
    JSON.parse(fs.readFileSync(new URL(`../../../storyboards/${entry.path}.json`, import.meta.url), "utf8")),
  );
  return plan.shots.flatMap((shot) => (shot.scene === "continuity" ? [shot.props.beats] : []));
}

const COMPOSITIONS = PARITY_COMPOSITION_IDS.map((id) => ({ id, shots: _readContinuityShots(id) }));

/** The last beat-local frame before the next beat's transition starts covering this one. */
function _readableEnd(beats: readonly ContinuityBeat[], index: number): number {
  const next = beats[index + 1];
  const outgoing = next ? getMotionDuration(next.transition.frames, next.transition.motion) : 0;
  return beats[index].duration - outgoing - 1;
}

/** When each tempo-scaled stage animation of a beat ends, in beat-local frames. */
function _stageAnimationEnds(beats: readonly ContinuityBeat[], index: number): Readonly<Record<string, number>> {
  const { Heading, SharedObject } = slowest.components;
  const token = beats[index].token;
  return {
    heading: motion.scale(Heading.entranceDuration),
    ...(index === 0 && token ? { sharedObjectFadeIn: SHARED_OBJECT_FADE_IN_AT + motion.scale(SharedObject.fadeIn) } : {}),
    ...(token?.appearance === "outline" ? { outlineFade: OUTLINE_FADE_AT + motion.scale(SharedObject.outlineFade) } : {}),
  };
}

test("every in-scope stock loop finishes its animations before the loop ends", () => {
  for (const preset of PARITY_STOCK_PRESET_IDS) {
    assert.equal(_picture({ preset }, LAST_LOOP_FRAME, true), _picture({ preset }, LAST_LOOP_FRAME, false), preset);
  }
});

test("every in-scope composition's stage animations finish inside their beats", () => {
  for (const { id, shots } of COMPOSITIONS) {
    for (const beats of shots) {
      for (const [index, beat] of beats.entries()) {
        const readableEnd = _readableEnd(beats, index);
        for (const [name, end] of Object.entries(_stageAnimationEnds(beats, index))) {
          assert.ok(end <= readableEnd, `${id} ${beat.id} ${name} ends at ${end}, readable until ${readableEnd}`);
        }
      }
    }
  }
});

test("every nested stock graphic has settled before its beat stops being readable", () => {
  for (const { id, shots } of COMPOSITIONS) {
    for (const beats of shots) {
      for (const [index, beat] of beats.entries()) {
        const content = beat.content;
        if (content.kind === "stock") {
          const frame = sampleStockFrame(_readableEnd(beats, index), content.settleFrame);
          assert.equal(_picture(content.request, frame, true), _picture(content.request, frame, false), `${id} ${beat.id}`);
        }
      }
    }
  }
});
```

- [ ] **Step 2: Run it**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/videoTheme/__tests__/animations-finish-at-the-slowest-tempo.integration.test.tsx`
Expected: 3 passing. The latest one-shot animation in scope is `query-column-cache-growth`'s growth, cued at frame 106 for 33 frames: at tempo 0.75 it lasts 44 frames and ends at frame 150, exactly the settle frame of `spatial-continuation`'s second beat. Every in-scope beat is at least 240 frames, so the 24-frame heading entrance and the 26.7-frame outline fade fit.

A failure names the preset or beat whose animation outlasts it. Do not shorten the animation or move its cue to pass: cue timing is content. Stop and report the failing item with its end frame, because the fix needs a content decision.

- [ ] **Step 3: Commit**

```bash
git add scripts/videoTheme/__tests__/animations-finish-at-the-slowest-tempo.integration.test.tsx
git commit -m "test(video-producer): prove in-scope animations finish at the slowest tempo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 32: Posters per theme

Spec §4.4: posters move to `showcase/assets/atlas/<themeId>/<id>.jpg`, `pnpm atlas:posters --theme <id> [ids]` renders them, `classic` and `avandar` posters are tracked, and a card whose theme has no poster shows the `classic` one with a "Preview in classic theme" badge. This plan has no active-theme picker, so every card asks for `classic`; plan 3 passes the active theme through the new `themeId` prop.

**Files:**
- Modify: `scripts/showcase/atlasPosters/atlasPosters.test.ts`
- Modify: `scripts/showcase/atlasPosters/renderAtlasPosters.ts`
- Move: `showcase/assets/atlas/*.jpg` to `showcase/assets/atlas/classic/`
- Create: `showcase/assets/atlas/avandar/*.jpg` (rendered)
- Modify: `src/continuity/gallery/CompositionCard/CompositionCard.tsx`, `CompositionCard.module.css`
- Modify: `src/gallery/locales/en/messages.po` and its compiled catalog (generated)

- [ ] **Step 1: Write the failing poster tests**

Replace `scripts/showcase/atlasPosters/atlasPosters.test.ts` with:

```ts
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { CONTINUITY_CATALOG } from "../../../src/continuity/continuityCatalog";
import { appRoot } from "../ShowcaseFilms/ShowcaseFilms";

const POSTERS = path.join(appRoot, "showcase/assets/atlas");
/** Themes with tracked posters. A card in any other theme falls back to `classic`. */
const POSTER_THEME_IDS = ["classic", "avandar"] as const;

async function _readPosterNames(themeId: string): Promise<readonly string[]> {
  return fs.readdir(path.join(POSTERS, themeId)).catch(() => []);
}

for (const themeId of POSTER_THEME_IDS) {
  test(`every composition and sample film has a tracked ${themeId} poster`, async () => {
    const posters = new Set(await _readPosterNames(themeId));
    const missing = CONTINUITY_CATALOG.filter((entry) => !posters.has(`${entry.id}.jpg`)).map((entry) => entry.id);
    assert.deepEqual(
      missing,
      [],
      `Run pnpm atlas:posters --theme ${themeId} ${missing.join(" ")} to render the missing posters.`,
    );
  });

  test(`no ${themeId} poster outlives its catalog entry`, async () => {
    const ids = new Set(CONTINUITY_CATALOG.map((entry) => `${entry.id}.jpg`));
    assert.deepEqual((await _readPosterNames(themeId)).filter((file) => !ids.has(file)), []);
  });
}

test("posters live only in theme folders", async () => {
  const entries = await fs.readdir(POSTERS, { withFileTypes: true });
  assert.deepEqual(
    entries.filter((entry) => !entry.isDirectory()).map((entry) => entry.name),
    [],
  );
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/showcase/atlasPosters/atlasPosters.test.ts`
Expected: FAIL. Both theme folders are missing and the posters sit at the top level.

- [ ] **Step 2: Render posters per theme**

In `scripts/showcase/atlasPosters/renderAtlasPosters.ts`:

1. Add imports:

```ts
import { createContinuityPlanFromVideoThemeSnapshot } from "../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { VIDEO_THEME_SLUG_PATTERN } from "../../../src/videoTheme/videoThemeSchema/videoThemeSchema";
```

2. Replace

```ts
/** Tracked card posters for the Atlas Compositions and Sample films sections. */
const ATLAS_POSTER_DIRECTORY: string = path.join(
  appRoot,
  "showcase/assets/atlas",
);
```

with

```ts
/**
 * Tracked card posters for the Atlas Compositions and Sample films sections,
 * one folder per theme.
 */
const ATLAS_POSTER_ROOT: string = path.join(appRoot, "showcase/assets/atlas");

const USAGE = "Usage: pnpm atlas:posters [--theme id] [composition ids...]";

/** `[--theme id] [ids...]`. The theme defaults to `classic`. */
function _parseArgs(argv: readonly string[]): Readonly<{ themeId: string; ids: readonly string[] }> {
  const flag = argv.indexOf("--theme");
  if (flag === -1) {
    return { themeId: "classic", ids: argv };
  }
  const themeId = argv[flag + 1];
  if (!themeId || !VIDEO_THEME_SLUG_PATTERN.test(themeId) || argv.indexOf("--theme", flag + 1) !== -1) {
    throw new Error(USAGE);
  }
  return { themeId, ids: argv.filter((_, position) => position !== flag && position !== flag + 1) };
}
```

3. Change the signature and docstring of `renderAtlasPosters` to:

```ts
/**
 * Render a still for each named composition or sample film, or for the whole
 * continuity catalog when no ids are given, in one theme, into that theme's
 * tracked poster folder.
 */
async function renderAtlasPosters(ids: readonly string[], themeId: string) {
```

4. In its `ShowcaseFilms.load(entry.id, { ... })` options, add `theme: { id: themeId },` after `captions: false,`.
5. Replace `await fs.mkdir(ATLAS_POSTER_DIRECTORY, { recursive: true });` with:

```ts
  const posterDirectory = path.join(ATLAS_POSTER_ROOT, themeId);
  await fs.mkdir(posterDirectory, { recursive: true });
```

6. Replace `const frame = film.plan ? getPosterFrameFromPlan(film.plan) : 0;` with:

```ts
      // The theme's camera preset can lengthen beats, so find the poster
      // frame in the plan the film draws.
      const frame = film.plan
        ? getPosterFrameFromPlan(createContinuityPlanFromVideoThemeSnapshot(film.plan, film.theme, [film.id]))
        : 0;
```

7. Replace `const output = path.join(ATLAS_POSTER_DIRECTORY, `${film.id}.jpg`);` with `const output = path.join(posterDirectory, `${film.id}.jpg`);`.
8. Replace the last line, `await renderAtlasPosters(process.argv.slice(2));`, with:

```ts
const { themeId, ids } = _parseArgs(process.argv.slice(2));
await renderAtlasPosters(ids, themeId);
```

- [ ] **Step 3: Move the classic posters and render both themes**

```bash
mkdir -p showcase/assets/atlas/classic
git mv showcase/assets/atlas/*.jpg showcase/assets/atlas/classic/
pnpm atlas:posters --theme classic
pnpm atlas:posters --theme avandar
```

Both renders need the Remotion license and headless Chrome, and each takes several minutes. Expected for `classic`: `git status --short showcase/assets/atlas/classic` lists no changes, or only films that draw the radial-network, node-traversal, or orbital-system captions or halos (the spec §1.6 consolidations). Open `showcase/assets/atlas/avandar/shared-object-handoff.jpg` and `showcase/assets/atlas/avandar/frame-to-interface.jpg` and check by eye: Avandar colours, radii, and type on the graphics and the stage, and the reenactment in `frame-to-interface` unchanged from its `classic` poster.

Run the Step 1 command. Expected: 5 passing.

- [ ] **Step 4: Fall back to the classic poster on a card**

Replace the body of `src/continuity/gallery/CompositionCard/CompositionCard.tsx` from `type Props = {` to the end with:

```tsx
type Props = {
  entry: ContinuityCatalogEntry;
  category: string;
  /** The active video theme. A theme with no poster shows the `classic` one. */
  themeId?: string;
  onOpen: (id: string) => void;
};

/** The posters a card tries in order: the theme's, then `classic`'s. */
function _posterSources(id: string, themeId: string): readonly string[] {
  return [...new Set([themeId, "classic"])].map((theme) => `assets/atlas/${theme}/${id}.jpg`);
}

/**
 * A composition or sample film card. Its thumbnail is the tracked poster
 * that `pnpm atlas:posters --theme <id>` renders from the live composition,
 * falling back to the `classic` poster with a badge when the active theme
 * has none. The live player itself opens in the preview modal.
 */
export function CompositionCard({ entry, category, themeId = "classic", onOpen }: Props) {
  const { t } = useLingui();
  const translate = useContinuityCopy();
  const [failedSources, setFailedSources] = useState<ReadonlySet<string>>(() => new Set());
  const sources = _posterSources(entry.id, themeId);
  const poster = sources.find((source) => !failedSources.has(source));
  const seconds = Math.round(entry.frames / 30);
  return (
    <AtlasCard
      title={translate(entry.title)}
      category={category}
      description={translate(entry.description)}
      reference={entry.id}
      badge={
        <span className="card-state">
          <i />
          {isSceneEntry(entry) ? t`STORYBOARD SCENES` : t`CONTINUITY`} ·{" "}
          {t`${seconds} SEC`}
        </span>
      }
      thumbnail={
        poster === undefined ? (
          <span className={css.missing}>{t`NO POSTER YET`}</span>
        ) : (
          <>
            <img
              key={poster}
              className={css.poster}
              src={poster}
              alt=""
              loading="lazy"
              onError={() => setFailedSources((failed) => new Set([...failed, poster]))}
            />
            {poster === sources[0] ? null : <span className={css.fallback}>{t`Preview in classic theme`}</span>}
          </>
        )
      }
      onOpen={() => onOpen(entry.id)}
    />
  );
}
```

`key={poster}` remounts the image when it falls back, so the fallback gets its own load and error events.

Append to `CompositionCard.module.css`:

```css
.fallback {
  background: var(--ava-neutral-9);
  border-radius: 4px;
  bottom: 8px;
  color: var(--ava-neutral-4);
  font: 9px var(--mono);
  left: 8px;
  letter-spacing: 1px;
  padding: 3px 6px;
  position: absolute;
}
```

Run: `pnpm gallery:messages`. Expected: `src/gallery/locales/en/messages.po` gains `Preview in classic theme` and its compiled catalog updates.

- [ ] **Step 5: Verify and commit**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/showcase/atlasPosters/atlasPosters.test.ts`. Expected: 5 passing.
Run both typecheck commands. Expected: no errors.
Run `pnpm showcase`, open the Compositions section, and check that every card shows its poster with no badge (`classic` is requested and present).

```bash
git add showcase/assets/atlas scripts/showcase/atlasPosters src/continuity/gallery/CompositionCard src/gallery/locales
git commit -m "feat(video-producer): render and show Atlas posters per theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 33: Every token has a reader

Spec §1.2: a token exists only if an in-scope renderer reads it, or it is a Mantine-native key. This audit finds readers four ways and then follows references, because a token that only a live token references (for example `color.textMuted` under every muted type role) is live too.

| Reader | How the audit sees it |
| --- | --- |
| Stock shapes | The usage collector, while the twelve presets render at five frames |
| The plan builder | A usage proxy around the semantic tokens while `createContinuityPlanFromVideoTheme` themes the five compositions under every camera preset |
| Stage CSS modules | `var(--video-*)` names in `src/continuity` and `src/motion-components`, matched to the token that emits them (spec correction 7) |
| Stage TSX | `useVideoProps("Name"` calls, and token paths written in source, such as `sketch.annotation.roughness` |

Two semantic groups are menus of interchangeable choices, like an atomic scale: `sketch.profile` and `camera.presets`. One member in use keeps the whole menu.

**Files:**
- Test: `scripts/videoTheme/__tests__/every-token-has-a-reader.integration.test.tsx`

- [ ] **Step 1: Write the audit**

```tsx
/*
 * No dead tokens: every catalog token outside Mantine's own keys is read by
 * an in-scope renderer, or referenced by a token that is. Readers are found
 * four ways: stock shapes report reads while the in-scope presets render,
 * the continuity plan builder reports reads through a usage proxy, stage CSS
 * modules name `--video-*` variables, and stage TSX names token paths or
 * calls `useVideoProps("Name"`. `sketch.profile` and `camera.presets` are
 * menus: one member in use keeps the whole menu, like an atomic scale.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CONTINUITY_CATALOG } from "../../../src/continuity/continuityCatalog";
import { createContinuityPlanFromVideoTheme } from "../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { StockGraphic } from "../../../src/stock/StockGraphic";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";
import { BUILT_IN_VIDEO_THEMES } from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { getValueAtPath } from "../../../src/videoTheme/getResolvedTokenValue/getResolvedTokenValue";
import { resolveVideoTheme } from "../../../src/videoTheme/resolveVideoTheme/resolveVideoTheme";
import { getTargetFromTokenReference, isTokenReference } from "../../../src/videoTheme/themeReferences/themeReferences";
import { createThemePatchFromLegacyAppearance } from "../../../src/videoTheme/themePatches/themePatches";
import { SEMANTIC_TOKENS } from "../../../src/videoTheme/tokenCatalog/semanticTokens";
import { isMantineTokenRoot, listTokenDefinitions } from "../../../src/videoTheme/tokenCatalog/tokenCatalog";
import {
  createTokenUsageCollector,
  createTokenUsageProxy,
  VideoTokenUsageContext,
} from "../../../src/videoTheme/tokenUsage/tokenUsage";
import { PARITY_COMPOSITION_IDS, PARITY_STOCK_PRESET_IDS } from "../themeParity/parityTargets/parityTargets";
import type { VideoThemeDocument } from "../../../src/videoTheme/videoTheme.types";

const SAMPLE_FRAMES = [0, 45, 90, 135, 179];
const CAMERA_PRESETS = ["authored", "deliberate", "gentle", "balanced", "brisk", "whip"] as const;
const STAGE_SOURCE_DIRECTORIES = ["src/continuity", "src/motion-components"];
const PALETTE_GROUPS = ["sketch.profile", "camera.presets"];

const TOKEN_PATHS = listTokenDefinitions()
  .map((entry) => entry.path)
  .filter((tokenPath) => !isMantineTokenRoot(tokenPath.split(".")[0]));
const TOKEN_PATH_SET: ReadonlySet<string> = new Set(TOKEN_PATHS);

function _stockReads(): readonly string[] {
  const collector = createTokenUsageCollector();
  for (const preset of PARITY_STOCK_PRESET_IDS) {
    for (const frame of SAMPLE_FRAMES) {
      renderToStaticMarkup(
        <VideoTokenUsageContext.Provider value={collector.report}>
          <StockGraphic preset={preset} frame={frame} />
        </VideoTokenUsageContext.Provider>,
      );
    }
  }
  return collector.getPaths();
}

function _planBuilderReads(): readonly string[] {
  const collector = createTokenUsageCollector();
  const plans = PARITY_COMPOSITION_IDS.map((id) => {
    const entry = CONTINUITY_CATALOG.find((candidate) => candidate.id === id);
    assert.ok(entry, id);
    return storyboardSchema.parse(
      JSON.parse(fs.readFileSync(new URL(`../../../storyboards/${entry.path}.json`, import.meta.url), "utf8")),
    );
  });
  for (const cameraPreset of CAMERA_PRESETS) {
    const patch = createThemePatchFromLegacyAppearance({ cameraPreset });
    const theme = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", { patches: [patch] });
    const semantic = createTokenUsageProxy({ value: theme.semantic, catalog: SEMANTIC_TOKENS, basePath: [], report: collector.report });
    plans.forEach((plan) => createContinuityPlanFromVideoTheme(plan, { semantic }));
  }
  return collector.getPaths();
}

/** The text of every stage renderer file with one of the extensions, tests and gallery UI excluded. */
function _readStageSources(pattern: RegExp): string {
  return STAGE_SOURCE_DIRECTORIES.flatMap((directory) => {
    const root = new URL(`../../../${directory}/`, import.meta.url);
    return fs
      .readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((file) => pattern.test(file) && !file.includes(".test.") && !file.includes("gallery"))
      .map((file) => fs.readFileSync(new URL(file, root), "utf8"));
  }).join("\n");
}

function _kebab(segment: string): string {
  return segment.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^-/, "");
}

/** The `--video-*` name a token's variables start with, as `buildVideoCssVariables` writes them. */
function _variablePrefix(tokenPath: string): string {
  const [root, ...rest] = tokenPath.split(".");
  return root === "components"
    ? `--video-component-${rest.map(_kebab).join("-")}`
    : `--video-${[root, ...rest].map(_kebab).join("-")}`;
}

function _cssReads(): readonly string[] {
  const names = new Set([..._readStageSources(/\.css$/).matchAll(/var\((--video-[a-z0-9-]+)/g)].map((match) => match[1]));
  const owners = TOKEN_PATHS.filter((tokenPath) => !tokenPath.startsWith("atomic."))
    .map((tokenPath) => ({ tokenPath, prefix: _variablePrefix(tokenPath) }))
    .sort((left, right) => right.prefix.length - left.prefix.length);
  return [...names].flatMap((name) => {
    const owner = owners.find(({ prefix }) => name === prefix || name.startsWith(`${prefix}-`));
    return owner ? [owner.tokenPath] : [];
  });
}

function _scriptReads(): readonly string[] {
  const source = _readStageSources(/\.tsx?$/);
  const components = new Set([...source.matchAll(/useVideoProps\("(\w+)"/g)].map((match) => match[1]));
  return TOKEN_PATHS.filter((tokenPath) => {
    const [root, name] = tokenPath.split(".");
    if (root === "components") {
      return components.has(name);
    }
    return root !== "atomic" && new RegExp(`(?<![\\w$])${tokenPath.replaceAll(".", "\\.")}(?!\\w)`).test(source);
  });
}

/** The raw value of a token in a theme file, before references resolve. */
function _rawValue(document: VideoThemeDocument, tokenPath: string): unknown {
  const [root, ...rest] = tokenPath.split(".");
  if (root === "components") {
    return getValueAtPath(document, ["components", rest[0], "defaultProps", ...rest.slice(1)]);
  }
  return root === "atomic"
    ? getValueAtPath(document, ["other", "video", "atomic", ...rest])
    : getValueAtPath(document, ["other", "video", "semantic", root, ...rest]);
}

function _referencedTokenPaths(value: unknown): readonly string[] {
  if (isTokenReference(value)) {
    const target = getTargetFromTokenReference(value);
    if (target.tier === "primary" || target.tier === "mantine") {
      return [];
    }
    const segments = target.tier === "atomic" ? ["atomic", ...target.path] : [...target.path];
    const prefixes = segments.map((_, index) => segments.slice(0, segments.length - index).join("."));
    return prefixes.filter((prefix) => TOKEN_PATH_SET.has(prefix)).slice(0, 1);
  }
  return typeof value === "object" && value !== null ? Object.values(value).flatMap(_referencedTokenPaths) : [];
}

/** A token plus, when it belongs to a menu group, every other choice in that menu. */
function _withPaletteSiblings(tokenPath: string): readonly string[] {
  const group = PALETTE_GROUPS.find((prefix) => tokenPath.startsWith(`${prefix}.`));
  return group ? TOKEN_PATHS.filter((candidate) => candidate.startsWith(`${group}.`)) : [tokenPath];
}

/** Every token read directly, plus every token a live token references in a built-in theme. */
function _liveTokenPaths(directReads: readonly string[]): ReadonlySet<string> {
  const documents = [...BUILT_IN_VIDEO_THEMES.values()];
  const live = new Set<string>();
  const pending: string[] = [];
  const markLive = (tokenPath: string) => {
    for (const member of _withPaletteSiblings(tokenPath)) {
      if (!live.has(member)) {
        live.add(member);
        pending.push(member);
      }
    }
  };
  directReads.filter((tokenPath) => TOKEN_PATH_SET.has(tokenPath)).forEach(markLive);
  for (let tokenPath = pending.pop(); tokenPath !== undefined; tokenPath = pending.pop()) {
    const current = tokenPath;
    documents.flatMap((document) => _referencedTokenPaths(_rawValue(document, current))).forEach(markLive);
  }
  return live;
}

test("every reader source finds tokens, so a broken collector cannot pass the audit", () => {
  for (const [name, reads] of Object.entries({
    stock: _stockReads(),
    planBuilder: _planBuilderReads(),
    css: _cssReads(),
    script: _scriptReads(),
  })) {
    assert.ok(reads.length > 0, name);
  }
});

test("every token is read by an in-scope renderer or referenced by one that is", () => {
  const live = _liveTokenPaths([..._stockReads(), ..._planBuilderReads(), ..._cssReads(), ..._scriptReads()]);
  assert.deepEqual(TOKEN_PATHS.filter((tokenPath) => !live.has(tokenPath)), []);
});
```

- [ ] **Step 2: Run it**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/videoTheme/__tests__/every-token-has-a-reader.integration.test.tsx`
Expected: 2 passing. Every token this plan added has a reader in its task, and plan 1's camera and blur tokens are read by `createContinuityPlanFromVideoTheme` (Task 30).

- [ ] **Step 3: Resolve any token the audit lists**

A failure lists dead paths. For each one:
1. Search for a reader the audit cannot see: `grep -rn "<last path segment>" src/continuity src/motion-components src/stock src/videoTheme`. If a renderer reads it through a pattern the audit misses (for example a computed key), stop and report the pattern and file: the audit needs a new reader rule, not a deleted token.
2. Otherwise delete the token from its catalog file under `src/videoTheme/tokenCatalog/`, from `themes/classic.theme.json`, and from `scripts/videoTheme/createAvandarTheme` if that module writes it (then run `pnpm theme:sync-avandar`), and update any plan 1 test that names it.
3. Run both typecheck commands. A type error naming the deleted token means a renderer reads it: restore the token and treat it as in point 1.

Re-run the Step 2 command until it passes, and list every deleted token in the commit body.

- [ ] **Step 4: Verify and commit**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/videoThemeSchema/videoThemeSchema.test.ts src/videoTheme/builtInVideoThemes/builtInVideoThemes.test.ts scripts/videoTheme/__tests__/every-token-has-a-reader.integration.test.tsx`
Expected: all pass.
Run: `pnpm theme:parity compare`. Expected: parity passes.

```bash
git add scripts/videoTheme/__tests__/every-token-has-a-reader.integration.test.tsx
git commit -m "test(video-producer): fail when a design token has no reader" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

If Step 3 deleted tokens, also add `src/videoTheme/tokenCatalog themes scripts/videoTheme` and use the subject `refactor(video-producer): remove design tokens no renderer reads`, with the deleted paths in the body.

---
### Task 34: Final verification

No new code. This task proves the plan's two promises: `classic` is unchanged, and `avandar` renders every in-scope item through the full frame gate (spec §5.1).

- [ ] **Step 1: Run every unit test**

Run: `pnpm test`
Expected: everything passes except the four known failures listed in the conventions (three in `ShowcaseFilms.test.ts`, one in `editor-controls.test`). Any other failure is a regression. Fix it in a new commit that names the task it belongs to.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors from either project.

- [ ] **Step 3: Run the full parity gate**

Run: `pnpm theme:parity compare`
Expected: every target reports `unexplainedPixels` 0 and `missingFrames` 0.

- [ ] **Step 4: Render every in-scope stock preset in both themes**

```bash
for theme in classic avandar; do
  for preset in network-graph node-traversal radial-network plexus-field orbital-system data-pipeline predicate-pushdown-boundary code-focus schema-mapping query-column-cache-growth source-merge decision-fork; do
    pnpm motion preview "$preset" --theme "$theme" && pnpm motion render "$preset" --theme "$theme" || echo "FAILED: $theme $preset"
  done
done
```

Expected: no `FAILED` line. Each render runs `scripts/render.sh`, whose frame gate (`check-frames.mjs`) must pass. Inspect the `avandar` contact sheets the previews print: Avandar colours, radii, and type, and no text overflowing a slot (see the overflow note in Step 6).

- [ ] **Step 5: Render every in-scope composition in both themes**

```bash
for theme in classic avandar; do
  for id in shared-object-handoff frame-to-interface aperture-detail spatial-continuation occlusion-wipe; do
    plan="storyboards/explainers/study-$id.json"
    pnpm video preview "$plan" --theme "$theme" && pnpm video render "$plan" --theme "$theme" || echo "FAILED: $theme $id"
  done
done
```

Expected: no `FAILED` line; each render's gate passes. In the `avandar` stills, the reenactment in `frame-to-interface` keeps the product's own theme while the stage around it is restyled.

- [ ] **Step 6: Check one export end to end**

Run `pnpm showcase`, open `shared-object-handoff` in the Compositions section, pick a camera preset and a palette colour, and download the MP4. Open its `delivery.json`: `themeId` is `classic` and `themeHash` differs from an export without those choices, because the gallery's controls now reach the render as a theme patch. The MP4 matches the preview, including the camera timing.

Known limitation to report, not fix: stock text sizes are validated against measured Arial widths at `classic` sizes (`FitTextSize`, the label schemas). A theme that enlarges a graphic type role or changes its family can overflow a slot. The parity and frame gates do not measure text fit.

- [ ] **Step 7: Confirm the branch is clean**

Run: `git status --short`
Expected: no output. Run `git log --oneline develop..HEAD` and confirm at least one commit for each of Tasks 1 through 33.

