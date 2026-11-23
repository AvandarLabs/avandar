# Video design tokens, plan 3 of 3: editor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every video design token editable from the Atlas preview modals through one reusable editor, with live previews, per-item overrides, saved themes, theme-accurate MP4 exports, and documentation.

**Architecture:** A pure draft model (`src/videoThemeEditor/themeDraft`) records edits as sparse patches over the saved theme, one for the whole theme and one per item, kept in localStorage per theme. `VideoThemeEditor` is a controlled component that walks plan 1's token catalog to build rows and controls, so any producer surface can host it. The gallery owns one draft state (`GalleryVideoTheme`), wraps each preview (never the chrome) in its own video theme provider built from that item's draft, sends the live player a `VideoThemeSnapshot` and waits for its resolved hash before allowing a download, and sends exports `theme: { id, patch }`. Every draft resolves through one rule (`createDraftThemeTarget`): a preview shows exactly the document saving would produce, so a built-in theme's draft resolves as the unsaved new theme that "Save as new theme" would create. Chrome controls keep their own `MantineProvider`, so the gallery theme and the video theme never style each other.

**Tech stack:** React 19, Mantine 9.2 (`Tabs`, `Accordion`, `ColorInput`, `NumberInput`, `Slider`, `SegmentedControl`, `Switch`, `Badge`, `Alert`, `Select` through `AtlasSelect`), Lingui 6, zod 4, Remotion Player, Playwright, node:test with tsx.

**Spec:** `docs/superpowers/specs/2026-11-12-video-design-tokens-design.md`, §2.2, §2.4, §3, §4.3, §4.4, §4.5, §5.2 (Usage), §5.3. Plans 1 (`docs/superpowers/plans/2026-11-13-video-design-tokens-1-model.md`) and 2 are complete before this plan starts.

---

## Conventions for every task

- Paths are relative to `apps/ava-video-producer/`. Every command runs from that directory. A path that starts with `<repo>/` is relative to the repository root.
- Run one test file with:
  `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test <file>`
- Typecheck with `pnpm exec tsc --noEmit` (for `src/`) and `pnpm exec tsc --noEmit -p tsconfig.tools.json` (for `scripts/` and `tests/`).
- Run one end-to-end spec with the showcase on port 4183. In one terminal: `PORT=4183 pnpm showcase`. In another: `pnpm exec playwright test -c playwright.motion.config.ts <spec file name>`. Never run the whole suite.
- Unit tests cannot render components that use `@lingui/react/macro`, because tsx does not run the Lingui macro. Unit-test the pure modules; the end-to-end specs cover the components.
- Follow `<repo>/docs/rules/typescript.md` and `<repo>/docs/rules/testing.md`: `type` over `interface`, no `any`, no `as unknown as`, `_`-prefixed private helpers, functions of 45 lines or fewer, a docstring on every export that says what it is for, and tests named for the behavior they assert.
- Every string a viewer sees goes through Lingui: `t` from `useLingui()` (`@lingui/react/macro`) or `<Trans>`. Catalog labels and descriptions go through `useTokenCopy`. Use Mantine components and style props, CSS modules for styles, inline `style` only for values computed at runtime (colour chips, specimens), `clsx` for conditional classes, and no Tailwind. No em dashes in copy or comments.
- Mantine popovers render inside the native `<dialog>`: pass `withinPortal: false` (through `popoverProps` or `comboboxProps`) on every component with a dropdown. `AtlasSelect` already does this.
- Commit after every task in this worktree. End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Contract needs from plans 1 and 2

Plan 1's "To be built by plan 2" table covers most of what this plan uses. Plan 1 also exports `isCameraSafeEasing(easing)` from `src/videoTheme/cameraEasing/cameraEasing.ts` (true for a bezier whose control points all lie in 0..1, or `{ powerInOut: 3 }`), and its resolver reports any other curve at `camera.easing.<name>` and `camera.presets.<name>.easing`. Tasks 6, 11, and 12 offer only those curves for camera tokens. This plan builds on plan 2 as follows. If plan 2 named or placed any of them differently, update the import paths in this plan before starting.

| # | Need | Plan 2 shape |
| --- | --- | --- |
| 1 | Camera timing from a theme | `createContinuityPlanFromVideoTheme(plan, theme)` and `createContinuityPlanFromVideoThemeSnapshot(plan, snapshot, overrideIds)` in `src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.ts` (its Task 30). A `Film` keeps its authored plan and `FilmComposition` themes it, so the live player (Task 18) passes the unthemed preview plan and counts preview frames through the snapshot function. |
| 2 | Legacy bridge location | `createThemePatchFromLegacyAppearance`, with its `LegacyAppearance` and `CameraPresetName` types and `_sketchProfile` helper, lives in `src/videoTheme/themePatches/themePatches.ts` beside `createThemePatchFromStockColors`, which `StockGraphic` keeps using (its Task 3). Its callers are `LivePlayer` (its Tasks 24 and 30), `_legacyThemePatches` in `ShowcaseFilms` (its Tasks 24 and 30), and three tests: `src/continuity/camera/stockTransparency.test.ts` (its Task 8), `createContinuityPlanFromVideoTheme.test.ts` (its Task 30), and `every-token-has-a-reader.integration.test.tsx` (its Task 33). Task 18 replaces `LivePlayer`; Task 20 removes the rest and only the legacy part of the module. |
| 3 | Gallery appearance at the end of plan 2 | `continuityAppearanceSchema` still holds `accent`, `background`, `annotationRoughness`, `boxRoughness`, and `cameraPreset`, so today's controls keep working. Task 19 removes them. |
| 4 | Snapshot helpers | `VideoThemeSnapshot`, `CLASSIC_VIDEO_THEME_SNAPSHOT`, `createVideoThemeSnapshot(library, themeId, patches = [])`, `addPatchesToVideoThemeSnapshot`, `createVideoThemeSourceFromSnapshot(snapshot, overrideIds)` (one cached source per snapshot and ids), and `resolveVideoThemeFromSnapshot(snapshot, overrideIds)`, all in `src/videoTheme/videoThemeSnapshot/videoThemeSnapshot.ts` (its Task 2). The gallery, the live player, and `delivery.json` all resolve through `resolveVideoThemeFromSnapshot`, so they agree on the hash. After Task 20 nothing here calls `addPatchesToVideoThemeSnapshot`; it stays as a tested helper. |
| 5 | One resolution per source | `VideoThemeProvider` and `VideoThemeScope` resolve each source object once through `resolveVideoThemeFromSource` (its Task 1), so a source must be treated as immutable. `GalleryItemTheme` (Task 15) memoizes its draft source, and every draft change makes a new one. |
| 6 | Film item ids | `FilmComposition` resolves a film with `createVideoThemeSourceFromSnapshot(film.theme, [film.id])`, where `film.id` is the catalog id (for example `shared-object-handoff`). |
| 7 | Server snapshots | `loadVideoThemeSnapshot({ id, patch? }, { directory })` in `scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.ts`, defaulting to `themes/` (its Task 4). Task 20 makes it build the snapshot through `createSnapshotFromThemeRequest`, so exports follow the draft rule. |
| 8 | Delivery record | `getDeliveryThemeFromFilm(film)` in `scripts/showcase/deliveryTheme/deliveryTheme.ts` writes `themeId` and `themeHash` into `delivery.json` (its Task 5). Task 20 makes it record a draft's saved base theme and a `themeDraft` flag. |
| 9 | Graphic hooks | Stock shapes read the theme through `useGraphicProps`, `useGraphicTokens`, and `useGraphicMotion` (its Task 7). They report reads through the same `VideoTokenUsageContext` as plan 1's hooks, so the usage collector (Task 7) sees stock graphics with no change. Their `classic` fallback without a provider never applies inside a gallery preview. |
| 10 | Font sizes | `classic` `fontSizes` are renumbered `3xs` to `9xl` (12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 30, 32 px), and the type roles point at the new keys (its Task 7): for example `text.stage.subtitle` and `text.stage.sharedObject` use `$fontSizes.7xl` (25 px) and `text.graphic.caption` uses `$fontSizes.lg` (17 px). Examples in this plan use these keys. |
| 11 | Card posters | `CompositionCard` takes `themeId` (default `classic`) and falls back to the `classic` poster with a "Preview in classic theme" badge (its Task 32). Task 19 passes the active theme. |
| 12 | Watch fixture | `tests/motion-watch.test.ts` copies `themes` (stock renders read the built-in themes). |
## Spec corrections this plan makes

Plan 1's corrections still apply. These are new.

| # | Spec says | This plan does | Why |
| --- | --- | --- | --- |
| 1 | The unsaved draft patch applies after scoped overrides | A preview resolves exactly the document saving would produce, through `createDraftThemeTarget`. A custom theme saves in place: its theme draft sits below its own saved per-item overrides and the item draft above them. A built-in theme can only be saved as a new theme: with a draft, everything resolves against an unsaved theme (`unsaved-draft`) that extends the built-in and has no overrides of its own, with the theme draft and item draft as patches. The editor, previews, the live player, and exports all apply this one rule. | Previews and MP4s must match what saving produces. A theme that extends a built-in does not inherit its per-item overrides (§1.1), so a theme-scope edit on `classic` recolours every composition (§1.7). |
| 2 | `VideoThemeEditor` props `{ schema, document, scope, usedTokens?, onChange(patch) }` | `{ library, themeId, draft, scope, item?, usedTokens?, onDraftChange, onScopeChange }` | The schema is plan 1's token catalog, which the editor imports. The draft carries both theme and item patches, so one change handler covers both scopes. |
| 3 | Item scope "per-token reset" | Reset clears a draft edit. A saved override shows a hollow dot and is removed by editing the theme file. | Patches merge, so a draft cannot delete a saved value. |
| 4 | Composite token edits | A draft can add or change an optional field of a composite token but not remove one; per-token reset reverts the whole token. Saving writes each composite whole. | Mantine's deep merge keeps fields a patch omits. |
| 5 | "Shows a changed on disk banner" via `/events` | The banner appears when a stored draft's base hash differs from the theme's current hash | The gallery already reloads on every `/events` publish, so the comparison has to survive the reload. |
| 6 | Translated editor copy | Resolver issue messages are English; the editor shows a translated lead sentence and the raw message as code | Plan 1's resolver builds its messages without Lingui. |
| 7 | (not covered) | The gallery Lingui macro transform and catalog include `src/videoThemeEditor/` | The editor lives outside `src/gallery` so other surfaces can host it. |
| 8 | §4.4 card fallback | Applies to Compositions and Sample films cards only | Motion cards render live, so they always show the active theme. |
| 9 | Design tokens tab in the Compositions modal | Scene studies (plain storyboard scenes) get no Design tokens tab | Their storyboard theme is out of scope (spec §4.6), so token edits would change nothing. |
| 10 | (not covered) | Transcript and caption downloads send `theme` and `cameraPreset` query parameters; the server turns them into a theme option | Caption timing depends on the camera preset, which is now a token. |
| 11 | (not covered) | The export request body cap grows from 8 KB to 8 KB plus the 256 KB theme cap | A theme patch can exceed 8 KB. |

## File map

Created:

| File | Responsibility |
| --- | --- |
| `docs/design/video-token-editor.md` | Recorded visual direction for the editor (Task 1) |
| `src/videoTheme/createDraftThemeTarget/createDraftThemeTarget.ts` | The draft rule: which theme a draft resolves as, and the reserved `DRAFT_THEME_ID` |
| `src/videoTheme/createSnapshotFromThemeRequest/createSnapshotFromThemeRequest.ts` | Export snapshots from `{ id, patch }` under the same draft rule |
| `src/videoThemeEditor/themeDraft/themeDraft.ts` | Pure draft model: path mapping, edits, draft sources, saved and new documents, snapshots, export themes |
| `src/videoThemeEditor/themeDraftStorage/themeDraftStorage.ts` | Draft and active-theme persistence |
| `src/videoThemeEditor/resolveDraftTheme/resolveDraftTheme.ts` | Draft resolution, validity, issues by token path |
| `src/videoThemeEditor/resolveDraftTheme/useDraftTheme.ts` | Draft resolution that keeps the last valid theme |
| `src/videoThemeEditor/resolveDraftTheme/useValidThemeDraft.ts` | The last draft safe to hand to previews |
| `src/videoThemeEditor/formatTokenValue/formatTokenValue.ts` | Short value text for rows and pickers |
| `src/videoThemeEditor/tokenRows/tokenRows.ts` | Rows, groups, filters, Essentials |
| `src/videoThemeEditor/referenceOptions/referenceOptions.ts` | Compatible reference targets for a picker |
| `src/videoThemeEditor/customTokenValue/customTokenValue.ts` | Custom values that become named scale entries |
| `src/videoThemeEditor/observedTokenUsage/observedTokenUsage.ts` | Subscribable usage collector |
| `src/videoThemeEditor/observedTokenUsage/useObservedTokenUsage.ts` | React binding for the collector |
| `src/videoThemeEditor/tokenCopy/buildTokenDescriptorsSource.ts` | Extractable Lingui descriptors for catalog copy |
| `src/videoThemeEditor/tokenCopy/tokenDescriptors.generated.ts` | Generated; never edited |
| `src/videoThemeEditor/tokenCopy/useTokenCopy.ts` | Translated catalog labels and descriptions |
| `src/videoThemeEditor/tokenCopy/useEditorCopy.ts` | Translated group, field, and enum option names |
| `scripts/videoTheme/buildTokenMessages/buildTokenMessages.ts` | Writes the generated descriptors |
| `src/videoThemeEditor/ThemeApi/ThemeApi.ts` | `/api/themes` client |
| `src/videoThemeEditor/useVideoThemeDraft/browserStorage.ts` | localStorage that never throws |
| `src/videoThemeEditor/useVideoThemeDraft/useThemeLibrary.ts` | Loaded themes and their hashes |
| `src/videoThemeEditor/useVideoThemeDraft/useActiveThemeId.ts` | `?theme=` and remembered selection |
| `src/videoThemeEditor/useVideoThemeDraft/useStoredDraft.ts` | Persisted draft with its base hash |
| `src/videoThemeEditor/useVideoThemeDraft/useThemeSaving.ts` | Save, save as new, status |
| `src/videoThemeEditor/useVideoThemeDraft/useVideoThemeDraft.ts` | The draft state shared by every modal |
| `src/videoThemeEditor/TokenEditorContext/TokenEditorContext.ts` | Edit functions and data for controls |
| `src/videoThemeEditor/controls/*` | Value, reference, colour role, composite, specimen, contrast controls |
| `src/videoThemeEditor/TokenControl/TokenControl.tsx` | Picks a control for a row |
| `src/videoThemeEditor/TokenRow/TokenRow.tsx` | One token: label, state, control, description, issue |
| `src/videoThemeEditor/VideoThemeEditor/*` | The controlled editor: toolbar, Essentials, tiers, sections |
| `src/videoThemeEditor/ThemeBar/ThemeBar.tsx`, `ChangedOnDiskBanner.tsx` | Theme picker and actions; changed-on-disk banner |
| `src/gallery/copyText/copyText.ts` | Clipboard copy with the local-HTTP fallback |
| `src/gallery/GalleryVideoTheme/GalleryVideoTheme.tsx`, `GalleryItemTheme.tsx` | Gallery draft context and per-preview scopes |
| `src/gallery/AtlasLayout/AtlasChromeProvider/AtlasChromeProvider.tsx` | The gallery chrome's Mantine provider |
| `src/gallery/AtlasLayout/AtlasPanelTabs/AtlasPanelTabs.tsx` | Details / Design tokens tabs |
| `src/gallery/VideoThemePanel/VideoThemePanel.tsx` | Theme bar, banner, and editor for one modal item |
| `src/showcase/filmTheme/filmTheme.ts` | Snapshot parsing, player acknowledgement, usage messages |
| `src/showcase/useFilmControl/useFilmControl.ts` | Live player message handling |
| `src/continuity/gallery/CompositionViewer/useCompositionTheme.ts` | Sends the snapshot, tracks the acknowledgement and usage |
| `scripts/showcase/captionFileOptions/captionFileOptions.ts` | Theme-aware caption download options |
| `tests/e2e/design-tokens.spec.ts` | Spec §5.3 |
| `docs/video-theme.md` | Tiers, file format, references, making a theme, the `/impeccable` workflow |

Modified: `lingui.gallery.config.ts`, `scripts/buildAtlas/createGalleryPlugin.mjs`, `scripts/buildAtlas/generateGalleryCopy.mjs`, `package.json`, `tests/motion-watch.test.ts`, `src/gallery/MotionGallery/{MotionGallery,useMotionGalleryState,MotionCard}.tsx`, `src/gallery/MotionGallery/PreviewDialog/{PreviewDialogContent,PreviewDetails,usePreviewDownload}`, `src/gallery/palette.ts`, `showcase/motion.css`, `showcase/download.d.ts`, `src/showcase/LivePlayer.tsx`, `src/continuity/continuityAppearance.ts` and its test, `src/continuity/gallery/CompositionViewer/*`, `src/continuity/gallery/CompositionGallery/CompositionGallery.tsx`, `scripts/showcase/server.ts`, `scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts` and its test, plan 2's `scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.ts`, `scripts/showcase/ShowcaseFilms/themedFilms.test.ts`, `scripts/showcase/deliveryTheme/deliveryTheme.ts` and its test, `src/videoTheme/themePatches/themePatches.ts` and its test, `src/continuity/camera/stockTransparency.test.ts`, `src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.test.ts`, and `scripts/videoTheme/__tests__/every-token-has-a-reader.integration.test.tsx`, plan 1's `scripts/showcase/themeStore/themeStore.ts` and its test, `tests/e2e/composition-appearance.spec.ts`, `playwright.motion.config.ts`, `<repo>/docs/video-producer-nomenclature.md`, `AGENTS.md`.

Deleted: `src/gallery/MotionGallery/PaletteControls.tsx`, `src/gallery/MotionGallery/PaletteSwatches.tsx`, `src/continuity/gallery/CompositionViewer/CameraPresetControl.tsx` and `.module.css`, `src/continuity/gallery/CompositionViewer/CompositionRoughnessControls.tsx`, `src/continuity/gallery/CompositionViewer/useCameraPresetOptions.ts`.

---

### Task 1: Contract check and design direction

The editor is a new surface, so its visual direction goes through `impeccable` before any UI code.

**Files:**
- Create: `docs/design/video-token-editor.md`

- [ ] **Step 1: Confirm plan 2's contract**

Run:

```bash
grep -n "export type VideoThemeSnapshot\|export const CLASSIC_VIDEO_THEME_SNAPSHOT\|export function createVideoThemeSnapshot\|export function createVideoThemeSourceFromSnapshot\|export function resolveVideoThemeFromSnapshot" src/videoTheme/videoThemeSnapshot/videoThemeSnapshot.ts
grep -rn "export function createContinuityPlanFromVideoTheme" src/continuity
grep -n "export function createThemePatchFromLegacyAppearance\|export function createThemePatchFromStockColors" src/videoTheme/themePatches/themePatches.ts
grep -n "export function getDeliveryThemeFromFilm" scripts/showcase/deliveryTheme/deliveryTheme.ts
grep -n "themeId?: string" src/continuity/gallery/CompositionCard/CompositionCard.tsx
grep -n "export function isCameraSafeEasing" src/videoTheme/cameraEasing/cameraEasing.ts
grep -n "theme" src/showcase/showcase.types.ts
```

Expected: five matches in `videoThemeSnapshot.ts`, two for `createContinuityPlanFromVideoTheme` and `createContinuityPlanFromVideoThemeSnapshot`, both theme patch functions, one each for the delivery record, the card's `themeId` prop, and `isCameraSafeEasing`, and `theme?:` on both `Film` and `FilmOptions`. If any is missing or named differently, stop and reconcile the names with plans 1 and 2 before continuing.

- [ ] **Step 2: Load `impeccable` and run its setup**

Invoke the `impeccable` skill for: "Design tokens tab inside the Atlas preview modal: a dense Operate-mode editor panel about 420 px wide, with a theme bar, a scope switch, Essentials, tier tabs, category accordions, and one row per token." Run its context script once with `--target src/gallery/AtlasLayout/AtlasDialog/AtlasDialog.tsx`, follow `reference/shape.md`, and read `reference/craft-floor.md` before writing any UI in later tasks.

- [ ] **Step 3: Record the direction**

Write `docs/design/video-token-editor.md` with the direction impeccable settles on. It must cover every heading below. The values here are what this plan's CSS modules assume; keep them unless the impeccable pass gives a concrete reason to change one, and if it does, update the CSS in Tasks 11 to 16 to match before writing them.

```markdown
# Video token editor: design direction

## Mode and job
Operate. A producer tunes a theme while watching the preview beside it. Scanning a long list and changing one value fast matters more than expression.

## Placement
The right column of the Atlas preview modal, under a Details / Design tokens tab pair. The tokens tab widens the column to 420 px. Under 800 px wide the column stacks below the player and takes the full width. When the active theme is built-in, a one-line muted notice under the theme picker says that its changes are saved as a new theme.

## Density and rhythm
Mantine size `xs` controls. 12 px body copy, 11 px descriptions, 10 px monospace token paths. 8 px between a row's parts, 12 px between rows, 1 px `--line` dividers between rows. The theme bar and toolbar stay visible while rows scroll.

## Colour
The gallery chrome variables only: `--ink` for labels, `--muted` for descriptions and paths, `--line` for dividers, `--paper` for the panel. `--ava-primary-6` marks an edited token (filled dot) and a saved override (hollow dot). Mantine `red` marks an issue. Video theme colours appear only inside chips, swatches, and specimens.

## States
Inherited values in item scope render at 60% opacity until edited. An issue adds a red left border and an alert line under the control. Disabled actions keep their label and explain themselves through the status line.

## Accessibility
Every control has a label naming its token, shows its value as text, and is keyboard operable. Status changes are announced through a polite live region. Focus rings use `--ava-primary-7` at 2 px.
```

- [ ] **Step 4: Commit**

```bash
git add docs/design/video-token-editor.md
git commit -m "docs(video-producer): record the token editor's design direction" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The draft target and the draft model

A preview must resolve exactly the document saving would produce. A custom theme saves in place. A built-in theme is read-only and saves as a new theme that extends it, and that new theme does not inherit the built-in's per-item overrides (spec §1.1). One shared module encodes the rule for the editor, the previews, the live player, and exports.

**Files:**
- Create: `src/videoTheme/createDraftThemeTarget/createDraftThemeTarget.ts`
- Test: `src/videoTheme/createDraftThemeTarget/createDraftThemeTarget.test.ts`
- Create: `src/videoThemeEditor/themeDraft/themeDraft.ts`
- Test: `src/videoThemeEditor/themeDraft/themeDraft.test.ts`

- [ ] **Step 1: Write the failing draft target tests**

`src/videoTheme/createDraftThemeTarget/createDraftThemeTarget.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES, createVideoThemeLibrary } from "../builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import { createDraftThemeTarget, DRAFT_THEME_ID } from "./createDraftThemeTarget";
import type { VideoThemeDocument, VideoThemeLibrary } from "../videoTheme.types";

const ORANGE_ACCENT = { other: { video: { semantic: { color: { accent: "$atomic.swatch.orange" } } } } };
const CLASSIC = BUILT_IN_VIDEO_THEMES.get("classic") as VideoThemeDocument;

/** Classic with a per-item accent override, like the accents classic authors per composition, plus a custom theme. */
const LIBRARY: VideoThemeLibrary = new Map<string, VideoThemeDocument>([
  ...createVideoThemeLibrary([{ schemaVersion: 1, id: "warm", label: "Warm", extends: "classic" }]),
  ["classic", { ...CLASSIC, overrides: { "network-graph": ORANGE_ACCENT } }],
]);

test("a custom theme is its own target", () => {
  const target = createDraftThemeTarget({ library: LIBRARY, themeId: "warm", hasDraft: true });
  assert.equal(target.library, LIBRARY);
  assert.equal(target.themeId, "warm");
});

test("a built-in theme without a draft is its own target", () => {
  assert.equal(createDraftThemeTarget({ library: LIBRARY, themeId: "classic", hasDraft: false }).themeId, "classic");
});

test("a built-in theme with a draft becomes an unsaved theme that extends it", () => {
  const target = createDraftThemeTarget({ library: LIBRARY, themeId: "classic", hasDraft: true });
  assert.equal(target.themeId, DRAFT_THEME_ID);
  assert.deepEqual(target.library.get(DRAFT_THEME_ID), {
    schemaVersion: 1,
    id: DRAFT_THEME_ID,
    label: "Classic",
    extends: "classic",
  });
});

test("the unsaved theme does not inherit the built-in's per-item overrides", () => {
  const scope = { overrideIds: ["network-graph"] };
  const target = createDraftThemeTarget({ library: LIBRARY, themeId: "classic", hasDraft: true });
  assert.equal(resolveVideoTheme(LIBRARY, "classic", scope).semantic.color.accent, "#f0ba83");
  assert.notEqual(resolveVideoTheme(target.library, target.themeId, scope).semantic.color.accent, "#f0ba83");
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/createDraftThemeTarget/createDraftThemeTarget.test.ts`
Expected: FAIL, `Cannot find module './createDraftThemeTarget'`.

- [ ] **Step 3: Implement the draft target**

`src/videoTheme/createDraftThemeTarget/createDraftThemeTarget.ts`:

```ts
import { BUILT_IN_VIDEO_THEME_IDS } from "../builtInVideoThemes/builtInVideoThemes";
import type { VideoThemeDocument, VideoThemeLibrary } from "../videoTheme.types";

/**
 * The reserved id of the unsaved theme a built-in theme's draft resolves as.
 * No theme file may use it: the theme store and Save as new theme refuse it.
 */
export const DRAFT_THEME_ID = "unsaved-draft";

/** The library and theme a draft resolves against. */
export type DraftThemeTarget = Readonly<{ library: VideoThemeLibrary; themeId: string }>;

/**
 * The theme a draft resolves as, so previews, the live player, and exports
 * all show exactly the document saving would produce. A custom theme saves
 * in place, so it is its own target. A built-in theme is read-only: saving
 * its draft creates a new theme that extends it, and per-item overrides are
 * not inherited through `extends`, so a built-in with a draft resolves as an
 * unsaved theme with no overrides of its own. A built-in with no draft is
 * itself, overrides included.
 */
export function createDraftThemeTarget(
  options: Readonly<{ library: VideoThemeLibrary; themeId: string; hasDraft: boolean }>,
): DraftThemeTarget {
  const { library, themeId, hasDraft } = options;
  if (!hasDraft || !(BUILT_IN_VIDEO_THEME_IDS as readonly string[]).includes(themeId)) {
    return { library, themeId };
  }
  const draftDocument: VideoThemeDocument = {
    schemaVersion: 1,
    id: DRAFT_THEME_ID,
    label: library.get(themeId)?.label ?? themeId,
    extends: themeId,
  };
  return {
    library: new Map<string, VideoThemeDocument>([...library, [DRAFT_THEME_ID, draftDocument]]),
    themeId: DRAFT_THEME_ID,
  };
}
```

Run the Step 2 command. Expected: 4 passing.

- [ ] **Step 4: Write the failing draft model tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { DRAFT_THEME_ID } from "../../videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { getValueAtPath } from "../../videoTheme/getResolvedTokenValue/getResolvedTokenValue";
import { CLASSIC_VIDEO_THEME_SNAPSHOT } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import {
  buildThemeIdFromLabel,
  countItemOverrides,
  createDraftPatchesForItem,
  createExportThemeFromDraft,
  createNewThemeDocument,
  createSavedDocumentFromDraft,
  createSnapshotFromDraft,
  EMPTY_THEME_DRAFT,
  getDocumentPathFromTokenPath,
  getTokenPathFromDocumentPath,
  listTokenPathsFromPatch,
  resetTokenInDraft,
  setTokenInDraft,
} from "./themeDraft";
import type { VideoThemeDocument } from "../../videoTheme/videoTheme.types";

const THEME = { kind: "theme" } as const;
const ITEM = { kind: "item", itemId: "network-graph" } as const;
const HEADING = {
  family: "$atomic.fontFamily.figtree",
  size: "$fontSizes.8xl",
  weight: "$atomic.fontWeight.bold",
  color: "$color.text",
};
const STUDIO: VideoThemeDocument = {
  schemaVersion: 1,
  id: "studio",
  label: "Studio",
  extends: "classic",
  other: { video: { atomic: { swatch: { ground: "#201510" } } } },
  overrides: {
    "network-graph": {
      other: { video: { semantic: { color: { accent: "$atomic.swatch.orange" } } } },
    },
  },
};
const LIBRARY = createVideoThemeLibrary([STUDIO]);

/** Classic with a per-item accent override, like the accents classic authors per composition. */
const CLASSIC_WITH_OVERRIDE = new Map<string, VideoThemeDocument>([
  ...BUILT_IN_VIDEO_THEMES,
  [
    "classic",
    {
      ...(BUILT_IN_VIDEO_THEMES.get("classic") as VideoThemeDocument),
      overrides: { "network-graph": { other: { video: { semantic: { color: { accent: "$atomic.swatch.orange" } } } } } },
    },
  ],
]);

test("token paths map to document paths and back in every tier", () => {
  for (const [tokenPath, documentPath] of [
    ["atomic.swatch.mint", "other.video.atomic.swatch.mint"],
    ["color.accent", "other.video.semantic.color.accent"],
    ["components.ProgressBar.height", "components.ProgressBar.defaultProps.height"],
    ["fontSizes.md", "fontSizes.md"],
  ] as const) {
    assert.equal(getDocumentPathFromTokenPath(tokenPath).join("."), documentPath);
    assert.equal(getTokenPathFromDocumentPath(documentPath.split(".")), tokenPath);
  }
});

test("a theme-scope edit lands in the draft patch", () => {
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "color.accent", "$atomic.swatch.cyan");
  assert.equal(
    getValueAtPath(draft.patch, ["other", "video", "semantic", "color", "accent"]),
    "$atomic.swatch.cyan",
  );
  assert.deepEqual(draft.overrides, {});
});

test("an item-scope edit lands in that item's override", () => {
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, ITEM, "stroke.default", "$atomic.strokeWidth.lg");
  assert.deepEqual(Object.keys(draft.overrides), ["network-graph"]);
  assert.deepEqual(draft.patch, {});
});

test("resetting an item's last edit removes its override", () => {
  const edited = setTokenInDraft(EMPTY_THEME_DRAFT, ITEM, "stroke.default", "$atomic.strokeWidth.lg");
  assert.deepEqual(resetTokenInDraft(edited, ITEM, "stroke.default").overrides, {});
});

test("patch token paths list each scale entry on its own", () => {
  assert.deepEqual(
    listTokenPathsFromPatch({
      other: { video: { atomic: { swatch: { mint: "#000000", cyan: "#111111" } } } },
    }),
    ["atomic.swatch.mint", "atomic.swatch.cyan"],
  );
});

test("saving replaces a composite token instead of merging its fields", () => {
  const base: VideoThemeDocument = {
    ...STUDIO,
    other: {
      video: {
        semantic: {
          text: { stage: { heading: { ...HEADING, letterSpacing: "$atomic.letterSpacing.tight" } } },
        },
      },
    },
  };
  const saved = createSavedDocumentFromDraft(
    base,
    setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "text.stage.heading", HEADING),
  );
  assert.deepEqual(
    getValueAtPath(saved, ["other", "video", "semantic", "text", "stage", "heading"]),
    HEADING,
  );
});

test("a new theme made from a built-in extends it and holds only the draft", () => {
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "atomic.swatch.mint", "#123456");
  assert.deepEqual(
    createNewThemeDocument({
      base: LIBRARY.get("classic") as VideoThemeDocument,
      draft,
      id: "minty",
      label: "Minty",
    }),
    {
      schemaVersion: 1,
      id: "minty",
      label: "Minty",
      extends: "classic",
      other: { video: { atomic: { swatch: { mint: "#123456" } } } },
    },
  );
});

test("a snapshot carries custom themes in its chain and leaves built-ins to the bundle", () => {
  const snapshot = createSnapshotFromDraft({
    library: LIBRARY,
    themeId: "studio",
    draft: EMPTY_THEME_DRAFT,
  });
  assert.deepEqual(
    snapshot.documents.map((document) => document.id),
    ["studio"],
  );
  assert.deepEqual(snapshot.patches, []);
});

test("an item's patches leave out theme edits its saved override already sets", () => {
  const draft = setTokenInDraft(
    setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "color.accent", "$atomic.swatch.cyan"),
    THEME,
    "stroke.default",
    "$atomic.strokeWidth.lg",
  );
  const [themePatch] = createDraftPatchesForItem({
    library: LIBRARY,
    themeId: "studio",
    draft,
    itemId: "network-graph",
  });
  assert.deepEqual(themePatch, {
    other: { video: { semantic: { stroke: { default: "$atomic.strokeWidth.lg" } } } },
  });
});

test("an export merges the theme and item drafts into one patch", () => {
  const draft = setTokenInDraft(
    setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "atomic.swatch.mint", "#000001"),
    ITEM,
    "atomic.swatch.cyan",
    "#000002",
  );
  assert.deepEqual(
    createExportThemeFromDraft({ library: LIBRARY, themeId: "studio", draft, itemId: "network-graph" }),
    {
      id: "studio",
      patch: { other: { video: { atomic: { swatch: { mint: "#000001", cyan: "#000002" } } } } },
    },
  );
});

test("an export of an unedited theme names only the theme", () => {
  assert.deepEqual(
    createExportThemeFromDraft({
      library: LIBRARY,
      themeId: "studio",
      draft: EMPTY_THEME_DRAFT,
      itemId: "network-graph",
    }),
    { id: "studio" },
  );
});

test("theme ids made from labels are unique slugs", () => {
  assert.equal(buildThemeIdFromLabel("Warm Studio!", ["warm-studio"]), "warm-studio-2");
});

test("a label never becomes the reserved draft theme id", () => {
  assert.equal(buildThemeIdFromLabel("Unsaved draft", []), `${DRAFT_THEME_ID}-2`);
});

test("a built-in theme's draft keeps every theme edit, because its new theme would not inherit the built-in's overrides", () => {
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "color.accent", "$atomic.swatch.cyan");
  assert.deepEqual(
    createDraftPatchesForItem({ library: CLASSIC_WITH_OVERRIDE, themeId: "classic", draft, itemId: "network-graph" }),
    [draft.patch],
  );
});

test("a built-in theme's draft snapshots as the unsaved theme that extends it", () => {
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "color.accent", "$atomic.swatch.cyan");
  const snapshot = createSnapshotFromDraft({ library: CLASSIC_WITH_OVERRIDE, themeId: "classic", draft, itemId: "network-graph" });
  assert.equal(snapshot.themeId, DRAFT_THEME_ID);
  assert.deepEqual(
    snapshot.documents.map((document) => document.extends),
    ["classic"],
  );
});

test("an unedited built-in theme snapshots as itself", () => {
  assert.deepEqual(
    createSnapshotFromDraft({ library: CLASSIC_WITH_OVERRIDE, themeId: "classic", draft: EMPTY_THEME_DRAFT }),
    CLASSIC_VIDEO_THEME_SNAPSHOT,
  );
});

test("a built-in theme's draft counts no saved item overrides", () => {
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "stroke.default", "$atomic.strokeWidth.lg");
  assert.equal(
    countItemOverrides({ library: CLASSIC_WITH_OVERRIDE, themeId: "classic", draft, itemId: "network-graph" }),
    0,
  );
});
```

- [ ] **Step 5: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/themeDraft/themeDraft.test.ts`
Expected: FAIL, `Cannot find module './themeDraft'`.

- [ ] **Step 6: Implement the draft model**

`src/videoThemeEditor/themeDraft/themeDraft.ts`:

```ts
import { mergeThemeOverrides, type MantineThemeOverride } from "@mantine/core";
import { BUILT_IN_VIDEO_THEME_IDS } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import {
  createDraftThemeTarget,
  DRAFT_THEME_ID,
  type DraftThemeTarget,
} from "../../videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { getValueAtPath } from "../../videoTheme/getResolvedTokenValue/getResolvedTokenValue";
import { isMantineTokenRoot, listTokenDefinitions } from "../../videoTheme/tokenCatalog/tokenCatalog";
import {
  createVideoThemeSnapshot,
  type VideoThemeSnapshot,
} from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
  VideoThemePatch,
  VideoThemeSource,
} from "../../videoTheme/videoTheme.types";

/**
 * Unsaved edits to one theme: a sparse patch for the whole theme and one per
 * catalog item. The editor writes it, previews resolve it, and saving folds
 * it into the theme file.
 */
export type ThemeDraft = Readonly<{
  patch: VideoThemePatch;
  overrides: Readonly<Record<string, VideoThemePatch>>;
}>;

/** Whether an edit applies to the whole theme or to one item. */
export type ThemeEditScope =
  | Readonly<{ kind: "theme" }>
  | Readonly<{ kind: "item"; itemId: string }>;

/** The theme an export renders with: a saved theme id plus unsaved edits. */
export type ExportTheme = Readonly<{ id: string; patch?: VideoThemePatch }>;

/** A draft with no edits. */
export const EMPTY_THEME_DRAFT: ThemeDraft = { patch: {}, overrides: {} };

type DraftTarget = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
  itemId?: string;
}>;

function _isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function _isBuiltIn(themeId: string): boolean {
  return (BUILT_IN_VIDEO_THEME_IDS as readonly string[]).includes(themeId);
}

function _getDocument(library: VideoThemeLibrary, themeId: string): VideoThemeDocument {
  const document = library.get(themeId);
  if (!document) {
    throw new Error(`Unknown theme "${themeId}"`);
  }
  return document;
}

/**
 * Where a token lives in a theme file, such as
 * `other.video.semantic.color.accent` for `color.accent`. Use it to read or
 * write a token in a document or patch.
 */
export function getDocumentPathFromTokenPath(tokenPath: string): readonly string[] {
  const [root, ...rest] = tokenPath.split(".");
  if (root === "atomic") {
    return ["other", "video", "atomic", ...rest];
  }
  if (root === "components") {
    const [name, ...props] = rest;
    return ["components", name, "defaultProps", ...props];
  }
  return isMantineTokenRoot(root) ? [root, ...rest] : ["other", "video", "semantic", root, ...rest];
}

/**
 * The token path for a theme file path, such as a zod issue path. Use it to
 * attach a schema problem to the editor row it belongs to.
 */
export function getTokenPathFromDocumentPath(documentPath: readonly PropertyKey[]): string {
  const segments = documentPath.map(String);
  const isVideo = segments[0] === "other" && segments[1] === "video";
  if (isVideo && segments[2] === "atomic") {
    return ["atomic", ...segments.slice(3)].join(".");
  }
  if (isVideo && segments[2] === "semantic") {
    return segments.slice(3).join(".");
  }
  if (segments[0] === "components" && segments[2] === "defaultProps") {
    return ["components", segments[1], ...segments.slice(3)].join(".");
  }
  return segments.join(".");
}

/** A copy of a nested object with one value set, creating parents as needed. */
export function setValueAtPath(
  source: Readonly<Record<string, unknown>>,
  path: readonly string[],
  value: unknown,
): Readonly<Record<string, unknown>> {
  const [key, ...rest] = path;
  if (key === undefined) {
    return source;
  }
  const child = source[key];
  return {
    ...source,
    [key]: rest.length === 0 ? value : setValueAtPath(_isRecord(child) ? child : {}, rest, value),
  };
}

/** A copy of a nested object with one value removed and empty parents pruned. */
export function removeValueAtPath(
  source: Readonly<Record<string, unknown>>,
  path: readonly string[],
): Readonly<Record<string, unknown>> {
  const [key, ...rest] = path;
  if (key === undefined || !Object.hasOwn(source, key)) {
    return source;
  }
  if (rest.length === 0) {
    return Object.fromEntries(Object.entries(source).filter(([entry]) => entry !== key));
  }
  const child = source[key];
  if (!_isRecord(child)) {
    return source;
  }
  const pruned = removeValueAtPath(child, rest);
  return Object.keys(pruned).length === 0
    ? removeValueAtPath(source, [key])
    : { ...source, [key]: pruned };
}

function _scopePatch(draft: ThemeDraft, scope: ThemeEditScope): VideoThemePatch {
  return scope.kind === "theme" ? draft.patch : (draft.overrides[scope.itemId] ?? {});
}

function _withScopePatch(draft: ThemeDraft, scope: ThemeEditScope, patch: VideoThemePatch): ThemeDraft {
  if (scope.kind === "theme") {
    return { ...draft, patch };
  }
  const others = Object.fromEntries(
    Object.entries(draft.overrides).filter(([itemId]) => itemId !== scope.itemId),
  );
  return {
    ...draft,
    overrides: Object.keys(patch).length === 0 ? others : { ...others, [scope.itemId]: patch },
  };
}

/** A draft with one token set in a scope, replacing any earlier draft value. */
export function setTokenInDraft(
  draft: ThemeDraft,
  scope: ThemeEditScope,
  tokenPath: string,
  value: unknown,
): ThemeDraft {
  const patch = setValueAtPath(_scopePatch(draft, scope), getDocumentPathFromTokenPath(tokenPath), value);
  return _withScopePatch(draft, scope, patch);
}

/** A draft with one token's draft value removed from a scope. */
export function resetTokenInDraft(draft: ThemeDraft, scope: ThemeEditScope, tokenPath: string): ThemeDraft {
  const patch = removeValueAtPath(_scopePatch(draft, scope), getDocumentPathFromTokenPath(tokenPath));
  return _withScopePatch(draft, scope, patch);
}

/** Whether a draft holds any edit. */
export function isThemeDraftEmpty(draft: ThemeDraft): boolean {
  return Object.keys(draft.patch).length === 0 && Object.keys(draft.overrides).length === 0;
}

/**
 * The token paths a patch sets, one per scale entry, such as
 * `atomic.swatch.mint`. Use it to count overrides or apply a patch token by
 * token.
 */
export function listTokenPathsFromPatch(patch: VideoThemePatch): readonly string[] {
  return listTokenDefinitions().flatMap(({ path, isScale }) => {
    const value = getValueAtPath(patch, getDocumentPathFromTokenPath(path));
    if (value === undefined) {
      return [];
    }
    return isScale && _isRecord(value) ? Object.keys(value).map((key) => `${path}.${key}`) : [path];
  });
}

function _draftTarget(target: DraftTarget): DraftThemeTarget {
  return createDraftThemeTarget({
    library: target.library,
    themeId: target.themeId,
    hasDraft: !isThemeDraftEmpty(target.draft),
  });
}

/**
 * How many tokens an item overrides, saved or drafted. On a built-in theme
 * with a draft the saved overrides do not count: the new theme saving would
 * create does not inherit them.
 */
export function countItemOverrides(target: DraftTarget & Readonly<{ itemId: string }>): number {
  const themeTarget = _draftTarget(target);
  const saved = _getDocument(themeTarget.library, themeTarget.themeId).overrides?.[target.itemId] ?? {};
  return new Set([
    ...listTokenPathsFromPatch(saved),
    ...listTokenPathsFromPatch(target.draft.overrides[target.itemId] ?? {}),
  ]).size;
}

function _applyPatch(target: VideoThemePatch, patch: VideoThemePatch): VideoThemePatch {
  return listTokenPathsFromPatch(patch).reduce((result, tokenPath) => {
    const documentPath = getDocumentPathFromTokenPath(tokenPath);
    return setValueAtPath(result, documentPath, getValueAtPath(patch, documentPath));
  }, target);
}

/**
 * The theme file a save writes: each draft token set whole, theme edits at
 * the theme level and item edits into `overrides`.
 */
export function createSavedDocumentFromDraft(document: VideoThemeDocument, draft: ThemeDraft): VideoThemeDocument {
  const overrides = Object.entries(draft.overrides).reduce<Record<string, VideoThemePatch>>(
    (result, [itemId, patch]) => ({ ...result, [itemId]: _applyPatch(result[itemId] ?? {}, patch) }),
    { ...document.overrides },
  );
  return {
    ..._applyPatch(document, draft.patch),
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
  } as VideoThemeDocument;
}

/**
 * A new theme holding a draft. From a built-in it is a sparse theme that
 * extends the built-in (whose per-item overrides it does not inherit); from
 * a custom theme it is a full copy with the draft folded in.
 */
export function createNewThemeDocument(
  options: Readonly<{ base: VideoThemeDocument; draft: ThemeDraft; id: string; label: string }>,
): VideoThemeDocument {
  const { base, draft, id, label } = options;
  if (!_isBuiltIn(base.id)) {
    return { ...createSavedDocumentFromDraft(base, draft), id, label };
  }
  const overrides = Object.fromEntries(
    Object.entries(draft.overrides).map(([itemId, patch]) => [itemId, _applyPatch({}, patch)]),
  );
  return {
    schemaVersion: 1,
    id,
    label,
    extends: base.id,
    ..._applyPatch({}, draft.patch),
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
  } as VideoThemeDocument;
}

/**
 * The unsaved patches one item renders with, lowest first: the theme draft,
 * then the item's draft. Tokens that the draft target's own saved override
 * for the item sets are left out of the theme draft, because once saved
 * those overrides outrank theme values. A built-in theme's draft targets an
 * unsaved theme with no overrides (see `createDraftThemeTarget`), so nothing
 * is left out there.
 */
export function createDraftPatchesForItem(target: DraftTarget): readonly VideoThemePatch[] {
  const { draft, itemId } = target;
  const themeTarget = _draftTarget(target);
  const saved =
    itemId === undefined ? {} : (_getDocument(themeTarget.library, themeTarget.themeId).overrides?.[itemId] ?? {});
  const themePatch = listTokenPathsFromPatch(saved).reduce(
    (patch, tokenPath) => removeValueAtPath(patch, getDocumentPathFromTokenPath(tokenPath)),
    draft.patch,
  );
  const itemPatch = itemId === undefined ? {} : (draft.overrides[itemId] ?? {});
  return [themePatch, itemPatch].filter((patch) => Object.keys(patch).length > 0);
}

/**
 * Everything needed to resolve a draft for one item, or for the whole theme
 * when no item is given: the draft target's library and theme, the item's
 * override id, and its draft patches. The editor, previews, snapshots, and
 * exports all start here, so they resolve the same theme and hash.
 */
export function createVideoThemeSourceFromDraft(target: DraftTarget): VideoThemeSource {
  const themeTarget = _draftTarget(target);
  return {
    library: themeTarget.library,
    themeId: themeTarget.themeId,
    scope: {
      overrideIds: target.itemId === undefined ? [] : [target.itemId],
      patches: createDraftPatchesForItem(target),
    },
  };
}

/**
 * What the live player needs to render an item with the draft: the draft
 * target's custom documents (built-ins come from its bundle; a built-in's
 * draft brings its unsaved theme) and the item's draft patches.
 */
export function createSnapshotFromDraft(target: DraftTarget): VideoThemeSnapshot {
  const themeTarget = _draftTarget(target);
  return createVideoThemeSnapshot(themeTarget.library, themeTarget.themeId, createDraftPatchesForItem(target));
}

/**
 * The `theme` an export request sends for one item: the saved id and one
 * merged patch. The server applies the same draft target to it (see
 * `createSnapshotFromThemeRequest`), so the MP4 matches the preview.
 */
export function createExportThemeFromDraft(target: DraftTarget): ExportTheme {
  const patches = createDraftPatchesForItem(target);
  if (patches.length === 0) {
    return { id: target.themeId };
  }
  return {
    id: target.themeId,
    patch: mergeThemeOverrides(...(patches as MantineThemeOverride[])) as VideoThemePatch,
  };
}

/**
 * A theme id made from a label: a slug, with a number added when taken or
 * when it would be the reserved `DRAFT_THEME_ID`.
 */
export function buildThemeIdFromLabel(label: string, takenIds: readonly string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "theme";
  let id = base;
  for (let suffix = 2; takenIds.includes(id) || id === DRAFT_THEME_ID; suffix += 1) {
    id = `${base}-${suffix}`;
  }
  return id;
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run the Step 5 command. Expected: 17 passing.

- [ ] **Step 8: Commit**

```bash
git add src/videoTheme/createDraftThemeTarget src/videoThemeEditor/themeDraft
git commit -m "feat(video-producer): model unsaved video theme edits as the theme saving would produce" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Draft and active-theme persistence

**Files:**
- Create: `src/videoThemeEditor/themeDraftStorage/themeDraftStorage.ts`
- Test: `src/videoThemeEditor/themeDraftStorage/themeDraftStorage.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_THEME_DRAFT } from "../themeDraft/themeDraft";
import {
  getActiveThemeIdFromLocation,
  readStoredThemeDraft,
  rememberActiveThemeId,
  writeStoredThemeDraft,
} from "./themeDraftStorage";

function _storage(entries: Record<string, string> = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    values,
  };
}

const DRAFT = {
  patch: { other: { video: { atomic: { swatch: { mint: "#123456" } } } } },
  overrides: {},
};

test("a stored draft reads back with its base hash", () => {
  const storage = _storage();
  writeStoredThemeDraft(storage, "classic", { baseHash: "abc", draft: DRAFT });
  assert.deepEqual(readStoredThemeDraft(storage, "classic"), { baseHash: "abc", draft: DRAFT });
});

test("a stored draft that no longer matches the theme schema is ignored", () => {
  const storage = _storage({
    "video-theme-draft:v1:classic": JSON.stringify({
      baseHash: "abc",
      draft: { patch: { other: { video: { semantic: { color: { sparkle: "$color.accent" } } } } }, overrides: {} },
    }),
  });
  assert.equal(readStoredThemeDraft(storage, "classic"), undefined);
});

test("storing an empty draft forgets the stored one", () => {
  const storage = _storage();
  writeStoredThemeDraft(storage, "classic", { baseHash: "abc", draft: DRAFT });
  writeStoredThemeDraft(storage, "classic", { baseHash: "abc", draft: EMPTY_THEME_DRAFT });
  assert.equal(storage.values.size, 0);
});

test("the theme in the URL wins over the remembered one", () => {
  const storage = _storage();
  rememberActiveThemeId(storage, "avandar");
  assert.equal(
    getActiveThemeIdFromLocation({ search: "?theme=classic", storage, available: ["classic", "avandar"] }),
    "classic",
  );
});

test("an unknown theme in the URL falls back to the remembered theme", () => {
  const storage = _storage();
  rememberActiveThemeId(storage, "avandar");
  assert.equal(
    getActiveThemeIdFromLocation({ search: "?theme=missing", storage, available: ["classic", "avandar"] }),
    "avandar",
  );
});

test("with nothing chosen the active theme is classic", () => {
  assert.equal(
    getActiveThemeIdFromLocation({ search: "", storage: _storage(), available: ["classic", "avandar"] }),
    "classic",
  );
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/themeDraftStorage/themeDraftStorage.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import { z } from "zod";
import { videoThemePatchSchema } from "../../videoTheme/videoThemeSchema/videoThemeSchema";
import { isThemeDraftEmpty, type ThemeDraft } from "../themeDraft/themeDraft";

const DRAFT_KEY_PREFIX = "video-theme-draft:v1:";
const ACTIVE_THEME_KEY = "video-theme-active:v1";

const storedDraftSchema = z
  .object({
    baseHash: z.string(),
    draft: z
      .object({
        patch: videoThemePatchSchema,
        overrides: z.record(z.string(), videoThemePatchSchema),
      })
      .strict(),
  })
  .strict();

/** A persisted draft and the hash of the theme file it was made against. */
export type StoredThemeDraft = Readonly<{ baseHash: string; draft: ThemeDraft }>;

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem" | "removeItem">;

/**
 * The draft stored for a theme, or undefined when there is none or it no
 * longer matches the theme schema. Drafts are kept per viewer so they
 * survive a reload.
 */
export function readStoredThemeDraft(storage: ReadableStorage, themeId: string): StoredThemeDraft | undefined {
  try {
    const parsed = storedDraftSchema.safeParse(
      JSON.parse(storage.getItem(`${DRAFT_KEY_PREFIX}${themeId}`) ?? "null"),
    );
    return parsed.success ? (parsed.data as StoredThemeDraft) : undefined;
  } catch {
    return undefined;
  }
}

/** Stores a theme's draft, or forgets it when the draft is empty. */
export function writeStoredThemeDraft(
  storage: WritableStorage,
  themeId: string,
  stored: StoredThemeDraft,
): void {
  const key = `${DRAFT_KEY_PREFIX}${themeId}`;
  try {
    if (isThemeDraftEmpty(stored.draft)) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(stored));
    }
  } catch {
    // Without storage the draft still works for this visit.
  }
}

/**
 * The theme to open: `?theme=` when it names an available theme, then the
 * viewer's last choice, then `classic`.
 */
export function getActiveThemeIdFromLocation(
  options: Readonly<{ search: string; storage: ReadableStorage; available: readonly string[] }>,
): string {
  const fromUrl = new URLSearchParams(options.search).get("theme");
  if (fromUrl && options.available.includes(fromUrl)) {
    return fromUrl;
  }
  let remembered: string | undefined;
  try {
    remembered = options.storage.getItem(ACTIVE_THEME_KEY) ?? undefined;
  } catch {
    remembered = undefined;
  }
  return remembered && options.available.includes(remembered) ? remembered : "classic";
}

/** Remembers the viewer's theme choice for their next visit. */
export function rememberActiveThemeId(storage: WritableStorage, themeId: string): void {
  try {
    storage.setItem(ACTIVE_THEME_KEY, themeId);
  } catch {
    // The choice still applies for this visit.
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/videoThemeEditor/themeDraftStorage
git commit -m "feat(video-producer): keep video theme drafts across reloads" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Resolving a draft and keeping the last valid theme

**Files:**
- Create: `src/videoThemeEditor/resolveDraftTheme/resolveDraftTheme.ts`
- Create: `src/videoThemeEditor/resolveDraftTheme/useDraftTheme.ts`
- Create: `src/videoThemeEditor/resolveDraftTheme/useValidThemeDraft.ts`
- Test: `src/videoThemeEditor/resolveDraftTheme/resolveDraftTheme.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { EMPTY_THEME_DRAFT, setTokenInDraft } from "../themeDraft/themeDraft";
import { isThemeDraftValid, resolveDraftTheme } from "./resolveDraftTheme";
import type { VideoThemeDocument } from "../../videoTheme/videoTheme.types";

const STUDIO: VideoThemeDocument = {
  schemaVersion: 1,
  id: "studio",
  label: "Studio",
  extends: "classic",
  overrides: {
    "network-graph": { other: { video: { semantic: { color: { accent: "$atomic.swatch.orange" } } } } },
  },
};
const LIBRARY = createVideoThemeLibrary([STUDIO]);
const THEME = { kind: "theme" } as const;

test("an unedited theme resolves with no patches", () => {
  const result = resolveDraftTheme({ library: LIBRARY, themeId: "studio", draft: EMPTY_THEME_DRAFT, scope: THEME });
  assert.equal(result.ok && result.patches.length, 0);
});

test("a draft reference to a missing token reports the token path", () => {
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "color.accent", "$atomic.swatch.nope");
  const result = resolveDraftTheme({ library: LIBRARY, themeId: "studio", draft, scope: THEME });
  assert.deepEqual(result.ok ? [] : result.issues.map((issue) => issue.path), ["color.accent"]);
});

test("a draft value that breaks the schema reports the token path", () => {
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "color.accent", "#ff0000");
  const result = resolveDraftTheme({ library: LIBRARY, themeId: "studio", draft, scope: THEME });
  assert.ok(!result.ok && result.issues.some((issue) => issue.path.startsWith("color.accent")));
});

test("item scope resolves the item's saved override", () => {
  const result = resolveDraftTheme({
    library: LIBRARY,
    themeId: "studio",
    draft: EMPTY_THEME_DRAFT,
    scope: { kind: "item", itemId: "network-graph" },
  });
  assert.equal(result.ok && result.theme.semantic.color.accent, "#f0ba83");
});

test("a built-in theme with a draft resolves without its per-item overrides", () => {
  const library = new Map<string, VideoThemeDocument>([
    ...BUILT_IN_VIDEO_THEMES,
    [
      "classic",
      {
        ...(BUILT_IN_VIDEO_THEMES.get("classic") as VideoThemeDocument),
        overrides: { "network-graph": { other: { video: { semantic: { color: { accent: "$atomic.swatch.orange" } } } } } },
      },
    ],
  ]);
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "stroke.default", "$atomic.strokeWidth.lg");
  const result = resolveDraftTheme({ library, themeId: "classic", draft, scope: { kind: "item", itemId: "network-graph" } });
  assert.ok(result.ok && result.theme.semantic.color.accent !== "#f0ba83");
});

test("a draft with a broken item override is not valid", () => {
  const draft = setTokenInDraft(
    EMPTY_THEME_DRAFT,
    { kind: "item", itemId: "data-pipeline" },
    "color.line",
    "$atomic.swatch.nope",
  );
  assert.equal(isThemeDraftValid({ library: LIBRARY, themeId: "studio", draft }), false);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/resolveDraftTheme/resolveDraftTheme.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the pure resolution**

`src/videoThemeEditor/resolveDraftTheme/resolveDraftTheme.ts`:

```ts
import { mergeVideoThemeLayers } from "../../videoTheme/mergeVideoThemeLayers/mergeVideoThemeLayers";
import { resolveVideoTheme } from "../../videoTheme/resolveVideoTheme/resolveVideoTheme";
import { VideoThemeError } from "../../videoTheme/VideoThemeError/VideoThemeError";
import { videoThemePatchSchema } from "../../videoTheme/videoThemeSchema/videoThemeSchema";
import {
  createVideoThemeSourceFromDraft,
  getTokenPathFromDocumentPath,
  type ThemeDraft,
  type ThemeEditScope,
} from "../themeDraft/themeDraft";
import type {
  ResolvedVideoTheme,
  VideoThemeIssue,
  VideoThemeLibrary,
  VideoThemePatch,
} from "../../videoTheme/videoTheme.types";

/** What a draft resolves to in one scope, or every problem it has. */
export type DraftThemeResult =
  | Readonly<{
      ok: true;
      merged: VideoThemePatch;
      theme: ResolvedVideoTheme;
      patches: readonly VideoThemePatch[];
    }>
  | Readonly<{ ok: false; merged: VideoThemePatch; issues: readonly VideoThemeIssue[] }>;

type DraftInput = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
}>;

function _schemaIssues(patches: readonly VideoThemePatch[]): VideoThemeIssue[] {
  return patches.flatMap((patch) => {
    const result = videoThemePatchSchema.safeParse(patch);
    return result.success
      ? []
      : result.error.issues.map((issue) => ({
          path: getTokenPathFromDocumentPath(issue.path),
          message: issue.message,
        }));
  });
}

/**
 * Resolves a draft as one scope sees it, against the theme saving would
 * produce (see `createDraftThemeTarget`): the theme with its draft, or one
 * item with its draft on top. Reports schema and reference problems by
 * token path instead of throwing, so the editor can mark them.
 */
export function resolveDraftTheme(input: DraftInput & Readonly<{ scope: ThemeEditScope }>): DraftThemeResult {
  const itemId = input.scope.kind === "item" ? input.scope.itemId : undefined;
  const { library, themeId, scope = {} } = createVideoThemeSourceFromDraft({ ...input, itemId });
  const patches = scope.patches ?? [];
  const merged = mergeVideoThemeLayers(library, themeId, scope);
  const schemaIssues = _schemaIssues(patches);
  if (schemaIssues.length > 0) {
    return { ok: false, merged, issues: schemaIssues };
  }
  try {
    return { ok: true, merged, patches, theme: resolveVideoTheme(library, themeId, scope) };
  } catch (error) {
    if (error instanceof VideoThemeError) {
      return { ok: false, merged, issues: error.issues };
    }
    throw error;
  }
}

/**
 * Whether every part of a draft resolves: the theme scope and each item it
 * overrides. Only a valid draft reaches previews and exports.
 */
export function isThemeDraftValid(input: DraftInput): boolean {
  return [
    { kind: "theme" } as const,
    ...Object.keys(input.draft.overrides).map((itemId) => ({ kind: "item", itemId }) as const),
  ].every((scope) => resolveDraftTheme({ ...input, scope }).ok);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 6 passing.

- [ ] **Step 5: Write the hooks**

`src/videoThemeEditor/resolveDraftTheme/useDraftTheme.ts`:

```ts
import { useEffect, useMemo, useState } from "react";
import { EMPTY_THEME_DRAFT, type ThemeDraft, type ThemeEditScope } from "../themeDraft/themeDraft";
import { resolveDraftTheme } from "./resolveDraftTheme";
import type {
  ResolvedVideoTheme,
  VideoThemeIssue,
  VideoThemeLibrary,
  VideoThemePatch,
} from "../../videoTheme/videoTheme.types";

/** A draft as the editor shows it: current values, a theme to preview, and problems. */
export type DraftTheme = Readonly<{
  merged: VideoThemePatch;
  theme: ResolvedVideoTheme;
  issues: readonly VideoThemeIssue[];
}>;

type Options = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
  scope: ThemeEditScope;
}>;

/**
 * Resolves a draft for the editor. While the draft has problems it keeps the
 * last theme that resolved, so previews and swatches never go blank, and it
 * still returns the current values so a control shows what was typed.
 */
export function useDraftTheme({ library, themeId, draft, scope }: Options): DraftTheme {
  const scopeKey = scope.kind === "item" ? scope.itemId : "";
  // Callers rebuild the scope object on every render; its key is what matters.
  const stableScope = useMemo<ThemeEditScope>(
    () => (scopeKey ? { kind: "item", itemId: scopeKey } : { kind: "theme" }),
    [scopeKey],
  );
  const result = useMemo(
    () => resolveDraftTheme({ library, themeId, draft, scope: stableScope }),
    [library, themeId, draft, stableScope],
  );
  const saved = useMemo(() => {
    const unedited = resolveDraftTheme({ library, themeId, draft: EMPTY_THEME_DRAFT, scope: stableScope });
    return unedited.ok ? unedited.theme : undefined;
  }, [library, themeId, stableScope]);
  const [lastValid, setLastValid] = useState<Readonly<{ key: string; theme: ResolvedVideoTheme }>>();
  const key = `${themeId}:${scopeKey}`;
  useEffect(() => {
    if (result.ok) {
      setLastValid({ key, theme: result.theme });
    }
  }, [result, key]);
  const fallback = lastValid?.key === key ? lastValid.theme : saved;
  if (result.ok) {
    return { merged: result.merged, theme: result.theme, issues: [] };
  }
  if (!fallback) {
    throw new Error(`The saved theme "${themeId}" does not resolve`);
  }
  return { merged: result.merged, theme: fallback, issues: result.issues };
}
```

`src/videoThemeEditor/resolveDraftTheme/useValidThemeDraft.ts`:

```ts
import { useEffect, useMemo, useState } from "react";
import { EMPTY_THEME_DRAFT, type ThemeDraft } from "../themeDraft/themeDraft";
import { isThemeDraftValid } from "./resolveDraftTheme";
import type { VideoThemeLibrary } from "../../videoTheme/videoTheme.types";

/**
 * The draft previews and exports may use: the current draft when every part
 * resolves, otherwise the last one of this theme that did. A preview must
 * never receive a draft that throws.
 */
export function useValidThemeDraft(
  options: Readonly<{ library: VideoThemeLibrary; themeId: string; draft: ThemeDraft }>,
): ThemeDraft {
  const { library, themeId, draft } = options;
  const isValid = useMemo(() => isThemeDraftValid({ library, themeId, draft }), [library, themeId, draft]);
  const [lastValid, setLastValid] = useState<Readonly<{ themeId: string; draft: ThemeDraft }>>();
  useEffect(() => {
    if (isValid) {
      setLastValid({ themeId, draft });
    }
  }, [isValid, themeId, draft]);
  if (isValid) {
    return draft;
  }
  return lastValid?.themeId === themeId ? lastValid.draft : EMPTY_THEME_DRAFT;
}
```

- [ ] **Step 6: Typecheck and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.

```bash
git add src/videoThemeEditor/resolveDraftTheme
git commit -m "feat(video-producer): resolve theme drafts and keep the last valid theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Value text and token rows

**Files:**
- Create: `src/videoThemeEditor/formatTokenValue/formatTokenValue.ts`
- Test: `src/videoThemeEditor/formatTokenValue/formatTokenValue.test.ts`
- Create: `src/videoThemeEditor/tokenRows/tokenRows.ts`
- Test: `src/videoThemeEditor/tokenRows/tokenRows.test.ts`

- [ ] **Step 1: Write the failing value text tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { formatTokenValue } from "./formatTokenValue";

test("lengths read in pixels whether stored as numbers or Mantine strings", () => {
  assert.equal(formatTokenValue("length", 18), "18 px");
  assert.equal(formatTokenValue("cssLength", "calc(1.5rem * var(--mantine-scale))"), "24 px");
});

test("durations read in milliseconds", () => {
  assert.equal(formatTokenValue("duration", 9), "300 ms");
});

test("opacities read as percentages", () => {
  assert.equal(formatTokenValue("opacity", 0.03), "3%");
});

test("power and bezier curves read differently", () => {
  assert.equal(formatTokenValue("easing", { powerInOut: 3 }), "x^3");
  assert.equal(formatTokenValue("easing", [0.16, 1, 0.3, 1]), "cubic-bezier(0.16, 1, 0.3, 1)");
});

test("a type style reads as its font, size, and weight", () => {
  assert.equal(
    formatTokenValue("typeStyle", { fontId: "arial", fontFamily: "Arial, sans-serif", fontSize: 17, fontWeight: 400, color: "#728794", alpha: 1 }),
    "Arial 17 px 400",
  );
});

test("a missing value reads as empty", () => {
  assert.equal(formatTokenValue("color", undefined), "");
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/formatTokenValue/formatTokenValue.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement value text**

`src/videoThemeEditor/formatTokenValue/formatTokenValue.ts`:

```ts
import { parseCssPixels } from "../../videoTheme/normalizeTokenValue/normalizeTokenValue";
import {
  getVideoFontIdFromStack,
  VIDEO_FONT_REGISTRY,
  type VideoFontId,
} from "../../videoTheme/videoFontRegistry/videoFontRegistry";
import type {
  EasingValue,
  GlowValue,
  GradientValue,
  ResolvedCameraPreset,
  ResolvedFill,
  ResolvedMotionStep,
  ResolvedPaint,
  ResolvedRange,
  ResolvedSketchProfile,
  ResolvedTypeStyle,
  ShadeValue,
  ShadowValue,
  SpringValue,
  TextShadowValue,
  TokenKind,
} from "../../videoTheme/videoTheme.types";

function _number(value: number): string {
  return String(Number(value.toFixed(3)));
}

function _percent(value: number): string {
  return `${_number(value * 100)}%`;
}

function _milliseconds(frames: number): string {
  return `${Math.round((frames / 30) * 1000)} ms`;
}

function _fontLabel(value: string): string {
  const id = Object.hasOwn(VIDEO_FONT_REGISTRY, value)
    ? (value as VideoFontId)
    : getVideoFontIdFromStack(value);
  return id ? VIDEO_FONT_REGISTRY[id].label : value;
}

function _easing(value: EasingValue): string {
  return "powerInOut" in value ? `x^${value.powerInOut}` : `cubic-bezier(${value.map(_number).join(", ")})`;
}

function _formatEffect(kind: TokenKind, value: unknown): string | undefined {
  switch (kind) {
    case "shadow":
    case "elevation":
      return (value as ShadowValue).layers.map((layer) => `${layer.offsetX} ${layer.offsetY} ${layer.blur}`).join(", ") || "0";
    case "glow": {
      const glow = value as GlowValue;
      return `${_number(glow.spread)} px ${_percent(glow.opacity)}`;
    }
    case "textShadow": {
      const shadow = value as TextShadowValue;
      return `${shadow.offsetX} ${shadow.offsetY} ${shadow.blur}`;
    }
    case "dash":
      return `[${(value as readonly number[]).join(" ")}]`;
    case "sketchProfile":
      return `~${_number((value as ResolvedSketchProfile).roughness)}`;
    case "spring": {
      const spring = value as SpringValue;
      return `${spring.damping} / ${spring.stiffness} / ${spring.mass}`;
    }
    default:
      return undefined;
  }
}

function _formatStructure(kind: TokenKind, value: unknown): string | undefined {
  switch (kind) {
    case "typeStyle": {
      const style = value as ResolvedTypeStyle;
      return `${_fontLabel(style.fontId)} ${_number(style.fontSize)} px ${style.fontWeight}`;
    }
    case "paint": {
      const paint = value as ResolvedPaint;
      return paint.alpha >= 1 ? paint.color : `${paint.color} ${_percent(paint.alpha)}`;
    }
    case "fill": {
      const fill = value as ResolvedFill;
      return fill.type === "solid" ? fill.color : `${fill.from} → ${fill.to}`;
    }
    case "gradient": {
      const gradient = value as GradientValue;
      return `${gradient.from} → ${gradient.to}`;
    }
    case "cameraPreset": {
      const preset = value as ResolvedCameraPreset;
      return `${_number(preset.speed)}× ${_number(preset.shutter)}°`;
    }
    case "range": {
      const range = value as ResolvedRange;
      return `${_number(range.min)}…${_number(range.max)}`;
    }
    default:
      return undefined;
  }
}

function _formatCollection(kind: TokenKind, value: unknown): string | undefined {
  switch (kind) {
    case "box":
      return Object.entries(value as Readonly<Record<string, number>>)
        .map(([side, pixels]) => `${side} ${_number(pixels)}`)
        .join(" · ");
    case "motionStep": {
      const step = value as ResolvedMotionStep;
      const frames = step.duration ?? step.period;
      return frames === undefined ? "" : _milliseconds(frames);
    }
    case "colorTuple": {
      const shades = value as readonly string[];
      return `${shades[0]} … ${shades[shades.length - 1]}`;
    }
    case "shade": {
      const shade = value as ShadeValue;
      return typeof shade === "number" ? String(shade) : `${shade.dark} / ${shade.light}`;
    }
    default:
      return undefined;
  }
}

/**
 * A short, language-neutral reading of a token value, such as `18 px`,
 * `300 ms`, or `Arial 17 px 400`. Use it wherever a control must show its
 * value as text, for example token rows and reference pickers.
 */
export function formatTokenValue(kind: TokenKind, value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  switch (kind) {
    case "length":
    case "cssLength": {
      const pixels = parseCssPixels(value);
      return pixels === undefined ? "" : `${_number(pixels)} px`;
    }
    case "letterSpacing":
      return `${_number(Number(value))} em`;
    case "opacity":
      return _percent(Number(value));
    case "duration":
      return _milliseconds(Number(value));
    case "number":
    case "fontWeight":
    case "cssNumber":
      return _number(parseCssPixels(value) ?? 0);
    case "easing":
      return _easing(value as EasingValue);
    case "fontFamily":
    case "fontStack":
      return _fontLabel(String(value));
    default:
      return _formatEffect(kind, value) ?? _formatStructure(kind, value) ?? _formatCollection(kind, value) ?? String(value);
  }
}
```

Run the Step 1 command. Expected: 6 passing.

- [ ] **Step 3: Write the failing row tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveDraftTheme } from "../resolveDraftTheme/resolveDraftTheme";
import { EMPTY_THEME_DRAFT, setTokenInDraft, type ThemeDraft, type ThemeEditScope } from "../themeDraft/themeDraft";
import { filterTokenRows, getEssentialRows, listTokenRows, type TokenRow } from "./tokenRows";
import type { VideoThemeDocument } from "../../videoTheme/videoTheme.types";

const STUDIO: VideoThemeDocument = {
  schemaVersion: 1,
  id: "studio",
  label: "Studio",
  extends: "classic",
  overrides: {
    "network-graph": { other: { video: { semantic: { color: { accent: "$atomic.swatch.orange" } } } } },
  },
};
const LIBRARY = createVideoThemeLibrary([STUDIO]);
const ITEM: ThemeEditScope = { kind: "item", itemId: "network-graph" };

function _rows(scope: ThemeEditScope, draft: ThemeDraft = EMPTY_THEME_DRAFT): readonly TokenRow[] {
  const resolved = resolveDraftTheme({ library: LIBRARY, themeId: "studio", draft, scope });
  if (!resolved.ok) {
    throw new Error("The test theme must resolve");
  }
  return listTokenRows({ library: LIBRARY, themeId: "studio", draft, scope, merged: resolved.merged, theme: resolved.theme });
}

function _row(rows: readonly TokenRow[], path: string): TokenRow | undefined {
  return rows.find((row) => row.path === path);
}

test("every catalog token gets a row, with one row per scale entry", () => {
  const rows = _rows({ kind: "theme" });
  for (const path of ["atomic.swatch.mint", "color.accent", "components.ProgressBar.height", "colors.primary"]) {
    assert.ok(_row(rows, path), path);
  }
  assert.equal(_row(rows, "atomic.swatch"), undefined);
});

test("rows group by tier and first segment", () => {
  const rows = _rows({ kind: "theme" });
  assert.deepEqual(
    ["color.accent", "atomic.swatch.mint", "fontSizes.md", "components.ProgressBar.height"].map((path) => _row(rows, path)?.group),
    ["semantic:color", "atomic:swatch", "mantine:type", "component:ProgressBar"],
  );
});

test("item-scope rows tell draft edits from saved overrides", () => {
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, ITEM, "stroke.default", "$atomic.strokeWidth.lg");
  const rows = _rows(ITEM, draft);
  assert.deepEqual(
    ["color.accent", "stroke.default", "color.line"].map((path) => _row(rows, path)?.overrideState),
    ["saved", "draft", "none"],
  );
});

test("on a built-in theme with a draft, item rows show no saved overrides", () => {
  const library = new Map<string, VideoThemeDocument>([
    ...BUILT_IN_VIDEO_THEMES,
    [
      "classic",
      {
        ...(BUILT_IN_VIDEO_THEMES.get("classic") as VideoThemeDocument),
        overrides: { "network-graph": { other: { video: { semantic: { color: { accent: "$atomic.swatch.orange" } } } } } },
      },
    ],
  ]);
  const draft = setTokenInDraft(EMPTY_THEME_DRAFT, { kind: "theme" }, "stroke.default", "$atomic.strokeWidth.lg");
  const resolved = resolveDraftTheme({ library, themeId: "classic", draft, scope: ITEM });
  if (!resolved.ok) {
    throw new Error("The test theme must resolve");
  }
  const rows = listTokenRows({ library, themeId: "classic", draft, scope: ITEM, merged: resolved.merged, theme: resolved.theme });
  assert.equal(_row(rows, "color.accent")?.overrideState, "none");
});

test("the used filter keeps atomic rows and drops unused semantic rows", () => {
  const filtered = filterTokenRows(_rows({ kind: "theme" }), {
    tiers: ["semantic", "atomic"],
    query: "",
    usedTokens: ["color.accent"],
    getText: () => "",
  });
  assert.ok(filtered.some((row) => row.path === "color.accent"));
  assert.ok(filtered.some((row) => row.path === "atomic.swatch.mint"));
  assert.ok(!filtered.some((row) => row.path === "color.line"));
});

test("search matches a row's text or its path", () => {
  const filtered = filterTokenRows(_rows({ kind: "theme" }), {
    tiers: ["semantic"],
    query: "corner.pill",
    getText: () => "",
  });
  assert.deepEqual(
    filtered.map((row) => row.path),
    ["corner.pill"],
  );
});

test("Essentials come out in their fixed order", () => {
  assert.deepEqual(
    getEssentialRows(_rows({ kind: "theme" })).map((row) => row.path),
    ["color.accent", "color.ground", "color.text", "atomic.fontFamily.figtree", "stroke.default", "corner.panel", "motion.tempo", "sketch.box"],
  );
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/tokenRows/tokenRows.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement rows**

`src/videoThemeEditor/tokenRows/tokenRows.ts`:

```ts
import {
  getResolvedTokenValue,
  getValueAtPath,
} from "../../videoTheme/getResolvedTokenValue/getResolvedTokenValue";
import { createDraftThemeTarget } from "../../videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { isMantineTokenRoot, listTokenDefinitions } from "../../videoTheme/tokenCatalog/tokenCatalog";
import {
  getDocumentPathFromTokenPath,
  isThemeDraftEmpty,
  type ThemeDraft,
  type ThemeEditScope,
} from "../themeDraft/themeDraft";
import type {
  ResolvedVideoTheme,
  TokenDefinition,
  VideoThemeLibrary,
  VideoThemePatch,
} from "../../videoTheme/videoTheme.types";

/** Which layer of the theme a token belongs to. */
export type TokenTier = "mantine" | "atomic" | "semantic" | "component";

/** Whether the scope being edited sets a token itself, and how. */
export type TokenOverrideState = "none" | "draft" | "saved";

/** One editable token as a scope sees it. */
export type TokenRow = Readonly<{
  path: string;
  definition: TokenDefinition;
  /** The key inside a scale, such as `mint` for `atomic.swatch.mint`. */
  scaleKey?: string;
  tier: TokenTier;
  /** Accordion section: `<tier>:<name>`. */
  group: string;
  /** The authored value in effect: a reference or a literal. */
  value: unknown;
  resolved: unknown;
  overrideState: TokenOverrideState;
}>;

/** A run of rows that share a section. */
export type TokenRowGroup = Readonly<{ group: string; rows: readonly TokenRow[] }>;

/** How the editor narrows its rows. */
export type TokenRowFilter = Readonly<{
  tiers: readonly TokenTier[];
  query: string;
  /** When set, semantic and component rows must appear here. */
  usedTokens?: readonly string[];
  /** The translated label and description of a row, for search. */
  getText: (row: TokenRow) => string;
}>;

/** The handful of tokens that change a look the most, always shown first (spec §3.2). */
export const ESSENTIAL_TOKEN_PATHS = [
  "color.accent",
  "color.ground",
  "color.text",
  "atomic.fontFamily.figtree",
  "stroke.default",
  "corner.panel",
  "motion.tempo",
  "sketch.box",
] as const;

const MANTINE_GROUPS: Readonly<Record<string, string>> = {
  colors: "palette",
  white: "palette",
  black: "palette",
  primaryColor: "palette",
  primaryShade: "palette",
  defaultGradient: "palette",
  fontFamily: "type",
  fontFamilyMonospace: "type",
  headings: "type",
  fontSizes: "type",
  lineHeights: "type",
  radius: "dimension",
  spacing: "dimension",
  autoContrast: "rendering",
  luminanceThreshold: "rendering",
  fontSmoothing: "rendering",
};

type RowContext = Readonly<{
  merged: VideoThemePatch;
  theme: ResolvedVideoTheme;
  scopePatch: VideoThemePatch;
  savedOverride: VideoThemePatch;
}>;

function _tierFromRoot(root: string): TokenTier {
  if (root === "atomic") {
    return "atomic";
  }
  if (root === "components") {
    return "component";
  }
  return isMantineTokenRoot(root) ? "mantine" : "semantic";
}

function _groupFromSegments(segments: readonly string[], tier: TokenTier): string {
  if (tier === "atomic" || tier === "component") {
    return `${tier}:${segments[1]}`;
  }
  return tier === "mantine" ? `mantine:${MANTINE_GROUPS[segments[0]] ?? segments[0]}` : `semantic:${segments[0]}`;
}

// A built-in theme with a draft previews as an unsaved theme with no
// overrides of its own (see createDraftThemeTarget), so none show as saved.
function _savedOverride(
  options: Readonly<{ library: VideoThemeLibrary; themeId: string; draft: ThemeDraft }>,
  itemId: string,
): VideoThemePatch {
  const target = createDraftThemeTarget({
    library: options.library,
    themeId: options.themeId,
    hasDraft: !isThemeDraftEmpty(options.draft),
  });
  return target.library.get(target.themeId)?.overrides?.[itemId] ?? {};
}

function _createRow(context: RowContext, path: string, definition: TokenDefinition, scaleKey?: string): TokenRow {
  const segments = path.split(".");
  const tier = _tierFromRoot(segments[0]);
  const documentPath = getDocumentPathFromTokenPath(path);
  const overrideState: TokenOverrideState =
    getValueAtPath(context.scopePatch, documentPath) !== undefined
      ? "draft"
      : getValueAtPath(context.savedOverride, documentPath) !== undefined
        ? "saved"
        : "none";
  return {
    path,
    definition,
    ...(scaleKey === undefined ? {} : { scaleKey }),
    tier,
    group: _groupFromSegments(segments, tier),
    value: getValueAtPath(context.merged, documentPath),
    resolved: getResolvedTokenValue(context.theme, path),
    overrideState,
  };
}

/**
 * Every token as one scope sees it, one row per scale entry, in catalog
 * order. The editor filters and groups these rows; reference pickers read
 * them for their options.
 */
export function listTokenRows(
  options: Readonly<{
    library: VideoThemeLibrary;
    themeId: string;
    draft: ThemeDraft;
    scope: ThemeEditScope;
    merged: VideoThemePatch;
    theme: ResolvedVideoTheme;
  }>,
): readonly TokenRow[] {
  const { scope, draft } = options;
  const context: RowContext = {
    merged: options.merged,
    theme: options.theme,
    scopePatch: scope.kind === "theme" ? draft.patch : (draft.overrides[scope.itemId] ?? {}),
    savedOverride: scope.kind === "item" ? _savedOverride(options, scope.itemId) : {},
  };
  return listTokenDefinitions().flatMap(({ path, definition, isScale }) => {
    if (!isScale) {
      return [_createRow(context, path, definition)];
    }
    const entries = getValueAtPath(options.merged, getDocumentPathFromTokenPath(path));
    const keys = typeof entries === "object" && entries !== null ? Object.keys(entries) : [];
    return keys.map((key) => _createRow(context, `${path}.${key}`, definition, key));
  });
}

/**
 * Rows in the chosen tiers that match the search and, when given, the
 * tokens an item used. Atomic and Mantine rows ignore usage: renders report
 * the semantic and component tokens they read, not what those point at.
 */
export function filterTokenRows(rows: readonly TokenRow[], filter: TokenRowFilter): readonly TokenRow[] {
  const query = filter.query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      filter.tiers.includes(row.tier) &&
      (!filter.usedTokens || row.tier === "atomic" || row.tier === "mantine" || filter.usedTokens.includes(row.path)) &&
      (!query || row.path.toLowerCase().includes(query) || filter.getText(row).toLowerCase().includes(query)),
  );
}

/** Rows split into sections, keeping first-appearance order. */
export function groupTokenRows(rows: readonly TokenRow[]): readonly TokenRowGroup[] {
  const groups = new Map<string, TokenRow[]>();
  for (const row of rows) {
    groups.set(row.group, [...(groups.get(row.group) ?? []), row]);
  }
  return [...groups].map(([group, grouped]) => ({ group, rows: grouped }));
}

/** The Essentials rows, in their fixed order. */
export function getEssentialRows(rows: readonly TokenRow[]): readonly TokenRow[] {
  return ESSENTIAL_TOKEN_PATHS.flatMap((path) => rows.filter((row) => row.path === path));
}
```

- [ ] **Step 5: Run the row tests to verify they pass**

Run the Step 3 command. Expected: 7 passing.

- [ ] **Step 6: Commit**

```bash
git add src/videoThemeEditor/formatTokenValue src/videoThemeEditor/tokenRows
git commit -m "feat(video-producer): list editable token rows with their scope state" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Reference options and custom values

**Files:**
- Create: `src/videoThemeEditor/referenceOptions/referenceOptions.ts`
- Test: `src/videoThemeEditor/referenceOptions/referenceOptions.test.ts`
- Create: `src/videoThemeEditor/customTokenValue/customTokenValue.ts`
- Test: `src/videoThemeEditor/customTokenValue/customTokenValue.test.ts`

- [ ] **Step 1: Write the failing reference option tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveDraftTheme } from "../resolveDraftTheme/resolveDraftTheme";
import { EMPTY_THEME_DRAFT } from "../themeDraft/themeDraft";
import { listTokenRows } from "../tokenRows/tokenRows";
import { isCameraCurveToken, listReferenceOptions, orderReferenceOptions } from "./referenceOptions";
import type { TokenKind } from "../../videoTheme/videoTheme.types";

const SCOPE = { kind: "theme" } as const;
const RESOLVED = resolveDraftTheme({ library: BUILT_IN_VIDEO_THEMES, themeId: "classic", draft: EMPTY_THEME_DRAFT, scope: SCOPE });
if (!RESOLVED.ok) {
  throw new Error("classic must resolve");
}
const ROWS = listTokenRows({
  library: BUILT_IN_VIDEO_THEMES,
  themeId: "classic",
  draft: EMPTY_THEME_DRAFT,
  scope: SCOPE,
  merged: RESOLVED.merged,
  theme: RESOLVED.theme,
});

const THEME = RESOLVED.theme;

function _references(kind: TokenKind, excludePath?: string): readonly string[] {
  return listReferenceOptions({ kind, excludePath, rows: ROWS, theme: THEME }).map((option) => option.reference);
}

test("a colour picker offers the primary colour, swatches, semantic colours, and palette shades", () => {
  const references = _references("color", "color.accent");
  for (const reference of ["$primary", "$atomic.swatch.mint", "$color.text", "$colors.primary.4"]) {
    assert.ok(references.includes(reference), reference);
  }
  assert.ok(!references.includes("$color.accent"));
});

test("a size picker offers Mantine font sizes as lengths", () => {
  assert.ok(_references("length").includes("$fontSizes.md"));
});

test("a weight picker offers heading weights but not line heights", () => {
  const references = _references("fontWeight");
  assert.ok(references.includes("$headings.sizes.h2.fontWeight"));
  assert.ok(references.includes("$atomic.fontWeight.bold"));
  assert.ok(!references.includes("$lineHeights.md"));
});

test("a fill picker offers the ground gradient", () => {
  assert.ok(_references("fill").includes("$defaultGradient"));
});

test("options from the current reference's scale come first", () => {
  const ordered = orderReferenceOptions(
    listReferenceOptions({ kind: "length", rows: ROWS, theme: THEME }),
    "$fontSizes.7xl",
  );
  assert.ok(ordered[0].path.startsWith("fontSizes."));
});

test("a camera curve picker offers only camera-safe curves", () => {
  const references = listReferenceOptions({ kind: "easing", rows: ROWS, theme: THEME, isCameraCurve: true }).map(
    (option) => option.reference,
  );
  assert.ok(references.includes("$atomic.easing.inOut"));
  assert.ok(references.includes("$atomic.easing.inOutCubic"));
  assert.ok(!references.includes("$atomic.easing.outBack"));
  assert.ok(_references("easing").includes("$atomic.easing.outBack"));
});

test("camera curves are the named camera curves and each camera preset's curve", () => {
  assert.equal(isCameraCurveToken("camera.easing.push"), true);
  assert.equal(isCameraCurveToken("camera.presets.whip", ["easing"]), true);
  assert.equal(isCameraCurveToken("camera.presets.whip", ["speed"]), false);
  assert.equal(isCameraCurveToken("atomic.easing.outBack"), false);
});
```

`RESOLVED.theme` is typed after the module-level `if (!RESOLVED.ok) throw` guard.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/referenceOptions/referenceOptions.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement reference options**

`src/videoThemeEditor/referenceOptions/referenceOptions.ts`:

```ts
import { isCameraSafeEasing } from "../../videoTheme/cameraEasing/cameraEasing";
import { getTokenDefinitionFromPath } from "../../videoTheme/tokenCatalog/tokenCatalog";
import type {
  EasingValue,
  ResolvedVideoTheme,
  TokenDefinition,
  TokenKind,
  TokenReference,
} from "../../videoTheme/videoTheme.types";
import type { TokenRow } from "../tokenRows/tokenRows";

/** One token a reference can point at, with what it currently holds. */
export type ReferenceOption = Readonly<{
  reference: TokenReference;
  /** The target's token path, or `primary` for Mantine's primary colour. */
  path: string;
  kind: TokenKind;
  definition?: TokenDefinition;
  /** Scale key or palette shade index. */
  key?: string;
  value: unknown;
}>;

function _effectiveKind(path: string, kind: TokenKind): TokenKind {
  if (kind === "cssLength") {
    return "length";
  }
  if (kind === "cssNumber") {
    return path.endsWith("fontWeight") ? "fontWeight" : "number";
  }
  return kind;
}

function _accepts(target: TokenKind, candidate: TokenKind): boolean {
  return target === "fill" ? candidate === "color" || candidate === "gradient" : candidate === target;
}

function _primaryOption(theme: ResolvedVideoTheme): ReferenceOption {
  const shade = theme.mantine.primaryShade;
  const index = typeof shade === "number" ? shade : theme.isDarkGround ? shade.dark : shade.light;
  return { reference: "$primary", path: "primary", kind: "color", value: theme.mantine.colors[theme.mantine.primaryColor]?.[index] };
}

function _paletteOptions(theme: ResolvedVideoTheme): ReferenceOption[] {
  return Object.entries(theme.mantine.colors).flatMap(([name, shades]) => {
    const definition = getTokenDefinitionFromPath(`colors.${name}`);
    return definition
      ? shades.map((value, index) => ({
          reference: `$colors.${name}.${index}` as TokenReference,
          path: `colors.${name}.${index}`,
          kind: "color" as const,
          definition,
          key: String(index),
          value,
        }))
      : [];
  });
}

/**
 * Whether a token, or one field of a composite token, holds a curve that
 * drives the camera: the named camera curves and each camera preset's curve.
 * The resolver reports any of them that `isCameraSafeEasing` refuses, so the
 * editor offers only camera-safe curves there.
 */
export function isCameraCurveToken(tokenPath: string, fieldPath: readonly string[] = []): boolean {
  const path = [tokenPath, ...fieldPath].join(".");
  return path.startsWith("camera.easing.") || /^camera\.presets\.[^.]+\.easing$/.test(path);
}

/**
 * Tokens a reference of one kind may point at: atomic and Mantine values,
 * semantic tokens of the same kind, and for colours Mantine's primary colour
 * and every palette shade. Component tokens are never targets. For a camera
 * curve (`isCameraCurve`), only curves `isCameraSafeEasing` accepts.
 */
export function listReferenceOptions(
  options: Readonly<{
    kind: TokenKind;
    excludePath?: string;
    rows: readonly TokenRow[];
    theme: ResolvedVideoTheme;
    isCameraCurve?: boolean;
  }>,
): readonly ReferenceOption[] {
  const { kind, excludePath, rows, theme, isCameraCurve = false } = options;
  const isColor = kind === "color" || kind === "fill";
  const fromRows: ReferenceOption[] = rows
    .filter(
      (row) =>
        row.tier !== "component" &&
        row.path !== excludePath &&
        _accepts(kind, _effectiveKind(row.path, row.definition.kind)) &&
        (!isCameraCurve || isCameraSafeEasing(row.resolved as EasingValue)),
    )
    .map((row) => ({
      reference: `$${row.path}` as TokenReference,
      path: row.path,
      kind: row.definition.kind,
      definition: row.definition,
      ...(row.scaleKey === undefined ? {} : { key: row.scaleKey }),
      value: row.resolved,
    }));
  return [...(isColor ? [_primaryOption(theme)] : []), ...fromRows, ...(isColor ? _paletteOptions(theme) : [])];
}

function _scaleOf(path: string): string {
  return path.split(".").slice(0, -1).join(".");
}

/** Options with those from the current reference's scale first, the likeliest picks. */
export function orderReferenceOptions(options: readonly ReferenceOption[], current: unknown): readonly ReferenceOption[] {
  if (typeof current !== "string" || !current.startsWith("$")) {
    return options;
  }
  const scale = _scaleOf(current.slice(1));
  return [
    ...options.filter((option) => _scaleOf(option.path) === scale),
    ...options.filter((option) => _scaleOf(option.path) !== scale),
  ];
}
```

Run the Step 1 command. Expected: 7 passing.

- [ ] **Step 3: Write the failing custom value tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getValueAtPath } from "../../videoTheme/getResolvedTokenValue/getResolvedTokenValue";
import { EMPTY_THEME_DRAFT } from "../themeDraft/themeDraft";
import { getCustomScaleFromReference, setCustomValueInDraft } from "./customTokenValue";

const THEME = { kind: "theme" } as const;
const SUBTITLE = {
  family: "$atomic.fontFamily.figtree",
  size: "$fontSizes.7xl",
  weight: "$atomic.fontWeight.regular",
  lineHeight: "$lineHeights.lg",
  color: "$color.text",
};

test("a custom colour on a semantic token becomes a named swatch", () => {
  const draft = setCustomValueInDraft(EMPTY_THEME_DRAFT, THEME, {
    tokenPath: "color.accent",
    fieldPath: [],
    currentValue: "$primary",
    currentReference: "$primary",
    kind: "color",
    literal: "#ff0000",
  });
  assert.equal(getValueAtPath(draft.patch, ["other", "video", "atomic", "swatch", "customColorAccent"]), "#ff0000");
  assert.equal(
    getValueAtPath(draft.patch, ["other", "video", "semantic", "color", "accent"]),
    "$atomic.swatch.customColorAccent",
  );
});

test("a custom size keeps the scale its field already points at", () => {
  const draft = setCustomValueInDraft(EMPTY_THEME_DRAFT, THEME, {
    tokenPath: "text.stage.subtitle",
    fieldPath: ["size"],
    currentValue: SUBTITLE,
    currentReference: "$fontSizes.7xl",
    kind: "length",
    literal: 27,
  });
  assert.equal(getValueAtPath(draft.patch, ["fontSizes", "customTextStageSubtitleSize"]), "27px");
  assert.deepEqual(getValueAtPath(draft.patch, ["other", "video", "semantic", "text", "stage", "subtitle"]), {
    ...SUBTITLE,
    size: "$fontSizes.customTextStageSubtitleSize",
  });
});

test("a length that points at another semantic token has no custom scale", () => {
  assert.equal(getCustomScaleFromReference("$stroke.default", "length"), undefined);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/customTokenValue/customTokenValue.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement custom values**

`src/videoThemeEditor/customTokenValue/customTokenValue.ts`:

```ts
import {
  getTargetFromTokenReference,
  isTokenReference,
} from "../../videoTheme/themeReferences/themeReferences";
import {
  setTokenInDraft,
  setValueAtPath,
  type ThemeDraft,
  type ThemeEditScope,
} from "../themeDraft/themeDraft";
import type { TokenKind } from "../../videoTheme/videoTheme.types";

const MANTINE_SCALES = new Set(["fontSizes", "lineHeights", "radius", "spacing"]);
const PIXEL_SCALES = new Set(["fontSizes", "radius", "spacing"]);

/** Where a custom value of a kind goes when its current reference names no scale. */
const FALLBACK_SCALES: Partial<Record<TokenKind, string>> = {
  color: "atomic.swatch",
  textShadow: "atomic.textShadow",
  glow: "atomic.glow",
  shadow: "atomic.shadow",
  easing: "atomic.easing",
  spring: "atomic.spring",
  dash: "atomic.dash",
  duration: "atomic.duration",
  opacity: "atomic.opacity",
  letterSpacing: "atomic.letterSpacing",
  fontWeight: "atomic.fontWeight",
  fontFamily: "atomic.fontFamily",
};

/** A request to give a semantic token, or one field of it, a value of its own. */
export type CustomValueRequest = Readonly<{
  tokenPath: string;
  /** Empty for the token itself, or the composite field, such as `["size"]`. */
  fieldPath: readonly string[];
  /** The token's whole authored value in this scope. */
  currentValue: unknown;
  /** The field's authored value: usually a reference. */
  currentReference: unknown;
  kind: TokenKind;
  literal: unknown;
}>;

/**
 * The scale a custom value lands in: the scale the current reference points
 * into (such as `fontSizes` for `$fontSizes.7xl`), otherwise the kind's
 * usual atomic scale, otherwise none. Semantic tokens hold only references,
 * so a custom value becomes a named scale entry.
 */
export function getCustomScaleFromReference(reference: unknown, kind: TokenKind): string | undefined {
  if (isTokenReference(reference)) {
    const target = getTargetFromTokenReference(reference);
    if (target.tier === "atomic" && target.path.length === 2) {
      return `atomic.${target.path[0]}`;
    }
    if (target.tier === "mantine" && target.path.length === 2 && MANTINE_SCALES.has(target.path[0])) {
      return target.path[0];
    }
  }
  return FALLBACK_SCALES[kind];
}

/** The scale key for a custom value, such as `customColorAccent`, at most 32 characters. */
export function buildCustomScaleKeyFromPath(path: readonly string[]): string {
  const words = path.flatMap((segment) => segment.split(/[^A-Za-z0-9]+/)).filter(Boolean);
  return `custom${words.map((word) => word[0].toUpperCase() + word.slice(1)).join("")}`.slice(0, 32);
}

function _toScaleLiteral(scale: string, literal: unknown): unknown {
  if (PIXEL_SCALES.has(scale) && typeof literal === "number") {
    return `${literal}px`;
  }
  return scale === "lineHeights" && typeof literal === "number" ? String(literal) : literal;
}

/**
 * A draft where a semantic token (or one field of it) points at a new
 * scale entry holding a custom value, in the same scope. Unchanged when no
 * scale fits.
 */
export function setCustomValueInDraft(draft: ThemeDraft, scope: ThemeEditScope, request: CustomValueRequest): ThemeDraft {
  const scale = getCustomScaleFromReference(request.currentReference, request.kind);
  if (!scale) {
    return draft;
  }
  const key = buildCustomScaleKeyFromPath([...request.tokenPath.split("."), ...request.fieldPath]);
  const reference = `$${scale}.${key}`;
  const withEntry = setTokenInDraft(draft, scope, `${scale}.${key}`, _toScaleLiteral(scale, request.literal));
  const current =
    typeof request.currentValue === "object" && request.currentValue !== null
      ? (request.currentValue as Readonly<Record<string, unknown>>)
      : {};
  const tokenValue = request.fieldPath.length === 0 ? reference : setValueAtPath(current, request.fieldPath, reference);
  return setTokenInDraft(withEntry, scope, request.tokenPath, tokenValue);
}
```

Run the Step 3 command. Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/videoThemeEditor/referenceOptions src/videoThemeEditor/customTokenValue
git commit -m "feat(video-producer): offer compatible references and custom token values" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Observed token usage

**Files:**
- Create: `src/videoThemeEditor/observedTokenUsage/observedTokenUsage.ts`
- Create: `src/videoThemeEditor/observedTokenUsage/useObservedTokenUsage.ts`
- Test: `src/videoThemeEditor/observedTokenUsage/observedTokenUsage.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createObservedTokenUsage } from "./observedTokenUsage";

test("reports during one render notify subscribers once with sorted unique paths", async () => {
  const usage = createObservedTokenUsage();
  let notifications = 0;
  usage.subscribe(() => {
    notifications += 1;
  });
  usage.report("color.line");
  usage.report("color.accent");
  usage.report("color.line");
  await Promise.resolve();
  assert.equal(notifications, 1);
  assert.deepEqual(usage.getPaths(), ["color.accent", "color.line"]);
});

test("the paths snapshot keeps its identity until something new is reported", async () => {
  const usage = createObservedTokenUsage();
  usage.report("color.accent");
  await Promise.resolve();
  const first = usage.getPaths();
  usage.report("color.accent");
  await Promise.resolve();
  assert.equal(usage.getPaths(), first);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/observedTokenUsage/observedTokenUsage.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement the collector**

`src/videoThemeEditor/observedTokenUsage/observedTokenUsage.ts`:

```ts
import type { TokenUsageReporter } from "../../videoTheme/tokenUsage/tokenUsage";

/** A usage collector that renders can report into and React can subscribe to. */
export type ObservedTokenUsage = Readonly<{
  report: TokenUsageReporter;
  getPaths: () => readonly string[];
  subscribe: (listener: () => void) => () => void;
}>;

/**
 * Collects the token paths renders read and tells subscribers in a
 * microtask, after the render that reported them. Use it where a preview's
 * usage must reach UI state, such as the editor's "used by this item"
 * filter or the live player's usage messages.
 */
export function createObservedTokenUsage(): ObservedTokenUsage {
  const seen = new Set<string>();
  const listeners = new Set<() => void>();
  let paths: readonly string[] = [];
  let isScheduled = false;
  return {
    report: (path) => {
      if (seen.has(path)) {
        return;
      }
      seen.add(path);
      if (!isScheduled) {
        isScheduled = true;
        queueMicrotask(() => {
          isScheduled = false;
          paths = [...seen].sort();
          listeners.forEach((listener) => listener());
        });
      }
    },
    getPaths: () => paths,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
```

`src/videoThemeEditor/observedTokenUsage/useObservedTokenUsage.ts`:

```ts
import { useState, useSyncExternalStore } from "react";
import { createObservedTokenUsage } from "./observedTokenUsage";
import type { TokenUsageReporter } from "../../videoTheme/tokenUsage/tokenUsage";

/**
 * A reporter to put in `VideoTokenUsageContext` around a preview, and the
 * token paths it has seen so far. One collector lives as long as the
 * component that calls this.
 */
export function useObservedTokenUsage(): Readonly<{ report: TokenUsageReporter; paths: readonly string[] }> {
  const [usage] = useState(createObservedTokenUsage);
  const paths = useSyncExternalStore(usage.subscribe, usage.getPaths, usage.getPaths);
  return { report: usage.report, paths };
}
```

- [ ] **Step 3: Run the tests to verify they pass**

Run the Step 1 command. Expected: 2 passing.

- [ ] **Step 4: Commit**

```bash
git add src/videoThemeEditor/observedTokenUsage
git commit -m "feat(video-producer): observe the tokens a preview reads" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Token copy in the gallery catalog

**Files:**
- Create: `src/videoThemeEditor/tokenCopy/buildTokenDescriptorsSource.ts`
- Test: `src/videoThemeEditor/tokenCopy/buildTokenDescriptorsSource.test.ts`
- Create: `scripts/videoTheme/buildTokenMessages/buildTokenMessages.ts`
- Create (generated): `src/videoThemeEditor/tokenCopy/tokenDescriptors.generated.ts`
- Create: `src/videoThemeEditor/tokenCopy/useTokenCopy.ts`
- Create: `src/videoThemeEditor/tokenCopy/useEditorCopy.ts`
- Modify: `lingui.gallery.config.ts`, `scripts/buildAtlas/createGalleryPlugin.mjs`, `scripts/buildAtlas/generateGalleryCopy.mjs`, `package.json`, `tests/motion-watch.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildTokenDescriptorsSource, getTokenMessagesFromCatalog } from "./buildTokenDescriptorsSource";

test("every catalog label and description becomes one descriptor", () => {
  const source = buildTokenDescriptorsSource();
  assert.equal(source.match(/msg\(/g)?.length, getTokenMessagesFromCatalog().length);
  assert.ok(source.includes('id: "tokens.Accent"'));
  assert.ok(source.includes('"tokens.The path, packet, or object a motion is about."'));
});

test("ICU braces and quotes in copy stay literal", () => {
  assert.ok(buildTokenDescriptorsSource(["Use {braces} and it's"]).includes(`message: "Use '{'braces'}' and it''s"`));
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/tokenCopy/buildTokenDescriptorsSource.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement the descriptor source**

`src/videoThemeEditor/tokenCopy/buildTokenDescriptorsSource.ts`:

```ts
import { listTokenDefinitions } from "../../videoTheme/tokenCatalog/tokenCatalog";

/** Message id prefix that keeps token copy apart from other gallery copy. */
export const TOKEN_MESSAGE_PREFIX = "tokens.";

/** Every catalog label and description, once each, sorted. */
export function getTokenMessagesFromCatalog(): readonly string[] {
  const messages = listTokenDefinitions().flatMap(({ definition }) => [definition.label, definition.description]);
  return [...new Set(messages)].sort();
}

function _escapeMessage(message: string): string {
  return message.replace(/'/g, "''").replace(/[{}]/g, (brace) => `'${brace}'`);
}

/**
 * The source of `tokenDescriptors.generated.ts`: one extractable Lingui
 * descriptor per catalog sentence, so gallery extraction adds token copy to
 * the gallery's translation catalog.
 */
export function buildTokenDescriptorsSource(messages: readonly string[] = getTokenMessagesFromCatalog()): string {
  const descriptors = messages.map(
    (message) =>
      `  msg({ id: ${JSON.stringify(TOKEN_MESSAGE_PREFIX + message)}, message: ${JSON.stringify(_escapeMessage(message))} }),`,
  );
  return (
    "/** Generated by buildTokenMessages from the video token catalog. Do not edit. */\n" +
    'import { msg } from "@lingui/core/macro";\n\n' +
    "/** Extractable descriptors for the video token catalog's labels and descriptions. */\n" +
    "export const tokenDescriptors = [\n" +
    descriptors.join("\n") +
    "\n];\n"
  );
}
```

Run the Step 1 command. Expected: 2 passing.

- [ ] **Step 3: Write the generator script**

`scripts/videoTheme/buildTokenMessages/buildTokenMessages.ts`:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildTokenDescriptorsSource } from "../../../src/videoThemeEditor/tokenCopy/buildTokenDescriptorsSource";
import { requireLicense } from "../../require-license.mjs";

/** Where the extractable token descriptors live, relative to the app. */
const DESCRIPTORS_FILE = "src/videoThemeEditor/tokenCopy/tokenDescriptors.generated.ts";

/**
 * Writes the token catalog's display copy as Lingui descriptors, so the
 * gallery extraction that follows adds it to the gallery catalog. Leaves the
 * file untouched when nothing changed.
 */
export async function buildTokenMessages(root: string): Promise<void> {
  const filename = path.join(root, DESCRIPTORS_FILE);
  const source = buildTokenDescriptorsSource();
  if ((await fs.readFile(filename, "utf8").catch(() => "")) !== source) {
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, source);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  requireLicense();
  await buildTokenMessages(process.cwd());
}
```

- [ ] **Step 4: Wire the editor into gallery extraction and the macro transform**

In `lingui.gallery.config.ts`, change

```ts
      include: ["src/gallery", "src/continuity/gallery"],
```

to

```ts
      include: ["src/gallery", "src/continuity/gallery", "src/videoThemeEditor"],
```

In `scripts/buildAtlas/createGalleryPlugin.mjs`, change

```js
            !["src/gallery/", "src/continuity/gallery/"].some((directory) =>
```

to

```js
            !["src/gallery/", "src/continuity/gallery/", "src/videoThemeEditor/"].some((directory) =>
```

In `scripts/buildAtlas/generateGalleryCopy.mjs`, after the `buildStockMessages` import add

```js
const { buildTokenMessages } = await tsImport(
  "../videoTheme/buildTokenMessages/buildTokenMessages.ts",
  import.meta.url,
);
```

and inside `generateGalleryCopy`, after `await buildStockMessages(root);`, add `await buildTokenMessages(root);`.

In `package.json`, replace the `gallery:messages` script with:

```json
"gallery:messages": "node scripts/require-license.mjs && node --import tsx --import ./scripts/yaml/registerYaml.mjs scripts/helperCatalog/buildHelperMessages/buildHelperMessages.ts && node --import tsx scripts/videoTheme/buildTokenMessages/buildTokenMessages.ts && lingui extract --config lingui.gallery.config.ts && lingui compile --config lingui.gallery.config.ts",
```

In `tests/motion-watch.test.ts`, add `"src/videoThemeEditor",` and `"scripts/videoTheme",` to `_createWatchFixture`'s `files` list (the gallery bundle now imports the editor, and the gallery build writes token descriptors).

- [ ] **Step 5: Write the copy hooks**

`src/videoThemeEditor/tokenCopy/useTokenCopy.ts`:

```ts
import { useLingui } from "@lingui/react";
import { useCallback } from "react";
import { TOKEN_MESSAGE_PREFIX } from "./buildTokenDescriptorsSource";

/**
 * Translates a token catalog label or description through the gallery
 * catalog, falling back to the English source. Use it for every piece of
 * catalog copy a viewer sees.
 */
export function useTokenCopy(): (message: string) => string {
  const { i18n } = useLingui();
  return useCallback((message: string) => i18n._({ id: `${TOKEN_MESSAGE_PREFIX}${message}`, message }), [i18n]);
}
```

`src/videoThemeEditor/tokenCopy/useEditorCopy.ts`:

```ts
/*
 * Translated names the editor shows that are not catalog copy: section
 * names, composite field names, and enum options.
 */
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";

/** Readable words for a component name, such as `Progress bar` for `ProgressBar`. */
function _humanize(name: string): string {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Section names for semantic and Mantine groups. Atomic groups use their scale's catalog label. */
export function useGroupCopy(): (group: string) => string | undefined {
  const { t } = useLingui();
  return useMemo(() => {
    const names: Readonly<Record<string, string>> = {
      "semantic:color": t`Color`,
      "semantic:text": t`Type`,
      "semantic:stroke": t`Strokes`,
      "semantic:corner": t`Corners`,
      "semantic:elevation": t`Elevation`,
      "semantic:effect": t`Effects`,
      "semantic:sketch": t`Sketch`,
      "semantic:layout": t`Layout`,
      "semantic:motion": t`Motion`,
      "semantic:camera": t`Camera`,
      "semantic:motionBlur": t`Motion blur`,
      "mantine:palette": t`Palettes`,
      "mantine:type": t`Type scale`,
      "mantine:dimension": t`Radii and spacing`,
      "mantine:rendering": t`Rendering`,
    };
    return (group: string) => {
      const [tier, name] = group.split(":");
      return tier === "component" ? _humanize(name) : names[group];
    };
  }, [t]);
}

/** Names of type style fields. */
function useTypeFieldCopy(): Readonly<Record<string, string>> {
  const { t } = useLingui();
  return useMemo(
    () => ({
      family: t`Font`,
      size: t`Size`,
      weight: t`Weight`,
      lineHeight: t`Line height`,
      letterSpacing: t`Letter spacing`,
      transform: t`Letter case`,
      numeric: t`Numerals`,
      color: t`Color`,
      alpha: t`Opacity`,
      textShadow: t`Text shadow`,
      glow: t`Glow`,
      stroke: t`Outline`,
    }),
    [t],
  );
}

/** Names of every composite field, for labels such as "Size" or "Curve". */
export function useFieldCopy(): (field: string) => string {
  const { t } = useLingui();
  const typeFields = useTypeFieldCopy();
  return useMemo(() => {
    const names: Readonly<Record<string, string>> = {
      ...typeFields,
      shadow: t`Shadow`,
      roughness: t`Roughness`,
      bowing: t`Bowing`,
      seed: t`Seed`,
      randomness: t`Offset`,
      top: t`Top`,
      right: t`Right`,
      bottom: t`Bottom`,
      left: t`Left`,
      x: t`Horizontal`,
      y: t`Vertical`,
      gap: t`Gap`,
      duration: t`Duration`,
      easing: t`Curve`,
      distance: t`Distance`,
      spring: t`Spring`,
      period: t`Cycle`,
      rate: t`Rate`,
      speed: t`Speed`,
      shutter: t`Shutter angle`,
      min: t`Minimum`,
      max: t`Maximum`,
      onDark: t`On dark grounds`,
      onLight: t`On light grounds`,
    };
    return (field: string) => names[field] ?? field;
  }, [t, typeFields]);
}

/** One enum option's name and, for camera presets, what it feels like. */
export type OptionCopy = Readonly<{ label: string; description?: string }>;

/** Camera preset names and the editorial intent of each. */
function useCameraPresetCopy(): Readonly<Record<string, OptionCopy>> {
  const { t } = useLingui();
  return useMemo(
    () => ({
      authored: { label: t`Composition default`, description: t`Keeps the speed, easing, and blur defined in each scene.` },
      deliberate: { label: t`Deliberate`, description: t`Patient and investigative. Gives viewers time to inspect an unfamiliar system or a dense diagram.` },
      gentle: { label: t`Gentle`, description: t`Calm and instructional. A gradual change of focus for tutorials and teaching.` },
      balanced: { label: t`Balanced`, description: t`Measured and readable. Connects related ideas without drawing attention away from the explanation.` },
      brisk: { label: t`Brisk`, description: t`Confident and purposeful. Moves promptly between familiar landmarks, with a more emphatic start and stop.` },
      whip: { label: t`Whip`, description: t`Fast and energetic. Adds a brief burst of momentum at a major subject change. Use it sparingly.` },
    }),
    [t],
  );
}

/** Names for enum options by token path or composite field name. */
export function useOptionCopy(): (key: string, option: string) => OptionCopy {
  const { t } = useLingui();
  const cameraPresets = useCameraPresetCopy();
  return useMemo(() => {
    const options: Readonly<Record<string, Readonly<Record<string, OptionCopy>>>> = {
      "camera.preset": cameraPresets,
      transform: { none: { label: t`As written` }, uppercase: { label: t`Uppercase` }, lowercase: { label: t`Lowercase` }, capitalize: { label: t`Capitalized` } },
      numeric: { normal: { label: t`Proportional` }, "tabular-nums": { label: t`Tabular` } },
      primaryColor: { primary: { label: t`Primary` }, neutral: { label: t`Neutral` }, secondary: { label: t`Secondary` }, success: { label: t`Success` }, warning: { label: t`Warning` }, danger: { label: t`Danger` }, info: { label: t`Info` } },
    };
    return (key: string, option: string) => options[key]?.[option] ?? { label: option };
  }, [t, cameraPresets]);
}
```

- [ ] **Step 6: Generate the descriptors and extract**

Run: `pnpm gallery:messages`
Expected: it writes `src/videoThemeEditor/tokenCopy/tokenDescriptors.generated.ts` and the extraction summary lists new `tokens.` messages in `src/gallery/locales/en/messages.po`.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test tests/motion-watch.test.ts`
Expected: passing.

- [ ] **Step 7: Typecheck and commit**

Run both typecheck commands. Expected: no errors.

```bash
git add src/videoThemeEditor/tokenCopy scripts/videoTheme/buildTokenMessages lingui.gallery.config.ts scripts/buildAtlas/createGalleryPlugin.mjs scripts/buildAtlas/generateGalleryCopy.mjs package.json tests/motion-watch.test.ts src/gallery/locales
git commit -m "feat(video-producer): translate video token copy through the gallery catalog" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Theme API client

**Files:**
- Create: `src/videoThemeEditor/ThemeApi/ThemeApi.ts`
- Test: `src/videoThemeEditor/ThemeApi/ThemeApi.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import classicTheme from "../../../themes/classic.theme.json";
import { ThemeApi, ThemeApiError } from "./ThemeApi";

const ORIGINAL_FETCH = globalThis.fetch;
const WARM = { schemaVersion: 1, id: "warm", label: "Warm", extends: "classic" } as const;

function _respondWith(responses: Readonly<Record<string, readonly [number, unknown]>>) {
  globalThis.fetch = async (input) => {
    const [status, body] = responses[String(input)] ?? [404, { message: "Not found", issues: [] }];
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

test("a refused save keeps the server's status and issues", async () => {
  _respondWith({ "/api/themes/warm": [400, { message: "Bad", issues: [{ path: "color.accent", message: "Missing" }] }] });
  await assert.rejects(ThemeApi.save(WARM, "hash"), (error: unknown) =>
    error instanceof ThemeApiError && error.status === 400 && error.issues[0]?.path === "color.accent",
  );
});

test("loading the library reads every listed theme with its hash", async () => {
  _respondWith({
    "/api/themes": [200, [{ id: "classic", label: "Classic", builtIn: true }, { id: "warm", label: "Warm", builtIn: false, extends: "classic" }]],
    "/api/themes/classic": [200, { document: classicTheme, hash: "a" }],
    "/api/themes/warm": [200, { document: WARM, hash: "b" }],
  });
  const loaded = await ThemeApi.loadAll();
  assert.deepEqual([...loaded.stored.keys()], ["classic", "warm"]);
  assert.equal(loaded.stored.get("warm")?.hash, "b");
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/ThemeApi/ThemeApi.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement**

`src/videoThemeEditor/ThemeApi/ThemeApi.ts`:

```ts
import { parseVideoThemeDocument } from "../../videoTheme/videoThemeSchema/videoThemeSchema";
import type { VideoThemeDocument, VideoThemeIssue } from "../../videoTheme/videoTheme.types";

/** One theme in the picker, as the showcase server lists it. */
export type ThemeSummary = Readonly<{ id: string; label: string; builtIn: boolean; extends?: string }>;

/** A theme file and the hash of its bytes, sent back as `If-Match` when saving. */
export type StoredTheme = Readonly<{ document: VideoThemeDocument; hash: string }>;

/** A refused theme request: its HTTP status and any token problems. */
export class ThemeApiError extends Error {
  readonly status: number;
  readonly issues: readonly VideoThemeIssue[];

  constructor(status: number, message: string, issues: readonly VideoThemeIssue[]) {
    super(message);
    this.name = "ThemeApiError";
    this.status = status;
    this.issues = issues;
  }
}

function _errorBody(body: unknown): Readonly<{ message: string; issues: readonly VideoThemeIssue[] }> {
  const record = typeof body === "object" && body !== null ? (body as Readonly<Record<string, unknown>>) : {};
  return {
    message: typeof record.message === "string" ? record.message : "Theme request failed",
    issues: Array.isArray(record.issues) ? (record.issues as VideoThemeIssue[]) : [],
  };
}

async function _request<Body>(url: string, init: RequestInit = {}): Promise<Body> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const { message, issues } = _errorBody(body);
    throw new ThemeApiError(response.status, message, issues);
  }
  return body as Body;
}

async function _read(id: string): Promise<StoredTheme> {
  const stored = await _request<{ document: unknown; hash: string }>(`/api/themes/${encodeURIComponent(id)}`);
  return { document: parseVideoThemeDocument(stored.document), hash: stored.hash };
}

async function _loadAll(): Promise<Readonly<{ themes: readonly ThemeSummary[]; stored: ReadonlyMap<string, StoredTheme> }>> {
  const themes = await _request<ThemeSummary[]>("/api/themes");
  const stored = await Promise.all(themes.map(async (theme) => [theme.id, await _read(theme.id)] as const));
  return { themes, stored: new Map(stored) };
}

/**
 * The showcase's `/api/themes` routes from the browser. Writes send the
 * same-origin headers the routes require; failures throw `ThemeApiError`
 * with the server's status so the UI can explain them.
 */
export const ThemeApi = {
  loadAll: _loadAll,
  read: _read,
  create: (document: VideoThemeDocument) =>
    _request<{ id: string; hash: string }>("/api/themes", { method: "POST", body: JSON.stringify(document) }),
  save: (document: VideoThemeDocument, hash: string) =>
    _request<{ hash: string }>(`/api/themes/${encodeURIComponent(document.id)}`, {
      method: "PUT",
      headers: { "If-Match": hash },
      body: JSON.stringify(document),
    }),
};
```

The browser adds `Origin` to every POST and PUT, which is what the routes check.

- [ ] **Step 3: Run the tests to verify they pass**

Run the Step 1 command. Expected: 2 passing.

- [ ] **Step 4: Commit**

```bash
git add src/videoThemeEditor/ThemeApi
git commit -m "feat(video-producer): read and save video themes from the browser" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The shared draft state hook

No unit test: the hook only wires tested modules (`themeDraft`, `themeDraftStorage`, `ThemeApi`) to React and the browser. The end-to-end specs in Task 21 cover it (draft survives reload, save as new, built-ins hide Save).

**Files:**
- Create: `src/videoThemeEditor/useVideoThemeDraft/browserStorage.ts`
- Create: `src/videoThemeEditor/useVideoThemeDraft/useThemeLibrary.ts`
- Create: `src/videoThemeEditor/useVideoThemeDraft/useActiveThemeId.ts`
- Create: `src/videoThemeEditor/useVideoThemeDraft/useStoredDraft.ts`
- Create: `src/videoThemeEditor/useVideoThemeDraft/useThemeSaving.ts`
- Create: `src/videoThemeEditor/useVideoThemeDraft/useVideoThemeDraft.ts`

- [ ] **Step 1: Write the storage fallback**

`src/videoThemeEditor/useVideoThemeDraft/browserStorage.ts`:

```ts
/** The storage methods the draft hooks use. */
export type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * localStorage when the browser allows it, otherwise an in-memory stand-in,
 * so a private window or blocked storage never breaks the editor.
 */
export function getBrowserStorage(): BrowserStorage {
  try {
    window.localStorage.getItem("video-theme-probe");
    return window.localStorage;
  } catch {
    const values = new Map<string, string>();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    };
  }
}
```

- [ ] **Step 2: Write the theme library hook**

`src/videoThemeEditor/useVideoThemeDraft/useThemeLibrary.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { ThemeApi, type StoredTheme, type ThemeSummary } from "../ThemeApi/ThemeApi";
import type { VideoThemeDocument, VideoThemeLibrary } from "../../videoTheme/videoTheme.types";

type ThemeCollection = Readonly<{ themes: readonly ThemeSummary[]; stored: ReadonlyMap<string, StoredTheme> }>;

/** Themes the editor knows, their files' hashes, and a library to resolve them. */
export type ThemeLibraryState = ThemeCollection &
  Readonly<{ library: VideoThemeLibrary; storeTheme: (stored: StoredTheme) => void }>;

function _summaryFromDocument(document: VideoThemeDocument): ThemeSummary {
  return {
    id: document.id,
    label: document.label,
    builtIn: BUILT_IN_VIDEO_THEMES.has(document.id),
    ...(document.extends ? { extends: document.extends } : {}),
  };
}

const BUILT_IN_COLLECTION: ThemeCollection = {
  themes: [...BUILT_IN_VIDEO_THEMES.values()].map(_summaryFromDocument),
  stored: new Map(),
};

/**
 * Starts with the bundled built-in themes and adds every theme the showcase
 * serves once `/api/themes` answers. Without the server, built-ins stay
 * available and saving is off (no stored hashes).
 */
export function useThemeLibrary(): ThemeLibraryState {
  const [collection, setCollection] = useState<ThemeCollection>(BUILT_IN_COLLECTION);
  useEffect(() => {
    let isCurrent = true;
    ThemeApi.loadAll().then(
      (loaded) => {
        if (isCurrent) {
          setCollection(loaded);
        }
      },
      () => {
        // Without the showcase API the built-in themes stay available.
      },
    );
    return () => {
      isCurrent = false;
    };
  }, []);
  const library = useMemo(
    () => createVideoThemeLibrary([...collection.stored.values()].map((entry) => entry.document)),
    [collection.stored],
  );
  const storeTheme = useCallback(
    (stored: StoredTheme) =>
      setCollection((current) => ({
        themes: current.themes.some((theme) => theme.id === stored.document.id)
          ? current.themes
          : [...current.themes, _summaryFromDocument(stored.document)],
        stored: new Map([...current.stored, [stored.document.id, stored]]),
      })),
    [],
  );
  return { ...collection, library, storeTheme };
}
```

- [ ] **Step 3: Write the active theme hook**

`src/videoThemeEditor/useVideoThemeDraft/useActiveThemeId.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getActiveThemeIdFromLocation,
  rememberActiveThemeId,
} from "../themeDraftStorage/themeDraftStorage";
import type { BrowserStorage } from "./browserStorage";
import type { VideoThemeLibrary } from "../../videoTheme/videoTheme.types";

/**
 * The theme being edited and a way to switch it. Reads `?theme=` and the
 * viewer's last choice; a URL theme that loads after the built-ins is
 * adopted until the viewer picks one. Switching rewrites `?theme=` so a
 * shared link opens the same theme.
 */
export function useActiveThemeId(
  options: Readonly<{ library: VideoThemeLibrary; storage: BrowserStorage }>,
): readonly [string, (themeId: string) => void] {
  const { library, storage } = options;
  const availableKey = [...library.keys()].join(",");
  const hasChosen = useRef(false);
  const [themeId, setThemeId] = useState(() =>
    getActiveThemeIdFromLocation({ search: location.search, storage, available: availableKey.split(",") }),
  );
  useEffect(() => {
    if (!hasChosen.current) {
      setThemeId(getActiveThemeIdFromLocation({ search: location.search, storage, available: availableKey.split(",") }));
    }
  }, [availableKey, storage]);
  const selectTheme = useCallback(
    (id: string) => {
      hasChosen.current = true;
      setThemeId(id);
      rememberActiveThemeId(storage, id);
      const url = new URL(location.href);
      url.searchParams.set("theme", id);
      history.replaceState(history.state, "", url);
    },
    [storage],
  );
  return [themeId, selectTheme] as const;
}
```

- [ ] **Step 4: Write the stored draft hook**

`src/videoThemeEditor/useVideoThemeDraft/useStoredDraft.ts`:

```ts
import { useState } from "react";
import {
  EMPTY_THEME_DRAFT,
  isThemeDraftEmpty,
  type ThemeDraft,
} from "../themeDraft/themeDraft";
import {
  readStoredThemeDraft,
  writeStoredThemeDraft,
  type StoredThemeDraft,
} from "../themeDraftStorage/themeDraftStorage";
import type { BrowserStorage } from "./browserStorage";

/** One theme's persisted draft and what can be done with it. */
export type StoredDraftState = Readonly<{
  draft: ThemeDraft;
  isDirty: boolean;
  /** The theme file changed after these edits were made. */
  isChangedOnDisk: boolean;
  setDraft: (draft: ThemeDraft) => void;
  /** Keeps the edits on top of the current file and clears the banner. */
  keepDraft: () => void;
  discard: () => void;
}>;

/**
 * The draft of the active theme, stored per viewer with the hash of the
 * file it was made against. The gallery reloads whenever a theme file
 * changes, so the stored hash is what tells a stale draft apart.
 */
export function useStoredDraft(
  options: Readonly<{ themeId: string; baseHash: string; storage: BrowserStorage }>,
): StoredDraftState {
  const { themeId, baseHash, storage } = options;
  const [state, setState] = useState(() => ({ themeId, record: readStoredThemeDraft(storage, themeId) }));
  const record = state.themeId === themeId ? state.record : readStoredThemeDraft(storage, themeId);
  if (state.themeId !== themeId) {
    setState({ themeId, record });
  }
  const draft = record?.draft ?? EMPTY_THEME_DRAFT;
  const store = (next: StoredThemeDraft) => {
    writeStoredThemeDraft(storage, themeId, next);
    setState({ themeId, record: next });
  };
  const isDirty = !isThemeDraftEmpty(draft);
  return {
    draft,
    isDirty,
    isChangedOnDisk: isDirty && Boolean(record?.baseHash) && Boolean(baseHash) && record?.baseHash !== baseHash,
    setDraft: (next) => store({ baseHash: record?.baseHash || baseHash, draft: next }),
    keepDraft: () => store({ baseHash, draft }),
    discard: () => store({ baseHash, draft: EMPTY_THEME_DRAFT }),
  };
}
```

- [ ] **Step 5: Write the saving hook**

`src/videoThemeEditor/useVideoThemeDraft/useThemeSaving.ts`:

```ts
import { useState } from "react";
import {
  buildThemeIdFromLabel,
  createNewThemeDocument,
  createSavedDocumentFromDraft,
  type ThemeDraft,
} from "../themeDraft/themeDraft";
import { ThemeApi, ThemeApiError, type StoredTheme } from "../ThemeApi/ThemeApi";
import type { VideoThemeIssue, VideoThemeLibrary } from "../../videoTheme/videoTheme.types";

/** What the last theme action did, for the theme bar's status line. */
export type ThemeSaveStatus =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "saving" }>
  | Readonly<{ kind: "saved" }>
  | Readonly<{ kind: "copied" }>
  | Readonly<{ kind: "failed"; status: number; issues: readonly VideoThemeIssue[] }>;

/** Saving actions and their status. */
export type ThemeSavingState = Readonly<{
  status: ThemeSaveStatus;
  setStatus: (status: ThemeSaveStatus) => void;
  save: () => Promise<void>;
  saveAsNew: (label: string) => Promise<void>;
}>;

type Options = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  isBuiltIn: boolean;
  storedTheme: StoredTheme | undefined;
  draft: ThemeDraft;
  storeTheme: (stored: StoredTheme) => void;
  selectTheme: (themeId: string) => void;
  discard: () => void;
}>;

function _failure(error: unknown): ThemeSaveStatus {
  return error instanceof ThemeApiError
    ? { kind: "failed", status: error.status, issues: error.issues }
    : { kind: "failed", status: 0, issues: [] };
}

/**
 * Saves the draft into its theme (custom themes only, guarded by the file's
 * hash) or into a new theme, then clears the draft. A new theme becomes the
 * active one.
 */
export function useThemeSaving(options: Options): ThemeSavingState {
  const [status, setStatus] = useState<ThemeSaveStatus>({ kind: "idle" });
  const save = async () => {
    const { storedTheme } = options;
    if (options.isBuiltIn || !storedTheme) {
      return;
    }
    const document = createSavedDocumentFromDraft(storedTheme.document, options.draft);
    setStatus({ kind: "saving" });
    try {
      const { hash } = await ThemeApi.save(document, storedTheme.hash);
      options.storeTheme({ document, hash });
      options.discard();
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus(_failure(error));
    }
  };
  const saveAsNew = async (label: string) => {
    const base = options.library.get(options.themeId);
    if (!base) {
      return;
    }
    const id = buildThemeIdFromLabel(label, [...options.library.keys()]);
    const document = createNewThemeDocument({ base, draft: options.draft, id, label });
    setStatus({ kind: "saving" });
    try {
      const { hash } = await ThemeApi.create(document);
      options.storeTheme({ document, hash });
      options.discard();
      options.selectTheme(id);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus(_failure(error));
    }
  };
  return { status, setStatus, save, saveAsNew };
}
```

- [ ] **Step 6: Compose the shared hook**

`src/videoThemeEditor/useVideoThemeDraft/useVideoThemeDraft.ts`:

```ts
import { useMemo } from "react";
import { BUILT_IN_VIDEO_THEME_IDS } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { getBrowserStorage } from "./browserStorage";
import { useActiveThemeId } from "./useActiveThemeId";
import { useStoredDraft, type StoredDraftState } from "./useStoredDraft";
import { useThemeLibrary } from "./useThemeLibrary";
import { useThemeSaving, type ThemeSavingState } from "./useThemeSaving";
import type { ThemeSummary } from "../ThemeApi/ThemeApi";
import type { VideoThemeLibrary } from "../../videoTheme/videoTheme.types";

/** Everything a theme editor host needs: themes, the active theme, its draft, and saving. */
export type VideoThemeDraftState = StoredDraftState &
  ThemeSavingState &
  Readonly<{
    themes: readonly ThemeSummary[];
    themeId: string;
    selectTheme: (themeId: string) => void;
    library: VideoThemeLibrary;
    isBuiltIn: boolean;
  }>;

/**
 * The theme list, the active theme (from `?theme=` or the viewer's last
 * choice), its unsaved draft (surviving reloads), and save actions. Call it
 * once per page and share the result with every modal, for example through
 * the gallery's theme context.
 */
export function useVideoThemeDraft(): VideoThemeDraftState {
  const storage = useMemo(getBrowserStorage, []);
  const { themes, stored, library, storeTheme } = useThemeLibrary();
  const [themeId, selectTheme] = useActiveThemeId({ library, storage });
  const storedTheme = stored.get(themeId);
  const draftState = useStoredDraft({ themeId, baseHash: storedTheme?.hash ?? "", storage });
  const isBuiltIn = (BUILT_IN_VIDEO_THEME_IDS as readonly string[]).includes(themeId);
  const saving = useThemeSaving({
    library,
    themeId,
    isBuiltIn,
    storedTheme,
    draft: draftState.draft,
    storeTheme,
    selectTheme,
    discard: draftState.discard,
  });
  return { themes, themeId, selectTheme, library, isBuiltIn, ...draftState, ...saving };
}
```

- [ ] **Step 7: Typecheck and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.

```bash
git add src/videoThemeEditor/useVideoThemeDraft
git commit -m "feat(video-producer): share one video theme draft across the Atlas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Literal value controls

Before writing UI, re-read `docs/design/video-token-editor.md` and impeccable's `reference/craft-floor.md`.

**Files:**
- Create: `src/videoThemeEditor/TokenEditorContext/TokenEditorContext.ts`
- Create: `src/videoThemeEditor/controls/valueControl.types.ts`
- Create: `src/videoThemeEditor/controls/defaultLiterals.ts`
- Create: `src/videoThemeEditor/controls/controls.module.css`
- Create: `src/videoThemeEditor/controls/NumberControls.tsx`
- Create: `src/videoThemeEditor/controls/ColorControls.tsx`
- Create: `src/videoThemeEditor/controls/MotionControls.tsx`
- Create: `src/videoThemeEditor/controls/EffectControls.tsx`
- Create: `src/videoThemeEditor/controls/ChoiceControls.tsx`
- Create: `src/videoThemeEditor/controls/ValueControl.tsx`

- [ ] **Step 1: Write the editor context**

`src/videoThemeEditor/TokenEditorContext/TokenEditorContext.ts`:

```ts
import { createContext, useContext } from "react";
import type { CustomValueRequest } from "../customTokenValue/customTokenValue";
import type { ThemeEditScope } from "../themeDraft/themeDraft";
import type { TokenRow } from "../tokenRows/tokenRows";
import type { ResolvedVideoTheme, VideoThemeIssue } from "../../videoTheme/videoTheme.types";

/** What every token control reads and the edits it can make. */
export type TokenEditorContextValue = Readonly<{
  scope: ThemeEditScope;
  rows: readonly TokenRow[];
  theme: ResolvedVideoTheme;
  issues: readonly VideoThemeIssue[];
  /** Six-digit theme colours offered by colour pickers. */
  swatches: readonly string[];
  setToken: (tokenPath: string, value: unknown) => void;
  setCustomValue: (request: CustomValueRequest) => void;
  resetToken: (tokenPath: string) => void;
}>;

/** Set by `VideoThemeEditor` for its controls; tightly coupled to `useTokenEditorValue`. */
export const TokenEditorContext = createContext<TokenEditorContextValue | undefined>(undefined);

/** The editor context. Throws outside `VideoThemeEditor`. */
export function useTokenEditor(): TokenEditorContextValue {
  const value = useContext(TokenEditorContext);
  if (!value) {
    throw new Error("Token controls need a VideoThemeEditor above them");
  }
  return value;
}
```

- [ ] **Step 2: Write the shared control types and defaults**

`src/videoThemeEditor/controls/valueControl.types.ts`:

```ts
import type { TokenDefinition } from "../../videoTheme/videoTheme.types";

/** What every literal value control receives. */
export type ValueControlProps = Readonly<{
  /** Accessible name naming the token, already translated. */
  label: string;
  definition: Pick<TokenDefinition, "kind" | "min" | "max" | "step" | "unit" | "options">;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Key for enum option names: the token path or the composite field name. */
  optionKey?: string;
  /** A camera curve: control points stay in 0..1 and the only power curve is the cubic in-out (`isCameraSafeEasing`). */
  isCameraCurve?: boolean;
}>;
```

`src/videoThemeEditor/controls/defaultLiterals.ts`:

```ts
import type { TokenKind } from "../../videoTheme/videoTheme.types";

const DEFAULT_LITERALS: Partial<Record<TokenKind, unknown>> = {
  color: "#ffffff",
  length: 1,
  number: 1,
  opacity: 1,
  duration: 9,
  letterSpacing: 0,
  fontWeight: 400,
  cssLength: "16px",
  cssNumber: "1.3",
  easing: [0.45, 0, 0.55, 1],
  spring: { damping: 14, stiffness: 120, mass: 0.8 },
  shadow: { layers: [{ offsetX: 0, offsetY: 4, blur: 8, spread: 0, alpha: 0.2 }] },
  glow: { spread: 4, blur: 0, opacity: 0.1 },
  textShadow: { offsetX: 0, offsetY: 1, blur: 2, alpha: 0.5 },
  dash: [],
  fontFamily: "arial",
  boolean: false,
};

/** A valid starting value for a new literal of a kind, such as a new scale entry. */
export function getDefaultLiteralFromKind(kind: TokenKind): unknown {
  return DEFAULT_LITERALS[kind];
}
```

- [ ] **Step 3: Write the control styles**

`src/videoThemeEditor/controls/controls.module.css`:

```css
.numberRow {
  min-width: 0;
}

.slider {
  flex: 1 1 auto;
  min-width: 96px;
}

.numberInput {
  flex: 0 0 112px;
}

.readout {
  color: var(--muted);
  font: 11px var(--mono);
  white-space: nowrap;
}

.color {
  flex: 1 1 auto;
}

.palette {
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.fields {
  display: grid;
  gap: 6px 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stack {
  display: grid;
  gap: 8px;
}

.easing {
  display: grid;
  gap: 8px;
}

.easingBody {
  align-items: start;
  display: grid;
  gap: 12px;
  grid-template-columns: 96px minmax(0, 1fr);
  padding-left: 12px;
}

.layers {
  display: grid;
  gap: 8px;
}

.layer {
  border-top: 1px solid var(--line);
  padding-top: 8px;
}

.shadowPreview {
  background: var(--paper);
  border-radius: 6px;
  display: inline-block;
  height: 24px;
  width: 48px;
}

.dashPreview {
  color: var(--ink);
  height: 8px;
  width: 160px;
}

.dashPreview line {
  stroke: currentcolor;
  stroke-width: 2;
}

.reference {
  display: grid;
  gap: 4px;
}

.option {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.optionDescription {
  color: var(--muted);
  flex-basis: 100%;
  font-size: 11px;
  line-height: 1.4;
}

.chip {
  border: 1px solid var(--line);
  border-radius: 3px;
  display: inline-block;
  flex: 0 0 auto;
  height: 12px;
  width: 12px;
}

.custom {
  display: grid;
  gap: 6px;
}

.customToggle {
  justify-self: start;
}

.composite {
  border: 0;
  display: grid;
  gap: 8px;
  margin: 0;
  min-width: 0;
  padding: 0;
}

.compositeField {
  align-items: start;
  display: grid;
  gap: 8px;
  grid-template-columns: 88px minmax(0, 1fr);
}

.fieldName {
  color: var(--muted);
  font-size: 11px;
  padding-top: 6px;
}

.specimenRow {
  align-items: center;
  display: flex;
  gap: 8px;
}

.specimen {
  border-radius: 6px;
  flex: 1 1 auto;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  padding: 10px 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.visuallyHidden {
  clip: rect(0 0 0 0);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
```

- [ ] **Step 4: Write the number controls**

`src/videoThemeEditor/controls/NumberControls.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Group, NumberInput, Slider } from "@mantine/core";
import { parseCssPixels } from "../../videoTheme/normalizeTokenValue/normalizeTokenValue";
import css from "./controls.module.css";
import type { ValueControlProps } from "./valueControl.types";

const SLIDER_STEP_LIMIT = 1000;
const UNIT_SUFFIXES: Readonly<Record<string, string>> = {
  px: " px",
  em: " em",
  "%": "%",
  deg: "°",
  "×": "×",
  cps: " cps",
};

function _output(kind: string, value: number): unknown {
  if (kind === "cssLength") {
    return `${value}px`;
  }
  return kind === "cssNumber" ? String(value) : value;
}

/**
 * A number token: a slider when the range is short, and an exact input with
 * its unit. Opacity reads as a percentage; Mantine strings round-trip.
 */
export function NumberValueControl({ label, definition, value, onChange }: ValueControlProps) {
  const scale = definition.unit === "%" ? 100 : 1;
  const min = (definition.min ?? 0) * scale;
  const max = (definition.max ?? 100) * scale;
  const step = (definition.step ?? 1) * scale;
  const shown = Number(((parseCssPixels(value) ?? min / scale) * scale).toFixed(4));
  const emit = (next: number) => onChange(_output(definition.kind, Number((next / scale).toFixed(6))));
  return (
    <Group className={css.numberRow} gap="xs" wrap="nowrap">
      {(max - min) / step <= SLIDER_STEP_LIMIT ? (
        <Slider className={css.slider} size="sm" min={min} max={max} step={step} value={shown} thumbLabel={label} label={null} onChange={emit} />
      ) : null}
      <NumberInput
        className={css.numberInput}
        size="xs"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        decimalScale={4}
        suffix={definition.unit ? UNIT_SUFFIXES[definition.unit] : undefined}
        value={shown}
        onChange={(next) => typeof next === "number" && emit(next)}
      />
    </Group>
  );
}

/** A duration token in frames, with its length in milliseconds beside it. */
export function DurationValueControl({ label, definition, value, onChange }: ValueControlProps) {
  const { t } = useLingui();
  const frames = typeof value === "number" ? value : 0;
  const milliseconds = Math.round((frames / 30) * 1000);
  return (
    <Group className={css.numberRow} gap="xs" wrap="nowrap">
      <NumberInput
        className={css.numberInput}
        size="xs"
        aria-label={label}
        min={definition.min ?? 0}
        max={definition.max ?? 600}
        step={1}
        allowDecimal={false}
        suffix={t` frames`}
        value={frames}
        onChange={(next) => typeof next === "number" && onChange(next)}
      />
      <span className={css.readout}>{t`${milliseconds} ms`}</span>
    </Group>
  );
}
```

- [ ] **Step 5: Write the colour controls**

`src/videoThemeEditor/controls/ColorControls.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ColorInput, Group, NumberInput } from "@mantine/core";
import css from "./controls.module.css";
import type { ValueControlProps } from "./valueControl.types";
import type { GradientValue } from "../../videoTheme/videoTheme.types";
import type { ReactNode } from "react";

const HEX_COLOR = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
const OPAQUE_HEX_COLOR = /^#[0-9a-f]{6}$/i;
const POPOVER = { withinPortal: false } as const;

/** A colour token: a hex field with a picker and the theme's swatches. */
export function ColorValueControl({
  label,
  value,
  onChange,
  swatches = [],
  badge,
}: ValueControlProps & Readonly<{ swatches?: readonly string[]; badge?: ReactNode }>) {
  const color = typeof value === "string" ? value : "#000000";
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <ColorInput
        className={css.color}
        size="xs"
        aria-label={label}
        value={color}
        format={color.length === 9 ? "hexa" : "hex"}
        swatches={[...swatches]}
        swatchesPerRow={8}
        withEyeDropper={false}
        popoverProps={POPOVER}
        onChange={(next) => {
          if (HEX_COLOR.test(next)) {
            onChange(next.toLowerCase());
          }
        }}
      />
      {badge}
    </Group>
  );
}

/** A ten-shade palette, one colour field per shade. */
export function PaletteValueControl({ label, value, onChange }: ValueControlProps) {
  const { t } = useLingui();
  const shades = Array.isArray(value) ? (value as readonly string[]) : [];
  return (
    <div className={css.palette} role="group" aria-label={label}>
      {shades.map((shade, index) => (
        <ColorInput
          key={`shade-${String(index)}`}
          size="xs"
          aria-label={t`${label}, shade ${index}`}
          value={shade}
          format="hex"
          withEyeDropper={false}
          popoverProps={POPOVER}
          onChange={(next) => {
            if (OPAQUE_HEX_COLOR.test(next)) {
              onChange(shades.map((current, position) => (position === index ? next.toLowerCase() : current)));
            }
          }}
        />
      ))}
    </div>
  );
}

/** The primary shade: one index for dark grounds and one for light grounds. */
export function ShadeValueControl({ label, value, onChange }: ValueControlProps) {
  const { t } = useLingui();
  const shade =
    typeof value === "number" ? { light: value, dark: value } : (value as Readonly<{ light: number; dark: number }>);
  const field = (side: "dark" | "light", name: string) => (
    <NumberInput
      size="xs"
      label={name}
      min={0}
      max={9}
      step={1}
      allowDecimal={false}
      value={shade[side]}
      onChange={(next) => typeof next === "number" && onChange({ ...shade, [side]: next })}
    />
  );
  return (
    <Group gap="xs" role="group" aria-label={label}>
      {field("dark", t`On dark grounds`)}
      {field("light", t`On light grounds`)}
    </Group>
  );
}

/** A gradient token: two colours and an angle. */
export function GradientValueControl({ label, value, onChange }: ValueControlProps) {
  const { t } = useLingui();
  const gradient = value as GradientValue;
  const colorField = (side: "from" | "to", name: string) => (
    <ColorInput
      size="xs"
      label={name}
      value={gradient[side]}
      format="hex"
      withEyeDropper={false}
      popoverProps={POPOVER}
      onChange={(next) => {
        if (HEX_COLOR.test(next)) {
          onChange({ ...gradient, [side]: next.toLowerCase() });
        }
      }}
    />
  );
  return (
    <Group gap="xs" role="group" aria-label={label} wrap="nowrap">
      {colorField("from", t`From`)}
      {colorField("to", t`To`)}
      <NumberInput size="xs" label={t`Angle`} suffix="°" min={0} max={360} value={gradient.deg} onChange={(deg) => typeof deg === "number" && onChange({ ...gradient, deg })} />
    </Group>
  );
}
```

- [ ] **Step 6: Write the motion controls**

`src/videoThemeEditor/controls/MotionControls.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { NumberInput, SegmentedControl, Text } from "@mantine/core";
import { CurvePlot } from "../../gallery/HelperGallery/demos/parts/CurvePlot";
import { createEasingFromToken } from "../../videoTheme/createEasingFromToken/createEasingFromToken";
import css from "./controls.module.css";
import type { ValueControlProps } from "./valueControl.types";
import type { EasingValue, SpringValue } from "../../videoTheme/videoTheme.types";

type Bezier = readonly [number, number, number, number];

const DEFAULT_BEZIER: Bezier = [0.45, 0, 0.55, 1];

function _withPoint(points: Bezier, index: number, value: number): Bezier {
  const [x1, y1, x2, y2] = points;
  return [index === 0 ? value : x1, index === 1 ? value : y1, index === 2 ? value : x2, index === 3 ? value : y2];
}

function BezierFields({
  points,
  isCameraCurve,
  onChange,
}: Readonly<{ points: Bezier; isCameraCurve: boolean; onChange: (points: Bezier) => void }>) {
  const { t } = useLingui();
  const names = [t`Start x`, t`Start y`, t`End x`, t`End y`];
  return (
    <div className={css.fields}>
      {points.map((point, index) => (
        <NumberInput
          key={names[index]}
          size="xs"
          label={names[index]}
          min={isCameraCurve || index % 2 === 0 ? 0 : -1}
          max={isCameraCurve || index % 2 === 0 ? 1 : 2}
          step={0.01}
          decimalScale={3}
          value={point}
          onChange={(next) => typeof next === "number" && onChange(_withPoint(points, index, next))}
        />
      ))}
    </div>
  );
}

/**
 * An easing token: a Bezier with four control values or a symmetric power
 * curve, drawn as a curve. A camera curve keeps its control points in 0..1
 * and offers only the cubic in-out power curve, the curves a camera supports.
 */
export function EasingValueControl({ label, value, onChange, isCameraCurve = false }: ValueControlProps) {
  const { t } = useLingui();
  const easing = value as EasingValue;
  const power = "powerInOut" in easing ? easing.powerInOut : undefined;
  const points: Bezier | undefined = "powerInOut" in easing ? undefined : easing;
  const powerControl = isCameraCurve ? (
    <Text size="xs" c="dimmed">
      {t`Cubic in-out. Cameras support no other power curve.`}
    </Text>
  ) : (
    <NumberInput size="xs" label={t`Exponent`} min={1} max={8} step={0.5} decimalScale={2} value={power} onChange={(next) => typeof next === "number" && onChange({ powerInOut: next })} />
  );
  return (
    <div className={css.easing} role="group" aria-label={label}>
      <SegmentedControl
        size="xs"
        aria-label={t`Curve type`}
        value={points ? "bezier" : "power"}
        data={[
          { value: "bezier", label: t`Bezier` },
          { value: "power", label: t`Power` },
        ]}
        onChange={(kind) => onChange(kind === "power" ? { powerInOut: 3 } : DEFAULT_BEZIER)}
      />
      <div className={css.easingBody}>
        <CurvePlot easing={createEasingFromToken(easing)} t={1} size={96} handles={points} />
        {points ? <BezierFields points={points} isCameraCurve={isCameraCurve} onChange={onChange} /> : powerControl}
      </div>
    </div>
  );
}

/** A spring token: damping, stiffness, and mass. */
export function SpringValueControl({ label, value, onChange }: ValueControlProps) {
  const { t } = useLingui();
  const spring = value as SpringValue;
  const fields = [
    { key: "damping", name: t`Damping`, min: 1, max: 100, step: 1 },
    { key: "stiffness", name: t`Stiffness`, min: 1, max: 1000, step: 1 },
    { key: "mass", name: t`Mass`, min: 0.1, max: 10, step: 0.1 },
  ] as const;
  return (
    <div className={css.fields} role="group" aria-label={label}>
      {fields.map((field) => (
        <NumberInput
          key={field.key}
          size="xs"
          label={field.name}
          min={field.min}
          max={field.max}
          step={field.step}
          decimalScale={2}
          value={spring[field.key]}
          onChange={(next) => typeof next === "number" && onChange({ ...spring, [field.key]: next })}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Write the effect controls**

`src/videoThemeEditor/controls/EffectControls.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Fieldset, Group, NumberInput, SegmentedControl, TextInput } from "@mantine/core";
import { useState, type ReactNode } from "react";
import { elevationToBoxShadow } from "../../videoTheme/cssValues/cssValues";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import css from "./controls.module.css";
import type { ValueControlProps } from "./valueControl.types";
import type { ShadowLayer, ShadowValue } from "../../videoTheme/videoTheme.types";

type NumberField = Readonly<{ key: string; name: string; min: number; max: number; step: number }>;
type NumberValues = Readonly<Record<string, number>>;

const DASH_PRESETS: Readonly<Record<string, readonly number[]>> = {
  solid: [],
  dotted: [1, 4],
  dashed: [6, 6],
};

function useEffectFields(): Readonly<Record<"shadow" | "glow" | "textShadow", readonly NumberField[]>> {
  const { t } = useLingui();
  const offsetX = { key: "offsetX", name: t`Offset x`, min: -200, max: 200, step: 1 };
  const offsetY = { key: "offsetY", name: t`Offset y`, min: -200, max: 200, step: 1 };
  const blur = { key: "blur", name: t`Blur`, min: 0, max: 200, step: 1 };
  const alpha = { key: "alpha", name: t`Opacity`, min: 0, max: 1, step: 0.01 };
  return {
    shadow: [offsetX, offsetY, blur, { key: "spread", name: t`Spread`, min: -100, max: 100, step: 1 }, alpha],
    glow: [
      { key: "spread", name: t`Spread`, min: -200, max: 200, step: 1 },
      { ...blur, max: 100 },
      { key: "opacity", name: t`Opacity`, min: 0, max: 1, step: 0.01 },
    ],
    textShadow: [{ ...offsetX, min: -50, max: 50 }, { ...offsetY, min: -50, max: 50 }, { ...blur, max: 50 }, alpha],
  };
}

function NumberFields({
  legend,
  fields,
  values,
  onChange,
  action,
}: Readonly<{ legend: string; fields: readonly NumberField[]; values: NumberValues; onChange: (values: NumberValues) => void; action?: ReactNode }>) {
  return (
    <Fieldset className={css.layer} legend={legend} variant="unstyled">
      <div className={css.fields}>
        {fields.map((field) => (
          <NumberInput
            key={field.key}
            size="xs"
            label={field.name}
            min={field.min}
            max={field.max}
            step={field.step}
            decimalScale={2}
            value={values[field.key]}
            onChange={(next) => typeof next === "number" && onChange({ ...values, [field.key]: next })}
          />
        ))}
      </div>
      {action}
    </Fieldset>
  );
}

/** A shadow token: up to four layers, previewed in the theme's shadow colour. */
export function ShadowValueControl({ label, value, onChange }: ValueControlProps) {
  const { t } = useLingui();
  const { theme } = useTokenEditor();
  const fields = useEffectFields().shadow;
  const shadow = value as ShadowValue;
  const setLayers = (layers: readonly ShadowLayer[]) => onChange({ layers });
  return (
    <div className={css.layers} role="group" aria-label={label}>
      {shadow.layers.map((layer, index) => {
        const layerNumber = index + 1;
        return (
          <NumberFields
            key={`layer-${String(layerNumber)}`}
            legend={t`Layer ${layerNumber}`}
            fields={fields}
            values={layer}
            onChange={(next) => setLayers(shadow.layers.map((current, position) => (position === index ? (next as ShadowLayer) : current)))}
            action={
              <Button size="compact-xs" variant="subtle" onClick={() => setLayers(shadow.layers.filter((_, position) => position !== index))}>
                {t`Remove layer ${layerNumber}`}
              </Button>
            }
          />
        );
      })}
      <Group gap="xs">
        <Button size="compact-xs" variant="default" disabled={shadow.layers.length >= 4} onClick={() => setLayers([...shadow.layers, { offsetX: 0, offsetY: 4, blur: 8, spread: 0, alpha: 0.2 }])}>
          {t`Add layer`}
        </Button>
        <span className={css.shadowPreview} style={{ boxShadow: elevationToBoxShadow({ layers: shadow.layers, color: theme.semantic.color.shadowColor }) }} aria-hidden="true" />
      </Group>
    </div>
  );
}

/** A glow token: spread, blur, and opacity. */
export function GlowValueControl({ label, value, onChange }: ValueControlProps) {
  const fields = useEffectFields().glow;
  return <NumberFields legend={label} fields={fields} values={value as NumberValues} onChange={onChange} />;
}

/** A text shadow token: offsets, blur, and opacity. Its colour comes from the type style. */
export function TextShadowValueControl({ label, value, onChange }: ValueControlProps) {
  const fields = useEffectFields().textShadow;
  return <NumberFields legend={label} fields={fields} values={value as NumberValues} onChange={onChange} />;
}

function _parseDash(text: string): readonly number[] | undefined {
  const parts = text.trim() ? text.trim().split(/[\s,]+/).map(Number) : [];
  return parts.length <= 8 && parts.every((part) => Number.isFinite(part) && part >= 0) ? parts : undefined;
}

/** A dash pattern: presets plus exact dash and gap lengths, previewed as a line. */
export function DashValueControl({ label, value, onChange }: ValueControlProps) {
  const { t } = useLingui();
  const pattern = Array.isArray(value) ? (value as readonly number[]) : [];
  const [text, setText] = useState(pattern.join(" "));
  const preset = Object.entries(DASH_PRESETS).find(([, dashes]) => dashes.join(" ") === pattern.join(" "))?.[0] ?? "";
  const apply = (dashes: readonly number[]) => {
    setText(dashes.join(" "));
    onChange(dashes);
  };
  return (
    <div className={css.stack} role="group" aria-label={label}>
      <SegmentedControl
        size="xs"
        aria-label={t`Dash preset`}
        value={preset}
        data={[
          { value: "solid", label: t`Solid` },
          { value: "dotted", label: t`Dotted` },
          { value: "dashed", label: t`Dashed` },
        ]}
        onChange={(next) => apply(DASH_PRESETS[next] ?? [])}
      />
      <TextInput
        size="xs"
        label={t`Dash and gap lengths`}
        value={text}
        error={_parseDash(text) ? undefined : t`Use up to eight numbers separated by spaces.`}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setText(next);
          const dashes = _parseDash(next);
          if (dashes) {
            onChange(dashes);
          }
        }}
      />
      <svg className={css.dashPreview} viewBox="0 0 160 8" aria-hidden="true">
        <line x1={0} y1={4} x2={160} y2={4} strokeDasharray={pattern.join(" ")} />
      </svg>
    </div>
  );
}
```

- [ ] **Step 8: Write the choice controls**

`src/videoThemeEditor/controls/ChoiceControls.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { SegmentedControl, Switch } from "@mantine/core";
import { AtlasSelect } from "../../gallery/AtlasSelect/AtlasSelect";
import { VIDEO_FONT_IDS, VIDEO_FONT_REGISTRY } from "../../videoTheme/videoFontRegistry/videoFontRegistry";
import { useOptionCopy } from "../tokenCopy/useEditorCopy";
import css from "./controls.module.css";
import type { ValueControlProps } from "./valueControl.types";

/** A font token: one of the registered families, marked when its glyph widths are measured. */
export function FontValueControl({ label, definition, value, onChange }: ValueControlProps) {
  const { t } = useLingui();
  const data = VIDEO_FONT_IDS.map((id) => {
    const font = VIDEO_FONT_REGISTRY[id];
    const name = font.label;
    return { value: definition.kind === "fontStack" ? font.stack : id, label: font.measured ? t`${name}, measured widths` : name };
  });
  return <AtlasSelect aria-label={label} data={data} value={String(value)} onChange={(next) => next && onChange(next)} />;
}

/** An enum token: segments for up to three options, otherwise a menu with explanations. */
export function EnumValueControl({ label, definition, value, onChange, optionKey = "" }: ValueControlProps) {
  const copy = useOptionCopy();
  const options = (definition.options ?? []).map((option) => ({ option, ...copy(optionKey, option) }));
  const data = options.map((entry) => ({ value: entry.option, label: entry.label }));
  if (options.length <= 3) {
    return <SegmentedControl size="xs" fullWidth aria-label={label} value={String(value)} data={data} onChange={onChange} />;
  }
  return (
    <AtlasSelect
      aria-label={label}
      value={String(value)}
      data={data}
      onChange={(next) => next && onChange(next)}
      renderOption={({ option }) => {
        const description = options.find((entry) => entry.option === option.value)?.description;
        return (
          <span className={css.option}>
            <span>{option.label}</span>
            {description ? <span className={css.optionDescription}>{description}</span> : null}
          </span>
        );
      }}
    />
  );
}

/** A switch token. */
export function BooleanValueControl({ label, value, onChange }: ValueControlProps) {
  return <Switch size="xs" aria-label={label} checked={value === true} onChange={(event) => onChange(event.currentTarget.checked)} />;
}
```

- [ ] **Step 9: Write the literal dispatcher**

`src/videoThemeEditor/controls/ValueControl.tsx`:

```tsx
import { TOKEN_CONTROLS } from "../../videoTheme/tokenCatalog/defineTokens";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import { BooleanValueControl, EnumValueControl, FontValueControl } from "./ChoiceControls";
import { ColorValueControl, GradientValueControl, PaletteValueControl, ShadeValueControl } from "./ColorControls";
import { DashValueControl, GlowValueControl, ShadowValueControl, TextShadowValueControl } from "./EffectControls";
import { EasingValueControl, SpringValueControl } from "./MotionControls";
import { DurationValueControl, NumberValueControl } from "./NumberControls";
import type { ValueControlProps } from "./valueControl.types";

const LAYER_CONTROLS = {
  shadow: ShadowValueControl,
  glow: GlowValueControl,
  textShadow: TextShadowValueControl,
} as const;

/**
 * The control for a literal value of any token kind, such as an atomic
 * value, a Mantine key, or a custom component value.
 */
export function ValueControl(props: ValueControlProps) {
  const { swatches } = useTokenEditor();
  switch (TOKEN_CONTROLS[props.definition.kind]) {
    case "color":
      return <ColorValueControl {...props} swatches={swatches} />;
    case "fill":
      return typeof props.value === "string" ? <ColorValueControl {...props} swatches={swatches} /> : <GradientValueControl {...props} />;
    case "palette":
      return <PaletteValueControl {...props} />;
    case "shade":
      return <ShadeValueControl {...props} />;
    case "gradient":
      return <GradientValueControl {...props} />;
    case "slider":
      return <NumberValueControl {...props} />;
    case "duration":
      return <DurationValueControl {...props} />;
    case "easing":
      return <EasingValueControl {...props} />;
    case "spring":
      return <SpringValueControl {...props} />;
    case "dash":
      return <DashValueControl {...props} />;
    case "font":
      return <FontValueControl {...props} />;
    case "segmented":
      return <EnumValueControl {...props} />;
    case "switch":
      return <BooleanValueControl {...props} />;
    case "layers": {
      const LayerControl = LAYER_CONTROLS[props.definition.kind as keyof typeof LAYER_CONTROLS];
      return <LayerControl {...props} />;
    }
    default:
      return null;
  }
}
```

- [ ] **Step 10: Typecheck, lint, and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.
From `<repo>`: `pnpm exec eslint apps/ava-video-producer/src/videoThemeEditor/controls apps/ava-video-producer/src/videoThemeEditor/TokenEditorContext` and `pnpm exec stylelint "apps/ava-video-producer/src/videoThemeEditor/**/*.css"`. Expected: no errors.

```bash
git add src/videoThemeEditor/TokenEditorContext src/videoThemeEditor/controls
git commit -m "feat(video-producer): add literal controls for every token kind" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Reference, colour role, and composite controls

**Files:**
- Create: `src/videoThemeEditor/controls/ContrastBadge.tsx`
- Create: `src/videoThemeEditor/controls/TypeSpecimen.tsx`
- Create: `src/videoThemeEditor/controls/SketchPreview.tsx`
- Create: `src/videoThemeEditor/controls/ReferenceControl.tsx`
- Create: `src/videoThemeEditor/controls/ColorRoleControl.tsx`
- Create: `src/videoThemeEditor/controls/CompositeControl.tsx`
- Create: `src/videoThemeEditor/TokenControl/TokenControl.tsx`

- [ ] **Step 1: Write the contrast badge and specimen**

`src/videoThemeEditor/controls/ContrastBadge.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import {
  getContrastRatioFromColors,
  getWcagLevelFromContrast,
  isLargeTypeStyle,
} from "../../videoTheme/textContrast/textContrast";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import type { ResolvedTypeStyle } from "../../videoTheme/videoTheme.types";

/** The WCAG contrast of a text colour against the theme's ground, as a badge. */
export function ContrastBadge({
  color,
  style,
}: Readonly<{ color: string; style?: Pick<ResolvedTypeStyle, "fontSize" | "fontWeight"> }>) {
  const { t } = useLingui();
  const { theme } = useTokenEditor();
  const ratio = getContrastRatioFromColors(color, theme.semantic.color.ground);
  const level = getWcagLevelFromContrast(ratio, style ? isLargeTypeStyle(style) : false);
  const formatted = ratio.toFixed(1);
  return (
    <Badge size="xs" variant="light" color={level === "fail" ? "red" : "green"}>
      {level === "fail" ? t`Low contrast ${formatted}:1` : t`${level} ${formatted}:1`}
    </Badge>
  );
}
```

`src/videoThemeEditor/controls/TypeSpecimen.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { buildColorWithAlpha, fillToCss, textShadowToCss } from "../../videoTheme/cssValues/cssValues";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import { ContrastBadge } from "./ContrastBadge";
import css from "./controls.module.css";
import type { ResolvedTypeStyle } from "../../videoTheme/videoTheme.types";

const SPECIMEN_MAX_SIZE = 40;

/** A sample line set in a resolved type style on the theme's ground, with its contrast. */
export function TypeSpecimen({ style }: Readonly<{ style: ResolvedTypeStyle | undefined }>) {
  const { t } = useLingui();
  const { theme } = useTokenEditor();
  if (!style) {
    return null;
  }
  return (
    <div className={css.specimenRow}>
      <p
        className={css.specimen}
        style={{
          background: fillToCss(theme.semantic.color.groundFill),
          color: buildColorWithAlpha(style.color, style.alpha),
          fontFamily: style.fontFamily,
          fontSize: Math.min(style.fontSize, SPECIMEN_MAX_SIZE),
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing === undefined ? undefined : `${style.letterSpacing}em`,
          lineHeight: style.lineHeight,
          textTransform: style.textTransform,
          fontVariantNumeric: style.fontVariantNumeric,
          textShadow: style.textShadow ? textShadowToCss(style.textShadow) : undefined,
        }}
      >
        {t`Data moves through the pipeline`}
      </p>
      <ContrastBadge color={style.color} style={style} />
    </div>
  );
}
```

`src/videoThemeEditor/controls/SketchPreview.tsx`:

```tsx
import { useMemo } from "react";
import rough from "roughjs";
import css from "./controls.module.css";
import type { ResolvedSketchProfile } from "../../videoTheme/videoTheme.types";

/** A small box drawn with a sketch profile, so roughness, bowing, and seed can be judged by eye. */
export function SketchPreview({ profile }: Readonly<{ profile: ResolvedSketchProfile | undefined }>) {
  const paths = useMemo(() => {
    if (!profile) {
      return [];
    }
    const generator = rough.generator();
    return generator.toPaths(
      generator.rectangle(4, 4, 88, 36, {
        roughness: profile.roughness,
        bowing: profile.bowing,
        seed: profile.seed,
        maxRandomnessOffset: profile.randomness,
        stroke: "currentColor",
        strokeWidth: 1.5,
      }),
    );
  }, [profile]);
  return (
    <svg className={css.sketchPreview} viewBox="0 0 96 44" aria-hidden="true">
      {paths.map((path) => (
        <path key={path.d} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} fill={path.fill ?? "none"} />
      ))}
    </svg>
  );
}
```

Add to `src/videoThemeEditor/controls/controls.module.css`:

```css
.sketchPreview {
  color: var(--ink);
  height: 44px;
  width: 96px;
}
```

- [ ] **Step 2: Write the reference control**

`src/videoThemeEditor/controls/ReferenceControl.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import { AtlasSelect } from "../../gallery/AtlasSelect/AtlasSelect";
import { isTokenReference } from "../../videoTheme/themeReferences/themeReferences";
import { getTokenDefinitionFromPath } from "../../videoTheme/tokenCatalog/tokenCatalog";
import { getCustomScaleFromReference } from "../customTokenValue/customTokenValue";
import { formatTokenValue } from "../formatTokenValue/formatTokenValue";
import {
  isCameraCurveToken,
  listReferenceOptions,
  orderReferenceOptions,
  type ReferenceOption,
} from "../referenceOptions/referenceOptions";
import { useTokenCopy } from "../tokenCopy/useTokenCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import css from "./controls.module.css";
import { getDefaultLiteralFromKind } from "./defaultLiterals";
import { ValueControl } from "./ValueControl";
import type { ValueControlProps } from "./valueControl.types";
import type { TokenDefinition, TokenKind } from "../../videoTheme/videoTheme.types";

/** Where a reference control writes and what it may offer. */
export type ReferenceControlProps = Readonly<{
  label: string;
  tokenPath: string;
  /** Empty for the token itself, or the composite field, such as `["size"]`. */
  fieldPath: readonly string[];
  kind: TokenKind;
  /** The field's authored value: a reference, a literal, or undefined when unset. */
  value: unknown;
  /** The token's whole authored value, for writing one field of a composite. */
  tokenValue: unknown;
  /** Component tokens may hold a literal one-off. */
  allowLiteral: boolean;
  /** Bounds for a literal when the field is the token itself. */
  definition?: TokenDefinition;
  onChange: (value: unknown) => void;
}>;

function useOptionLabel(): (option: ReferenceOption) => string {
  const { t } = useLingui();
  const copy = useTokenCopy();
  return useCallback(
    (option: ReferenceOption) => {
      const value = formatTokenValue(option.kind, option.value);
      if (option.path === "primary") {
        return t`Primary color, ${value}`;
      }
      const name = option.definition ? copy(option.definition.label) : option.path;
      return option.key === undefined ? `${name} · ${value}` : `${name} ${option.key} · ${value}`;
    },
    [t, copy],
  );
}

function CustomValue(props: ReferenceControlProps & Readonly<{ options: readonly ReferenceOption[] }>) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  const isReference = isTokenReference(props.value);
  const scale = props.allowLiteral ? undefined : getCustomScaleFromReference(props.value, props.kind);
  const [isOpen, setOpen] = useState(props.allowLiteral && props.value !== undefined && !isReference);
  if (!props.allowLiteral && !scale) {
    return null;
  }
  const definition: ValueControlProps["definition"] = props.allowLiteral
    ? (props.definition ?? { kind: props.kind })
    : (getTokenDefinitionFromPath(`${scale}.custom`) ?? { kind: props.kind });
  const current = isReference ? props.options.find((option) => option.reference === props.value)?.value : props.value;
  const name = props.label;
  return (
    <div className={css.custom}>
      <Button className={css.customToggle} size="compact-xs" variant="subtle" aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>
        {t`Custom value`}
      </Button>
      {isOpen ? (
        <ValueControl
          label={t`Custom ${name}`}
          definition={definition}
          value={current ?? getDefaultLiteralFromKind(definition.kind)}
          optionKey={props.fieldPath.at(-1) ?? props.tokenPath}
          isCameraCurve={isCameraCurveToken(props.tokenPath, props.fieldPath)}
          onChange={(literal) =>
            props.allowLiteral
              ? props.onChange(literal)
              : editor.setCustomValue({
                  tokenPath: props.tokenPath,
                  fieldPath: props.fieldPath,
                  currentValue: props.tokenValue,
                  currentReference: props.value,
                  kind: props.kind,
                  literal,
                })
          }
        />
      ) : null}
    </div>
  );
}

/**
 * Points a semantic or component token, or one field of it, at another
 * token, with each option's current value as text and a chip for colours.
 * Component tokens, and semantic tokens whose kind has a scale, can also take
 * a custom value; on a semantic token it becomes a named scale entry. A
 * camera curve offers only camera-safe curves, as options and as a custom
 * value.
 */
export function ReferenceControl(props: ReferenceControlProps) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  const toLabel = useOptionLabel();
  const isCameraCurve = isCameraCurveToken(props.tokenPath, props.fieldPath);
  const options = useMemo(
    () =>
      orderReferenceOptions(
        listReferenceOptions({ kind: props.kind, excludePath: props.tokenPath, rows: editor.rows, theme: editor.theme, isCameraCurve }),
        props.value,
      ),
    [props.kind, props.tokenPath, props.value, editor.rows, editor.theme, isCameraCurve],
  );
  const chips = useMemo(
    () => new Map<string, string | undefined>(options.map((option) => [option.reference, option.kind === "color" && typeof option.value === "string" ? option.value : undefined])),
    [options],
  );
  return (
    <div className={css.reference}>
      <AtlasSelect
        aria-label={props.label}
        searchable
        data={options.map((option) => ({ value: option.reference, label: toLabel(option) }))}
        value={isTokenReference(props.value) ? props.value : null}
        placeholder={props.value === undefined ? t`Not set` : t`Custom value`}
        nothingFoundMessage={t`No matching tokens`}
        onChange={(next) => next && props.onChange(next)}
        renderOption={({ option }) => {
          const chip = chips.get(option.value);
          return (
            <span className={css.option}>
              {chip ? <span className={css.chip} style={{ background: chip }} aria-hidden="true" /> : null}
              <span>{option.label}</span>
            </span>
          );
        }}
      />
      <CustomValue {...props} options={options} />
    </div>
  );
}
```

- [ ] **Step 3: Write the colour role control**

`src/videoThemeEditor/controls/ColorRoleControl.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Switch } from "@mantine/core";
import { useFieldCopy } from "../tokenCopy/useEditorCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import { ContrastBadge } from "./ContrastBadge";
import css from "./controls.module.css";
import { ReferenceControl } from "./ReferenceControl";
import type { TokenRow } from "../tokenRows/tokenRows";

const TEXT_COLOR_PATHS = new Set(["color.text", "color.textMuted"]);

type ColorPair = Readonly<{ onDark: unknown; onLight: unknown }>;

function _isPair(value: unknown): value is ColorPair {
  return typeof value === "object" && value !== null && "onDark" in value && "onLight" in value;
}

/**
 * A colour role: one reference, or one for dark grounds and one for light
 * grounds. Text colours show their contrast against the ground.
 */
export function ColorRoleControl({ row, label }: Readonly<{ row: TokenRow; label: string }>) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  const fieldCopy = useFieldCopy();
  const pair = _isPair(row.value) ? row.value : undefined;
  const allowLiteral = row.tier === "component";
  return (
    <div className={css.stack}>
      <Switch
        size="xs"
        label={t`Different on light grounds`}
        checked={pair !== undefined}
        onChange={(event) => editor.setToken(row.path, event.currentTarget.checked ? { onDark: row.value, onLight: row.value } : pair?.onDark)}
      />
      {pair ? (
        (["onDark", "onLight"] as const).map((side) => {
          const sideName = fieldCopy(side);
          return (
            <ReferenceControl
              key={side}
              label={t`${label}, ${sideName}`}
              tokenPath={row.path}
              fieldPath={[side]}
              kind="color"
              value={pair[side]}
              tokenValue={row.value}
              allowLiteral={allowLiteral}
              onChange={(next) => editor.setToken(row.path, { ...pair, [side]: next })}
            />
          );
        })
      ) : (
        <ReferenceControl label={label} tokenPath={row.path} fieldPath={[]} kind="color" value={row.value} tokenValue={row.value} allowLiteral={allowLiteral} definition={row.definition} onChange={(next) => editor.setToken(row.path, next)} />
      )}
      {TEXT_COLOR_PATHS.has(row.path) && typeof row.resolved === "string" ? <ContrastBadge color={row.resolved} /> : null}
    </div>
  );
}
```

- [ ] **Step 4: Write the composite control**

`src/videoThemeEditor/controls/CompositeControl.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { isTokenReference } from "../../videoTheme/themeReferences/themeReferences";
import {
  COMPOSITE_TOKEN_FIELDS,
  type CompositeTokenKind,
  type FieldSpec,
} from "../../videoTheme/tokenCatalog/defineTokens";
import { useFieldCopy } from "../tokenCopy/useEditorCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import { EnumValueControl } from "./ChoiceControls";
import css from "./controls.module.css";
import { ReferenceControl } from "./ReferenceControl";
import { SketchPreview } from "./SketchPreview";
import { TypeSpecimen } from "./TypeSpecimen";
import type { TokenRow } from "../tokenRows/tokenRows";
import type { ResolvedSketchProfile, ResolvedTypeStyle } from "../../videoTheme/videoTheme.types";

type FieldProps = Readonly<{
  row: TokenRow;
  label: string;
  name: string;
  field: FieldSpec;
  value: Readonly<Record<string, unknown>>;
}>;

function CompositeField({ row, label, name, field, value }: FieldProps) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  const fieldName = useFieldCopy()(name);
  const fieldLabel = t`${label}, ${fieldName}`;
  const write = (next: unknown) => editor.setToken(row.path, { ...value, [name]: next });
  return (
    <div className={css.compositeField}>
      <span className={css.fieldName}>{fieldName}</span>
      {field.kind === "enum" ? (
        <EnumValueControl label={fieldLabel} definition={field} value={value[name] ?? field.options?.[0]} optionKey={name} onChange={write} />
      ) : (
        <ReferenceControl label={fieldLabel} tokenPath={row.path} fieldPath={[name]} kind={field.kind} value={value[name]} tokenValue={row.value} allowLiteral={row.tier === "component"} onChange={write} />
      )}
    </div>
  );
}

/**
 * A composite token edited field by field (type style, paint, elevation,
 * sketch, box, motion step, camera preset, range). A composite that points
 * at another composite, such as a sketch role, is one reference picker.
 */
export function CompositeControl({ row, label }: Readonly<{ row: TokenRow; label: string }>) {
  const editor = useTokenEditor();
  const sketch = row.definition.kind === "sketchProfile" ? <SketchPreview profile={row.resolved as ResolvedSketchProfile | undefined} /> : null;
  if (isTokenReference(row.value)) {
    return (
      <div className={css.stack}>
        <ReferenceControl label={label} tokenPath={row.path} fieldPath={[]} kind={row.definition.kind} value={row.value} tokenValue={row.value} allowLiteral={false} onChange={(next) => editor.setToken(row.path, next)} />
        {sketch}
      </div>
    );
  }
  const fields: Readonly<Record<string, FieldSpec>> = COMPOSITE_TOKEN_FIELDS[row.definition.kind as CompositeTokenKind].fields;
  const value = typeof row.value === "object" && row.value !== null ? (row.value as Readonly<Record<string, unknown>>) : {};
  return (
    <fieldset className={css.composite}>
      <legend className={css.visuallyHidden}>{label}</legend>
      {row.definition.kind === "typeStyle" ? <TypeSpecimen style={row.resolved as ResolvedTypeStyle | undefined} /> : null}
      {sketch}
      {Object.entries(fields).map(([name, field]) => (
        <CompositeField key={name} row={row} label={label} name={name} field={field} value={value} />
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 5: Write the row control dispatcher**

`src/videoThemeEditor/TokenControl/TokenControl.tsx`:

```tsx
import { isCompositeTokenKind } from "../../videoTheme/tokenCatalog/defineTokens";
import { ColorRoleControl } from "../controls/ColorRoleControl";
import { CompositeControl } from "../controls/CompositeControl";
import { ReferenceControl } from "../controls/ReferenceControl";
import { ValueControl } from "../controls/ValueControl";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import type { TokenRow } from "../tokenRows/tokenRows";

/**
 * The control for a token row: literal values in the atomic and Mantine
 * tiers (and for enums and switches anywhere), references above them.
 */
export function TokenControl({ row, label }: Readonly<{ row: TokenRow; label: string }>) {
  const editor = useTokenEditor();
  const kind = row.definition.kind;
  const write = (next: unknown) => editor.setToken(row.path, next);
  if (row.tier === "atomic" || row.tier === "mantine" || kind === "enum" || kind === "boolean") {
    return <ValueControl label={label} definition={row.definition} value={row.value} optionKey={row.path} onChange={write} />;
  }
  if (kind === "color") {
    return <ColorRoleControl row={row} label={label} />;
  }
  if (isCompositeTokenKind(kind)) {
    return <CompositeControl row={row} label={label} />;
  }
  return <ReferenceControl label={label} tokenPath={row.path} fieldPath={[]} kind={kind} value={row.value} tokenValue={row.value} allowLiteral={row.tier === "component"} definition={row.definition} onChange={write} />;
}
```

- [ ] **Step 6: Typecheck, lint, and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.
From `<repo>`: `pnpm exec eslint apps/ava-video-producer/src/videoThemeEditor`. Expected: no errors.

```bash
git add src/videoThemeEditor/controls src/videoThemeEditor/TokenControl
git commit -m "feat(video-producer): edit token references, colour roles, and composites" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Token rows and the editor

**Files:**
- Create: `src/videoThemeEditor/TokenRow/TokenRow.tsx`
- Create: `src/videoThemeEditor/TokenRow/TokenRow.module.css`
- Create: `src/videoThemeEditor/VideoThemeEditor/useTokenEditorValue.ts`
- Create: `src/videoThemeEditor/VideoThemeEditor/EditorToolbar.tsx`
- Create: `src/videoThemeEditor/VideoThemeEditor/EssentialsGroup.tsx`
- Create: `src/videoThemeEditor/VideoThemeEditor/TokenSections.tsx`
- Create: `src/videoThemeEditor/VideoThemeEditor/VideoThemeEditor.tsx`
- Create: `src/videoThemeEditor/VideoThemeEditor/VideoThemeEditor.module.css`

- [ ] **Step 1: Write the row**

`src/videoThemeEditor/TokenRow/TokenRow.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconArrowBackUp } from "@tabler/icons-react";
import clsx from "clsx";
import { useCallback } from "react";
import { formatTokenValue } from "../formatTokenValue/formatTokenValue";
import { TokenControl } from "../TokenControl/TokenControl";
import { useTokenCopy } from "../tokenCopy/useTokenCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import css from "./TokenRow.module.css";
import type { TokenRow as TokenRowModel } from "../tokenRows/tokenRows";

/** A row's visible name: the catalog label, plus the key for a scale entry. */
export function useTokenRowLabel(): (row: TokenRowModel) => string {
  const copy = useTokenCopy();
  return useCallback(
    (row: TokenRowModel) => (row.scaleKey === undefined ? copy(row.definition.label) : `${copy(row.definition.label)} · ${row.scaleKey}`),
    [copy],
  );
}

function OverrideDot({ state }: Readonly<{ state: TokenRowModel["overrideState"] }>) {
  const { t } = useLingui();
  if (state === "none") {
    return null;
  }
  return (
    <span
      className={clsx(css.dot, state === "saved" && css.dotSaved)}
      role="img"
      aria-label={state === "draft" ? t`Edited, not saved` : t`Saved override for this item`}
    />
  );
}

/** One token: its name and state, its control, its path and description, and any problem. */
export function TokenRow({ row }: Readonly<{ row: TokenRowModel }>) {
  const { t } = useLingui();
  const copy = useTokenCopy();
  const editor = useTokenEditor();
  const label = useTokenRowLabel()(row);
  const issue = editor.issues.find((entry) => entry.path === row.path || entry.path.startsWith(`${row.path}.`));
  const isInherited = editor.scope.kind === "item" && row.overrideState === "none";
  return (
    <div className={clsx(css.row, isInherited && css.inherited, issue && css.hasIssue)} data-token-path={row.path}>
      <div className={css.header}>
        <span className={css.label}>{label}</span>
        <OverrideDot state={row.overrideState} />
        <span className={css.value}>{formatTokenValue(row.definition.kind, row.resolved)}</span>
        {row.overrideState === "draft" ? (
          <ActionIcon size="sm" variant="subtle" aria-label={t`Reset ${label}`} title={t`Reset ${label}`} onClick={() => editor.resetToken(row.path)}>
            <IconArrowBackUp size={14} aria-hidden="true" />
          </ActionIcon>
        ) : null}
      </div>
      <TokenControl row={row} label={label} />
      <p className={css.meta}>
        <code className={css.path}>{row.path}</code> {copy(row.definition.description)}
      </p>
      {issue ? (
        <p className={css.issue} role="alert">
          {t`This value does not resolve.`} <code>{issue.message}</code>
        </p>
      ) : null}
    </div>
  );
}
```

`src/videoThemeEditor/TokenRow/TokenRow.module.css`:

```css
.row {
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 8px;
  padding: 12px 0;
}

.inherited {
  opacity: 0.6;
}

.inherited:focus-within {
  opacity: 1;
}

.hasIssue {
  border-left: 3px solid var(--mantine-color-red-6);
  padding-left: 9px;
}

.header {
  align-items: center;
  display: flex;
  gap: 8px;
  min-width: 0;
}

.label {
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  min-width: 0;
  overflow-wrap: anywhere;
}

.dot {
  background: var(--ava-primary-6);
  border: 2px solid var(--ava-primary-6);
  border-radius: 50%;
  flex: 0 0 auto;
  height: 8px;
  width: 8px;
}

.dotSaved {
  background: transparent;
}

.value {
  color: var(--muted);
  font: 11px var(--mono);
  margin-left: auto;
  white-space: nowrap;
}

.meta {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
  margin: 0;
}

.path {
  font: 10px var(--mono);
}

.issue {
  color: var(--mantine-color-red-7);
  font-size: 11px;
  margin: 0;
}
```

- [ ] **Step 2: Add the empty-scale helper to the row module**

Atomic scales with no entries (classic's `size` and `textShadow`) still need a section so a value can be added. Append to `src/videoThemeEditor/tokenRows/tokenRows.ts`:

```ts
/**
 * Sections for atomic scales that have no entries yet, such as an empty
 * `textShadow` scale, so the editor can offer to add the first value.
 */
export function listEmptyAtomicScaleGroups(rows: readonly TokenRow[]): readonly string[] {
  const filled = new Set(rows.map((row) => row.group));
  return listTokenDefinitions()
    .filter(({ path, isScale }) => isScale && path.startsWith("atomic."))
    .map(({ path }) => `atomic:${path.split(".")[1]}`)
    .filter((group) => !filled.has(group));
}
```

and append to `src/videoThemeEditor/tokenRows/tokenRows.test.ts` (add `listEmptyAtomicScaleGroups` to its import):

```ts
test("atomic scales with no entries still get a section", () => {
  assert.deepEqual(listEmptyAtomicScaleGroups(_rows({ kind: "theme" })), ["atomic:size", "atomic:textShadow"]);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/tokenRows/tokenRows.test.ts`
Expected: 8 passing.

- [ ] **Step 3: Write the editor context value**

`src/videoThemeEditor/VideoThemeEditor/useTokenEditorValue.ts`:

```ts
import { useMemo } from "react";
import { setCustomValueInDraft } from "../customTokenValue/customTokenValue";
import {
  resetTokenInDraft,
  setTokenInDraft,
  type ThemeDraft,
  type ThemeEditScope,
} from "../themeDraft/themeDraft";
import type { TokenEditorContextValue } from "../TokenEditorContext/TokenEditorContext";
import type { TokenRow } from "../tokenRows/tokenRows";
import type { ResolvedVideoTheme, VideoThemeIssue } from "../../videoTheme/videoTheme.types";

const OPAQUE_HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** The context `VideoThemeEditor` gives its controls; tightly coupled to it. */
export function useTokenEditorValue(
  options: Readonly<{
    draft: ThemeDraft;
    scope: ThemeEditScope;
    rows: readonly TokenRow[];
    theme: ResolvedVideoTheme;
    issues: readonly VideoThemeIssue[];
    onDraftChange: (draft: ThemeDraft) => void;
  }>,
): TokenEditorContextValue {
  const { draft, scope, rows, theme, issues, onDraftChange } = options;
  const swatches = useMemo(
    () => [...new Set([...Object.values(theme.atomic.swatch), ...(theme.mantine.colors.primary ?? [])])].filter((color) => OPAQUE_HEX_COLOR.test(color)),
    [theme],
  );
  return useMemo(
    () => ({
      scope,
      rows,
      theme,
      issues,
      swatches,
      setToken: (tokenPath, value) => onDraftChange(setTokenInDraft(draft, scope, tokenPath, value)),
      setCustomValue: (request) => onDraftChange(setCustomValueInDraft(draft, scope, request)),
      resetToken: (tokenPath) => onDraftChange(resetTokenInDraft(draft, scope, tokenPath)),
    }),
    [draft, scope, rows, theme, issues, swatches, onDraftChange],
  );
}
```

- [ ] **Step 4: Write the toolbar**

`src/videoThemeEditor/VideoThemeEditor/EditorToolbar.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Badge, SegmentedControl, Switch, TextInput } from "@mantine/core";
import css from "./VideoThemeEditor.module.css";
import type { ThemeEditScope } from "../themeDraft/themeDraft";

/** Which tier tab is open. */
export type EditorTier = "component" | "semantic" | "atomic";

/** The editor's search, tier, and usage filter. */
export type EditorFilters = Readonly<{ tier: EditorTier; query: string; isUsedOnly: boolean }>;

/** The item the host is previewing, for item-scope edits. */
export type EditorItem = Readonly<{ id: string; scopeLabel: string }>;

type Props = Readonly<{
  filters: EditorFilters;
  onFiltersChange: (filters: EditorFilters) => void;
  scope: ThemeEditScope;
  item?: EditorItem;
  overrideCount: number;
  hasUsage: boolean;
  onScopeChange: (scope: ThemeEditScope) => void;
}>;

function ScopeSwitch({ scope, item, overrideCount, onScopeChange }: Readonly<{ scope: ThemeEditScope; item: EditorItem; overrideCount: number; onScopeChange: (scope: ThemeEditScope) => void }>) {
  const { t } = useLingui();
  return (
    <div className={css.scope}>
      <SegmentedControl
        size="xs"
        fullWidth
        aria-label={t`Edit scope`}
        value={scope.kind}
        data={[
          { value: "theme", label: t`All items (theme)` },
          { value: "item", label: item.scopeLabel },
        ]}
        onChange={(kind) => onScopeChange(kind === "item" ? { kind: "item", itemId: item.id } : { kind: "theme" })}
      />
      {overrideCount > 0 ? <Badge size="xs" variant="light">{t`Overrides: ${overrideCount}`}</Badge> : null}
    </div>
  );
}

/** The editor's scope switch, search, and usage filter. */
export function EditorToolbar({ filters, onFiltersChange, scope, item, overrideCount, hasUsage, onScopeChange }: Props) {
  const { t } = useLingui();
  return (
    <div className={css.toolbar}>
      {item ? <ScopeSwitch scope={scope} item={item} overrideCount={overrideCount} onScopeChange={onScopeChange} /> : null}
      <TextInput
        size="xs"
        type="search"
        aria-label={t`Search tokens`}
        placeholder={t`Search by name, path, or description`}
        value={filters.query}
        onChange={(event) => onFiltersChange({ ...filters, query: event.currentTarget.value })}
      />
      {hasUsage ? (
        <div className={css.usage}>
          <Switch size="xs" label={t`Only tokens this item uses`} checked={filters.isUsedOnly} onChange={(event) => onFiltersChange({ ...filters, isUsedOnly: event.currentTarget.checked })} />
          {filters.isUsedOnly ? <p className={css.hint}>{t`Shows the tokens seen so far. Play the preview once to discover the rest.`}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Write Essentials and the sections**

`src/videoThemeEditor/VideoThemeEditor/EssentialsGroup.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { TokenRow } from "../TokenRow/TokenRow";
import { getEssentialRows, type TokenRow as TokenRowModel } from "../tokenRows/tokenRows";
import css from "./VideoThemeEditor.module.css";

/** The Essentials group: the few tokens that change a look the most. */
export function EssentialsGroup({ rows }: Readonly<{ rows: readonly TokenRowModel[] }>) {
  const { t } = useLingui();
  return (
    <section className={css.essentials} aria-label={t`Essentials`}>
      <h3 className={css.sectionTitle}>{t`Essentials`}</h3>
      {getEssentialRows(rows).map((row) => (
        <TokenRow key={row.path} row={row} />
      ))}
    </section>
  );
}
```

`src/videoThemeEditor/VideoThemeEditor/TokenSections.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Accordion, Button } from "@mantine/core";
import { useState } from "react";
import { getTokenDefinitionFromPath } from "../../videoTheme/tokenCatalog/tokenCatalog";
import { getDefaultLiteralFromKind } from "../controls/defaultLiterals";
import { useGroupCopy } from "../tokenCopy/useEditorCopy";
import { useTokenCopy } from "../tokenCopy/useTokenCopy";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import { TokenRow } from "../TokenRow/TokenRow";
import { groupTokenRows, type TokenRow as TokenRowModel, type TokenRowGroup } from "../tokenRows/tokenRows";
import css from "./VideoThemeEditor.module.css";

function useGroupName(): (group: string) => string {
  const groupCopy = useGroupCopy();
  const copy = useTokenCopy();
  return (group) => {
    const [tier, name] = group.split(":");
    const scaleLabel = tier === "atomic" ? getTokenDefinitionFromPath(`atomic.${name}.entry`)?.label : undefined;
    return groupCopy(group) ?? (scaleLabel ? copy(scaleLabel) : name);
  };
}

function _nextCustomKey(rows: readonly TokenRowModel[]): string {
  const taken = new Set(rows.map((row) => row.scaleKey));
  let index = 1;
  while (taken.has(`custom${index}`)) {
    index += 1;
  }
  return `custom${index}`;
}

function AddScaleValue({ group, rows }: TokenRowGroup) {
  const { t } = useLingui();
  const editor = useTokenEditor();
  const scalePath = `atomic.${group.split(":")[1]}`;
  const kind = getTokenDefinitionFromPath(`${scalePath}.entry`)?.kind;
  if (!kind) {
    return null;
  }
  return (
    <Button size="compact-xs" variant="subtle" onClick={() => editor.setToken(`${scalePath}.${_nextCustomKey(rows)}`, getDefaultLiteralFromKind(kind))}>
      {t`Add value`}
    </Button>
  );
}

/**
 * Rows grouped into accordion sections. Only open sections render their
 * rows, so a long tier stays fast. Atomic sections can add a value.
 */
export function TokenSections({ rows, emptyGroups }: Readonly<{ rows: readonly TokenRowModel[]; emptyGroups: readonly string[] }>) {
  const { t } = useLingui();
  const groupName = useGroupName();
  const [open, setOpen] = useState<string[]>([]);
  const groups: readonly TokenRowGroup[] = [...groupTokenRows(rows), ...emptyGroups.map((group) => ({ group, rows: [] }))];
  if (groups.length === 0) {
    return <p className={css.empty}>{t`No tokens match.`}</p>;
  }
  return (
    <Accordion multiple value={open} onChange={setOpen} classNames={{ item: css.section, control: css.sectionControl, panel: css.sectionPanel }}>
      {groups.map(({ group, rows: grouped }) => (
        <Accordion.Item key={group} value={group}>
          <Accordion.Control>
            {groupName(group)} <span className={css.count}>{grouped.length}</span>
          </Accordion.Control>
          <Accordion.Panel>
            {open.includes(group) ? (
              <>
                {grouped.map((row) => (
                  <TokenRow key={row.path} row={row} />
                ))}
                {group.startsWith("atomic:") ? <AddScaleValue group={group} rows={grouped} /> : null}
              </>
            ) : null}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}
```

- [ ] **Step 6: Write the editor**

`src/videoThemeEditor/VideoThemeEditor/VideoThemeEditor.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { SegmentedControl } from "@mantine/core";
import { useMemo, useState } from "react";
import { useDraftTheme } from "../resolveDraftTheme/useDraftTheme";
import { countItemOverrides, type ThemeDraft, type ThemeEditScope } from "../themeDraft/themeDraft";
import { useTokenCopy } from "../tokenCopy/useTokenCopy";
import { TokenEditorContext } from "../TokenEditorContext/TokenEditorContext";
import { useTokenRowLabel } from "../TokenRow/TokenRow";
import {
  filterTokenRows,
  listEmptyAtomicScaleGroups,
  listTokenRows,
  type TokenRow,
} from "../tokenRows/tokenRows";
import { EditorToolbar, type EditorFilters, type EditorItem, type EditorTier } from "./EditorToolbar";
import { EssentialsGroup } from "./EssentialsGroup";
import { TokenSections } from "./TokenSections";
import { useTokenEditorValue } from "./useTokenEditorValue";
import css from "./VideoThemeEditor.module.css";
import type { VideoThemeLibrary } from "../../videoTheme/videoTheme.types";

type Props = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
  scope: ThemeEditScope;
  /** The previewed item, which enables item-scope edits. */
  item?: EditorItem;
  /** Token paths the previewed item read; enables the usage filter. */
  usedTokens?: readonly string[];
  onDraftChange: (draft: ThemeDraft) => void;
  onScopeChange: (scope: ThemeEditScope) => void;
}>;

function useVisibleRows(rows: readonly TokenRow[], filters: EditorFilters, usedTokens: readonly string[] | undefined) {
  const copy = useTokenCopy();
  const toLabel = useTokenRowLabel();
  return useMemo(
    () =>
      filterTokenRows(rows, {
        tiers: filters.tier === "atomic" ? ["atomic", "mantine"] : [filters.tier],
        query: filters.query,
        usedTokens: filters.isUsedOnly ? usedTokens : undefined,
        getText: (row) => `${toLabel(row)} ${copy(row.definition.description)}`,
      }),
    [rows, filters, usedTokens, copy, toLabel],
  );
}

function TierSwitch({ filters, onFiltersChange, hasItem }: Readonly<{ filters: EditorFilters; onFiltersChange: (filters: EditorFilters) => void; hasItem: boolean }>) {
  const { t } = useLingui();
  return (
    <SegmentedControl
      size="xs"
      fullWidth
      aria-label={t`Token layer`}
      value={filters.tier}
      data={[
        { value: "component", label: hasItem ? t`Components for this item` : t`Components` },
        { value: "semantic", label: t`Semantic` },
        { value: "atomic", label: t`Atomic` },
      ]}
      onChange={(tier) => onFiltersChange({ ...filters, tier: tier as EditorTier })}
    />
  );
}

/**
 * The design-token editor: Essentials, then component, semantic, and atomic
 * tokens in searchable sections, editing a draft for the whole theme or one
 * item. It is controlled and knows nothing about the gallery, so any
 * producer surface can host it with a theme library and a draft.
 */
export function VideoThemeEditor(props: Props) {
  const { t } = useLingui();
  const draftTheme = useDraftTheme(props);
  const rows = useMemo(
    () => listTokenRows({ library: props.library, themeId: props.themeId, draft: props.draft, scope: props.scope, merged: draftTheme.merged, theme: draftTheme.theme }),
    [props.library, props.themeId, props.draft, props.scope, draftTheme.merged, draftTheme.theme],
  );
  const context = useTokenEditorValue({ draft: props.draft, scope: props.scope, rows, theme: draftTheme.theme, issues: draftTheme.issues, onDraftChange: props.onDraftChange });
  const [filters, setFilters] = useState<EditorFilters>({ tier: "semantic", query: "", isUsedOnly: false });
  const visibleRows = useVisibleRows(rows, filters, props.usedTokens);
  const showsEmptyScales = filters.tier === "atomic" && !filters.query && !filters.isUsedOnly;
  return (
    <TokenEditorContext.Provider value={context}>
      <section className={css.editor} aria-label={t`Design tokens`}>
        <EditorToolbar
          filters={filters}
          onFiltersChange={setFilters}
          scope={props.scope}
          item={props.item}
          overrideCount={props.item ? countItemOverrides({ library: props.library, themeId: props.themeId, draft: props.draft, itemId: props.item.id }) : 0}
          hasUsage={props.usedTokens !== undefined}
          onScopeChange={props.onScopeChange}
        />
        {filters.query ? null : <EssentialsGroup rows={rows} />}
        <TierSwitch filters={filters} onFiltersChange={setFilters} hasItem={props.item !== undefined} />
        <TokenSections rows={visibleRows} emptyGroups={showsEmptyScales ? listEmptyAtomicScaleGroups(rows) : []} />
      </section>
    </TokenEditorContext.Provider>
  );
}
```

`src/videoThemeEditor/VideoThemeEditor/VideoThemeEditor.module.css`:

```css
.editor {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.toolbar {
  background: var(--paper);
  display: grid;
  gap: 8px;
  padding-bottom: 8px;
  position: sticky;
  top: 0;
  z-index: 2;
}

.scope {
  align-items: center;
  display: flex;
  gap: 8px;
}

.usage {
  display: grid;
  gap: 4px;
}

.hint {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
  margin: 0;
}

.essentials {
  border-bottom: 1px solid var(--line);
}

.sectionTitle {
  color: var(--ink);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.02em;
  margin: 0;
}

.section {
  border-bottom: 1px solid var(--line);
}

.sectionControl {
  font-size: 12px;
  padding-inline: 0;
}

.sectionPanel {
  padding-inline: 0;
}

.count {
  color: var(--muted);
  font: 10px var(--mono);
  margin-left: 6px;
}

.empty {
  color: var(--muted);
  font-size: 12px;
}
```

- [ ] **Step 7: Typecheck, lint, and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.
From `<repo>`: `pnpm exec eslint apps/ava-video-producer/src/videoThemeEditor` and `pnpm exec stylelint "apps/ava-video-producer/src/videoThemeEditor/**/*.css"`. Expected: no errors.

```bash
git add src/videoThemeEditor/TokenRow src/videoThemeEditor/VideoThemeEditor src/videoThemeEditor/tokenRows
git commit -m "feat(video-producer): add the reusable video theme editor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Theme bar and changed-on-disk banner

**Files:**
- Create: `src/videoThemeEditor/ThemeBar/ThemeBar.tsx`
- Create: `src/videoThemeEditor/ThemeBar/ThemeBar.module.css`
- Create: `src/videoThemeEditor/ThemeBar/ChangedOnDiskBanner.tsx`

- [ ] **Step 1: Write the theme bar**

`src/videoThemeEditor/ThemeBar/ThemeBar.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Badge, Button, Group, TextInput } from "@mantine/core";
import { useState } from "react";
import { AtlasSelect } from "../../gallery/AtlasSelect/AtlasSelect";
import css from "./ThemeBar.module.css";
import type { ThemeSummary } from "../ThemeApi/ThemeApi";
import type { ThemeSaveStatus } from "../useVideoThemeDraft/useThemeSaving";

type Props = Readonly<{
  themes: readonly ThemeSummary[];
  themeId: string;
  isBuiltIn: boolean;
  isDirty: boolean;
  hasIssues: boolean;
  status: ThemeSaveStatus;
  onSelectTheme: (themeId: string) => void;
  onSave: () => void;
  onSaveAsNew: (label: string) => void;
  onDiscard: () => void;
  onCopyJson: () => void;
}>;

function useStatusText(): (status: ThemeSaveStatus) => string {
  const { t } = useLingui();
  return (status) => {
    switch (status.kind) {
      case "saving":
        return t`Saving…`;
      case "saved":
        return t`Theme saved.`;
      case "copied":
        return t`Theme JSON copied.`;
      case "failed": {
        const messages: Readonly<Record<number, string>> = {
          400: t`The theme has problems. Fix the marked tokens and save again.`,
          403: t`Built-in themes are read-only. Save a copy as a new theme.`,
          409: t`This theme changed on disk. Reload the page, then save again.`,
          413: t`This theme is too large to save.`,
        };
        return messages[status.status] ?? t`The theme could not be saved. Check the showcase terminal.`;
      }
      default:
        return "";
    }
  };
}

function SaveAsNewForm({ onSubmit, onCancel }: Readonly<{ onSubmit: (label: string) => void; onCancel: () => void }>) {
  const { t } = useLingui();
  const [label, setLabel] = useState("");
  return (
    <form
      className={css.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (label.trim()) {
          onSubmit(label.trim());
        }
      }}
    >
      <TextInput size="xs" label={t`New theme name`} value={label} onChange={(event) => setLabel(event.currentTarget.value)} data-autofocus />
      <Group gap="xs">
        <Button size="compact-xs" type="submit" disabled={!label.trim()}>{t`Create theme`}</Button>
        <Button size="compact-xs" variant="subtle" onClick={onCancel}>{t`Cancel`}</Button>
      </Group>
    </form>
  );
}

/**
 * The theme picker and theme actions above the editor: Save (custom themes
 * only), Save as new theme, Discard, and Copy theme JSON, with an unsaved
 * indicator, a polite status line, and, for a built-in theme, a notice that
 * its changes are saved as a new theme.
 */
export function ThemeBar(props: Props) {
  const { t } = useLingui();
  const statusText = useStatusText();
  const [isNaming, setNaming] = useState(false);
  const isBusy = props.status.kind === "saving";
  return (
    <div className={css.bar}>
      <Group gap="xs" wrap="nowrap">
        <AtlasSelect
          aria-label={t`Theme`}
          data={props.themes.map(({ id, label, builtIn }) => ({ value: id, label: builtIn ? t`${label} (built-in)` : label }))}
          value={props.themeId}
          onChange={(id) => id && props.onSelectTheme(id)}
        />
        {props.isDirty ? <Badge size="sm" variant="light">{t`Unsaved changes`}</Badge> : null}
      </Group>
      {props.isBuiltIn ? (
        <p className={css.notice}>
          {t`Changes to a built-in theme are saved as a new theme. New themes use theme colors in every composition.`}
        </p>
      ) : null}
      <Group gap="xs">
        {props.isBuiltIn ? null : (
          <Button size="compact-xs" disabled={!props.isDirty || props.hasIssues || isBusy} onClick={props.onSave}>{t`Save`}</Button>
        )}
        <Button size="compact-xs" variant="default" disabled={props.hasIssues || isBusy} onClick={() => setNaming(true)}>{t`Save as new theme`}</Button>
        <Button size="compact-xs" variant="subtle" disabled={!props.isDirty || isBusy} onClick={props.onDiscard}>{t`Discard`}</Button>
        <Button size="compact-xs" variant="subtle" onClick={props.onCopyJson}>{t`Copy theme JSON`}</Button>
      </Group>
      {isNaming ? (
        <SaveAsNewForm
          onCancel={() => setNaming(false)}
          onSubmit={(label) => {
            setNaming(false);
            props.onSaveAsNew(label);
          }}
        />
      ) : null}
      <p className={css.status} role="status" aria-live="polite">{statusText(props.status)}</p>
    </div>
  );
}
```

`src/videoThemeEditor/ThemeBar/ThemeBar.module.css`:

```css
.bar {
  background: var(--paper);
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 8px;
  padding-bottom: 12px;
}

.notice {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
  margin: 0;
}

.form {
  display: grid;
  gap: 8px;
}

.status {
  color: var(--muted);
  font-size: 11px;
  margin: 0;
  min-height: 1.4em;
}
```

- [ ] **Step 2: Write the banner**

`src/videoThemeEditor/ThemeBar/ChangedOnDiskBanner.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Alert, Button, Group } from "@mantine/core";

/**
 * Shown when the theme file changed after the viewer's unsaved edits were
 * made: keep the edits on top of the new file, or discard them.
 */
export function ChangedOnDiskBanner({ onKeep, onDiscard }: Readonly<{ onKeep: () => void; onDiscard: () => void }>) {
  const { t } = useLingui();
  return (
    <Alert variant="light" color="yellow" title={t`This theme changed on disk`}>
      <p>{t`Your unsaved edits were made against an older version. Keep them on top of the new version, or discard them.`}</p>
      <Group gap="xs">
        <Button size="compact-xs" onClick={onKeep}>{t`Keep my edits`}</Button>
        <Button size="compact-xs" variant="subtle" onClick={onDiscard}>{t`Discard my edits`}</Button>
      </Group>
    </Alert>
  );
}
```

- [ ] **Step 3: Typecheck, lint, and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.
From `<repo>`: `pnpm exec eslint apps/ava-video-producer/src/videoThemeEditor/ThemeBar`. Expected: no errors.

```bash
git add src/videoThemeEditor/ThemeBar
git commit -m "feat(video-producer): add the theme bar and changed-on-disk banner" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Gallery theme context, modal tabs, and the tokens panel

**Files:**
- Create: `src/gallery/copyText/copyText.ts`
- Create: `src/gallery/GalleryVideoTheme/GalleryVideoTheme.tsx`
- Create: `src/gallery/GalleryVideoTheme/GalleryItemTheme.tsx`
- Create: `src/gallery/AtlasLayout/AtlasChromeProvider/AtlasChromeProvider.tsx`
- Create: `src/gallery/AtlasLayout/AtlasPanelTabs/AtlasPanelTabs.tsx`
- Create: `src/gallery/AtlasLayout/AtlasPanelTabs/AtlasPanelTabs.module.css`
- Create: `src/gallery/VideoThemePanel/VideoThemePanel.tsx`
- Create: `src/gallery/VideoThemePanel/VideoThemePanel.module.css`
- Modify: `src/gallery/MotionGallery/useMotionGalleryState.ts`
- Modify: `src/videoThemeEditor/resolveDraftTheme/useValidThemeDraft.ts`

- [ ] **Step 1: Move the clipboard helper out of the motion state hook**

Create `src/gallery/copyText/copyText.ts` with the body of `_copyText` from `src/gallery/MotionGallery/useMotionGalleryState.ts`, unchanged except for its signature:

```ts
/**
 * Copies text to the clipboard, falling back to a hidden textarea on local
 * HTTP where the Clipboard API is blocked. Throws when neither works. Use it
 * for any copy button, such as a creative brief or a theme's JSON.
 */
export async function copyTextToClipboard(value: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    /* Local HTTP fallback. */
  }
  const previousFocus =
    document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement
      ? document.activeElement
      : undefined;
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("aria-label", label);
  field.style.cssText = "position:fixed;left:0;top:0;opacity:0;width:1px;height:1px";
  (document.querySelector("dialog[open]") ?? document.body).append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  previousFocus?.focus();
  if (!copied) {
    throw new Error("Clipboard unavailable");
  }
}
```

In `useMotionGalleryState.ts`, delete the whole `async function _copyText({ value, label }: { value: string; label: string; }): Promise<void> { … }` declaration, add `import { copyTextToClipboard } from "../copyText/copyText";`, and in `onCopy` replace

```ts
        await _copyText({ value, label: t`Text to copy` });
```

with

```ts
        await copyTextToClipboard(value, t`Text to copy`);
```

- [ ] **Step 2: Let the valid-draft hook report validity**

Replace the return type and the last lines of `useValidThemeDraft` so the gallery can disable saving and exports while any part of the draft fails:

```ts
export function useValidThemeDraft(
  options: Readonly<{ library: VideoThemeLibrary; themeId: string; draft: ThemeDraft }>,
): Readonly<{ draft: ThemeDraft; isValid: boolean }> {
  const { library, themeId, draft } = options;
  const isValid = useMemo(() => isThemeDraftValid({ library, themeId, draft }), [library, themeId, draft]);
  const [lastValid, setLastValid] = useState<Readonly<{ themeId: string; draft: ThemeDraft }>>();
  useEffect(() => {
    if (isValid) {
      setLastValid({ themeId, draft });
    }
  }, [isValid, themeId, draft]);
  if (isValid) {
    return { draft, isValid };
  }
  return { draft: lastValid?.themeId === themeId ? lastValid.draft : EMPTY_THEME_DRAFT, isValid };
}
```

- [ ] **Step 3: Write the gallery theme context**

`src/gallery/GalleryVideoTheme/GalleryVideoTheme.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { resolveVideoTheme } from "../../videoTheme/resolveVideoTheme/resolveVideoTheme";
import { VideoThemeContext } from "../../videoTheme/useVideoTheme/useVideoTheme";
import { useDraftTheme } from "../../videoThemeEditor/resolveDraftTheme/useDraftTheme";
import { useValidThemeDraft } from "../../videoThemeEditor/resolveDraftTheme/useValidThemeDraft";
import { createSavedDocumentFromDraft, type ThemeDraft } from "../../videoThemeEditor/themeDraft/themeDraft";
import {
  useVideoThemeDraft,
  type VideoThemeDraftState,
} from "../../videoThemeEditor/useVideoThemeDraft/useVideoThemeDraft";
import { copyTextToClipboard } from "../copyText/copyText";
import type { ResolvedVideoTheme } from "../../videoTheme/videoTheme.types";

/** The gallery's theme state plus what previews and exports need from it. */
export type GalleryVideoThemeValue = VideoThemeDraftState &
  Readonly<{
    /** The last draft whose every part resolves; previews and exports use it. */
    validDraft: ThemeDraft;
    /** The theme with its theme-scope draft, for gallery-wide reads such as briefs. */
    galleryTheme: ResolvedVideoTheme;
    hasIssues: boolean;
    copyThemeJson: () => Promise<void>;
  }>;

const GalleryVideoThemeContext = createContext<GalleryVideoThemeValue | undefined>(undefined);
const THEME_SCOPE = { kind: "theme" } as const;

/** The gallery theme state. Throws outside `GalleryVideoTheme`. */
export function useGalleryVideoTheme(): GalleryVideoThemeValue {
  const value = useContext(GalleryVideoThemeContext);
  if (!value) {
    throw new Error("Gallery theme state needs a GalleryVideoTheme above this component");
  }
  return value;
}

/**
 * Owns the one theme draft every Atlas modal edits, and makes the saved
 * active theme the ambient video theme source. It sets no Mantine theme:
 * each preview gets its own `GalleryItemTheme`, so the gallery chrome never
 * picks up video tokens. Wrap the Motions, Compositions, and Sample films
 * sections in it.
 */
export function GalleryVideoTheme({ children }: Readonly<{ children: ReactNode }>) {
  const { t } = useLingui();
  const state = useVideoThemeDraft();
  const { library, themeId, draft, setStatus } = state;
  const draftTheme = useDraftTheme({ library, themeId, draft, scope: THEME_SCOPE });
  const valid = useValidThemeDraft({ library, themeId, draft });
  const savedTheme = useMemo(() => resolveVideoTheme(library, themeId), [library, themeId]);
  const videoContext = useMemo(() => ({ theme: savedTheme, source: { library, themeId } }), [savedTheme, library, themeId]);
  const copyThemeJson = useCallback(async () => {
    const document = library.get(themeId);
    if (!document) {
      return;
    }
    try {
      await copyTextToClipboard(JSON.stringify(createSavedDocumentFromDraft(document, draft), null, 2), t`Theme JSON`);
      setStatus({ kind: "copied" });
    } catch {
      setStatus({ kind: "failed", status: 0, issues: [] });
    }
  }, [library, themeId, draft, setStatus, t]);
  const value: GalleryVideoThemeValue = {
    ...state,
    validDraft: valid.draft,
    galleryTheme: draftTheme.theme,
    hasIssues: !valid.isValid,
    copyThemeJson,
  };
  return (
    <GalleryVideoThemeContext.Provider value={value}>
      <VideoThemeContext.Provider value={videoContext}>{children}</VideoThemeContext.Provider>
    </GalleryVideoThemeContext.Provider>
  );
}
```

`src/gallery/GalleryVideoTheme/GalleryItemTheme.tsx`:

```tsx
import { useDeferredValue, useMemo, type ReactNode } from "react";
import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import {
  createVideoThemeSourceFromDraft,
  isThemeDraftEmpty,
} from "../../videoThemeEditor/themeDraft/themeDraft";
import { useGalleryVideoTheme } from "./GalleryVideoTheme";
import type { VideoThemeSource } from "../../videoTheme/videoTheme.types";

/**
 * Renders one live preview with the gallery draft, resolved as saving would
 * produce it (see `createDraftThemeTarget`): the draft target's theme plus
 * the item's draft patches. The previewed renderer still adds the item's
 * own override id, as it does without a draft. The source is memoized
 * because providers resolve each source object once. With no edits it adds
 * nothing and the preview uses the saved theme. Wrap each preview in it,
 * never the gallery chrome. Thumbnails trail the modal by one deferred
 * render so typing stays fast.
 */
export function GalleryItemTheme({ itemId, children }: Readonly<{ itemId: string; children: ReactNode }>) {
  const { library, themeId, validDraft } = useGalleryVideoTheme();
  const current = useMemo(() => ({ library, themeId, draft: validDraft }), [library, themeId, validDraft]);
  const deferred = useDeferredValue(current);
  const source = useMemo<VideoThemeSource>(() => {
    const draftSource = createVideoThemeSourceFromDraft({ ...deferred, itemId });
    return { library: draftSource.library, themeId: draftSource.themeId, scope: { patches: draftSource.scope?.patches ?? [] } };
  }, [deferred, itemId]);
  if (isThemeDraftEmpty(deferred.draft)) {
    return children;
  }
  return (
    <VideoThemeProvider source={source} element="none">
      {children}
    </VideoThemeProvider>
  );
}
```

- [ ] **Step 4: Write the chrome provider and the tabs**

`src/gallery/AtlasLayout/AtlasChromeProvider/AtlasChromeProvider.tsx`:

```tsx
import "@mantine/core/styles.layer.css";
import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";

const ATLAS_CHROME_THEME = { fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif" } as const;

/**
 * The gallery chrome's own Mantine theme, for controls inside the Atlas
 * modals such as the Details / Design tokens tabs and the token editor. It
 * never carries video tokens; previews get theirs from `GalleryItemTheme`.
 */
export function AtlasChromeProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <MantineProvider theme={ATLAS_CHROME_THEME}>{children}</MantineProvider>;
}
```

`src/gallery/AtlasLayout/AtlasPanelTabs/AtlasPanelTabs.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Tabs } from "@mantine/core";
import { useState, type ReactNode } from "react";
import { AtlasChromeProvider } from "../AtlasChromeProvider/AtlasChromeProvider";
import css from "./AtlasPanelTabs.module.css";

/** Which panel of an Atlas modal's right column is open. */
export type AtlasPanelTab = "details" | "tokens";

type Props = Readonly<{
  tab: AtlasPanelTab;
  onTabChange: (tab: AtlasPanelTab) => void;
  details: ReactNode;
  /** The Design tokens panel, or undefined when the item cannot be themed. */
  tokens?: ReactNode;
}>;

/**
 * The right column of an Atlas preview modal: Details, and Design tokens
 * when the item can be themed. The tokens panel mounts on its first visit
 * and both panels stay mounted, so a running export keeps its status.
 */
export function AtlasPanelTabs({ tab, onTabChange, details, tokens }: Props) {
  const { t } = useLingui();
  const [hasVisitedTokens, setVisitedTokens] = useState(tab === "tokens");
  if (!tokens) {
    return <>{details}</>;
  }
  return (
    <AtlasChromeProvider>
      <Tabs
        value={tab}
        onChange={(next) => {
          const chosen: AtlasPanelTab = next === "tokens" ? "tokens" : "details";
          if (chosen === "tokens") {
            setVisitedTokens(true);
          }
          onTabChange(chosen);
        }}
        classNames={{ root: css.root, list: css.list, panel: css.panel }}
      >
        <Tabs.List grow>
          <Tabs.Tab value="details">{t`Details`}</Tabs.Tab>
          <Tabs.Tab value="tokens">{t`Design tokens`}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="details">{details}</Tabs.Panel>
        <Tabs.Panel value="tokens">{hasVisitedTokens ? tokens : null}</Tabs.Panel>
      </Tabs>
    </AtlasChromeProvider>
  );
}
```

`src/gallery/AtlasLayout/AtlasPanelTabs/AtlasPanelTabs.module.css`:

```css
.root {
  min-width: 0;
}

.list {
  background: var(--paper);
  position: sticky;
  top: 0;
  z-index: 3;
}

.panel {
  min-width: 0;
}
```

- [ ] **Step 5: Write the tokens panel**

`src/gallery/VideoThemePanel/VideoThemePanel.tsx`:

```tsx
import { useState } from "react";
import { ChangedOnDiskBanner } from "../../videoThemeEditor/ThemeBar/ChangedOnDiskBanner";
import { ThemeBar } from "../../videoThemeEditor/ThemeBar/ThemeBar";
import { VideoThemeEditor } from "../../videoThemeEditor/VideoThemeEditor/VideoThemeEditor";
import { useGalleryVideoTheme } from "../GalleryVideoTheme/GalleryVideoTheme";
import css from "./VideoThemePanel.module.css";
import type { ThemeEditScope } from "../../videoThemeEditor/themeDraft/themeDraft";

type Props = Readonly<{
  item: Readonly<{ id: string; scopeLabel: string }>;
  usedTokens: readonly string[];
}>;

/**
 * The Design tokens tab of an Atlas modal: the theme bar, the
 * changed-on-disk banner, and the editor for the open item. Key it by the
 * item so its scope resets when the item changes.
 */
export function VideoThemePanel({ item, usedTokens }: Props) {
  const gallery = useGalleryVideoTheme();
  const [scope, setScope] = useState<ThemeEditScope>({ kind: "theme" });
  return (
    <div className={css.panel}>
      <ThemeBar
        themes={gallery.themes}
        themeId={gallery.themeId}
        isBuiltIn={gallery.isBuiltIn}
        isDirty={gallery.isDirty}
        hasIssues={gallery.hasIssues}
        status={gallery.status}
        onSelectTheme={gallery.selectTheme}
        onSave={() => void gallery.save()}
        onSaveAsNew={(label) => void gallery.saveAsNew(label)}
        onDiscard={gallery.discard}
        onCopyJson={() => void gallery.copyThemeJson()}
      />
      {gallery.isChangedOnDisk ? <ChangedOnDiskBanner onKeep={gallery.keepDraft} onDiscard={gallery.discard} /> : null}
      <VideoThemeEditor
        library={gallery.library}
        themeId={gallery.themeId}
        draft={gallery.draft}
        scope={scope}
        item={item}
        usedTokens={usedTokens}
        onDraftChange={gallery.setDraft}
        onScopeChange={setScope}
      />
    </div>
  );
}
```

`src/gallery/VideoThemePanel/VideoThemePanel.module.css`:

```css
.panel {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 16px 20px 20px;
}

@media (width <= 760px) {
  .panel {
    padding: 12px;
  }
}
```

- [ ] **Step 6: Typecheck and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.

```bash
git add src/gallery/copyText src/gallery/GalleryVideoTheme src/gallery/AtlasLayout src/gallery/VideoThemePanel src/gallery/MotionGallery/useMotionGalleryState.ts src/videoThemeEditor/resolveDraftTheme/useValidThemeDraft.ts
git commit -m "feat(video-producer): give Atlas modals a Design tokens tab" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Motions section on the video theme

The Motions page drops its palette controls: the accent and background now come from the theme (and its Essentials), cards and the modal preview render with the draft, and exports carry it.

**Files:**
- Modify: `src/gallery/MotionGallery/MotionGallery.tsx`
- Modify: `src/gallery/MotionGallery/useMotionGalleryState.ts`
- Modify: `src/gallery/MotionGallery/MotionCard.tsx`
- Modify: `src/gallery/MotionGallery/PreviewDialog/PreviewDialogContent.tsx`
- Modify: `src/gallery/MotionGallery/PreviewDialog/PreviewDetails.tsx`
- Modify: `src/gallery/MotionGallery/PreviewDialog/usePreviewDownload.ts`
- Modify: `src/gallery/palette.ts`
- Modify: `showcase/motion.css`
- Modify: `showcase/download.d.ts`
- Delete: `src/gallery/MotionGallery/PaletteControls.tsx`, `src/gallery/MotionGallery/PaletteSwatches.tsx`

- [ ] **Step 1: Wrap the themed sections and drop the palette from the motion page**

In `src/gallery/MotionGallery/MotionGallery.tsx`:

1. Replace `import { PaletteControls } from "./PaletteControls";` with `import { GalleryVideoTheme, useGalleryVideoTheme } from "../GalleryVideoTheme/GalleryVideoTheme";`.
2. In `MotionGallery`, delete `accent,`, `background,`, `setAccent,`, and `setBackground,` from the `useMotionGalleryState()` destructuring, and after `const { t } = useGalleryLingui();` add:

```tsx
  const { galleryTheme } = useGalleryVideoTheme();
  const accent = galleryTheme.semantic.color.accent;
  const background = galleryTheme.semantic.color.ground;
```

3. Delete the `<PaletteControls … />` element (its four props) between the `collection-subline` div and the results.
4. In the `<MotionCard … />` element, delete `accent={accent}` and `background={background}`.
5. In the `<PreviewDialog … />` element, delete `setAccent={setAccent}` and `setBackground={setBackground}` (keep `accent` and `background`; the brief and configured JSON quote them).
6. Replace `AtlasSectionRoot` with:

```tsx
/** The gallery for the section the URL names; themed sections share one draft. */
function AtlasSectionRoot() {
  const section = getAtlasSection();
  if (section === "helpers") {
    return <HelperGallery />;
  }
  return (
    <GalleryVideoTheme>
      {section === "motions" ? <MotionGallery /> : <CompositionGallery section={section} />}
    </GalleryVideoTheme>
  );
}
```

In `src/gallery/MotionGallery/useMotionGalleryState.ts`:

1. Delete `import { DEFAULT_ACCENT, DEFAULT_BACKGROUND } from "../palette";`.
2. Delete the whole `_readPaletteOverride` function.
3. In `MotionGalleryState`, delete the `accent`, `background`, `setAccent`, and `setBackground` fields.
4. Delete the `accent` and `background` `useState` calls and the whole `persistPaletteOverrides` effect.
5. In the returned object, delete `accent,`, `background,`, `setAccent,`, and `setBackground,`.

Keep the `Dispatch` and `SetStateAction` type import: the `saved`, `collection`, `query`, and `playing` setters still use it.

- [ ] **Step 2: Render motion cards with the draft**

In `src/gallery/MotionGallery/MotionCard.tsx`:

1. Add `import { GalleryItemTheme } from "../GalleryVideoTheme/GalleryItemTheme";`.
2. Delete `accent,` and `background,` from the destructured props and `accent: string;` and `background: string;` from the props type.
3. Replace the `StockGraphic` element with:

```tsx
          <GalleryItemTheme itemId={preset.id}>
            <StockGraphic
              {...({
                preset: preset.id,
                input: contentState?.resolvedInput,
              } as import("../../stock/contracts/StockContract.types").StockRequest)}
              frame={frame}
            />
          </GalleryItemTheme>
```

- [ ] **Step 3: Give the motion modal its tabs, usage, and themed preview**

Replace `src/gallery/MotionGallery/PreviewDialog/PreviewDialogContent.tsx` with:

```tsx
import { useLingui as useGalleryLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { StockGraphic } from "../../../stock/StockGraphic";
import { VideoTokenUsageContext } from "../../../videoTheme/tokenUsage/tokenUsage";
import { useObservedTokenUsage } from "../../../videoThemeEditor/observedTokenUsage/useObservedTokenUsage";
import { AtlasPanelTabs, type AtlasPanelTab } from "../../AtlasLayout/AtlasPanelTabs/AtlasPanelTabs";
import { GalleryItemTheme } from "../../GalleryVideoTheme/GalleryItemTheme";
import { VideoThemePanel } from "../../VideoThemePanel/VideoThemePanel";
import { isReducedMotionPreferred } from "../isReducedMotionPreferred";
import { useFrames } from "../useGalleryClock";
import { PreviewDetails } from "./PreviewDetails";
import { PreviewPlaybackControls } from "./PreviewPlaybackControls";
import type { StockPresetId } from "../../../stock/catalog";
import type { StockRequest } from "../../../stock/contracts/StockContract.types";
import type { ContentDraft } from "../ContentControls/ContentDraftModule/ContentDraftModule";
import type { Preset } from "../Preset.types";
import type { ReactNode } from "react";

/** Per-motion player, content editor, theme editor, and export controls. */
export type Props = Readonly<{
  preset: Preset;
  contentState: ContentDraft;
  onContentChange: (state: ContentDraft) => void;
  saved: boolean;
  initialPlaying: boolean;
  onSave: (id: StockPresetId) => void;
  onCopy: (text: string, label: string) => void;
  notice: string;
  /** The theme's resolved accent and ground, quoted in briefs and configured JSON. */
  accent: string;
  background: string;
}>;

function usePlayingUnlessReducedMotion(initialPlaying: boolean) {
  const [playing, setPlaying] = useState(initialPlaying && !isReducedMotionPreferred());
  useEffect(function pauseOnReducedMotionPreference() {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pauseForPreference = () => {
      if (preference.matches) {
        setPlaying(false);
      }
    };
    preference.addEventListener("change", pauseForPreference);
    return () => preference.removeEventListener("change", pauseForPreference);
  }, []);
  return [playing, setPlaying] as const;
}

/** Remounts for each motion to isolate playback, pending exports, and the editor's scope. */
export function PreviewDialogContent(props: Props): ReactNode {
  const { t } = useGalleryLingui();
  const { preset, contentState } = props;
  const [playing, setPlaying] = usePlayingUnlessReducedMotion(props.initialPlaying);
  const [frame, setFrame] = useFrames(playing, preset.loopFrames);
  const [tab, setTab] = useState<AtlasPanelTab>("details");
  const usage = useObservedTokenUsage();
  return (
    <div className={clsx("dialog-layout", tab === "tokens" && "is-token-panel")}>
      <div className="dialog-player">
        <div className="dialog-stage">
          <div className="dialog-canvas">
            <GalleryItemTheme itemId={preset.id}>
              <VideoTokenUsageContext.Provider value={usage.report}>
                <StockGraphic {...({ preset: preset.id, input: contentState.resolvedInput } as StockRequest)} frame={frame} />
              </VideoTokenUsageContext.Provider>
            </GalleryItemTheme>
          </div>
        </div>
        <PreviewPlaybackControls playing={playing} setPlaying={setPlaying} frame={frame} setFrame={setFrame} loopFrames={preset.loopFrames} />
      </div>
      <AtlasPanelTabs
        tab={tab}
        onTabChange={setTab}
        details={<PreviewDetails {...props} />}
        tokens={<VideoThemePanel item={{ id: preset.id, scopeLabel: t`This motion only` }} usedTokens={usage.paths} />}
      />
    </div>
  );
}
```

`PreviewDetails` takes `Omit<Props, "initialPlaying">`; spreading `props` passes an extra `initialPlaying`, which TypeScript allows on a spread. If the linter objects, destructure `initialPlaying` out first.

- [ ] **Step 4: Point details and downloads at the theme**

In `src/gallery/MotionGallery/PreviewDialog/PreviewDetails.tsx`:

1. Delete `import { PaletteControls } from "../PaletteControls";`.
2. Delete `setAccent,` and `setBackground,` from the destructured props.
3. Replace the `usePreviewDownload({ preset, contentState, accent, background })` call with `usePreviewDownload({ preset, contentState })`, and destructure `canExport` too: `const { exporting, exportStatus, canExport, download } = …`.
4. Delete the `<PaletteControls … />` element.
5. Change the download button's `disabled={exporting || !contentState.isValid}` to `disabled={exporting || !contentState.isValid || !canExport}`.

Replace `src/gallery/MotionGallery/PreviewDialog/usePreviewDownload.ts` with:

```ts
import { useLingui as useGalleryLingui } from "@lingui/react/macro";
import { useState } from "react";
import { downloadFilm } from "../../../../showcase/download.js";
import { createExportThemeFromDraft } from "../../../videoThemeEditor/themeDraft/themeDraft";
import { useGalleryVideoTheme } from "../../GalleryVideoTheme/GalleryVideoTheme";
import type { Props as PreviewProps } from "./PreviewDialogContent";

type Options = Pick<PreviewProps, "preset" | "contentState">;

/**
 * Tracks an MP4 download of the previewed motion with the theme the preview
 * shows, unsaved edits included, and surfaces progress and failures. An
 * invalid draft cannot be exported.
 */
export function usePreviewDownload({ preset, contentState }: Readonly<Options>): {
  exporting: boolean;
  exportStatus: string;
  canExport: boolean;
  download: () => Promise<void>;
} {
  const { t } = useGalleryLingui();
  const { library, themeId, validDraft, hasIssues } = useGalleryVideoTheme();
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const download = async () => {
    setExporting(true);
    try {
      await downloadFilm({
        id: `stock-${preset.id}`,
        options: {
          schemaVersion: 1,
          input: contentState.resolvedInput,
          theme: createExportThemeFromDraft({ library, themeId, draft: validDraft, itemId: preset.id }),
        },
        onStatus: (status) => setExportStatus(status.message),
      });
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : t`Export failed. Try again.`);
    } finally {
      setExporting(false);
    }
  };
  return { exporting, exportStatus, canExport: !hasIssues, download };
}
```

Replace `showcase/download.d.ts`'s `DownloadFilmOptions` type with:

```ts
/** Inputs for downloadFilm. */
type DownloadFilmOptions = {
  captions?: boolean;
  cameraMotion?: boolean;
  motionBlur?: boolean;
  annotations?: boolean;
  accent?: string;
  background?: string;
  schemaVersion?: 1;
  input?: import("../src/stock/contracts/StockContract.types").StockInputByPreset[import("../src/stock/contracts/StockContract.types").StockPresetId];
  /** The saved theme to render with and the unsaved edits on top of it. */
  theme?: { id: string; patch?: Readonly<Record<string, unknown>> };
};
```

- [ ] **Step 5: Remove the palette components and their styles**

Delete `src/gallery/MotionGallery/PaletteControls.tsx` and `src/gallery/MotionGallery/PaletteSwatches.tsx`.

In `src/gallery/palette.ts`, delete `ACCENT_SWATCHES` and `BACKGROUND_SWATCHES` with their docstrings and replace the remaining docstring with: `/** Atlas parity defaults: the accent and ground the classic theme shows in the gallery. */` above `DEFAULT_ACCENT`. Keep both imports; the defaults still use them.

Run: `grep -rn "palette-controls\|palette-group\|palette-reset\|palette-help\|color-control\|className=\"swatch\|PaletteSwatches\|ACCENT_SWATCHES\|BACKGROUND_SWATCHES" src showcase/*.js showcase/*.html`
Expected: no output.

In `showcase/motion.css`, delete every rule whose selector names `.palette-controls`, `.palette-group`, `.palette-reset`, `.palette-help`, `.color-control`, `.swatches`, or `.swatch` (including those inside media queries and the `.dialog-details .palette-*` and `.dialog-details .swatch*` rules). Keep `.palette-row` and `.palette-note`. Then append:

```css
/* The Design tokens tab widens the modal's right column. */
.dialog-layout.is-token-panel {
  grid-template-columns: minmax(0, 1fr) 420px;
}
```

At 760 px and below `.dialog-layout` is `display: block`, so the column stacks under the player.

Run from `<repo>`: `pnpm exec stylelint "apps/ava-video-producer/showcase/motion.css"`. Expected: no errors.

- [ ] **Step 6: Typecheck, rebuild, and look**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.

Start `PORT=4183 pnpm showcase`, open `http://localhost:4183/motion.html` headless with the Playwright MCP at 1440 × 1000, open the first motion, switch to Design tokens, and take screenshots of the Details tab, the Design tokens tab, and an open Atlas section into `<repo>/.temp/feat-video-improvements/`. Repeat at 390 × 844. Check against `docs/design/video-token-editor.md` and fix what one look shows before looking again.

- [ ] **Step 7: Commit**

```bash
git add -A src/gallery showcase/motion.css showcase/download.d.ts
git commit -m "feat(video-producer): theme the Motions section from the token editor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Film theme messages

**Files:**
- Create: `src/showcase/filmTheme/filmTheme.ts`
- Test: `src/showcase/filmTheme/filmTheme.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveDraftTheme } from "../../videoThemeEditor/resolveDraftTheme/resolveDraftTheme";
import { createSnapshotFromDraft, EMPTY_THEME_DRAFT, setTokenInDraft } from "../../videoThemeEditor/themeDraft/themeDraft";
import { createFilmThemeAcknowledgement, createFilmTokensUsedMessage, isFilmTokensUsedMessage } from "./filmTheme";

const ITEM_ID = "shared-object-handoff";
const DRAFT = setTokenInDraft(EMPTY_THEME_DRAFT, { kind: "theme" }, "atomic.swatch.cyan", "#123456");

test("the player acknowledges a snapshot with the hash the gallery resolves", () => {
  const snapshot = createSnapshotFromDraft({ library: BUILT_IN_VIDEO_THEMES, themeId: "classic", draft: DRAFT, itemId: ITEM_ID });
  const { message } = createFilmThemeAcknowledgement(ITEM_ID, JSON.parse(JSON.stringify(snapshot)));
  const gallery = resolveDraftTheme({ library: BUILT_IN_VIDEO_THEMES, themeId: "classic", draft: DRAFT, scope: { kind: "item", itemId: ITEM_ID } });
  assert.equal(message.type === "film-theme" && message.hash, gallery.ok && gallery.theme.hash);
});

test("a snapshot with a literal semantic value is refused with its path", () => {
  const { snapshot, message } = createFilmThemeAcknowledgement(ITEM_ID, {
    themeId: "classic",
    documents: [],
    patches: [{ other: { video: { semantic: { color: { accent: "#ff0000" } } } } }],
  });
  assert.equal(snapshot, undefined);
  assert.ok(message.type === "film-theme-error" && message.issues.some((issue) => issue.path.includes("accent")));
});

test("usage messages are recognised only for their own film", () => {
  const message = createFilmTokensUsedMessage(ITEM_ID, ["color.accent"]);
  assert.equal(isFilmTokensUsedMessage(message, ITEM_ID), true);
  assert.equal(isFilmTokensUsedMessage(message, "occlusion-wipe"), false);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/showcase/filmTheme/filmTheme.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement**

`src/showcase/filmTheme/filmTheme.ts`:

```ts
import { z, ZodError } from "zod";
import { VideoThemeError } from "../../videoTheme/VideoThemeError/VideoThemeError";
import {
  parseVideoThemeDocument,
  VIDEO_THEME_SLUG_PATTERN,
  videoThemePatchSchema,
} from "../../videoTheme/videoThemeSchema/videoThemeSchema";
import {
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { VideoThemeIssue, VideoThemePatch } from "../../videoTheme/videoTheme.types";

const snapshotSchema = z
  .object({
    themeId: z.string().regex(VIDEO_THEME_SLUG_PATTERN),
    documents: z.array(z.unknown()).max(8),
    patches: z.array(videoThemePatchSchema).max(4),
  })
  .strict();

/** The live player's answer to a theme: the resolved hash, or why it refused. */
export type FilmThemeAcknowledgement =
  | Readonly<{ type: "film-theme"; id: string; hash: string }>
  | Readonly<{ type: "film-theme-error"; id: string; issues: readonly VideoThemeIssue[] }>;

/** The tokens a live film has read so far. */
export type FilmTokensUsedMessage = Readonly<{ type: "film-tokens-used"; id: string; paths: readonly string[] }>;

type UnknownRecord = Readonly<Record<string, unknown>>;

function _isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

/** Validates a snapshot that crossed a window boundary. Throws on any problem. */
export function parseVideoThemeSnapshot(value: unknown): VideoThemeSnapshot {
  const parsed = snapshotSchema.parse(value);
  return {
    themeId: parsed.themeId,
    documents: parsed.documents.map(parseVideoThemeDocument),
    patches: parsed.patches as VideoThemePatch[],
  };
}

function _issuesFromError(error: unknown): VideoThemeIssue[] {
  if (error instanceof VideoThemeError) {
    return [...error.issues];
  }
  if (error instanceof ZodError) {
    return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
  }
  return [{ path: "", message: error instanceof Error ? error.message : String(error) }];
}

/**
 * What the live player does with a `theme` message: the snapshot to apply
 * when it resolves, and the acknowledgement to post back either way.
 */
export function createFilmThemeAcknowledgement(
  id: string,
  value: unknown,
): Readonly<{ snapshot?: VideoThemeSnapshot; message: FilmThemeAcknowledgement }> {
  try {
    const snapshot = parseVideoThemeSnapshot(value);
    // The film root resolves with the film id as its override scope, so the hash matches the picture.
    return { snapshot, message: { type: "film-theme", id, hash: resolveVideoThemeFromSnapshot(snapshot, [id]).hash } };
  } catch (error) {
    return { message: { type: "film-theme-error", id, issues: _issuesFromError(error) } };
  }
}

/** The usage message the live player posts as its film reads tokens. */
export function createFilmTokensUsedMessage(id: string, paths: readonly string[]): FilmTokensUsedMessage {
  return { type: "film-tokens-used", id, paths };
}

/** Whether a posted message is a theme acknowledgement for this film. */
export function isFilmThemeAcknowledgement(data: unknown, id: string): data is FilmThemeAcknowledgement {
  return (
    _isRecord(data) &&
    data.id === id &&
    ((data.type === "film-theme" && typeof data.hash === "string") ||
      (data.type === "film-theme-error" && Array.isArray(data.issues)))
  );
}

/** Whether a posted message is a usage report for this film. */
export function isFilmTokensUsedMessage(data: unknown, id: string): data is FilmTokensUsedMessage {
  return (
    _isRecord(data) &&
    data.type === "film-tokens-used" &&
    data.id === id &&
    Array.isArray(data.paths) &&
    data.paths.every((path) => typeof path === "string")
  );
}
```

- [ ] **Step 3: Run the tests to verify they pass**

Run the Step 1 command. Expected: 3 passing. If the first test fails, plan 2's `resolveVideoThemeFromSnapshot` does not resolve the same scope as the gallery (contract need 4); reconcile it with plan 2 rather than changing this test.

- [ ] **Step 4: Commit**

```bash
git add src/showcase/filmTheme
git commit -m "feat(video-producer): define the live player's theme messages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: The live player takes themes and reports usage

**Files:**
- Create: `src/showcase/useFilmControl/useFilmControl.ts`
- Modify: `src/showcase/LivePlayer.tsx`

- [ ] **Step 1: Write the message handling hook**

`src/showcase/useFilmControl/useFilmControl.ts`:

```ts
import { useEffect, useRef, type RefObject } from "react";
import {
  continuityAppearanceSchema,
  type ContinuityAppearance,
} from "../../continuity/continuityAppearance";
import { createFilmThemeAcknowledgement, createFilmTokensUsedMessage } from "../filmTheme/filmTheme";
import type { PlayerRef } from "@remotion/player";
import type { VideoThemeSnapshot } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";

/** The live player's state and setters that parent messages read and change. */
export type FilmControlOptions = Readonly<{
  id: string;
  player: RefObject<PlayerRef | null>;
  isContinuity: boolean;
  appearance: ContinuityAppearance;
  captions: boolean;
  speed: number;
  loop: boolean;
  previewFrames: number;
  usedTokens: readonly string[];
  send: (message: object) => void;
  onAppearance: (appearance: ContinuityAppearance) => void;
  onTheme: (snapshot: VideoThemeSnapshot) => void;
  onSpeed: (speed: number) => void;
  onLoop: (loop: boolean) => void;
}>;

function _sendOptions(options: FilmControlOptions): void {
  options.send({
    type: "film-options",
    id: options.id,
    options: options.isContinuity ? { ...options.appearance, captions: options.captions } : { captions: options.captions },
    transport: { speed: options.speed, loop: options.loop },
  });
}

function _handlePlayback(action: unknown, value: unknown, options: FilmControlOptions): boolean {
  const player = options.player.current;
  switch (action) {
    case "play":
      player?.play();
      return true;
    case "pause":
      player?.pause();
      return true;
    case "replay":
      player?.seekTo(0);
      player?.play();
      return true;
    case "seek":
      if (typeof value === "number" && Number.isFinite(value)) {
        player?.seekTo(Math.max(0, Math.min(options.previewFrames - 1, value)));
        player?.play();
      }
      return true;
    case "speed":
      if (typeof value === "number" && [0.5, 1, 1.5, 2].includes(value)) {
        options.onSpeed(value);
      }
      return true;
    case "loop":
      options.onLoop(Boolean(value));
      return true;
    default:
      return false;
  }
}

function _handleSettings(action: unknown, value: unknown, options: FilmControlOptions): void {
  if (action === "appearance" && options.isContinuity) {
    const result = continuityAppearanceSchema.safeParse(value);
    if (result.success) {
      options.onAppearance(result.data);
    }
  }
  if (action === "theme" && options.isContinuity) {
    const { snapshot, message } = createFilmThemeAcknowledgement(options.id, value);
    if (snapshot) {
      options.onTheme(snapshot);
    }
    options.send(message);
  }
  if (action === "options") {
    _sendOptions(options);
  }
}

/**
 * Connects the live player to the gallery that embeds it: answers transport,
 * appearance, and theme messages, acknowledges a theme by its resolved
 * hash, reports its options whenever they change, and posts the tokens its
 * film has read.
 */
export function useFilmControl(options: FilmControlOptions): void {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  const { isContinuity, appearance, captions, speed, loop, usedTokens, id, send } = options;
  useEffect(() => {
    _sendOptions(latest.current);
  }, [isContinuity, appearance, captions, speed, loop]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== "film-control") {
        return;
      }
      if (event.data.id && event.data.id !== latest.current.id) {
        return;
      }
      const { action, value } = event.data;
      if (!_handlePlayback(action, value, latest.current)) {
        _handleSettings(action, value, latest.current);
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (usedTokens.length > 0) {
      send(createFilmTokensUsedMessage(id, usedTokens));
    }
  }, [usedTokens, id, send]);
}
```

- [ ] **Step 2: Replace the live player**

Plan 2 changed this file twice. Its Task 24 added the legacy appearance bridge (a `theme` memo that adds `createThemePatchFromLegacyAppearance(appearance)` to `film.theme ?? CLASSIC_VIDEO_THEME_SNAPSHOT` through `addPatchesToVideoThemeSnapshot`) and passed `theme` in the player's film input. Its Task 30 memoized `previewPlan` and counted `previewFrames` through `createContinuityPlanFromVideoThemeSnapshot(previewPlan, theme, [film.id])`. This replacement keeps the Task 30 frame count and the `theme` input, takes the theme from the gallery's `theme` messages instead of the legacy patch, and drops the bridge. Before replacing, run `git diff <plan 1's last commit> -- src/showcase/LivePlayer.tsx` and carry over anything else plan 2 added.

Replace `src/showcase/LivePlayer.tsx` with:

```tsx
import { i18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import { I18nProvider } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createRoot } from "react-dom/client";
import {
  continuityAppearanceSchema,
  createContinuityPlanFromOptions,
  type ContinuityAppearance,
} from "../continuity/continuityAppearance";
import { createContinuityPlanFromVideoThemeSnapshot } from "../continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { HelperPlayer } from "../gallery/HelperGallery/HelperPlayer/HelperPlayer";
import { durationInFrames } from "../storyboard/schema/timeline";
import { VideoTokenUsageContext } from "../videoTheme/tokenUsage/tokenUsage";
import { useObservedTokenUsage } from "../videoThemeEditor/observedTokenUsage/useObservedTokenUsage";
import { FilmComposition } from "./FilmComposition";
import { useFilmControl } from "./useFilmControl/useFilmControl";
import type { Film } from "./showcase.types";
import type { VideoThemeSnapshot } from "../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import "../theme.css";
import "./player.css";

i18n.setMessagesCompiler(compileMessage);
i18n.loadAndActivate({ locale: "en", messages: {} });
const id = new URLSearchParams(location.search).get("id") ?? "avandar-home";

type SavedPlayback = Readonly<{ frame: number; playing: boolean; captions: boolean; speed?: number; loop?: boolean }>;
type ContinuityShot = Extract<NonNullable<Film["plan"]>["shots"][number], { scene: "continuity" }>;

function readSaved(): SavedPlayback | undefined {
  try {
    return (JSON.parse(sessionStorage.getItem(`film:${id}`) ?? "null") as SavedPlayback | null) ?? undefined;
  } catch {
    return undefined;
  }
}
const saved = readSaved();
let savePlayback = () => {};
window.addEventListener("message", (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== window.parent ||
    event.data?.type !== "film-control" ||
    event.data.action !== "reload"
  ) {
    return;
  }
  try {
    savePlayback();
  } catch {
    /* Storage can be unavailable in a restricted browser. */
  }
  send({ type: "film-reloading", requestId: event.data.requestId });
  location.reload();
});
function send(message: object) {
  window.parent.postMessage(message, location.origin);
}

function _findContinuityShot(film: Film): ContinuityShot | undefined {
  const shot = film.plan?.shots.find((candidate) => candidate.scene === "continuity");
  return shot?.scene === "continuity" ? shot : undefined;
}

function _getInitialAppearance(shot: ContinuityShot | undefined): ContinuityAppearance {
  return continuityAppearanceSchema.parse(
    shot ? { cameraMotion: shot.props.cameraMotion, motionBlur: shot.props.motionBlur, annotations: shot.props.annotations } : {},
  );
}

// The film keeps its unthemed plan: FilmComposition applies the theme.
function _createPreviewPlan(film: Film, appearance: ContinuityAppearance, isContinuity: boolean) {
  return film.plan && isContinuity ? createContinuityPlanFromOptions(film.plan, appearance) : film.plan;
}

function useSavedPlayback(player: RefObject<PlayerRef | null>, state: Readonly<{ captions: boolean; speed: number; loop: boolean }>) {
  const { captions, speed, loop } = state;
  useEffect(() => {
    savePlayback = () =>
      sessionStorage.setItem(
        `film:${id}`,
        JSON.stringify({ frame: player.current?.getCurrentFrame() ?? 0, playing: player.current?.isPlaying() ?? false, captions, speed, loop }),
      );
  }, [player, captions, speed, loop]);
  useEffect(function registerPlayEventListener() {
    const current = player.current;
    const play = () => send({ type: "film-playing", id });
    current?.addEventListener("play", play);
    return () => {
      current?.removeEventListener("play", play);
    };
  }, [player]);
}

type LiveFilmProps = Readonly<{
  film: Film;
  player: RefObject<PlayerRef | null>;
  previewFrames: number;
  captions: boolean;
  speed: number;
  loop: boolean;
}>;

function LiveFilm({ film, player, previewFrames, captions, speed, loop }: LiveFilmProps) {
  return (
    <Player
      ref={player}
      component={FilmComposition}
      inputProps={{ film: { ...film, frames: previewFrames, showCaptions: captions } }}
      compositionWidth={film.width}
      compositionHeight={film.height}
      durationInFrames={previewFrames}
      fps={film.fps}
      controls
      loop={loop}
      playbackRate={speed}
      autoPlay={saved?.playing ?? false}
      initialFrame={Math.min(previewFrames - 1, saved?.frame ?? (id === "avandar-home" ? 490 : Math.min(100, previewFrames - 1)))}
      style={{ width: "100%" }}
      clickToPlay={false}
      spaceKeyToPlayOrPause
      errorFallback={() => (
        <p className="liveError">
          <Trans>Preview unavailable. Check the showcase terminal, then reload.</Trans>
        </p>
      )}
    />
  );
}

/**
 * The embedded live preview: plays a film, follows the gallery's transport,
 * appearance, and theme messages, and reports the tokens its film reads.
 */
function LivePlayer({ film }: { film: Film }) {
  const player = useRef<PlayerRef>(null);
  const continuity = _findContinuityShot(film);
  const [appearance, setAppearance] = useState(() => _getInitialAppearance(continuity));
  const [theme, setTheme] = useState<VideoThemeSnapshot | undefined>(film.theme);
  const [captions, setCaptions] = useState(saved?.captions ?? true);
  const [speed, setSpeed] = useState(saved?.speed ?? 1);
  const [loop, setLoop] = useState(saved?.loop ?? false);
  const usage = useObservedTokenUsage();
  const previewPlan = useMemo(() => _createPreviewPlan(film, appearance, Boolean(continuity)), [film, appearance, continuity]);
  // Count frames with the theme applied: its camera preset can lengthen beats.
  const previewFrames = useMemo(
    () => (previewPlan ? durationInFrames(createContinuityPlanFromVideoThemeSnapshot(previewPlan, theme, [film.id])) : film.frames),
    [previewPlan, theme, film.id, film.frames],
  );
  useSavedPlayback(player, { captions, speed, loop });
  useFilmControl({
    id,
    player,
    isContinuity: Boolean(continuity),
    appearance,
    captions,
    speed,
    loop,
    previewFrames,
    usedTokens: usage.paths,
    send,
    onAppearance: (next) => {
      setAppearance(next);
      setCaptions(next.captions);
    },
    onTheme: setTheme,
    onSpeed: setSpeed,
    onLoop: setLoop,
  });
  return (
    <I18nProvider i18n={i18n}>
      <div className="liveFilm">
        <VideoTokenUsageContext.Provider value={usage.report}>
          <LiveFilm film={{ ...film, theme, plan: previewPlan }} player={player} previewFrames={previewFrames} captions={captions} speed={speed} loop={loop} />
        </VideoTokenUsageContext.Provider>
        {film.plan?.captions && !continuity ? (
          <label className="captionToggle">
            <input type="checkbox" checked={captions} onChange={(event) => setCaptions(event.target.checked)} />
            <Trans>Captions</Trans>
          </label>
        ) : null}
      </div>
    </I18nProvider>
  );
}

async function start() {
  const response = await fetch(`/api/films/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error("Film unavailable");
  }
  const film = (await response.json()) as Film;
  createRoot(document.getElementById("root")!).render(film.kind === "helper" ? <HelperPlayer film={film} /> : <LivePlayer film={film} />);
}
start().catch(() => {
  document.getElementById("load-error")!.hidden = false;
});
```

`LivePlayer` runs past 45 lines because of its state declarations; this matches the existing file's structure. If the reviewer asks, move the seven `useState` calls into a `useLiveFilmState(film)` hook.

- [ ] **Step 3: Typecheck and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors. Until Task 19 trims `continuityAppearanceSchema`, its legacy fields still fill in with their defaults and the gallery still sends them; Task 19 removes them on both sides.

```bash
git add src/showcase/useFilmControl src/showcase/LivePlayer.tsx
git commit -m "feat(video-producer): let the live player take video themes and report usage" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Compositions and Sample films on the video theme

The composition modal loses its palette, roughness, and camera-preset controls (they are tokens now), gains the Design tokens tab, keeps the live player on the draft's theme, gates downloads on the player's acknowledgement, and shows per-theme posters.

**Files:**
- Modify: `src/continuity/continuityAppearance.ts` and `src/continuity/continuityAppearance.test.ts`
- Modify: `src/continuity/gallery/CompositionViewer/useCompositionAppearance.ts`
- Modify: `src/continuity/gallery/CompositionViewer/compositionExportOptions.test.ts`
- Modify: `src/continuity/gallery/CompositionViewer/CompositionControls.tsx` and `CompositionControls.module.css`
- Create: `src/continuity/gallery/CompositionViewer/useCompositionTheme.ts`
- Modify: `src/continuity/gallery/CompositionViewer/CompositionViewer.tsx` and `CompositionViewer.module.css`
- Modify: `src/continuity/gallery/CompositionViewer/CompositionActions/CompositionActions.tsx` and `useCompositionDownload.ts`
- Modify: `src/continuity/gallery/CompositionGallery/CompositionGallery.tsx`
- Modify: `scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts` (one option, until Task 20 removes it)
- Delete: `CameraPresetControl.tsx`, `CameraPresetControl.module.css`, `CompositionRoughnessControls.tsx`, `useCameraPresetOptions.ts` (all in `src/continuity/gallery/CompositionViewer/`)

- [ ] **Step 1: Write the failing appearance tests**

Replace `src/continuity/continuityAppearance.test.ts` with:

```ts
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { storyboardSchema } from "../storyboard/schema/schema";
import { continuityAppearanceSchema, createContinuityPlanFromOptions } from "./continuityAppearance";
import { CONTINUITY_CATALOG } from "./continuityCatalog";

function _readFirstStudy() {
  return storyboardSchema.parse(
    JSON.parse(fs.readFileSync(new URL(`../../storyboards/${CONTINUITY_CATALOG[0].path}.json`, import.meta.url), "utf8")),
  );
}

test("render options reach every continuity shot without mutating the plan", () => {
  const plan = _readFirstStudy();
  const before = structuredClone(plan);
  const copy = createContinuityPlanFromOptions(plan, { cameraMotion: false, annotations: false });
  assert.deepEqual(plan, before);
  for (const [index, shot] of copy.shots.entries()) {
    const original = plan.shots[index];
    if (shot.scene !== "continuity" || original.scene !== "continuity") {
      assert.equal(shot, original);
      continue;
    }
    assert.equal(shot.props.cameraMotion, false);
    assert.equal(shot.props.annotations, false);
    assert.equal(shot.props.beats, original.props.beats);
  }
});

test("omitted options keep the authored flags", () => {
  const authored = createContinuityPlanFromOptions(_readFirstStudy(), { motionBlur: false });
  assert.deepEqual(createContinuityPlanFromOptions(authored, {}), authored);
});

test("every render option defaults to on", () => {
  assert.deepEqual(continuityAppearanceSchema.parse({}), {
    captions: true,
    cameraMotion: true,
    motionBlur: true,
    annotations: true,
  });
});

test("colours, sketch levels, and camera presets are not render options", () => {
  for (const option of [{ accent: "#123456" }, { boxRoughness: 1 }, { annotationRoughness: 1 }, { cameraPreset: "whip" }]) {
    assert.equal(continuityAppearanceSchema.safeParse(option).success, false, Object.keys(option)[0]);
  }
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/continuity/continuityAppearance.test.ts`
Expected: FAIL on the defaults and "not render options" tests (the legacy fields still exist).

- [ ] **Step 2: Trim the appearance schema**

Replace `src/continuity/continuityAppearance.ts` with:

```ts
import { z } from "zod";
import type { Storyboard } from "../storyboard/schema/schema";

/**
 * Render options a viewer toggles for a continuity composition, shared by
 * previews and exports. Colours, sketch levels, and camera presets are
 * design tokens edited in the theme, not options.
 */
export const continuityAppearanceSchema = z
  .object({
    captions: z.boolean().default(true),
    cameraMotion: z.boolean().default(true),
    motionBlur: z.boolean().default(true),
    annotations: z.boolean().default(true),
  })
  .strict();

/** Complete render options acknowledged by the active player. */
export type ContinuityAppearance = z.infer<typeof continuityAppearanceSchema>;

/**
 * Applies render options to every continuity shot without mutating the
 * authored plan. Captions are a film option and stay out of shot props.
 */
export function createContinuityPlanFromOptions(plan: Storyboard, raw: unknown): Storyboard {
  const shape = continuityAppearanceSchema.shape;
  const { captions: _captions, ...appearance } = z
    .object({
      captions: shape.captions.unwrap().optional(),
      cameraMotion: shape.cameraMotion.unwrap().optional(),
      motionBlur: shape.motionBlur.unwrap().optional(),
      annotations: shape.annotations.unwrap().optional(),
    })
    .strict()
    .parse(raw);
  return {
    ...plan,
    shots: plan.shots.map((shot) =>
      shot.scene === "continuity" ? { ...shot, props: { ...shot.props, ...appearance } } : shot,
    ),
  };
}
```

Run the Step 1 command. Expected: 4 passing.

In `src/continuity/gallery/CompositionViewer/compositionExportOptions.test.ts`, change

```ts
const DRAFT = continuityAppearanceSchema.parse({ accent: "#123456" });
```

to

```ts
const DRAFT = continuityAppearanceSchema.parse({ cameraMotion: false });
```

and change `acknowledged: { id: "study", options: { ...DRAFT, accent: "#abcdef" } },` to `acknowledged: { id: "study", options: { ...DRAFT, motionBlur: false } },`.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/continuity/gallery/CompositionViewer/compositionExportOptions.test.ts`
Expected: 2 passing.

In `src/continuity/gallery/CompositionViewer/useCompositionAppearance.ts`, replace both `"composition-appearance"` string literals with `"composition-appearance:v2"`. The old key holds fields the schema no longer accepts, so starting fresh is the migration (spec §2.3).

The showcase server builds its `cameraPreset` option from `continuityAppearanceSchema.shape.cameraPreset`, which no longer exists, so it would fail to start. Task 20 removes that option with the rest of the legacy bridge. Until then, in `scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts`, replace

```ts
    cameraPreset: continuityAppearanceSchema.shape.cameraPreset
      .unwrap()
      .optional(),
```

with the same values written out:

```ts
    cameraPreset: z.enum(["authored", "deliberate", "gentle", "balanced", "brisk", "whip"]).optional(),
```

and replace its import

```ts
import {
  continuityAppearanceSchema,
  createContinuityPlanFromOptions,
} from "../../../src/continuity/continuityAppearance";
```

with `import { createContinuityPlanFromOptions } from "../../../src/continuity/continuityAppearance";`.

- [ ] **Step 3: Remove the controls that became tokens**

Delete `src/continuity/gallery/CompositionViewer/CameraPresetControl.tsx`, `CameraPresetControl.module.css`, `CompositionRoughnessControls.tsx`, and `useCameraPresetOptions.ts`. Their copy now lives in `useOptionCopy` (Task 8).

Replace `src/continuity/gallery/CompositionViewer/CompositionControls.tsx` with:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Checkbox } from "@mantine/core";
import { AtlasChromeProvider } from "../../../gallery/AtlasLayout/AtlasChromeProvider/AtlasChromeProvider";
import { AtlasSelect } from "../../../gallery/AtlasSelect/AtlasSelect";
import css from "./CompositionControls.module.css";
import type { useCompositionAppearance } from "./useCompositionAppearance";

type Props = { appearance: ReturnType<typeof useCompositionAppearance> };
type ControlsProps = Props & {
  /** A scene study plays plain storyboard scenes with its authored theme. */
  isScene: boolean;
};

/**
 * Transport and render toggles for the active composition. Colours, sketch
 * levels, and camera presets are design tokens, edited in the Design tokens
 * tab. Scene studies keep only playback.
 */
export function CompositionControls({ appearance, isScene }: ControlsProps) {
  return (
    <AtlasChromeProvider>
      <div className={css.controls}>
        {isScene ? (
          <p className={css.help}>
            <Trans>
              Storyboard scenes play with their authored theme and per-shot field colors. Design tokens, camera motion,
              motion blur, and annotation settings apply to continuity compositions only.
            </Trans>
          </p>
        ) : null}
        <TransportControls appearance={appearance} isScene={isScene} />
      </div>
    </AtlasChromeProvider>
  );
}

function TransportControls({ appearance, isScene }: ControlsProps) {
  const { t } = useLingui();
  return (
    <div className={css.transport}>
      <button onClick={() => appearance.send("play")}>
        <Trans>Play</Trans>
      </button>
      <button onClick={() => appearance.send("pause")}>
        <Trans>Pause</Trans>
      </button>
      <button onClick={() => appearance.send("replay")}>
        <Trans>Replay</Trans>
      </button>
      <AtlasSelect
        label={t`Speed`}
        value={String(appearance.transport.speed)}
        data={[0.5, 1, 1.5, 2].map((speed) => ({ value: String(speed), label: `${speed}×` }))}
        onChange={(speed) => appearance.setTransport((current) => ({ ...current, speed: Number(speed) }))}
      />
      <Checkbox
        size="xs"
        label={t`Loop`}
        checked={appearance.transport.loop}
        onChange={(event) => {
          const loop = event.currentTarget.checked;
          appearance.setTransport((current) => ({ ...current, loop }));
        }}
      />
      {isScene ? null : <AppearanceToggles appearance={appearance} />}
    </div>
  );
}

function AppearanceToggles({ appearance }: Props) {
  const { t } = useLingui();
  const labels = {
    cameraMotion: t`Camera motion`,
    motionBlur: t`Motion blur`,
    annotations: t`Annotations`,
    captions: t`Captions`,
  };
  return (
    <>
      {(["cameraMotion", "motionBlur", "annotations", "captions"] as const).map((key) => (
        <Checkbox key={key} size="xs" label={labels[key]} checked={appearance.draft[key]} onChange={(event) => appearance.update({ [key]: event.currentTarget.checked })} />
      ))}
    </>
  );
}
```

In `CompositionControls.module.css`, delete the three `.roughness` rule blocks (`.roughness { … }`, `:global(dialog:modal) .roughness { … }`, and `.roughness > div { … }`).

- [ ] **Step 4: Write the composition theme hook**

`src/continuity/gallery/CompositionViewer/useCompositionTheme.ts`:

```ts
import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { isFilmThemeAcknowledgement, isFilmTokensUsedMessage } from "../../../showcase/filmTheme/filmTheme";
import {
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { VideoThemeIssue } from "../../../videoTheme/videoTheme.types";

/** About 100 ms, so dragging a slider does not flood the player (spec §3.4). */
const THEME_SEND_DELAY_MS = 100;

type Acknowledgement = Readonly<{ id: string; hash?: string; issues: readonly VideoThemeIssue[] }>;

function _expectedTheme(snapshotKey: string, id: string) {
  if (!snapshotKey) {
    return undefined;
  }
  try {
    return resolveVideoThemeFromSnapshot(JSON.parse(snapshotKey) as VideoThemeSnapshot, [id]);
  } catch {
    return undefined;
  }
}

function _isOptionsFrom(data: unknown, id: string): boolean {
  return typeof data === "object" && data !== null && "type" in data && data.type === "film-options" && "id" in data && data.id === id;
}

/**
 * Keeps the live player on the draft's theme: sends the item's snapshot
 * (debounced while editing, and again whenever the player reports its
 * options after loading), tracks the hash it acknowledges, and collects the
 * tokens it reports reading. Downloads wait until the player acknowledges
 * the theme the gallery expects.
 */
export function useCompositionTheme(
  options: Readonly<{ id: string; player: RefObject<HTMLIFrameElement | null>; snapshot: VideoThemeSnapshot | undefined }>,
) {
  const { id, player, snapshot } = options;
  const snapshotKey = snapshot ? JSON.stringify(snapshot) : "";
  const expected = useMemo(() => _expectedTheme(snapshotKey, id), [snapshotKey, id]);
  const [acknowledgement, setAcknowledgement] = useState<Acknowledgement>();
  const [usage, setUsage] = useState<Readonly<{ id: string; paths: readonly string[] }>>({ id, paths: [] });
  const send = useCallback(() => {
    if (snapshotKey) {
      player.current?.contentWindow?.postMessage({ type: "film-control", id, action: "theme", value: JSON.parse(snapshotKey) }, location.origin);
    }
  }, [id, player, snapshotKey]);
  useEffect(() => {
    const timer = setTimeout(send, THEME_SEND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [send]);
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== location.origin || event.source !== player.current?.contentWindow) {
        return;
      }
      const { data } = event;
      if (_isOptionsFrom(data, id)) {
        send();
      }
      if (isFilmThemeAcknowledgement(data, id)) {
        setAcknowledgement(data.type === "film-theme" ? { id, hash: data.hash, issues: [] } : { id, issues: data.issues });
      }
      if (isFilmTokensUsedMessage(data, id)) {
        setUsage({ id, paths: data.paths });
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [id, player, send]);
  return {
    isAcknowledged: expected !== undefined && acknowledgement?.id === id && acknowledgement.hash === expected.hash,
    playerIssues: acknowledgement?.id === id ? acknowledgement.issues : [],
    usedTokens: usage.id === id ? usage.paths : [],
    cameraPreset: expected?.semantic.camera.preset ?? "authored",
  };
}
```

- [ ] **Step 5: Wire the viewer, its actions, and downloads**

Replace `src/continuity/gallery/CompositionViewer/CompositionViewer.tsx` with:

```tsx
import { useLingui } from "@lingui/react/macro";
import clsx from "clsx";
import { useMemo, useRef, useState, type RefObject } from "react";
import { AtlasPanelTabs, type AtlasPanelTab } from "../../../gallery/AtlasLayout/AtlasPanelTabs/AtlasPanelTabs";
import { useGalleryVideoTheme } from "../../../gallery/GalleryVideoTheme/GalleryVideoTheme";
import { VideoThemePanel } from "../../../gallery/VideoThemePanel/VideoThemePanel";
import { createExportThemeFromDraft, createSnapshotFromDraft } from "../../../videoThemeEditor/themeDraft/themeDraft";
import { isSceneEntry } from "../../continuityCatalog";
import { useContinuityCopy } from "../../useContinuityCopy";
import { CompositionActions } from "./CompositionActions/CompositionActions";
import { CompositionControls } from "./CompositionControls";
import { CompositionSummary } from "./CompositionSummary";
import css from "./CompositionViewer.module.css";
import { useCompositionAppearance } from "./useCompositionAppearance";
import { useCompositionPlayer } from "./useCompositionPlayer";
import { useCompositionTheme } from "./useCompositionTheme";
import { VocabularyGuide } from "./VocabularyGuide/VocabularyGuide";
import type { ContinuityCatalogEntry } from "../../continuityCatalog";

type Props = {
  selected: ContinuityCatalogEntry;
  captions: boolean | undefined;
  onOptions: (options: { id: string; captions: boolean }) => void;
};

type SettingsProps = Readonly<{
  selected: ContinuityCatalogEntry;
  captions: boolean | undefined;
  player: RefObject<HTMLIFrameElement | null>;
  appearance: ReturnType<typeof useCompositionAppearance>;
  tab: AtlasPanelTab;
  onTabChange: (tab: AtlasPanelTab) => void;
}>;

function CompositionSettings({ selected, captions, player, appearance, tab, onTabChange }: SettingsProps) {
  const { t } = useLingui();
  const { library, themeId, validDraft, hasIssues } = useGalleryVideoTheme();
  const isScene = isSceneEntry(selected);
  const snapshot = useMemo(
    () => (isScene ? undefined : createSnapshotFromDraft({ library, themeId, draft: validDraft, itemId: selected.id })),
    [isScene, library, themeId, validDraft, selected.id],
  );
  const exportTheme = useMemo(
    () => createExportThemeFromDraft({ library, themeId, draft: validDraft, itemId: selected.id }),
    [library, themeId, validDraft, selected.id],
  );
  const theme = useCompositionTheme({ id: selected.id, player, snapshot });
  return (
    <AtlasPanelTabs
      tab={tab}
      onTabChange={onTabChange}
      details={
        <>
          <CompositionControls appearance={appearance} isScene={isScene} />
          <CompositionActions
            id={selected.id}
            captions={captions}
            options={appearance.options}
            isScene={isScene}
            theme={exportTheme}
            isThemeReady={isScene || (theme.isAcknowledged && !hasIssues)}
            cameraPreset={theme.cameraPreset}
          />
        </>
      }
      tokens={isScene ? undefined : <VideoThemePanel key={selected.id} item={{ id: selected.id, scopeLabel: t`This composition only` }} usedTokens={theme.usedTokens} />}
    />
  );
}

/** One live composition with matching exports, its design tokens, and reusable study guidance. */
export function CompositionViewer({ selected, captions, onOptions }: Props) {
  const translate = useContinuityCopy();
  const player = useRef<HTMLIFrameElement>(null);
  const isScene = isSceneEntry(selected);
  const appearance = useCompositionAppearance(selected.id, player, isScene);
  const [tab, setTab] = useState<AtlasPanelTab>("details");
  useCompositionPlayer({ id: selected.id, player, onOptions });
  return (
    <section className={clsx(css.compositionViewer, tab === "tokens" && !isScene && css.isTokenPanel)} aria-label={translate("Composition screening")}>
      <div className={css.stage}>
        <iframe
          key={selected.id}
          className={css.compositionViewerPlayer}
          ref={player}
          src={`/live.html?id=${encodeURIComponent(selected.id)}`}
          title={translate(selected.title)}
          onLoad={appearance.loaded}
          allowFullScreen
        />
      </div>
      <div className={css.details}>
        <CompositionSummary selected={selected} />
      </div>
      <div className={css.settings}>
        <CompositionSettings selected={selected} captions={captions} player={player} appearance={appearance} tab={tab} onTabChange={setTab} />
      </div>
      <div className={css.guidance}>
        {selected.family === "vocabulary" && <VocabularyGuide entry={selected} />}
        <CompositionNotice isScene={isScene} />
      </div>
    </section>
  );
}

function CompositionNotice({ isScene }: { isScene: boolean }) {
  const translate = useContinuityCopy();
  return (
    <p className={css.compositionViewerNotice}>
      {translate(
        isScene
          ? "Live React storyboard scenes. Fictional demonstration data. Window contents are curated fictional screenshots; figures, timings and diagrams are illustrations. Downloads render the current composition as authored."
          : "Live React compositions. Fictional demonstration data. Product states are scripted; architecture diagrams are illustrations. Plugin capabilities are future vision. Downloads render the current composition and caption selection.",
      )}
    </p>
  );
}
```

Append to `src/continuity/gallery/CompositionViewer/CompositionViewer.module.css`:

```css
/* The Design tokens tab widens the settings column, which then scrolls with the viewer. */
.compositionViewer.isTokenPanel {
  grid-template-columns: minmax(0, 1fr) 420px;
}

.isTokenPanel .settings {
  position: static;
}

@media (width <= 800px) {
  .compositionViewer.isTokenPanel {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Replace `src/continuity/gallery/CompositionViewer/CompositionActions/CompositionActions.tsx` with:

```tsx
import { useLingui } from "@lingui/react/macro";
import { useContinuityCopy } from "../../../useContinuityCopy";
import css from "./CompositionActions.module.css";
import { useCompositionDownload } from "./useCompositionDownload";
import type { ExportTheme } from "../../../../videoThemeEditor/themeDraft/themeDraft";
import type { CompositionExportOptions } from "../compositionExportOptions";

type Props = Readonly<{
  id: string;
  options: CompositionExportOptions | undefined;
  captions: boolean | undefined;
  /** Scene studies carry no narration, so they offer no transcript or captions. */
  isScene: boolean;
  /** The theme the export renders with, unsaved edits included. */
  theme: ExportTheme;
  /** The live player shows this theme, so the MP4 will match the preview. */
  isThemeReady: boolean;
  /** The camera preset in effect, which changes caption timing. */
  cameraPreset: string;
}>;

/** Explicit exports use only the options and theme the live player acknowledged. */
export function CompositionActions({ id, captions, options, isScene, theme, isThemeReady, cameraPreset }: Props) {
  const { t } = useLingui();
  const translate = useContinuityCopy();
  const download = useCompositionDownload({ id, captions, options, theme: isScene ? undefined : theme });
  const isReady = options !== undefined && isThemeReady;
  const label = download.busy
    ? translate("Preparing export…")
    : options === undefined
      ? translate("Loading preview…")
      : isThemeReady
        ? translate("Download MP4")
        : t`Applying design tokens…`;
  return (
    <div className={css.compositionActions}>
      <div className={css.compositionActionsLinks}>
        <button className={css.compositionActionsDownload} disabled={download.busy || !isReady} aria-busy={download.busy} onClick={() => void download.start()}>
          {label}
        </button>
        {!isScene && <NarrationLinks id={id} options={options} themeId={theme.id} cameraPreset={cameraPreset} />}
      </div>
      <p className={css.compositionActionsStatus} role="status">
        {translate(download.status)}
      </p>
    </div>
  );
}

/** Transcript and caption downloads, timed by the theme's camera preset. */
function NarrationLinks({
  id,
  options,
  themeId,
  cameraPreset,
}: Readonly<{ id: string; options: CompositionExportOptions | undefined; themeId: string; cameraPreset: string }>) {
  const translate = useContinuityCopy();
  const cameraMotion = options && "cameraMotion" in options ? options.cameraMotion : true;
  const captionQuery = new URLSearchParams({ theme: themeId, cameraPreset, cameraMotion: String(cameraMotion) });
  return (
    <>
      <a href={`/api/films/${encodeURIComponent(id)}/transcript.txt`} download>
        {translate("Transcript")}
      </a>
      <a href={`/api/films/${encodeURIComponent(id)}/captions.srt?${captionQuery}`} download>
        {translate("Captions")}
      </a>
    </>
  );
}
```

Replace `src/continuity/gallery/CompositionViewer/CompositionActions/useCompositionDownload.ts` with:

```ts
import { useState } from "react";
import { downloadFilm } from "../../../../../showcase/download.js";
import type { ExportTheme } from "../../../../videoThemeEditor/themeDraft/themeDraft";
import type { CompositionExportOptions } from "../compositionExportOptions";

/** On-demand rendering with the acknowledged options and theme, with progress scoped to the selected film. */
export function useCompositionDownload(options: {
  id: string;
  options: CompositionExportOptions | undefined;
  captions: boolean | undefined;
  theme: ExportTheme | undefined;
}) {
  const { id, options: appearance, theme } = options;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ id: "", message: "" });
  async function start() {
    if (busy || appearance === undefined) {
      return;
    }
    setBusy(true);
    try {
      await downloadFilm({
        id,
        options: theme ? { ...appearance, theme } : appearance,
        onStatus: (job) => setProgress({ id, message: job.message }),
      });
    } catch {
      setProgress({ id, message: "Export failed. Check the showcase terminal and retry." });
    } finally {
      setBusy(false);
    }
  }
  return { busy, status: progress.id === id ? progress.message : "", start };
}
```

- [ ] **Step 6: Show the active theme's posters**

Plan 2's `CompositionCard` already tries `assets/atlas/<themeId>/<id>.jpg`, falls back to the `classic` poster with a "Preview in classic theme" badge, and defaults `themeId` to `classic`. Pass it the active theme.

In `src/continuity/gallery/CompositionGallery/CompositionGallery.tsx`:

1. Add `import { useGalleryVideoTheme } from "../../../gallery/GalleryVideoTheme/GalleryVideoTheme";`.
2. After `  const copy = useSectionCopy(section);` add `  const { themeId } = useGalleryVideoTheme();`.
3. Replace

```tsx
            <CompositionCard
              key={entry.id}
              entry={entry}
              category={getCategoryLabel(entry.category)}
              onOpen={gallery.openEntry}
            />
```

with

```tsx
            <CompositionCard
              key={entry.id}
              entry={entry}
              category={getCategoryLabel(entry.category)}
              themeId={themeId}
              onOpen={gallery.openEntry}
            />
```

`CompositionGallery` renders inside `GalleryVideoTheme` (Task 16), so the hook has its provider.

- [ ] **Step 7: Typecheck, lint, test, and look**

Run both typecheck commands. Expected: no errors. Any remaining reference to `cameraPreset`, `annotationRoughness`, `boxRoughness`, `accent`, or `background` on a `ContinuityAppearance` is a leftover; remove it.
From `<repo>`: `pnpm exec eslint apps/ava-video-producer/src/continuity apps/ava-video-producer/src/showcase` and `pnpm exec stylelint "apps/ava-video-producer/src/continuity/**/*.css"`. Expected: no errors.

With the showcase running, open `http://localhost:4183/motion.html?section=compositions`, open Shared-object handoff, switch to Design tokens, and change Essentials Accent at theme scope. Confirm the live player recolours within a moment and Download MP4 re-enables. Under `classic` a theme-scope edit previews as the new theme saving would create, which does not inherit classic's authored per-composition accents, so every composition takes the new accent. Then switch to **This composition only**, pick a second accent, open another composition, and confirm it still shows the first. Screenshot Details and Design tokens at 1440 × 1000 and 390 × 844 into `<repo>/.temp/feat-video-improvements/`.

- [ ] **Step 8: Commit**

```bash
git add -A src/continuity scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts
git commit -m "feat(video-producer): theme compositions from the token editor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Server options and removal of the legacy bridge

**Files:**
- Create: `scripts/showcase/captionFileOptions/captionFileOptions.ts`
- Test: `scripts/showcase/captionFileOptions/captionFileOptions.test.ts`
- Modify: `scripts/showcase/server.ts`
- Modify: `scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts` and `ShowcaseFilms.test.ts`
- Create: `src/videoTheme/createSnapshotFromThemeRequest/createSnapshotFromThemeRequest.ts`
- Test: `src/videoThemeEditor/themeDraft/themeDraft.test.ts` (appended)
- Modify: `scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.ts` and `scripts/showcase/ShowcaseFilms/themedFilms.test.ts` (plan 2)
- Modify: `scripts/showcase/themeStore/themeStore.ts` and `themeStore.test.ts` (plan 1)
- Modify: `src/videoTheme/themePatches/themePatches.ts` and `themePatches.test.ts` (plan 2; the legacy function and its tests only)
- Modify: `src/continuity/camera/stockTransparency.test.ts`, `src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.test.ts`, and `scripts/videoTheme/__tests__/every-token-has-a-reader.integration.test.tsx` (plan 2's tests that call the legacy function)
- Modify: `scripts/showcase/deliveryTheme/deliveryTheme.ts` and `deliveryTheme.test.ts` (plan 2)

- [ ] **Step 1: Write the failing caption option tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getCaptionFileOptionsFromSearch } from "./captionFileOptions";

test("a theme and camera preset become a theme option for caption timing", () => {
  assert.deepEqual(getCaptionFileOptionsFromSearch(new URLSearchParams("theme=classic&cameraPreset=whip&cameraMotion=true")), {
    theme: { id: "classic", patch: { other: { video: { semantic: { camera: { preset: "whip" } } } } } },
    cameraMotion: true,
  });
});

test("without a theme the film keeps its own and only camera motion applies", () => {
  assert.deepEqual(getCaptionFileOptionsFromSearch(new URLSearchParams("cameraMotion=false")), { cameraMotion: false });
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/showcase/captionFileOptions/captionFileOptions.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 2: Implement**

`scripts/showcase/captionFileOptions/captionFileOptions.ts`:

```ts
/**
 * Film options for a transcript or caption download from its query string.
 * Caption timing depends on the camera preset, which is a theme token, so
 * `theme` and `cameraPreset` become a theme option; `ShowcaseFilms.load`
 * validates both.
 */
export function getCaptionFileOptionsFromSearch(parameters: URLSearchParams): Readonly<Record<string, unknown>> {
  const themeId = parameters.get("theme");
  const cameraPreset = parameters.get("cameraPreset");
  const cameraMotion = parameters.get("cameraMotion");
  return {
    ...(themeId
      ? {
          theme: {
            id: themeId,
            ...(cameraPreset ? { patch: { other: { video: { semantic: { camera: { preset: cameraPreset } } } } } } : {}),
          },
        }
      : {}),
    ...(cameraMotion === null ? {} : { cameraMotion: cameraMotion !== "false" }),
  };
}
```

Run the Step 1 command. Expected: 2 passing.

- [ ] **Step 3: Use it in the server and raise the export body cap**

In `scripts/showcase/server.ts`:

1. Add `import { getCaptionFileOptionsFromSearch } from "./captionFileOptions/captionFileOptions";` and add `THEME_FILE_MAX_BYTES` to the existing `./themeStore/themeStore` import.
2. After the `requestSchema` declaration, add:

```ts
/** An export body: the film id, its options, and a theme patch of up to 256 KB. */
const EXPORT_BODY_MAX_BYTES = 8192 + THEME_FILE_MAX_BYTES;
```

3. In `exportRequest`, change `if (body.length > 8192) {` to `if (body.length > EXPORT_BODY_MAX_BYTES) {`.
4. In `api()`, replace the caption branch's film load

```ts
    const film = await ShowcaseFilms.load(filmMatch[1], {
      ...(parameters.has("cameraPreset")
        ? { cameraPreset: parameters.get("cameraPreset") }
        : {}),
      ...(parameters.has("cameraMotion")
        ? { cameraMotion: parameters.get("cameraMotion") !== "false" }
        : {}),
    });
```

with:

```ts
    const film = await ShowcaseFilms.load(filmMatch[1], getCaptionFileOptionsFromSearch(parameters));
```

Plan 2's `const files = captionFiles(createContinuityPlanFromVideoThemeSnapshot(film.plan, film.theme, [film.id]));` below it stays, so caption timing follows the requested theme.

- [ ] **Step 4: Remove the legacy options and bridge**

In `scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts`:

1. Delete these entries from `optionsSchema` (the first in the form Task 19 left it):

```ts
    cameraPreset: z.enum(["authored", "deliberate", "gentle", "balanced", "brisk", "whip"]).optional(),
```

```ts
    annotationRoughness: z.number().min(0).max(3).optional(),
    boxRoughness: z.number().min(0).max(3).optional(),
```

2. Delete plan 2's bridge helper:

```ts
/** The gallery's palette, roughness, and camera preset controls for a continuity film, as theme patches. */
function _legacyThemePatches(options: z.infer<typeof optionsSchema>): VideoThemePatch[] {
  const { accent, background, annotationRoughness, boxRoughness, cameraPreset } = options;
  const legacy = { accent, background, annotationRoughness, boxRoughness, cameraPreset };
  return Object.values(legacy).some((value) => value !== undefined)
    ? [createThemePatchFromLegacyAppearance(legacy)]
    : [];
}
```

3. In `_loadFilm`, replace

```ts
    theme: addPatchesToVideoThemeSnapshot(
      await loadVideoThemeSnapshot(options.theme ?? { id: "classic" }),
      continuity ? _legacyThemePatches(options) : [],
    ),
```

with

```ts
    theme: await loadVideoThemeSnapshot(options.theme ?? { id: "classic" }),
```

4. Delete the imports plan 2 added for the bridge:

```ts
import { createThemePatchFromLegacyAppearance } from "../../../src/videoTheme/themePatches/themePatches";
import { addPatchesToVideoThemeSnapshot } from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { VideoThemePatch } from "../../../src/videoTheme/videoTheme.types";
```

Keep the `VideoThemePatch` import if anything else in the file still uses it.

5. Keep `accent` and `background`: they are public stock request fields, which `StockGraphic` applies through `createThemePatchFromStockColors`. Continuity films now reject them, so a colour sent to one fails instead of being ignored. Replace

```ts
  if (
    continuity &&
    (options.input !== undefined || options.schemaVersion !== undefined)
  )
    throw new Error("Stock input requires an Atlas preset");
```

with

```ts
  if (
    continuity &&
    (options.input !== undefined ||
      options.schemaVersion !== undefined ||
      options.accent !== undefined ||
      options.background !== undefined)
  )
    throw new Error("Continuity input and colours come from the storyboard and theme");
```

In plan 2's `src/videoTheme/themePatches/themePatches.ts`, delete the legacy part and keep the stock colour patch: delete `CameraPresetName`, `LegacyAppearance`, `_sketchProfile`, and `createThemePatchFromLegacyAppearance`, so the file reads:

```ts
import type { VideoThemePatch } from "../videoTheme.types";

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
```

In `src/videoTheme/themePatches/themePatches.test.ts`, replace

```ts
import { videoThemePatchSchema } from "../videoThemeSchema/videoThemeSchema";
import {
  createThemePatchFromLegacyAppearance,
  createThemePatchFromStockColors,
} from "./themePatches";
```

with `import { createThemePatchFromStockColors } from "./themePatches";`, and delete these three tests:

```ts
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

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/themePatches/themePatches.test.ts`
Expected: 3 passing.

Plan 2's tests that used the bridge now write the theme patch directly.

In `src/continuity/camera/stockTransparency.test.ts`, replace

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

with

```ts
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";

/** Sketches boxes at a test roughness, through an atomic step the box profile points at. */
function _withBoxRoughness(boxRoughness: number, element: ReturnType<typeof createElement>) {
  const box = {
    roughness: "$atomic.roughness.testBox",
    bowing: "$atomic.bowing.md",
    seed: "$atomic.seed.md",
    randomness: "$atomic.randomness.md",
  };
  return createElement(VideoThemeScope, {
    patches: [{ other: { video: { atomic: { roughness: { testBox: boxRoughness } }, semantic: { sketch: { box } } } } }],
    children: element,
  });
}
```

In `src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.test.ts`, delete

```ts
import { createThemePatchFromLegacyAppearance } from "../../videoTheme/themePatches/themePatches";
```

and

```ts
import type { CameraPresetName } from "../../videoTheme/themePatches/themePatches";
```

and replace

```ts
function _classicWithCamera(cameraPreset: CameraPresetName) {
  return _classicWith(createThemePatchFromLegacyAppearance({ cameraPreset }));
}
```

with

```ts
function _classicWithCamera(cameraPreset: "authored" | (typeof PRESETS)[number]) {
  return _classicWith({ other: { video: { semantic: { camera: { preset: cameraPreset } } } } });
}
```

In `scripts/videoTheme/__tests__/every-token-has-a-reader.integration.test.tsx`, delete

```ts
import { createThemePatchFromLegacyAppearance } from "../../../src/videoTheme/themePatches/themePatches";
```

and replace

```ts
    const patch = createThemePatchFromLegacyAppearance({ cameraPreset });
```

with

```ts
    const patch = { other: { video: { semantic: { camera: { preset: cameraPreset } } } } };
```

Then check that nothing still reaches the bridge:

```bash
grep -rn "createThemePatchFromLegacyAppearance\|LegacyAppearance\|CameraPresetName\|legacyAnnotation\|legacyBox" src scripts tests
```

Expected: no matches.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/continuity/camera/stockTransparency.test.ts src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.test.ts scripts/videoTheme/__tests__/every-token-has-a-reader.integration.test.tsx`
Expected: all pass.

- [ ] **Step 5: Update the film loading tests**

Run: `grep -n "annotationRoughness\|boxRoughness\|cameraPreset" scripts/showcase/ShowcaseFilms/ShowcaseFilms.test.ts`

For each match:
- Delete `annotationRoughness` and `boxRoughness` from the options a case passes, and delete the assertions on `shot.props.annotationRoughness` and `shot.props.boxRoughness`.
- Replace `cameraPreset: "<name>"` with `theme: { id: "classic", patch: { other: { video: { semantic: { camera: { preset: "<name>" } } } } } }`.
- In a continuity case that passes `accent` or `background`, move the colour into the theme patch as a swatch (`{ other: { video: { atomic: { swatch: { ground: "#ffffff" } } } } }`) and assert on the film's theme instead of `shot.props.accent`.

Add a case:

```ts
test("continuity films refuse colour options; colours come from the theme", async () => {
  await assert.rejects(ShowcaseFilms.load("shared-object-handoff", { accent: "#ff0000" }), /theme/);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/showcase/ShowcaseFilms/ShowcaseFilms.test.ts`
Expected: every case passes except the three that failed before plan 1 (missing `helperCatalog` in the temp copy).

- [ ] **Step 6: Make exports follow the draft rule**

An export sends `theme: { id, patch }` with the saved base id. On a built-in theme the server must resolve that patch against the same unsaved theme the preview used, or the MP4 and its hash would differ from the preview.

Append to `src/videoThemeEditor/themeDraft/themeDraft.test.ts`. Add the `createSnapshotFromThemeRequest` import to the top of the file, `resolveVideoThemeFromSnapshot` to its `videoThemeSnapshot` import, `type ThemeDraft` to its `./themeDraft` import, and `VideoThemeLibrary` to its `videoTheme.types` import:

```ts
import { createSnapshotFromThemeRequest } from "../../videoTheme/createSnapshotFromThemeRequest/createSnapshotFromThemeRequest";

function _exportAndPreviewHashes(library: VideoThemeLibrary, themeId: string, draft: ThemeDraft) {
  const target = { library, themeId, draft, itemId: "network-graph" };
  const exported = createExportThemeFromDraft(target);
  const exportSnapshot = createSnapshotFromThemeRequest({ library, id: exported.id, patch: exported.patch });
  return [
    resolveVideoThemeFromSnapshot(exportSnapshot, ["network-graph"]).hash,
    resolveVideoThemeFromSnapshot(createSnapshotFromDraft(target), ["network-graph"]).hash,
  ];
}

const EXPORT_DRAFT = setTokenInDraft(
  setTokenInDraft(EMPTY_THEME_DRAFT, THEME, "color.accent", "$atomic.swatch.cyan"),
  ITEM,
  "stroke.default",
  "$atomic.strokeWidth.lg",
);

test("an export of a built-in theme's draft resolves to the same hash as its preview", () => {
  const [exported, preview] = _exportAndPreviewHashes(CLASSIC_WITH_OVERRIDE, "classic", EXPORT_DRAFT);
  assert.equal(exported, preview);
});

test("an export of a custom theme's draft resolves to the same hash as its preview", () => {
  const [exported, preview] = _exportAndPreviewHashes(LIBRARY, "studio", EXPORT_DRAFT);
  assert.equal(exported, preview);
});
```

`resolveVideoThemeFromSnapshot` is the resolution the film root and `delivery.json` use, so equal hashes mean the MP4 shows the preview.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoThemeEditor/themeDraft/themeDraft.test.ts`
Expected: FAIL, `createSnapshotFromThemeRequest` not found.

Create `src/videoTheme/createSnapshotFromThemeRequest/createSnapshotFromThemeRequest.ts`:

```ts
import { createDraftThemeTarget } from "../createDraftThemeTarget/createDraftThemeTarget";
import { createVideoThemeSnapshot, type VideoThemeSnapshot } from "../videoThemeSnapshot/videoThemeSnapshot";
import type { VideoThemeLibrary, VideoThemePatch } from "../videoTheme.types";

/**
 * The snapshot a server render takes from a saved theme id and an unsaved
 * patch, under the same draft rule as the gallery preview (see
 * `createDraftThemeTarget`): a patch on a built-in theme renders as the
 * unsaved theme saving would create, so an MP4 matches its preview and
 * hash. Used by `loadVideoThemeSnapshot` for exports and showcase films.
 */
export function createSnapshotFromThemeRequest(
  options: Readonly<{ library: VideoThemeLibrary; id: string; patch?: VideoThemePatch }>,
): VideoThemeSnapshot {
  const patches = options.patch && Object.keys(options.patch).length > 0 ? [options.patch] : [];
  const target = createDraftThemeTarget({ library: options.library, themeId: options.id, hasDraft: patches.length > 0 });
  return createVideoThemeSnapshot(target.library, target.themeId, patches);
}
```

Run the test command again. Expected: 19 passing.

In plan 2's `scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.ts`, change the snapshot import from

```ts
import {
  createVideoThemeSnapshot,
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
```

to

```ts
import { createSnapshotFromThemeRequest } from "../../../src/videoTheme/createSnapshotFromThemeRequest/createSnapshotFromThemeRequest";
import {
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
```

and replace

```ts
  const snapshot = createVideoThemeSnapshot(library, request.id, patches);
```

with

```ts
  const snapshot = createSnapshotFromThemeRequest({ library, id: request.id, patch: patches[0] });
```

In plan 2's `scripts/showcase/ShowcaseFilms/themedFilms.test.ts`, add `import { DRAFT_THEME_ID } from "../../../src/videoTheme/createDraftThemeTarget/createDraftThemeTarget";` and replace

```ts
test("a film carries the requested theme and its draft patch", async () => {
  const patch = { other: { video: { atomic: { swatch: { ground: "#201510" } } } } };
  const film = await ShowcaseFilms.load("stock-network-graph", { theme: { id: "avandar", patch } });
  assert.equal(film.theme?.themeId, "avandar");
  assert.deepEqual(film.theme?.patches, [patch]);
});
```

with

```ts
test("a draft on a built-in theme renders as the unsaved theme that extends it", async () => {
  const patch = { other: { video: { atomic: { swatch: { ground: "#201510" } } } } };
  const film = await ShowcaseFilms.load("stock-network-graph", { theme: { id: "avandar", patch } });
  assert.equal(film.theme?.themeId, DRAFT_THEME_ID);
  assert.deepEqual(
    film.theme?.documents.map((document) => document.extends),
    ["avandar"],
  );
  assert.deepEqual(film.theme?.patches, [patch]);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.test.ts scripts/showcase/ShowcaseFilms/themedFilms.test.ts`
Expected: all passing. A film made from a built-in theme's draft now carries the theme id `unsaved-draft`; Step 7 keeps that id out of `delivery.json`.

- [ ] **Step 7: Record the saved theme of a draft export**

Plan 2's `getDeliveryThemeFromFilm` records `film.theme.themeId`, which for a built-in theme's draft is the reserved `unsaved-draft`. Record the saved theme the export started from, and flag every export that carries unsaved edits.

In plan 2's `scripts/showcase/deliveryTheme/deliveryTheme.test.ts`, put the imports below at the top of the file (the first replaces its `videoThemeSnapshot` import) and append the rest:

```ts
import {
  createVideoThemeSnapshot,
  resolveVideoThemeFromSnapshot,
} from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { createSnapshotFromThemeRequest } from "../../../src/videoTheme/createSnapshotFromThemeRequest/createSnapshotFromThemeRequest";
import type { VideoThemeDocument } from "../../../src/videoTheme/videoTheme.types";

const GROUND = { other: { video: { atomic: { swatch: { ground: "#201510" } } } } };
const WARM: VideoThemeDocument = { schemaVersion: 1, id: "warm", label: "Warm", extends: "classic" };

test("a built-in theme's draft records the built-in it extends and marks the draft", () => {
  const theme = createSnapshotFromThemeRequest({ library: BUILT_IN_VIDEO_THEMES, id: "avandar", patch: GROUND });
  const delivery = getDeliveryThemeFromFilm({ id: "occlusion-wipe", theme });
  assert.deepEqual([delivery.themeId, delivery.themeDraft], ["avandar", true]);
});

test("a custom theme's draft records the custom theme and marks the draft", () => {
  const theme = createVideoThemeSnapshot(createVideoThemeLibrary([WARM]), "warm", [GROUND]);
  const delivery = getDeliveryThemeFromFilm({ id: "occlusion-wipe", theme });
  assert.deepEqual([delivery.themeId, delivery.themeDraft], ["warm", true]);
});

test("a saved theme records no draft", () => {
  const theme = { themeId: "avandar", documents: [], patches: [] };
  assert.equal("themeDraft" in getDeliveryThemeFromFilm({ id: "occlusion-wipe", theme }), false);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/showcase/deliveryTheme/deliveryTheme.test.ts`
Expected: FAIL on the two draft tests (`themeId` is `unsaved-draft` and `themeDraft` is undefined).

Replace plan 2's `scripts/showcase/deliveryTheme/deliveryTheme.ts`, which reads

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

with

```ts
import { DRAFT_THEME_ID } from "../../../src/videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import {
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { Film } from "../../../src/showcase/showcase.types";

// A built-in theme's draft renders as the unsaved theme that extends it, so
// the saved theme it started from is that theme's `extends`.
function _savedThemeId(snapshot: VideoThemeSnapshot | undefined): string {
  if (snapshot?.themeId !== DRAFT_THEME_ID) {
    return snapshot?.themeId ?? "classic";
  }
  return snapshot.documents.find((document) => document.id === DRAFT_THEME_ID)?.extends ?? DRAFT_THEME_ID;
}

/**
 * The theme an export rendered, for its `delivery.json`: the saved theme it
 * started from, the resolved hash (which matches the hash the live player
 * acknowledged for the same draft), and `themeDraft: true` when unsaved
 * edits were applied on top of that theme.
 */
export function getDeliveryThemeFromFilm(
  film: Pick<Film, "id" | "theme">,
): Readonly<{ themeId: string; themeHash: string; themeDraft?: true }> {
  const hasDraft =
    film.theme !== undefined && (film.theme.themeId === DRAFT_THEME_ID || film.theme.patches.length > 0);
  return {
    themeId: _savedThemeId(film.theme),
    themeHash: resolveVideoThemeFromSnapshot(film.theme, [film.id]).hash,
    ...(hasDraft ? { themeDraft: true as const } : {}),
  };
}
```

Run the test command again. Expected: 5 passing. `render.ts` spreads the result into `delivery.json`, so it needs no change.

- [ ] **Step 8: Reserve the draft theme id**

Append to plan 1's `scripts/showcase/themeStore/themeStore.test.ts`:

```ts
test("the reserved draft theme id cannot be created", () =>
  _withStore(async (store) => {
    assert.equal(await _statusOf(store.create({ ...WARM, id: "unsaved-draft" })), 400);
  }));
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/showcase/themeStore/themeStore.test.ts`
Expected: FAIL, status 200 (the store writes `unsaved-draft.theme.json`).

In `scripts/showcase/themeStore/themeStore.ts`, after the import

```ts
import {
  BUILT_IN_VIDEO_THEME_IDS,
  createVideoThemeLibrary,
} from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
```

add

```ts
import { DRAFT_THEME_ID } from "../../../src/videoTheme/createDraftThemeTarget/createDraftThemeTarget";
```

and change the start of `create` from

```ts
    create: async (value) => {
      const document = _parse(value);
      const text = _serializeWithinCap(document);
```

to

```ts
    create: async (value) => {
      const document = _parse(value);
      if (document.id === DRAFT_THEME_ID) {
        throw new ThemeStoreError(400, "That theme id is reserved for unsaved edits. Choose another name.");
      }
      const text = _serializeWithinCap(document);
```

Run the store test command again. Expected: all passing. Save as new theme never asks for this id: `buildThemeIdFromLabel` skips it (Task 2).

- [ ] **Step 9: Typecheck and commit**

Run both typecheck commands. Expected: no errors.

```bash
git add -A scripts/showcase scripts/videoTheme src/videoTheme src/videoThemeEditor/themeDraft src/continuity
git commit -m "refactor(video-producer): carry themes through exports under the draft rule and drop the legacy appearance bridge" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: End-to-end specs

**Files:**
- Create: `tests/e2e/design-tokens.spec.ts`
- Modify: `tests/e2e/composition-appearance.spec.ts`
- Modify: `playwright.motion.config.ts`

- [ ] **Step 1: Write the specs**

`tests/e2e/design-tokens.spec.ts`:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Spec §5.3: editing design tokens from the Atlas modals. Drafts live in each
 * test's fresh browser storage; the one file a test creates is deleted in
 * `finally`.
 */

const THEMES_DIRECTORY = path.join(process.cwd(), "themes");

async function _openFirstMotionTokens(page: Page): Promise<Locator> {
  await page.goto("/motion.html");
  await page.getByRole("button", { name: /^Explore / }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Design tokens" }).click();
  return dialog;
}

async function _setEssentialAccent(dialog: Locator, color: string): Promise<void> {
  const accent = dialog.getByRole("region", { name: "Essentials" }).locator('[data-token-path="color.accent"]');
  await accent.getByRole("button", { name: "Custom value" }).click();
  const input = accent.getByRole("textbox", { name: "Custom Accent" });
  await input.fill(color);
  await input.press("Enter");
}

function _strokesIn(scope: Locator, color: string): Locator {
  return scope.locator(`svg [stroke="${color}"]`);
}

test("changing the accent in Essentials updates a motion thumbnail and the modal player", async ({ page }) => {
  const dialog = await _openFirstMotionTokens(page);
  await _setEssentialAccent(dialog, "#ff0000");
  await expect(_strokesIn(dialog.locator(".dialog-canvas"), "#ff0000").first()).toBeAttached();
  await expect(_strokesIn(page.locator(".motion-card").first(), "#ff0000").first()).toBeAttached();
});

test("a theme-scope accent edit recolours a composition's live player", async ({ page }) => {
  await page.goto("/motion.html?section=compositions");
  await page.getByRole("button", { name: "Explore Shared-object handoff" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Design tokens" }).click();
  await _setEssentialAccent(dialog, "#ff00ff");
  await expect(page.frameLocator("iframe").locator('[stroke="#ff00ff"], [fill="#ff00ff"]').first()).toBeAttached();
});

test("an item override changes only that item, and its reset clears it", async ({ page }) => {
  const dialog = await _openFirstMotionTokens(page);
  await dialog.getByText("This motion only", { exact: true }).click();
  await _setEssentialAccent(dialog, "#00ff00");
  const cards = page.locator(".motion-card");
  await expect(_strokesIn(dialog.locator(".dialog-canvas"), "#00ff00").first()).toBeAttached();
  await expect(_strokesIn(cards.nth(0), "#00ff00").first()).toBeAttached();
  await expect(cards.nth(1).locator("svg").first()).toBeAttached();
  await expect(_strokesIn(cards.nth(1), "#00ff00")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Reset Accent" }).first().click();
  await expect(_strokesIn(dialog.locator(".dialog-canvas"), "#00ff00")).toHaveCount(0);
});

test("save as new theme writes a theme file", async ({ page }) => {
  const label = `E2E temporary ${Date.now()}`;
  const file = path.join(THEMES_DIRECTORY, `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.theme.json`);
  try {
    const dialog = await _openFirstMotionTokens(page);
    await _setEssentialAccent(dialog, "#123456");
    await dialog.getByRole("button", { name: "Save as new theme" }).click();
    await dialog.getByRole("textbox", { name: "New theme name" }).fill(label);
    await dialog.getByRole("button", { name: "Create theme" }).click();
    await expect.poll(() => fs.access(file).then(() => true, () => false)).toBe(true);
    expect(JSON.parse(await fs.readFile(file, "utf8"))).toMatchObject({ extends: "classic", label });
  } finally {
    await fs.rm(file, { force: true });
  }
});

test("a draft survives a reload", async ({ page }) => {
  let dialog = await _openFirstMotionTokens(page);
  await _setEssentialAccent(dialog, "#abcdef");
  await expect(dialog.getByText("Unsaved changes")).toBeVisible();
  await page.reload();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Design tokens" }).click();
  await expect(dialog.getByText("Unsaved changes")).toBeVisible();
  await expect(_strokesIn(dialog.locator(".dialog-canvas"), "#abcdef").first()).toBeAttached();
});

test("a download waits for the player to acknowledge the theme, then carries it", async ({ page }) => {
  let exportPayload: unknown;
  let releaseFilm = () => {};
  const filmHeld = new Promise<void>((resolve) => {
    releaseFilm = resolve;
  });
  await page.route("**/api/films/shared-object-handoff", async (route) => {
    await filmHeld;
    await route.continue();
  });
  await page.route("**/api/exports", async (route) => {
    exportPayload = route.request().postDataJSON();
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Intercepted test export" }) });
  });
  await page.goto("/motion.html?section=compositions");
  await page.getByRole("button", { name: "Explore Shared-object handoff" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Design tokens" }).click();
  await _setEssentialAccent(dialog, "#ff00ff");
  await dialog.getByRole("tab", { name: "Details" }).click();
  await expect(dialog.getByRole("button", { name: /^(Loading preview…|Applying design tokens…)$/ })).toBeDisabled();
  releaseFilm();
  const download = dialog.getByRole("button", { name: "Download MP4", exact: true });
  await expect(download).toBeEnabled();
  await download.click();
  await expect
    .poll(() => exportPayload)
    .toMatchObject({
      id: "shared-object-handoff",
      options: {
        theme: {
          id: "classic",
          patch: {
            other: {
              video: {
                atomic: { swatch: { customColorAccent: "#ff00ff" } },
                semantic: { color: { accent: "$atomic.swatch.customColorAccent" } },
              },
            },
          },
        },
      },
    });
});

test("built-in themes offer only Save as new theme", async ({ page }) => {
  const dialog = await _openFirstMotionTokens(page);
  await expect(dialog.getByRole("button", { name: "Save as new theme" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
});
```

- [ ] **Step 2: Remove the specs for controls that became tokens**

In `tests/e2e/composition-appearance.spec.ts`, delete the test `"independent roughness levels persist and reach the export request"`, the `["compositions", "films"].forEach(...)` block (camera presets persist, reach the live player and match exports), and the test `"camera preset menus explain settings and feel without changing selection"`. Then delete `import { selectAtlasOption } from "./helpers/selectAtlasOption";` (nothing else uses it). The roughness and camera preset are edited and exported as tokens now, which `design-tokens.spec.ts` covers.

In `playwright.motion.config.ts`, add `"design-tokens.spec.ts",` to `testMatch`.

- [ ] **Step 3: Run each spec on its own**

Start the showcase: `PORT=4183 pnpm showcase`. Then, one at a time:

```bash
pnpm exec playwright test -c playwright.motion.config.ts design-tokens.spec.ts
pnpm exec playwright test -c playwright.motion.config.ts composition-appearance.spec.ts
pnpm exec playwright test -c playwright.motion.config.ts motion-navigation.spec.ts
```

Expected: all pass. `motion-content.spec.ts` cannot load before this plan (no YAML loader) and is not run.

Confirm the save-as-new test left nothing behind: `git status --short themes` prints nothing.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e playwright.motion.config.ts
git commit -m "test(video-producer): cover token editing, overrides, saving, drafts, and themed exports end to end" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: Documentation

**Files:**
- Create: `docs/video-theme.md`
- Modify: `<repo>/docs/video-producer-nomenclature.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write the theme guide**

`docs/video-theme.md`:

````markdown
# Video themes

Every visual and animation value a motion or composition draws comes from a video theme: colours, type, strokes, corners, shadows, glows, sketch, layout, motion timing, and camera. Themes are JSON files in `themes/`. Change a look by changing a theme, never by adding a literal to a renderer.

## Tiers

| Tier | Lives at | Holds | Example |
| --- | --- | --- | --- |
| Mantine | top-level keys (`colors`, `fontSizes`, `radius`, `spacing`, `headings`, `primaryShade`, ...) | Literal values, exactly where Mantine expects them | `"fontSizes": { "md": "16px" }` |
| Atomic | `other.video.atomic` | Literal scales: swatches, stroke widths, opacities, durations, curves, shadows, sketch settings | `"strokeWidth": { "sm": 2 }` |
| Semantic | `other.video.semantic` | References only, named by meaning | `"accent": "$primary"`, `"caption": { "size": "$fontSizes.lg", ... }` |
| Component | `components.<Name>.defaultProps` | A reference, or a deliberate one-off literal, per themed shape | `"ProgressBar": { "defaultProps": { "height": 3 } }` |

The token catalog in `src/videoTheme/tokenCatalog/` lists every token with its label, description, unit, range, and editor control. A token exists only when a renderer reads it.

## References

A reference is `$` followed by a path:

- `$atomic.<scale>.<key>` reads an atomic value, such as `$atomic.swatch.mint`.
- `$colors.primary.4`, `$fontSizes.md`, `$headings.sizes.h2.fontSize` read Mantine keys.
- `$primary` reads the primary palette at the primary shade: `primaryShade.dark` on a dark ground, `primaryShade.light` on a light one.
- Anything else reads a semantic token, such as `$color.text` or `$sketch.profile.smooth`.

A colour may be `{ "onDark": "$...", "onLight": "$..." }`; the ground's luminance against `luminanceThreshold` picks one. Lengths are pixels of the surface that draws them: the graphic (960 × 600) or the stage (1600 × 840). Durations are frames at 30 fps. Graphic text accepts only fonts with measured glyph widths (Arial, Courier New).

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

- A theme that names `extends` may be sparse; one without it must define every token.
- `overrides` holds per-item art direction keyed by Atlas id. It applies to the theme that declares it and is not inherited by themes that extend it.
- Inside a composition, a nested preset's override applies first and the composition's override wins.
- `classic` is today's look. `avandar` is generated from the product theme by `pnpm theme:sync-avandar`; never edit it by hand.
- `unsaved-draft` is reserved for unsaved edits to a built-in theme; no theme file may use it.

## Making a theme in the Atlas

1. Open a motion or composition, then the **Design tokens** tab.
2. Edit **Essentials** first: accent, ground, text, stage font, default stroke, panel corners, tempo, and box sketch. The previews and cards update as you type.
3. Switch the scope to **This motion only** or **This composition only** for art direction that belongs to one item. A dot marks an edited token; reset it from its row.
4. Drafts are kept in your browser across reloads. **Save as new theme** writes `themes/<id>.theme.json`; **Save** updates a custom theme; built-in themes are read-only.

   Previews always show exactly what saving would produce. Edits to a custom theme preview as that theme: its per-item overrides still outrank theme-wide edits, as they will once saved. Edits to a built-in theme preview as the new theme **Save as new theme** would create. That theme extends the built-in but does not inherit its per-item overrides, so a theme-wide accent edit on `classic` recolours every composition, including those whose accent `classic` sets per composition. Downloads of a built-in theme's draft render the same way. Every download's `delivery.json` records the saved theme it started from as `themeId`, its resolved `themeHash`, and `"themeDraft": true` when unsaved edits were applied.
5. **Copy theme JSON** copies the theme as it would be saved.
6. Downloads render with the theme the preview shows, unsaved edits included. A composition's download waits until its live player has applied the theme.

## Making a theme with `/impeccable`

1. Read the JSON Schema at `GET /api/themes/schema.json` on the running showcase. Every token carries its title, description, unit, range, surface, and editor control.
2. Write a sparse theme that `extends: "classic"` and sets the atomic swatches, Mantine palettes and type scale, and the semantic references the design calls for. Keep graphic text on measured fonts and every text role at WCAG AA against its ground.
3. Save it with `POST /api/themes` (or as a file in `themes/`). The server rejects schema errors, broken references, and cycles, and reports each by token path.
4. Open the Atlas with `?theme=<id>`, review it in the Design tokens tab, and render posters with `pnpm atlas:posters --theme <id>`.

## Checks

- `pnpm theme:parity compare` proves `classic` still renders today's pixels.
- `src/videoTheme/textContrast/textContrast.test.ts` holds every text role to AA on dark and light grounds.
````

- [ ] **Step 2: Add the terms to the nomenclature**

In `<repo>/docs/video-producer-nomenclature.md`, add these rows to the Summary table after the `Reenactment` row:

```markdown
| Theme | A JSON file of design tokens that sets how every motion and composition looks and moves | Whole look | `apps/ava-video-producer/themes/`; the Atlas **Design tokens** tab |
| Design token | One named visual or animation value in a theme | Value | The token catalog in `src/videoTheme/tokenCatalog/` |
| Override | Per-item art direction a theme applies to one Atlas id | Part of a theme | A theme's `overrides` |
```

and add this section before `## Reserved and avoided words`:

```markdown
## Design tokens

A **theme** holds every value a motion or composition draws. Its values are **design tokens**, in three tiers:

| Term | What it is | Example |
| --- | --- | --- |
| Atomic token | A literal value with no meaning of its own, in a scale | `atomic.strokeWidth.sm` is 2 px |
| Semantic token | A reference named by meaning; holds no literal | `color.accent`, `text.graphic.caption` |
| Component token | One themed shape's default, a reference or a deliberate one-off | `components.ProgressBar.height` |

An **override** is per-item art direction inside a theme, keyed by Atlas id. It is never inherited by a theme that extends the one declaring it. Say "token" for these values; a continuity object that travels between motions is a **shared object**, never a token. See `apps/ava-video-producer/docs/video-theme.md`.
```

- [ ] **Step 3: Point the app guide at both**

In `AGENTS.md`, after the bullet that begins "Use the terms in [the video producer nomenclature]", add:

```markdown
- Read [docs/video-theme.md](docs/video-theme.md) before changing a colour, font, stroke, corner, shadow, glow, sketch, layout, timing, or camera value in a renderer. Every such value comes from the video theme: add or reuse a token, never a literal. The design-token terms are in the nomenclature above.
```

- [ ] **Step 4: Commit**

```bash
git add docs/video-theme.md AGENTS.md ../../docs/video-producer-nomenclature.md
git commit -m "docs(video-producer): document video themes and their terms" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: Verify the editor

- [ ] **Step 1: Unit tests**

Run: `pnpm test`
Expected: every new test passes. The only failures are the four that failed before plan 1 (three in `ShowcaseFilms.test.ts`, one in `editor-controls.test`). Fix anything else.

- [ ] **Step 2: Typecheck, lint, format, and messages**

Run: `pnpm typecheck`. Expected: no errors.
From `<repo>`: `pnpm format`, then `pnpm exec eslint apps/ava-video-producer/src apps/ava-video-producer/scripts apps/ava-video-producer/tests` and `pnpm lint:css`. Expected: no new errors.
Run: `pnpm gallery:messages`. Expected: it completes; commit any catalog changes.

- [ ] **Step 3: Parity still holds**

Run: `pnpm theme:parity compare`
Expected: no unexplained differences. This plan changes no renderer; previews and exports with an empty draft must match plan 2's output.

- [ ] **Step 4: End-to-end, one spec at a time**

Run the three specs from Task 21 Step 3 again on a fresh `PORT=4183 pnpm showcase`. Expected: all pass, and `git status --short themes` prints nothing afterwards.

- [ ] **Step 5: Look at the shipped surface**

With the Playwright MCP, headless: open the Motions and Compositions modals at 1440 × 1000 and 390 × 844; screenshot the Design tokens tab with Essentials open, a semantic section open, an item-scope override, an issue state (point `color.accent` at a missing swatch through a custom reference), and the changed-on-disk banner (edit `themes/<custom>.theme.json` on disk while a draft is open). Save them in `<repo>/.temp/feat-video-improvements/`. Compare against `docs/design/video-token-editor.md`; run impeccable's `critique` on the panel and fix every material finding before finishing.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A src scripts tests docs showcase
git commit -m "chore(video-producer): polish the token editor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Skip the commit when there is nothing to add.
