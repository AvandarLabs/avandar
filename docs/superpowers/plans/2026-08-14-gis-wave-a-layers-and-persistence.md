# GIS Wave A: layers made real Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-layer prototype chrome into the designed GIS shell: a full-bleed map with a floating layer stack, a sectioned layer inspector, real map furniture, and a persisted, shareable `maps` resource that holds an ordered multi-layer stack.

**Architecture:** `AvaMap` becomes a Supabase row (`public.maps`) whose `config jsonb` holds a versioned `AvaMapConfig` (basemap, camera, bookmarks, ordered `MapLayer[]`). The React layer splits in two: `useAvaMapEditor` owns the config and autosaves it, and a Direction C shell (`MapShell`) floats every panel over a map that always fills the content area. Rendering keeps Phase 1's pure pipeline and gains a stack: one query per layer via `useQueries`, one cached `FeatureCollection` per layer, one merged `MapSpec`, one `syncMap`.

**Tech Stack:** TypeScript, React 19, MapLibre GL JS, DuckDB-WASM (via `WorkspaceQetlClient`), TanStack Query, Mantine 8, `@dnd-kit/react`, Lingui, Zod, Vitest, pgTAP, Playwright, Supabase declarative schema.

**Specs:**

- `docs/superpowers/specs/2026-08-12-gis-avamap-design.md` — §6 (permissions), §7 (persistence), §8 (module layout), §10 (feature inventory), §11 (Wave A scope), §12 (testing).
- `docs/superpowers/specs/2026-08-12-gis-shell-design.md` — §3 (Direction C), §4 (flows), §5 (states), §6 (color and legends), §8 (responsive and theme), §9 (accessibility), §10 (component inventory, Wave column = A).
- `docs/design/gis/feature-home-inventory.md` — every feature's home, and §6's current-state findings.
- `docs/design/gis/shell-prototype.html` — the published prototype. **Every CSS value in this plan is copied from it.** When a value here and a value there disagree, the prototype wins; open it and check.

**Preceded by:** `docs/superpowers/plans/2026-08-12-gis-avamap-core-refactor.md` (Phase 1, landed) and `docs/superpowers/plans/2026-08-12-gis-app-type-permissions.md` (the `gis` app_type, landed: see migrations `20260814010030`–`20260814010032`).

---

## Conventions this plan follows

Read these before Task 1. They are not negotiable and reviewers enforce them.

- **`AGENTS.md`**, **`docs/rules/typescript.md`**, **`docs/rules/testing.md`**, **`docs/rules/css.md`**, **`docs/rules/i18n.md`**, **`docs/rules/sql.md`**, **`docs/rules/e2e-testing.md`**. The four that bite most often in this plan:
  - **Naming a conversion.** Only four shapes: `[Receiver].to[Target]`, `[Receiver].from[Source]`, `make[Target]From[Source]`, `get[Target]From[Source]`. Never `resolve*`, never `compute*`, never a free function starting with `to`.
  - **Copy functions carry no prefix** and live in `shared/copy/`: `appLabel(app)`, `resourceTypeLabel(type)`.
  - **No tautological tests.** Never assert `typeof x === "function"` or `toBeDefined()` on a non-nullable. Assert values, side effects, error paths. Prefer `it.todo` over a placeholder.
  - **Never pass `t` across a function boundary.** Pass `i18n` and use `msg` if a string has to be picked at runtime.
- **The directory on disk is `src/views/GISApp/`, and the import alias is `@/views/GisApp/`.** macOS is case-insensitive, so both resolve; the repo's existing imports all use `GisApp` and ESLint's import resolver is happy with it. Match the existing files exactly: file paths in this plan use `GISApp`, import specifiers use `GisApp`. Do not "fix" one to match the other.
- **Import extensions are location-dependent.** `shared/**` writes explicit `.ts` suffixes (it also runs under Deno); `src/**` must not (`import-x/extensions` rejects them there).
- **Models are imported through their namespace entry** (`$/models/AvaMap/AvaMap.ts`), never through `*.types.ts`, except from inside the model's own folder.
- **Non-exported top-level helpers take a `_` prefix.** The code blocks below already show the prefix where it applies.
- **`uuid()` needs its brand:** `uuid<MapBookmarkId>()`, never bare `uuid()`.
- **Styling is CSS Modules.** Class selectors are camelCase with optional BEM `__element` / `--modifier` suffixes, and **properties are in alphabetical order** (`stylelint.config.js` enforces `order/properties-alphabetical-order`). Every CSS block below is already alphabetised; keep it that way when you edit.
- **Never inline `style={}`** unless the value is computed at runtime (a swatch's `backgroundColor` is; a layout width is not).
- **Line length is capped at 80 characters** by ESLint `max-len`, comments included. Some blocks below exceed it inside a docstring. Rewrap to fit; do not change the wording and do not add an eslint-disable.
- **Run `npx prettier --write <files>` and `npx eslint --fix <files>` before committing each task.**

## Commands

| Purpose                                       | Command                                  |
| --------------------------------------------- | ---------------------------------------- |
| Run one test file                             | `pnpm test:frontend <path-substring>`    |
| Run all frontend + model tests                | `pnpm test:frontend`                     |
| Type check                                    | `pnpm type-check`                        |
| Lint (TS + CSS)                               | `pnpm lint`                              |
| Generate a migration from `supabase/schemas/` | `pnpm db:new-migration <name>`           |
| Apply migrations locally                      | `pnpm db:apply-migrations`               |
| Regenerate DB types                           | `pnpm db:gen-types`                      |
| Database tests                                | `pnpm test:db`                           |
| One e2e spec                                  | `pnpm test:e2e tests/e2e/<name>.spec.ts` |
| Extract i18n messages                         | `pnpm i18n:extract`                      |

> **Local Supabase is shared across every worktree.** One Docker stack serves every checkout, so another session's `db diff` can silently revert your migrations. After `pnpm db:apply-migrations`, confirm `public.maps` exists before moving on (Task 6, Step 8).

## Deviations from the specs (deliberate, with rationale)

1. **`AvaMap` becomes the persisted row; the config gets its own name.** Spec §7 stores "the versioned `AvaMap` config" inside `maps.config`, so one symbol cannot be both the row and the thing inside it. Phase 1's `AvaMapRead` is renamed `AvaMapConfigRead` (namespace `AvaMapConfig`), and `AvaMap` is rebuilt as a `SupabaseCrudModelSpec` row model exactly like `Dashboard`. Task 1 is that rename and nothing else.
2. **Layer reorder ships with both a pointer path and a keyboard path.** `@dnd-kit/react@0.1.18` is already resolved in `pnpm-lock.yaml` as a transitive dependency of `@puckeditor/core`, so it is promoted to a direct dependency at that exact version rather than introducing a new resolution. The keyboard path is `Alt`+`ArrowUp` / `Alt`+`ArrowDown` on the focused layer select button, which answers shell design §11 open question 5. Both write through one model primitive, `AvaMapConfig.withStackOrder`.
3. **No `hasSpatial()` capability probe.** Same reasoning as the Phase 1 plan's deviation 1: Wave A ships no spatial-dependent symbology, so nothing consumes the probe and a getter with no caller is dead code. Cluster and Heat are `aria-disabled` with the "arrives in a later release" reason (shell design §4.2, row 1), never the spatial reason. The tri-state probe lands with the first spatial binding, in Wave B.
4. **`maps.is_public` and `maps.slug` are created but inert.** Spec §7 lists both columns, so they exist and carry the same partial unique index dashboards use. There is deliberately **no anon SELECT policy and no public map route**: nothing may read a map without authenticating until Wave E adds the embed. `util__auth_user_may_select_map` therefore has no `is_public` short-circuit. The schema file records this so Wave E knows where to look.
5. **The boundary disclaimer is copy, not a config field.** Shell design §5.5 makes it editable, but §10.6's model-gap list does not include it and its editor is the Wave E export sheet. Wave A renders the default from `shared/copy/mapDisclaimer.ts`. Adding a persisted field with no writer would be a field nobody can change.
6. **`PopupConfig.action`'s shape is this plan's choice.** §10.6 names the gap ("`PopupConfig` action field"), not the shape. It is one optional link: a label plus a URL template whose `{columnName}` placeholders are filled from the clicked feature's properties.
7. **The partial-mapping status card has no action in Wave A.** Shell design §5.2 gives it a "See why" button that opens the coordinate validation report, and §10.5 puts `ValidationReport` in Wave C. The card renders its title and its largest reason with no button, rather than shipping a button that opens nothing.
8. **`useMapLayerData` (one layer) becomes `useMapLayersData` (the stack).** React cannot call a hook per layer in a loop. `useQueries` from `@tanstack/react-query` is used directly, which is precedented in `src/views/EntityManagerApp/EntityNavbar.tsx`. The alternative, one hidden component per layer lifting its result, makes render state harder to reason about than one keyed map.
9. **`MapCanvas`'s `fitBounds` prop becomes a `FitBoundsRequest` with a monotonic id.** Phase 1 compared bounds by value so a refetch would not undo a pan. That guard makes "Zoom to layer" a no-op the second time it is pressed on the same layer. An id makes both behaviours correct: a refetch does not bump the id, a user action does.
10. **Symbology labels are Point / Sized / Cluster / Heat**, matching the prototype, where Point is `circle` and Sized is `proportionalSymbol`. Those are the only two members the model has, so switching between them is a real state change; the other two are unavailable with a stated reason.
11. **"Sized" is available in Wave A, not Wave C.** §10.3 puts `SymbolSizeFields` in Wave C and Tier 1 puts proportional symbols there too, but the current build already lets an author size symbols by a column (`LayerSymbolSizeField`), `proportionalSymbol` is in the model, and `makeLayerSpecFromMapLayer` already renders it. Removing it would be a regression. What stays in Wave C is the part that genuinely does not exist: the nested-circle **size legend**, and the full min-radius and scale controls. Wave A gives Sized a value column and a largest radius, which is what exists today.
12. **A new layer's popup selects the source's first 12 columns.** The popup selection _is_ the layer's query projection, so `"all"` on a layer whose query selects only two bound coordinate columns is what produced the empty drawer in inventory §6.7. The cap exists because a 60-column linelist would otherwise put 60 rows in the drawer and 60 properties on every one of thousands of features. It is one constant in `MapLayerUpdates` and the Popup section says the author can change the selection.

## Cut line for the Aug 19 demo

The demo is five days out. Everything below Stage 6 must land. These are the parts to drop first if time runs out, in this order, and each is a whole task or a clearly-marked step inside one so dropping it leaves the build green:

1. **Task 11, the map list view.** Without it a map is still reachable by URL and still shareable; it is just not browsable, so pair this cut with keeping the seeded map's URL to hand.
2. **Task 15, Step 5, the custom XYZ / WMS / WMTS basemap form.** Built-in basemaps and "no basemap" still work; drop the form and the `custom` member stays unreachable from the UI.
3. **Task 15, Step 6, the Views (bookmarks) menu.** The model field stays; only the menu goes.
4. **Task 23, Step 5's link-action controls** (the `Switch` and the two `TextInput`s). Popup **column** selection is the part that fixes the empty drawer and must not be cut with it.
5. **Task 22, the Sensitivity and Filter inspector sections.** Both fields are editable through the model only without them, and sensitivity enforcement is Wave B anyway.

Do **not** cut Task 26 (the status states) or Task 28 (the responsive bands). The status card is the difference between "the product is broken" and "you filtered too hard", and the bands are what stop the top bar's Export button falling off the edge of the map at demo-projector widths.

## Parallelisation

Stage 1 is a hard prerequisite for everything. After Task 5, two workers can run concurrently in separate worktrees:

- **Worker A:** Stage 2 (Tasks 6 to 11), the database, client, and routes.
- **Worker B:** Stages 3 to 5 (Tasks 12 to 24), the shell, against a locally-stubbed `useAvaMapEditor`.

Stage 6 (Tasks 25 to 30) joins them and must run after both. Worker B's only dependency on Worker A is `AvaMapClient`, which `useAvaMapEditor` calls, so Worker B should write Task 27's hook first with a stubbed save and let Worker A's client land underneath it. If only one worker is available, run the tasks in order.

---

## File structure

**Created — model (`shared/`)**

| File                                                                              | Responsibility                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts`                         | `AvaMapConfigRead`, `MapViewState`, `BasemapConfig`, `BasemapStyleKey`, `MapBookmark` |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.ts`                               | `AvaMapConfig` namespace entry                                                        |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts`      | `makeEmpty`, layer and bookmark updates, stack order                                  |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts` | order, add, remove, duplicate, bookmark behaviour                                     |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema.ts`                         | Zod schema for the persisted config, plus `fromJson` / `toJson`                       |
| `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema.test.ts`                    | round trip, version rejection, unknown-field rejection                                |
| `shared/models/AvaMap/AvaMapParsers.ts`                                           | `maps` row parsers, config validated through the schema                               |
| `shared/copy/mapDisclaimer.ts`                                                    | the mandatory boundary disclaimer                                                     |

**Created — client, routes, views (`src/`)**

| File                                                                                                 | Responsibility                                                |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/clients/maps/AvaMapClient.ts`                                                                   | `maps` CRUD via `createRdbCrudClient`                         |
| `src/routes/_auth/$workspaceSlug/map/route.tsx`                                                      | permission guard with a `map` resource fallback               |
| `src/routes/_auth/$workspaceSlug/map/index.tsx`                                                      | map list                                                      |
| `src/routes/_auth/$workspaceSlug/map/$mapId.tsx`                                                     | the editor, loads one map                                     |
| `src/views/GISApp/MapListView/MapListView.tsx`                                                       | list, create, open, delete                                    |
| `src/views/GISApp/MapListView/MapCard.tsx`                                                           | one card                                                      |
| `src/views/GISApp/useAvaMapEditor/useAvaMapEditor.ts`                                                | config state, undo-free immutable updates, debounced autosave |
| `src/views/GISApp/useAvaMapEditor/useAvaMapEditor.test.ts`                                           | save state machine, coalescing, failure                       |
| `src/views/GISApp/shell/MapShell.tsx`                                                                | the Direction C grid                                          |
| `src/views/GISApp/shell/MapShell.module.css`                                                         | grid, gutters, responsive bands                               |
| `src/views/GISApp/shell/SkipLinks/SkipLinks.tsx`                                                     | the two skip links                                            |
| `src/views/GISApp/shell/SkipLinks/SkipLinks.module.css`                                              | visually-hidden-until-focused                                 |
| `src/views/GISApp/shell/MapChromePanel/MapChromePanel.tsx`                                           | collapsible floating `Paper`                                  |
| `src/views/GISApp/shell/MapChromePanel/MapChromePanel.module.css`                                    | panel, header, pill-when-collapsed                            |
| `src/views/GISApp/shell/useChromePanelState/useChromePanelState.ts`                                  | per-user panel collapse, persisted                            |
| `src/views/GISApp/shell/useChromePanelState/useChromePanelState.test.ts`                             | default per band, explicit user choice wins                   |
| `src/views/GISApp/shell/useMapChromeInsets/useMapChromeInsets.ts`                                    | measured panel insets for camera padding                      |
| `src/views/GISApp/shell/MapFurnitureBar/MapFurnitureBar.tsx`                                         | coordinates, scale bar, attribution, disclaimer               |
| `src/views/GISApp/shell/MapFurnitureBar/MapFurnitureBar.module.css`                                  | the docked strip                                              |
| `src/views/GISApp/shell/MapFurnitureBar/useMapPointerCoordinates.ts`                                 | live lng/lat readout                                          |
| `src/views/GISApp/shell/MapFurnitureBar/useMapScale/useMapScale.ts`                                  | scale bar length and label                                    |
| `src/views/GISApp/shell/MapFurnitureBar/useMapScale/useMapScale.test.ts`                             | rounding, sub-zoom-4 suppression                              |
| `src/views/GISApp/shell/MapTopBar/MapTopBar.tsx`                                                     | title, save state, actions                                    |
| `src/views/GISApp/shell/MapTopBar/MapTopBar.module.css`                                              | clusters, wrap-not-clip                                       |
| `src/views/GISApp/shell/MapTopBar/MapTitleInput.tsx`                                                 | unstyled title input                                          |
| `src/views/GISApp/shell/MapTopBar/SaveStateIndicator.tsx`                                            | saved / saving / unsaved / failed                             |
| `src/views/GISApp/shell/MapTopBar/BasemapControl/BasemapControl.tsx`                                 | built-in list, no-basemap, custom                             |
| `src/views/GISApp/shell/MapTopBar/BasemapControl/CustomBasemapForm.tsx`                              | XYZ / WMS / WMTS url + attribution                            |
| `src/views/GISApp/shell/MapTopBar/ViewsMenu/ViewsMenu.tsx`                                           | bookmarks                                                     |
| `src/views/GISApp/shell/MapToolCluster/MapToolCluster.tsx`                                           | the toolbar shell, one live tool                              |
| `src/views/GISApp/shell/MapToolCluster/MapToolCluster.module.css`                                    | cluster and tool buttons                                      |
| `src/views/GISApp/panels/LayerPanel/LayerPanel.tsx`                                                  | the stack panel                                               |
| `src/views/GISApp/panels/LayerPanel/LayerList.tsx`                                                   | ordered rows, drag context                                    |
| `src/views/GISApp/panels/LayerPanel/LayerRow/LayerRow.tsx`                                           | grip, visibility, select, status, menu                        |
| `src/views/GISApp/panels/LayerPanel/LayerRow/LayerRow.module.css`                                    | row grid and states                                           |
| `src/views/GISApp/panels/LayerPanel/LayerRow/LayerSwatch.tsx`                                        | point and sized swatch                                        |
| `src/views/GISApp/panels/LayerPanel/LayerRow/LayerStatusBadge.tsx`                                   | loading / error / no rows / unmapped                          |
| `src/views/GISApp/panels/LayerPanel/LayerActionsMenu.tsx`                                            | rename, duplicate, zoom to, delete                            |
| `src/views/GISApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePicker.tsx`                         | the add-layer popover                                         |
| `src/views/GISApp/panels/LayerPanel/getStackOrderWithLayerMoved/getStackOrderWithLayerMoved.ts`      | the keyboard reorder primitive                                |
| `src/views/GISApp/panels/LayerPanel/getStackOrderWithLayerMoved/getStackOrderWithLayerMoved.test.ts` | ends of the list, unknown layer                               |
| `src/views/GISApp/panels/LayerInspector/LayerInspector.tsx`                                          | the sectioned inspector, `LayerChangeHandler`                 |
| `src/views/GISApp/panels/LayerInspector/LayerInspector.module.css`                                   | lead block, sections, segmented control                       |
| `src/views/GISApp/panels/LayerInspector/InspectorSection.tsx`                                        | one collapsible section                                       |
| `src/views/GISApp/panels/LayerInspector/useLayerSourceColumns.ts`                                    | a source's full column list                                   |
| `src/views/GISApp/panels/LayerInspector/DataSection.tsx`                                             | source, binding, lat/lng, callouts                            |
| `src/views/GISApp/panels/LayerInspector/StyleSection.tsx`                                            | symbology, color, radius, stroke                              |
| `src/views/GISApp/panels/LayerInspector/SensitivitySection.tsx`                                      | mode and minimum count                                        |
| `src/views/GISApp/panels/LayerInspector/FilterSection.tsx`                                           | the layer's filter tree                                       |
| `src/views/GISApp/panels/LayerInspector/PopupSection.tsx`                                            | popup columns and link action                                 |
| `src/views/GISApp/panels/LayerInspector/LegendSection.tsx`                                           | legend title, units, position                                 |
| `src/views/GISApp/panels/LegendPanel/MapLegend.tsx`                                                  | the over-map legend                                           |
| `src/views/GISApp/panels/LegendPanel/MapLegend.module.css`                                           | legend list and keys                                          |
| `src/views/GISApp/panels/FeatureInspector/FeatureInspector.tsx`                                      | rewritten popup drawer                                        |
| `src/views/GISApp/panels/MapStatusCard/MapStatusCard.tsx`                                            | the selected layer's actionable status                        |
| `src/views/GISApp/panels/MapStatusCard/MapStatusCard.module.css`                                     | the card                                                      |
| `src/views/GISApp/panels/MapFirstRunCard/MapFirstRunCard.tsx`                                        | "This map has no layers yet"                                  |
| `src/views/GISApp/layers/MapLayerViewState.ts`                                                       | the shape every status surface reads                          |
| `src/views/GISApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns.ts`             | lat/lng name inference                                        |
| `src/views/GISApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns.test.ts`        | whole-name match, both-or-nothing, numeric only               |
| `src/views/GISApp/layers/LayerGeometryCache/LayerGeometryCache.ts`                                   | per-layer `FeatureCollection` memo                            |
| `src/views/GISApp/layers/LayerGeometryCache/LayerGeometryCache.test.ts`                              | reference stability and invalidation                          |
| `src/views/GISApp/layers/useMapLayersData/useMapLayersData.ts`                                       | one query per layer                                           |
| `src/views/GISApp/layers/useMapLayersData/useMapLayersData.test.ts`                                  | ported from `useMapLayerData.test.ts`, extended to two layers |
| `src/views/GISApp/layers/useAvaMapRender/useAvaMapRender.ts`                                         | stack to merged `MapSpec` plus per-layer state                |
| `src/views/GISApp/layers/useFitBoundsRequest/useFitBoundsRequest.ts`                                 | panel-aware camera requests, first-render auto-fit            |
| `src/views/GISApp/layers/MapLayerUpdates.ts`                                                         | moved up from `panels/LayerFormPanel/`                        |
| `src/views/GISApp/layers/MapLayerUpdates.test.ts`                                                    | popup projection, symbology carry-over                        |
| `tests/e2e/gis-map-layers.spec.ts`                                                                   | the Wave A e2e spec                                           |
| `tests/e2e/helpers/seedAvaMap.ts`                                                                    | seed and tear down a map row                                  |

**Created — database**

| File                                                    | Responsibility               |
| ------------------------------------------------------- | ---------------------------- |
| `supabase/schemas/10.maps.sql`                          | the table, triggers, indexes |
| `supabase/schemas/17.rls.maps.sql`                      | RLS policies                 |
| `supabase/tests/database/permissions/rls_maps.test.sql` | pgTAP for those policies     |

**Modified**

`shared/models/AvaMap/AvaMap.ts`, `shared/models/AvaMap/AvaMap.types.ts`, `shared/models/AvaMap/MapLayer/MapLayer.types.ts`, `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts` (+ test), `shared/copy/resourceTypeLabel.ts`, `supabase/schemas/00.enum.resource_type.sql`, `supabase/schemas/16.utils.resource-permissions.sql`, `supabase/schemas/70.rpc_resources__transfer_ownership.sql`, `supabase/schemas/70.rpc_workspaces__private_resource_counts.sql`, `supabase/schemas/71.rpc_workspaces__transfer_all_owned_resources.sql`, `src/components/permissions/ShareResourceModal/shareCopy.ts`, `src/config/AppLinks.tsx`, `src/config/NavbarLinks.tsx`, `src/components/layouts/RootLayout/WorkspaceLayout.tsx`, `src/views/GISApp/GisApp.tsx`, `src/views/GISApp/MapCanvas/MapCanvas.tsx`, `src/views/GISApp/MapCanvas/MapInstanceHelpers.ts`, `src/views/GISApp/MapCanvas/useFitMapBounds.ts`, `src/views/GISApp/basemap/BasemapStyle.ts`, `src/views/GISApp/basemap/MapStyles.ts`, `src/views/GISApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows.ts` (+ test), and the ten files that reference `AvaMap.Basemap` / `AvaMap.ViewState` (Task 1 lists them).

**Deleted** (Task 29, after everything else is green)

`src/views/GISApp/GisMapCanvas/` (whole directory), `src/views/GISApp/panels/LayerFormPanel/` (whole directory except `MapLayerUpdates.ts`, which moves), `src/views/GISApp/panels/FeatureInspector.tsx` (replaced by the directory form), `src/views/GISApp/useGisMapState.ts`, `src/views/GISApp/useGisLayerView.ts`, `src/views/GISApp/layers/useLayerMapSpec.ts`, `src/views/GISApp/layers/useRenderedLayerSpec.ts`, `src/views/GISApp/layers/useLayerFeatureCollection.ts`, `src/views/GISApp/layers/useMapLayerData/` (whole directory; `MapLayerData.ts` moves into `useMapLayersData/`), `src/views/GISApp/MapCanvas/MapStatusOverlay/` (whole directory), `src/views/GISApp/basemap/MapStylePicker.tsx`, `src/views/GISApp/GisApp.module.css`.

---

# Stage 1: the model

Five tasks. Nothing here touches the database or the UI, so the whole stage is
unit-tested and fast.

## Task 1: Split `AvaMap` into a row model and a config model

Pure rename. Phase 1's `AvaMapRead` is the editable config, not the persisted
row, so it moves to `AvaMapConfig` and frees the `AvaMap` name for the row
model Task 5 builds. No behaviour change.

**Files:**

- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts`
- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.ts`
- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts`
- Move: `shared/models/AvaMap/AvaMapModule/AvaMapModule.test.ts` → `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts`
- Delete: `shared/models/AvaMap/AvaMap.types.ts`, `shared/models/AvaMap/AvaMap.ts`, `shared/models/AvaMap/AvaMapModule/AvaMapModule.ts`
- Modify: `src/views/GISApp/useGisMapState.ts`, `src/views/GISApp/GisMapCanvas/GisMapCanvas.tsx`, `src/views/GISApp/MapCanvas/MapCanvas.tsx`, `src/views/GISApp/MapCanvas/MapInstanceHelpers.ts`, `src/views/GISApp/MapCanvas/useAttachMapInstance.ts`, `src/views/GISApp/MapCanvas/useLatestMapValues.ts`, `src/views/GISApp/MapCanvas/useMapInstance.ts`, `src/views/GISApp/MapCanvas/useMapStyleSync.ts`, `src/views/GISApp/basemap/BasemapStyle.ts`, `src/views/GISApp/basemap/MapStyles.ts`

- [ ] **Step 1: Create the config types**

`shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts`:

```ts
import type { Model } from "@avandar/models";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

type ModelType = "AvaMapConfig";
type CurrentAvaMapConfigVersion = 1;

/**
 * Where the map is looking. `center` is `[longitude, latitude]`, MapLibre
 * order.
 */
export type MapViewState = {
  center: [longitude: number, latitude: number];
  zoom: number;
};

/** Keys of the basemap styles the app ships. Style URLs live in the GIS app. */
export type BasemapStyleKey =
  "avandar" | "positron" | "bright" | "liberty" | "dark" | "fiord";

/**
 * The map's backdrop. `none` renders a flat background instead of tiles, which
 * is the usable fallback when tile hosts are unreachable.
 */
export type BasemapConfig =
  | { type: "builtIn"; style: BasemapStyleKey }
  | { type: "none"; background: string };

/**
 * The editable body of a map: a basemap, a camera position, and an ordered
 * layer stack. Persisted as the `config` column of a `maps` row, so it is
 * versioned and carries no row identity of its own.
 */
export type AvaMapConfigRead = Model.Versioned<
  ModelType,
  CurrentAvaMapConfigVersion,
  {
    basemap: BasemapConfig;
    view: MapViewState;

    /** Draw order, bottom to top. */
    layers: readonly MapLayer.T[];
  }
>;
```

- [ ] **Step 2: Create the config module**

`shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts`:

```ts
import { Model } from "@avandar/models";
import type {
  AvaMapConfigRead,
  MapViewState,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts";

/** Opening camera position when a map has no data to fit yet. */
const DEFAULT_MAP_VIEW_STATE: MapViewState = {
  center: [-74.006, 40.7128],
  zoom: 10,
};

/** Constructors and defaults for a map's editable configuration. */
export const AvaMapConfigModule = {
  /** Opening camera position when a map has no data to fit yet. */
  defaultViewState: DEFAULT_MAP_VIEW_STATE,

  /** A new, empty config with the default basemap and camera and no layers. */
  makeEmpty: (): AvaMapConfigRead => {
    return Model.make("AvaMapConfig", {
      version: 1,
      basemap: { type: "builtIn", style: "avandar" },
      view: DEFAULT_MAP_VIEW_STATE,
      layers: [],
    } as const);
  },
};
```

- [ ] **Step 3: Create the namespace entry**

`shared/models/AvaMap/AvaMapConfig/AvaMapConfig.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  AvaMapConfigRead,
  BasemapConfig,
  BasemapStyleKey,
  MapViewState,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts";

/** Public model namespace for a map's editable configuration. */
export { AvaMapConfigModule as AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts";

export namespace AvaMapConfig {
  export type T = AvaMapConfigRead;
  export type Basemap = BasemapConfig;
  export type BasemapStyle = BasemapStyleKey;
  export type ViewState = MapViewState;
}
```

- [ ] **Step 4: Move the module test and retarget it**

```bash
mkdir -p shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule
git mv shared/models/AvaMap/AvaMapModule/AvaMapModule.test.ts \
  shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts
```

Then in the moved file replace every `AvaMap` identifier and import with
`AvaMapConfig`, and delete any assertion about `name` or `id` (the config has
neither). The file must end up asserting only what `makeEmpty` still promises:
the default basemap style, the default camera, and an empty layer list.

- [ ] **Step 5: Retarget every consumer**

```bash
grep -rl '\$/models/AvaMap/AvaMap"' src \
  | xargs sed -i '' \
    -e 's|\$/models/AvaMap/AvaMap"|$/models/AvaMap/AvaMapConfig/AvaMapConfig"|g' \
    -e 's|\bAvaMap\.Basemap\b|AvaMapConfig.Basemap|g' \
    -e 's|\bAvaMap\.ViewState\b|AvaMapConfig.ViewState|g' \
    -e 's|\bAvaMap\.BasemapStyle\b|AvaMapConfig.BasemapStyle|g' \
    -e 's|\bAvaMap\.T\b|AvaMapConfig.T|g' \
    -e 's|{ AvaMap }|{ AvaMapConfig }|g' \
    -e 's|{ type AvaMap }|{ type AvaMapConfig }|g'
```

Then fix by hand what `sed` cannot:

- `src/views/GISApp/useGisMapState.ts`: `AvaMap.makeEmpty(DEFAULT_MAP_NAME)`
  becomes `AvaMapConfig.makeEmpty()`. Delete the now-unused
  `DEFAULT_MAP_NAME` constant and rename the hook's `avaMap` field to
  `mapConfig` throughout the file and in `GisMapCanvas.tsx` / `GisApp.tsx`.
- `src/views/GISApp/basemap/BasemapStyle.ts`: the docstring reference
  `{@link AvaMap.Basemap}` becomes `{@link AvaMapConfig.Basemap}`.
- `src/views/GISApp/basemap/MapStyles.ts`: the comment "aliased from the AvaMap
  model" becomes "aliased from the AvaMapConfig model".

- [ ] **Step 6: Delete the old model files**

```bash
git rm shared/models/AvaMap/AvaMap.ts shared/models/AvaMap/AvaMap.types.ts \
  shared/models/AvaMap/AvaMapModule/AvaMapModule.ts
```

- [ ] **Step 7: Verify nothing references the old paths**

Run: `grep -rn "models/AvaMap/AvaMap\"" src shared ; echo "exit=$?"`
Expected: no output, `exit=1`.

- [ ] **Step 8: Type check and run the model tests**

Run: `pnpm type-check && pnpm test:frontend AvaMapConfigModule`
Expected: no type errors; the moved test file passes.

- [ ] **Step 9: Commit**

```bash
git add -A shared/models/AvaMap src/views/GISApp
git commit -m "refactor(gis): split AvaMap into a row model and AvaMapConfig"
```

---

## Task 2: Give `AvaMapConfig` bookmarks, custom basemaps, and stack operations

The model gaps shell design §10.6 marks Wave A, plus the layer-list operations
the stack panel needs. Every operation returns the config it was given, by
reference, when there is nothing to change: the render pipeline depends on that
(see `useLayerMapSpec`'s docstring).

**Files:**

- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfig.ts`
- Modify: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.ts`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigModule/AvaMapConfigModule.test.ts`

- [ ] **Step 1: Write the failing tests for stack order**

Append to `AvaMapConfigModule.test.ts`. `_createLayer` is a tiny local helper;
`MapLayer.makeEmpty` already gives a valid layer.

```ts
describe("stack order", () => {
  it("lists layers top of the z-order first", () => {
    const bottom = MapLayer.makeEmpty("Bottom");
    const top = MapLayer.makeEmpty("Top");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [bottom, top],
    };
    expect(AvaMapConfig.toStackOrder(config).map(prop("name"))).toEqual([
      "Top",
      "Bottom",
    ]);
  });

  it("reverses a row order back into draw order", () => {
    const bottom = MapLayer.makeEmpty("Bottom");
    const top = MapLayer.makeEmpty("Top");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [bottom, top],
    };
    const reordered = AvaMapConfig.withStackOrder(config, [bottom.id, top.id]);
    expect(reordered.layers.map(prop("name"))).toEqual(["Top", "Bottom"]);
  });

  it("rejects a row order that is not a permutation of the stack", () => {
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [MapLayer.makeEmpty("Only")],
    };
    expect(() => {
      return AvaMapConfig.withStackOrder(config, []);
    }).toThrow("does not match the layers on the map");
  });

  it("returns the same config when the order is unchanged", () => {
    const first = MapLayer.makeEmpty("First");
    const second = MapLayer.makeEmpty("Second");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [first, second],
    };
    expect(AvaMapConfig.withStackOrder(config, [second.id, first.id])).toBe(
      config,
    );
  });
});

describe("layer operations", () => {
  it("adds a new layer at the top of the z-order", () => {
    const existing = MapLayer.makeEmpty("Existing");
    const added = MapLayer.makeEmpty("Added");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [existing],
    };
    expect(
      AvaMapConfig.withLayerAdded(config, added).layers.map(prop("name")),
    ).toEqual(["Existing", "Added"]);
  });

  it("replaces one layer and leaves the others by reference", () => {
    const kept = MapLayer.makeEmpty("Kept");
    const edited = MapLayer.makeEmpty("Edited");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [kept, edited],
    };
    const next = AvaMapConfig.withLayerReplaced(config, edited.id, (layer) => {
      return { ...layer, isVisible: false };
    });
    expect(next.layers[0]).toBe(kept);
    expect(next.layers[1]?.isVisible).toBe(false);
  });

  it("returns the same config when an update changes nothing", () => {
    const layer = MapLayer.makeEmpty("Layer");
    const config = { ...AvaMapConfig.makeEmpty(), layers: [layer] };
    expect(
      AvaMapConfig.withLayerReplaced(config, layer.id, (current) => {
        return current;
      }),
    ).toBe(config);
  });

  it("duplicates a layer directly above the original with a new id", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const config = { ...AvaMapConfig.makeEmpty(), layers: [layer] };
    const next = AvaMapConfig.withLayerDuplicated(config, layer.id, "Copy");
    expect(next.layers.map(prop("name"))).toEqual(["Cases", "Copy"]);
    expect(next.layers[1]?.id).not.toBe(layer.id);
  });

  it("removes a layer by id", () => {
    const kept = MapLayer.makeEmpty("Kept");
    const dropped = MapLayer.makeEmpty("Dropped");
    const config = {
      ...AvaMapConfig.makeEmpty(),
      layers: [kept, dropped],
    };
    expect(AvaMapConfig.withLayerRemoved(config, dropped.id).layers).toEqual([
      kept,
    ]);
  });
});

describe("bookmarks", () => {
  it("appends a bookmark holding the given camera", () => {
    const config = AvaMapConfig.makeEmpty();
    const view = { center: [29.2, -1.7], zoom: 8 } as const;
    const next = AvaMapConfig.withBookmarkAdded(
      config,
      AvaMapConfig.makeBookmark({ name: "North Kivu", view }),
    );
    expect(next.bookmarks).toHaveLength(1);
    expect(next.bookmarks[0]?.view).toEqual(view);
  });

  it("removes a bookmark by id", () => {
    const bookmark = AvaMapConfig.makeBookmark({
      name: "Goma",
      view: AvaMapConfig.defaultViewState,
    });
    const config = AvaMapConfig.withBookmarkAdded(
      AvaMapConfig.makeEmpty(),
      bookmark,
    );
    expect(
      AvaMapConfig.withBookmarkRemoved(config, bookmark.id).bookmarks,
    ).toEqual([]);
  });
});
```

Add the imports the new tests need at the top of the file:
`import { prop } from "@avandar/utils";` and
`import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend AvaMapConfigModule`
Expected: FAIL, `AvaMapConfig.toStackOrder is not a function`.

- [ ] **Step 3: Extend the config types**

In `AvaMapConfig.types.ts`, add the bookmark and custom-basemap types and the
`bookmarks` field:

```ts
import type { UUID } from "@avandar/utils";

export type MapBookmarkId = UUID<"MapBookmark">;

/** A saved camera position the author can return to from the Views menu. */
export type MapBookmark = {
  id: MapBookmarkId;
  name: string;
  view: MapViewState;
};

/** Tile protocols a workspace can point the map at. */
export type CustomBasemapKind = "xyz" | "wms" | "wmts";
```

Replace `BasemapConfig` with the three-member union spec §4.5 defines:

```ts
/**
 * The map's backdrop.
 *
 * `custom` exists because humanitarian deployments routinely have their own
 * tile server, and `none` renders a flat background instead of tiles, which is
 * the usable fallback when tile hosts are unreachable. A `custom` source
 * carries its own attribution because we cannot know it, and the furniture
 * strip may never show an unattributed basemap.
 */
export type BasemapConfig =
  | { type: "builtIn"; style: BasemapStyleKey }
  | {
      type: "custom";
      kind: CustomBasemapKind;
      url: string;
      attribution: string;
    }
  | { type: "none"; background: string };
```

And add `bookmarks` to `AvaMapConfigRead`, directly after `view`:

```ts
    /** Saved camera positions, in the order the author created them. */
    bookmarks: readonly MapBookmark[];
```

- [ ] **Step 4: Extend the namespace entry**

In `AvaMapConfig.ts`, add to the imported type list and to the namespace:

```ts
export namespace AvaMapConfig {
  export type T = AvaMapConfigRead;
  export type Basemap = BasemapConfig;
  export type BasemapStyle = BasemapStyleKey;
  export type CustomBasemapKind = CustomBasemapKindType;
  export type ViewState = MapViewState;
  export type Bookmark = MapBookmark;
  export type BookmarkId = MapBookmarkId;
}
```

Import `CustomBasemapKind as CustomBasemapKindType` so the namespace member and
the imported type do not collide, the same aliasing `MapLayer.ts` already uses
for `GeoBinding`.

- [ ] **Step 5: Implement the operations**

Replace `AvaMapConfigModule.ts` with:

```ts
import { Model } from "@avandar/models";
import { propEq } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import type {
  AvaMapConfigRead,
  MapBookmark,
  MapBookmarkId,
  MapViewState,
} from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

/** Opening camera position when a map has no data to fit yet. */
const DEFAULT_MAP_VIEW_STATE: MapViewState = {
  center: [-74.006, 40.7128],
  zoom: 10,
};

/** True when both id lists hold the same ids, in any order. */
function _haveSameIds(
  first: readonly MapLayer.Id[],
  second: readonly MapLayer.Id[],
): boolean {
  if (first.length !== second.length) {
    return false;
  }
  const firstSet = new Set(first);
  return second.every((id) => {
    return firstSet.has(id);
  });
}

/** Constructors, defaults, and immutable updates for a map's configuration. */
export const AvaMapConfigModule = {
  /** Opening camera position when a map has no data to fit yet. */
  defaultViewState: DEFAULT_MAP_VIEW_STATE,

  /** A new, empty config with the default basemap and camera and no layers. */
  makeEmpty: (): AvaMapConfigRead => {
    return Model.make("AvaMapConfig", {
      version: 1,
      basemap: { type: "builtIn", style: "avandar" },
      view: DEFAULT_MAP_VIEW_STATE,
      bookmarks: [],
      layers: [],
    } as const);
  },

  /**
   * The layers in the order the layer panel lists them: top of the z-order
   * first. `layers` is stored bottom to top because that is MapLibre's draw
   * order, and the panel reads top down because that is what a reader of a map
   * sees first.
   * @param config The map whose stack is being listed.
   */
  toStackOrder: (config: AvaMapConfigRead): readonly MapLayer.T[] => {
    return [...config.layers].reverse();
  },

  /**
   * Reorders the stack from a panel row order, top of the z-order first.
   *
   * Both the drag handler and the keyboard handler go through here, so the two
   * cannot disagree about what a move means.
   *
   * @param config The map being reordered.
   * @param orderedLayerIds Every layer id, in panel row order.
   * @returns The reordered config, or `config` when the order is unchanged.
   * @throws When `orderedLayerIds` is not a permutation of the map's layers,
   * which would silently drop or duplicate a layer.
   */
  withStackOrder: (
    config: AvaMapConfigRead,
    orderedLayerIds: readonly MapLayer.Id[],
  ): AvaMapConfigRead => {
    const currentIds = config.layers.map((layer) => {
      return layer.id;
    });
    if (!_haveSameIds(currentIds, orderedLayerIds)) {
      throw new Error(
        "The requested layer order does not match the layers on the map.",
      );
    }
    const nextLayers = [...orderedLayerIds].reverse().map((layerId) => {
      return config.layers.find(propEq("id", layerId))!;
    });
    const isUnchanged = nextLayers.every((layer, layerIndex) => {
      return layer === config.layers[layerIndex];
    });
    return isUnchanged ? config : { ...config, layers: nextLayers };
  },

  /** Adds a layer at the top of the z-order, which is the first panel row. */
  withLayerAdded: (
    config: AvaMapConfigRead,
    layer: MapLayer.T,
  ): AvaMapConfigRead => {
    return { ...config, layers: [...config.layers, layer] };
  },

  /** Removes a layer by id. Unknown ids leave the config untouched. */
  withLayerRemoved: (
    config: AvaMapConfigRead,
    layerId: MapLayer.Id,
  ): AvaMapConfigRead => {
    const nextLayers = config.layers.filter((layer) => {
      return layer.id !== layerId;
    });
    return nextLayers.length === config.layers.length
      ? config
      : { ...config, layers: nextLayers };
  },

  /**
   * Applies an immutable update to one layer.
   * @param config The map holding the layer.
   * @param layerId Which layer to update.
   * @param update Receives the current layer and returns the next one. Return
   * the layer it was given to signal "nothing changed".
   */
  withLayerReplaced: (
    config: AvaMapConfigRead,
    layerId: MapLayer.Id,
    update: (current: MapLayer.T) => MapLayer.T,
  ): AvaMapConfigRead => {
    const currentLayer = config.layers.find(propEq("id", layerId));
    if (!currentLayer) {
      return config;
    }
    const nextLayer = update(currentLayer);
    if (nextLayer === currentLayer) {
      return config;
    }
    return {
      ...config,
      layers: config.layers.map((layer) => {
        return layer.id === layerId ? nextLayer : layer;
      }),
    };
  },

  /**
   * Copies a layer directly above the original, with a fresh id so the two
   * render as separate MapLibre layers.
   * @param name The copy's display name, already localized by the caller.
   */
  withLayerDuplicated: (
    config: AvaMapConfigRead,
    layerId: MapLayer.Id,
    name: string,
  ): AvaMapConfigRead => {
    const sourceIndex = config.layers.findIndex(propEq("id", layerId));
    const sourceLayer = config.layers[sourceIndex];
    if (!sourceLayer) {
      return config;
    }
    const copy: MapLayer.T = {
      ...sourceLayer,
      id: uuid<MapLayer.Id>(),
      name,
      legend: { ...sourceLayer.legend, title: name },
    };
    const nextLayers = [...config.layers];
    nextLayers.splice(sourceIndex + 1, 0, copy);
    return { ...config, layers: nextLayers };
  },

  /**
   * A bookmark for the given camera position.
   * @param params.name The bookmark's display name, already localized.
   */
  makeBookmark: (params: { name: string; view: MapViewState }): MapBookmark => {
    return {
      id: uuid<MapBookmarkId>(),
      name: params.name,
      view: params.view,
    };
  },

  /** Appends a bookmark. */
  withBookmarkAdded: (
    config: AvaMapConfigRead,
    bookmark: MapBookmark,
  ): AvaMapConfigRead => {
    return { ...config, bookmarks: [...config.bookmarks, bookmark] };
  },

  /** Removes a bookmark by id. */
  withBookmarkRemoved: (
    config: AvaMapConfigRead,
    bookmarkId: MapBookmarkId,
  ): AvaMapConfigRead => {
    const nextBookmarks = config.bookmarks.filter((bookmark) => {
      return bookmark.id !== bookmarkId;
    });
    return nextBookmarks.length === config.bookmarks.length
      ? config
      : { ...config, bookmarks: nextBookmarks };
  },
};
```

- [ ] **Step 5a: Handle the new `custom` basemap in the two places that switch on it**

`BasemapStyle.fromBasemap` and `BasemapStyle.toKey` in
`src/views/GISApp/basemap/BasemapStyle.ts` use `.exhaustive()`, so they stop
compiling until the new member is handled. Add to `fromBasemap`, between the
`builtIn` and `none` arms:

```ts
      .with({ type: "custom" }, (custom) => {
        return {
          version: 8 as const,
          sources: {
            [CUSTOM_BASEMAP_SOURCE_ID]: match(custom.kind)
              .with("xyz", () => {
                return {
                  type: "raster" as const,
                  tiles: [custom.url],
                  tileSize: 256,
                  attribution: custom.attribution,
                };
              })
              .with("wms", "wmts", () => {
                // WMS and WMTS both answer a templated GET, so MapLibre reads
                // them through the same raster source. The author supplies the
                // full template including `{bbox-epsg-3857}` (WMS) or
                // `{z}/{x}/{y}` (WMTS); we do not build it for them, because
                // guessing a server's layer names and CRS is how you ship a
                // grey rectangle.
                return {
                  type: "raster" as const,
                  tiles: [custom.url],
                  tileSize: 256,
                  attribution: custom.attribution,
                };
              })
              .exhaustive(),
          },
          layers: [
            {
              id: CUSTOM_BASEMAP_LAYER_ID,
              type: "raster" as const,
              source: CUSTOM_BASEMAP_SOURCE_ID,
            },
          ],
        };
      })
```

with these constants at the top of the file:

```ts
/** Source id for a workspace-supplied tile service. */
const CUSTOM_BASEMAP_SOURCE_ID = "ava-custom-basemap";

/** Layer id for a workspace-supplied tile service. */
const CUSTOM_BASEMAP_LAYER_ID = "ava-custom-basemap-layer";
```

And to `toKey`, so a url or attribution edit forces a `setStyle`:

```ts
      .with({ type: "custom" }, (custom) => {
        return `custom:${custom.kind}:${custom.url}`;
      })
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test:frontend AvaMapConfigModule && pnpm type-check`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add shared/models/AvaMap src/views/GISApp/basemap
git commit -m "feat(gis): add bookmarks, custom basemaps, and stack ops to AvaMapConfig"
```

---

## Task 3: Validate the persisted config with Zod

`maps.config` is a `jsonb` blob, so the row's shape is only as good as its
parser. Spec §13 risk 6 makes this explicit: a config version bump needs a
parser and a test.

**Files:**

- Create: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema.ts`
- Test: `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema.test.ts`

- [ ] **Step 1: Write the failing test**

`shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema.test.ts`:

```ts
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema.ts";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import { describe, expect, it } from "vitest";

describe("AvaMapConfigSchema", () => {
  it("round trips an empty config", () => {
    const config = AvaMapConfig.makeEmpty();
    const parsed = AvaMapConfigSchema.fromJson(
      AvaMapConfigSchema.toJson(config),
    );
    expect(parsed).toEqual(config);
  });

  it("round trips a config carrying a layer and a bookmark", () => {
    const config = AvaMapConfig.withBookmarkAdded(
      AvaMapConfig.withLayerAdded(
        AvaMapConfig.makeEmpty(),
        MapLayer.makeEmpty("Cases"),
      ),
      AvaMapConfig.makeBookmark({
        name: "Goma",
        view: { center: [29.2, -1.7], zoom: 9 },
      }),
    );
    expect(
      AvaMapConfigSchema.fromJson(AvaMapConfigSchema.toJson(config)),
    ).toEqual(config);
  });

  it("rejects a config written by a future version", () => {
    const config = AvaMapConfig.makeEmpty();
    const future = { ...AvaMapConfigSchema.toJson(config), version: 2 };
    expect(() => {
      return AvaMapConfigSchema.fromJson(future);
    }).toThrow();
  });

  it("rejects a layer whose symbology is not a known kind", () => {
    const config = AvaMapConfig.withLayerAdded(
      AvaMapConfig.makeEmpty(),
      MapLayer.makeEmpty("Cases"),
    );
    const json = AvaMapConfigSchema.toJson(config) as {
      layers: Array<{ symbology: { type: string } }>;
    };
    json.layers[0]!.symbology.type = "hexbin";
    expect(() => {
      return AvaMapConfigSchema.fromJson(json);
    }).toThrow();
  });

  it("rejects a config that is not an object at all", () => {
    expect(() => {
      return AvaMapConfigSchema.fromJson(null);
    }).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend AvaMapConfigSchema`
Expected: FAIL, cannot resolve `AvaMapConfigSchema`.

- [ ] **Step 3: Write the schema**

`shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema.ts`:

```ts
import { uuidType } from "$/lib/zodHelpers.ts";
import { z } from "zod";
import type { AvaMapConfigRead } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

const ViewStateSchema = z.object({
  center: z.tuple([z.number(), z.number()]),
  zoom: z.number(),
});

const BasemapSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("builtIn"),
    style: z.enum([
      "avandar",
      "positron",
      "bright",
      "liberty",
      "dark",
      "fiord",
    ]),
  }),
  z.object({
    type: z.literal("custom"),
    kind: z.enum(["xyz", "wms", "wmts"]),
    url: z.string().min(1),
    attribution: z.string().min(1),
  }),
  z.object({ type: z.literal("none"), background: z.string().min(1) }),
]);

const BookmarkSchema = z.object({
  id: uuidType<"MapBookmark">(),
  name: z.string(),
  view: ViewStateSchema,
});

/**
 * The layer's query is accepted as an opaque object.
 *
 * `StructuredQuery` has no Zod schema anywhere in the repo, and authoring one
 * for the whole query model (data sources, columns, joins, filter trees) is a
 * separate piece of work. Everything `AvaMapConfig` itself owns is validated
 * strictly, so a shape drift in the map model is caught here; a drift in
 * `StructuredQuery` is caught by the executor that runs it.
 */
const StructuredQuerySchema: z.ZodType<StructuredQuery.Partial> =
  z.custom<StructuredQuery.Partial>(
    (value) => {
      return typeof value === "object" && value !== null;
    },
    { message: "Expected a structured query object" },
  );

const ColorSpecSchema = z.object({
  type: z.literal("single"),
  color: z.string(),
});

const StrokeSpecSchema = z.object({
  width: z.number(),
  color: z.string(),
});

const SymbologySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("circle"),
    radius: z.number(),
    color: ColorSpecSchema,
    stroke: StrokeSpecSchema,
  }),
  z.object({
    type: z.literal("proportionalSymbol"),
    value: uuidType<"QueryColumn">(),
    minRadius: z.number(),
    maxRadius: z.number(),
    scale: z.enum(["sqrt", "linear"]),
    color: ColorSpecSchema,
    stroke: StrokeSpecSchema,
  }),
]);

const SensitivitySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("exact") }),
  z.object({ mode: z.literal("jitter"), radiusMeters: z.number() }),
  z.object({
    mode: z.literal("aggregateOnly"),
    minCellCount: z.number(),
    minGeoLevel: z.string(),
  }),
]);

const GeoBindingSchema = z.object({
  type: z.literal("latLngColumns"),
  latitude: uuidType<"QueryColumn">().optional(),
  longitude: uuidType<"QueryColumn">().optional(),
});

const PopupSchema = z.object({
  columnIds: z.union([
    z.literal("all"),
    z.array(uuidType<"QueryColumn">()).readonly(),
  ]),
  action: z.object({ label: z.string(), urlTemplate: z.string() }).optional(),
});

const LegendSchema = z.object({
  title: z.string(),
  units: z.string().optional(),
  showNoData: z.boolean(),
  position: z.enum(["bottomLeft", "bottomRight", "topRight", "hidden"]),
});

const LayerSchema = z.object({
  __type: z.literal("MapLayer"),
  version: z.literal(1),
  id: uuidType<"MapLayer">(),
  name: z.string(),
  isVisible: z.boolean(),
  source: StructuredQuerySchema,
  geoBinding: GeoBindingSchema.optional(),
  symbology: SymbologySchema,
  sensitivity: SensitivitySchema,
  popup: PopupSchema,
  legend: LegendSchema,
});

const ConfigSchema = z.object({
  __type: z.literal("AvaMapConfig"),
  version: z.literal(1),
  basemap: BasemapSchema,
  view: ViewStateSchema,
  bookmarks: z.array(BookmarkSchema).readonly(),
  layers: z.array(LayerSchema).readonly(),
});

/**
 * Reader and writer for the `config` column of a `maps` row.
 *
 * `undefined` is not valid JSON, so optional fields (`units`, `geoBinding`,
 * `action`) are dropped on the way out by `JSON.stringify` and come back
 * absent, which Zod's `.optional()` accepts and which reads back as
 * `undefined`. That is why `toJson` goes through a stringify/parse pair rather
 * than handing the model object over directly.
 */
export const AvaMapConfigSchema = {
  /** The Zod schema, exposed for tests and for the row parsers. */
  schema: ConfigSchema,

  /**
   * Validates a `jsonb` value and returns it as a config.
   * @param json The raw value read from the database.
   * @throws ZodError when the value is not a config this build understands.
   */
  fromJson: (json: unknown): AvaMapConfigRead => {
    return ConfigSchema.parse(json) as AvaMapConfigRead;
  },

  /** Serializes a config into a plain JSON value for the database. */
  toJson: (config: AvaMapConfigRead): unknown => {
    return JSON.parse(JSON.stringify(config));
  },
};
```

> Two notes on this file. `MapLayer` is imported for the type only, so the
> import is `import type`. And `LayerSchema`'s output is structurally the
> layer model, but `z.custom` erases the query's inferred type, so `fromJson`
> carries one cast at the boundary. That cast is the reason the round-trip
> tests in Step 1 exist: they are what actually holds the schema and the model
> together.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:frontend AvaMapConfigSchema && pnpm type-check`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add shared/models/AvaMap/AvaMapConfig
git commit -m "feat(gis): validate the persisted AvaMap config with Zod"
```

---

## Task 4: Give `MapLayer` a source constructor and popup column resolution

Two model helpers the add-layer flow and the popup need. The second one is what
fixes the empty feature drawer the inventory records in §6.7: the layer's query
only ever selected its bound coordinate columns, and the feature builder omits
exactly those, so `properties` was empty by construction.

**Files:**

- Modify: `shared/models/AvaMap/MapLayer/MapLayer.types.ts`
- Modify: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts`
- Test: `shared/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `MapLayerModule.test.ts`. The file already has fixtures for a
dataset, its columns, and a bound layer; reuse them rather than writing new
ones, and follow their naming.

```ts
describe("makeFromDataSource", () => {
  it("names the layer and its legend after the caller's name", () => {
    const layer = MapLayer.makeFromDataSource({
      dataSource: _createDataset(),
      name: "Cholera linelist",
    });
    expect(layer.name).toBe("Cholera linelist");
    expect(layer.legend.title).toBe("Cholera linelist");
  });

  it("selects the source and no columns, so nothing is bound yet", () => {
    const dataSource = _createDataset();
    const layer = MapLayer.makeFromDataSource({
      dataSource,
      name: "Cholera linelist",
    });
    expect(layer.source.dataSource).toBe(dataSource);
    expect(layer.source.queryColumns).toEqual([]);
    expect(layer.geoBinding).toBeUndefined();
  });
});

describe("toPopupColumnNames", () => {
  it("returns every non-coordinate column name when set to all", () => {
    const layer = _createBoundLayer();
    expect(MapLayer.toPopupColumnNames(layer)).toBe("all");
  });

  it("resolves selected column ids to the names rows are keyed by", () => {
    const bound = _createBoundLayer();
    const [firstColumn] = bound.source.queryColumns;
    const layer: MapLayer.T = {
      ...bound,
      popup: { columnIds: [firstColumn!.id], action: undefined },
    };
    expect(MapLayer.toPopupColumnNames(layer)).toEqual([
      QueryColumn.getDerivedColumnName(firstColumn!),
    ]);
  });

  it("drops a selected column that is no longer in the layer's query", () => {
    const bound = _createBoundLayer();
    const layer: MapLayer.T = {
      ...bound,
      popup: {
        columnIds: [uuid<QueryColumn.Id>()],
        action: undefined,
      },
    };
    expect(MapLayer.toPopupColumnNames(layer)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend MapLayerModule`
Expected: FAIL, `MapLayer.makeFromDataSource is not a function`.

- [ ] **Step 3: Add the popup action to the model type**

In `MapLayer.types.ts`, replace `PopupConfig`:

```ts
/**
 * A link shown at the foot of a feature's popup, for clicking through to the
 * record the feature came from.
 *
 * `urlTemplate` carries `{columnName}` placeholders, filled from the clicked
 * feature's properties. A placeholder naming a column the popup did not select
 * stays literal rather than resolving to `undefined`, so a broken template is
 * visible instead of producing a plausible wrong URL.
 */
export type PopupLinkAction = { label: string; urlTemplate: string };

/**
 * Which columns a feature's popup shows. `"all"` shows every column the
 * layer's query returned.
 */
export type PopupConfig = {
  columnIds: readonly QueryColumn.Id[] | "all";
  action: PopupLinkAction | undefined;
};
```

And export the new type from the namespace entry `MapLayer.ts`:

```ts
export type PopupAction = PopupLinkAction;
```

- [ ] **Step 4: Implement both helpers**

In `MapLayerModule.ts`, add `action: undefined` to `makeEmpty`'s `popup`
object, then add:

```ts
  /**
   * A layer pointed at a data source, with no geometry bound yet.
   *
   * The add-layer flow asks for exactly one thing, the source, because it is
   * the only field with no sensible default. Everything else is edited in the
   * inspector afterwards.
   *
   * @param params.dataSource The source whose rows the layer will query.
   * @param params.name The layer's display name, already localized.
   */
  makeFromDataSource: (params: {
    dataSource: QueryDataSource.T;
    name: string;
  }): MapLayerRead => {
    const layer = MapLayerModule.makeEmpty(params.name);
    return {
      ...layer,
      source: { ...layer.source, dataSource: params.dataSource },
    };
  },

  /**
   * The column names a feature's popup should show, keyed the way query
   * result rows are keyed rather than by column id.
   *
   * @param layer The layer whose popup config and query columns are read.
   * @returns `"all"` when the popup shows everything, otherwise the resolved
   * names of the selected columns. Ids that are no longer in the layer's query
   * are dropped: a column the query does not return cannot be shown, and
   * carrying it would put an empty row in the popup.
   */
  toPopupColumnNames: (layer: MapLayerRead): readonly string[] | "all" => {
    const { columnIds } = layer.popup;
    if (columnIds === "all") {
      return "all";
    }
    return columnIds
      .map((columnId) => {
        const column = layer.source.queryColumns.find(propEq("id", columnId));
        return column ? QueryColumn.getDerivedColumnName(column) : undefined;
      })
      .filter(isDefined);
  },
```

Add `isDefined` to the `@avandar/utils` import and
`import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.ts";`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test:frontend MapLayerModule && pnpm type-check`
Expected: PASS. `pnpm type-check` also flags `MapLayerUpdates`, which builds a
`popup` object nowhere; if it does not, no change is needed there.

- [ ] **Step 6: Commit**

```bash
git add shared/models/AvaMap/MapLayer
git commit -m "feat(gis): add MapLayer source constructor and popup column resolution"
```

---

## Task 5: Build the `AvaMap` row model and its parsers

The `maps` row, modelled directly on `Dashboard`. Read
`shared/models/Dashboard/Dashboard.types.ts` and `DashboardParsers.ts` first;
this is the same shape with a typed `config`.

**Files:**

- Create: `shared/models/AvaMap/AvaMap.types.ts`
- Create: `shared/models/AvaMap/AvaMap.ts`
- Create: `shared/models/AvaMap/AvaMapParsers.ts`

- [ ] **Step 1: Write the row types**

`shared/models/AvaMap/AvaMap.types.ts`:

```ts
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { UserProfileId } from "$/models/User/UserProfile.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

type ModelType = "AvaMap";

export type AvaMapId = UUID<ModelType>;

export type AvaMapRead = Model.Base<
  ModelType,
  {
    /** The map's basemap, camera, bookmarks, and ordered layer stack. */
    config: AvaMapConfig.T;

    /** Timestamp of when the map was created. */
    createdAt: string;

    /** The map's description. */
    description: string | undefined;

    /** The map's unique identifier. */
    id: AvaMapId;

    /**
     * Inert until Wave E adds a public map route. No policy on `maps` reads
     * this column, so setting it does not expose the row.
     */
    isPublic: boolean;

    /** Restricted unless the caller has explicit grants (RBAC). */
    isRestricted: boolean;

    /** The map's name, shown in the top bar's title input. */
    name: string;

    /** The map's owner id. */
    ownerId: UserId;

    /** The map's owner profile id. */
    ownerProfileId: UserProfileId;

    /** Inert until Wave E, alongside `isPublic`. */
    slug: string | undefined;

    /** Timestamp of when the map was last updated. */
    updatedAt: string;

    /** Workspace id the map belongs to. */
    workspaceId: Workspace.Id;
  }
>;

/** CRUD type definitions for the AvaMap model. */
export type AvaMapModel = SupabaseCrudModelSpec<
  {
    tableName: "maps";
    modelName: "AvaMap";
    modelPrimaryKeyType: AvaMapId;
    modelTypes: {
      Read: AvaMapRead;
      Insert: SetOptional<
        AvaMapRead,
        "createdAt" | "id" | "isPublic" | "isRestricted" | "updatedAt"
      >;
      Update: Partial<AvaMapRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
```

- [ ] **Step 2: Write the namespace entry**

`shared/models/AvaMap/AvaMap.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type { AvaMapId, AvaMapModel } from "$/models/AvaMap/AvaMap.types.ts";

export { AvaMapParsers } from "$/models/AvaMap/AvaMapParsers.ts";

export namespace AvaMap {
  export type T<K extends keyof AvaMapModel = "Read"> = AvaMapModel[K];
  export type Id = AvaMapId;
}
```

- [ ] **Step 3: Write the parsers**

`shared/models/AvaMap/AvaMapParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema.ts";
import { z } from "zod";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";
import type { AvaMapId, AvaMapModel } from "$/models/AvaMap/AvaMap.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { UserProfileId } from "$/models/User/UserProfile.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  config: supabaseJSONSchema,
  created_at: z.iso.datetime({ offset: true }),
  description: z.string().nullable(),
  id: z.uuid(),
  is_public: z.boolean(),
  is_restricted: z.boolean(),
  name: z.string(),
  owner_id: z.uuid(),
  owner_profile_id: z.uuid(),
  slug: z.string().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/**
 * Parsers for `public.maps`.
 *
 * `config` is the one column that does not pass through untouched:
 * {@link AvaMapConfigSchema} validates it on the way in and serializes it on
 * the way out. A row whose config this build cannot understand throws here
 * rather than reaching the renderer, because a half-understood layer stack
 * renders a map that is quietly wrong.
 */
export const AvaMapParsers = makeParserRegistry<AvaMapModel>().build({
  modelName: "AvaMap",
  DBReadSchema,
  fromDBReadToModelRead: pipe(
    camelCaseKeysDeep,
    nullsToUndefinedDeep,
    (obj): AvaMapModel["Read"] => {
      return Model.make("AvaMap", {
        ...obj,
        id: obj.id as AvaMapId,
        workspaceId: obj.workspaceId as Workspace.Id,
        ownerId: obj.ownerId as UserId,
        ownerProfileId: obj.ownerProfileId as UserProfileId,
        config: AvaMapConfigSchema.fromJson(obj.config),
      });
    },
  ),
  fromModelInsertToDBInsert: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps(["description", "slug"]),
  ),
  fromModelUpdateToDBUpdate: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps(["description", "slug"]),
  ),
});

/**
 * Do not remove these tests!
 */
type CrudTypes = AvaMapModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
```

> `camelCaseKeysDeep` walks into `config` and would camelCase the layer stack's
> own keys. That is harmless today because every key inside the config is
> already camelCase, but `__type` must survive: confirm it does in Step 4's
> test before moving on. `snakeCaseKeysDeep` has the mirror problem on write,
> which is why `fromModelUpdateToDBUpdate` must be given a config that has
> already been through `AvaMapConfigSchema.toJson`. Task 8's client does that.

- [ ] **Step 4: Prove the config survives the parser round trip**

Add to `shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema.test.ts`:

```ts
it("survives the key-casing transforms the row parsers apply", () => {
  const config = AvaMapConfig.withLayerAdded(
    AvaMapConfig.makeEmpty(),
    MapLayer.makeEmpty("Cases"),
  );
  const json = AvaMapConfigSchema.toJson(config);
  const round = camelCaseKeysDeep(snakeCaseKeysDeep(json));
  expect(AvaMapConfigSchema.fromJson(round)).toEqual(config);
});
```

with `import { camelCaseKeysDeep, snakeCaseKeysDeep } from "@avandar/utils";`.

If this fails, the casing transforms are mangling the config and the parsers
must skip it: change both `fromModelInsertToDBInsert` and
`fromModelUpdateToDBUpdate` to lift `config` out before the pipe and put it
back afterwards, and add a comment naming the key that broke.

- [ ] **Step 5: Run the tests**

Run: `pnpm test:frontend AvaMapConfigSchema && pnpm type-check`
Expected: PASS. `pnpm type-check` will still fail on `AvaMapModel["DBRead"]`
until Task 6 regenerates `shared/types/database.types.ts` with the `maps`
table. That is expected: note it and continue; Task 6 Step 9 rechecks.

- [ ] **Step 6: Commit**

```bash
git add shared/models/AvaMap
git commit -m "feat(gis): add the AvaMap row model and parsers"
```

---

# Stage 2: persistence, permissions, and routes

Spec §6 (the `map` resource type) and §7 (the `maps` table). The `gis` app_type
already landed with the permissions plan; this stage makes a map a **resource**
so it can be shared.

## Task 6: Create `public.maps` and extend `resource_type` to `map`

All schema work goes through the declarative workflow: edit
`supabase/schemas/**`, then generate a migration. **Never hand-edit
`supabase/migrations/`.**

**Files:**

- Create: `supabase/schemas/10.maps.sql`
- Create: `supabase/schemas/17.rls.maps.sql`
- Modify: `supabase/schemas/00.enum.resource_type.sql`
- Modify: `supabase/schemas/15.resource_shares.sql`
- Modify: `supabase/schemas/16.utils.resource-permissions.sql`

- [ ] **Step 1: Add `map` to the resource type enum**

`supabase/schemas/00.enum.resource_type.sql`:

```sql
create type public.resource_type as enum ('dashboard', 'dataset', 'map');
```

- [ ] **Step 2: Create the table**

`supabase/schemas/10.maps.sql`. It is `10.` because it depends only on
`workspaces` and `user_profiles`, the same layer `dashboards` sits at.

```sql
create table public.maps (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace this map belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- User id of the owner. We cannot delete users that still own a map
  owner_id uuid not null default auth.uid () references auth.users (id) on update cascade on delete no action,
  -- User profile id of the owner for this workspace. We cannot
  -- remove users from a workspace if they still own a map.
  owner_profile_id uuid not null references public.user_profiles (id) on update cascade on delete no action,
  -- Timestamp of when the map was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when the map was last updated.
  updated_at timestamptz not null default now(),
  -- Name of the map
  name text not null,
  -- Description of the map
  description text,
  -- Reserved for the Wave E public embed. NO POLICY READS THIS COLUMN: there
  -- is no anon SELECT policy on `maps` and no public map route, so setting it
  -- true does not expose the row. Wave E adds both, and must add pgTAP for
  -- them at the same time.
  is_public boolean not null default false,
  -- Optional unique slug, reserved for the same Wave E embed
  slug text,
  -- The map's full AvaMapConfig as a JSON blob. Layer-model evolution is a
  -- config version bump plus a parser, not a migration: see
  -- shared/models/AvaMap/AvaMapConfig/AvaMapConfigSchema.ts
  config jsonb not null,
  -- When true, tag-based app roles do not apply; shares still can
  is_restricted boolean not null default false
);

-- Enable row level security
-- RLS and policies: `17.rls.maps.sql`
-- (after `16.utils.resource-permissions.sql` defines resource helper
-- functions).
alter table public.maps enable row level security;

/** Prevents a map from being reassigned to another workspace. */
create or replace function public.maps__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path = public as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'map workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tr__maps__prevent_workspace_id_change before
update of workspace_id on public.maps for each row
execute function public.maps__prevent_workspace_id_change ();

-- Trigger the `updated_at` update
create trigger tr_maps__set_updated_at before
update on public.maps for each row
execute function public.util__set_updated_at ();

-- Indexes to improve performance
create index idx_maps__slug on public.maps (slug);

create index idx_maps__workspace_owner on public.maps (
  workspace_id,
  owner_id
);

-- Globally unique vanity slug for public maps, mirroring dashboards so a
-- future `/m/<slug>` route resolves to at most one map even if a frontend
-- check is bypassed. Inert until Wave E, like `is_public`.
create unique index maps__slug_unique_when_public on public.maps (slug)
where
  is_public = true and
  slug is not null;
```

- [ ] **Step 3: Teach the share trigger about maps**

In `supabase/schemas/15.resource_shares.sql`, inside
`resource_shares__validate_resource_workspace`, add a third branch after the
`dataset` one. **Without this every share on a map fails**: the workspace id
stays NULL, which is `distinct from` the share's workspace id, and the trigger
raises.

```sql
  elsif new.resource_type = 'map'::public.resource_type then
    select m.workspace_id into v_resource_workspace_id
    from public.maps m
    where m.id = new.resource_id;
```

Update that function's docstring: "for both resource tables" becomes "for
every resource table".

- [ ] **Step 4: Extend the four resource-permission helpers**

All four are in `supabase/schemas/16.utils.resource-permissions.sql`.

`util__resource_type_to_app_type` — add the case and update the docstring from
"a dashboard or dataset resource type" to "a resource type":

```sql
  select case p_resource_type
    when 'dashboard'::public.resource_type then 'dashboards'::public.app_type
    when 'dataset'::public.resource_type then 'data_sources'::public.app_type
    when 'map'::public.resource_type then 'gis'::public.app_type
  end;
```

`util__is_resource_private_to_owner` — add a branch before the final `else`:

```sql
elsif p_resource_type = 'map' then
select
  m.owner_id,
  m.workspace_id,
  coalesce(m.is_restricted, false) into v_owner_id,
  v_workspace_id,
  v_is_restricted
from
  public.maps m
where
  m.id = p_resource_id;
```

`util__resource_effective_role` — add a branch before the final `else`.
`v_is_public` is deliberately left at its `false` initialiser: `maps.is_public`
is inert (see `10.maps.sql`), and reading it here would grant Settings Admins
admin on an owner-private map on the strength of a column no policy honours.

```sql
  elsif p_resource_type = 'map' then
    select
      m.workspace_id,
      m.owner_id,
      coalesce(m.is_restricted, false)
    into v_workspace_id, v_owner_id, v_is_restricted
    from public.maps m
    where
      m.id = p_resource_id;
    v_app := 'gis';
```

`util__auth_user_can_access_resource_in_workspace` — add a branch before the
final `else`:

```sql
elsif p_resource_type = 'map' then
select
  m.workspace_id into v_resource_workspace_id
from
  public.maps m
where
  m.id = p_resource_id;
```

- [ ] **Step 5: Add the hardened SELECT helper for maps**

Append to `supabase/schemas/16.utils.resource-permissions.sql`, after
`util__auth_user_may_select_dashboard`:

```sql
/**
 * Whether the auth user may SELECT a map row under hardened RLS.
 *
 * Same editor-only block as `util__auth_user_may_select_dashboard` with app
 * `gis`, and deliberately WITHOUT the `is_public` short-circuit that function
 * has: `maps.is_public` is reserved for the Wave E public embed and no policy
 * on `maps` honours it, so a map is never readable without authenticating and
 * without a grant.
 *
 * Blocks workspace members whose only grant on an unrestricted row is a
 * workspace-wide app role at editor+ (e.g. a Global Editor) from reading
 * another user's map, while keeping viewers, owners, settings/workspace
 * managers, restricted-resource paths, and explicit `resource_shares` grants.
 * Group shares with requires_app_access=true additionally require the auth
 * user to have a gis app role.
 *
 * @param p_map_id Primary key of `public.maps`.
 * @returns True when the row should be visible to `auth.uid()`.
 */
create or replace function public.util__auth_user_may_select_map (
  p_map_id uuid
) returns boolean language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_uid uuid := auth.uid ();
  v_ws uuid;
  v_owner uuid;
  v_restricted boolean;
  v_app_role public.role_level;
  v_editor_rank int := public.util__role_level_rank ('editor'::public.role_level);
  v_user_rank int;
  v_has_share boolean;
begin
  if v_uid is null then
    return false;
  end if;

  select
    m.workspace_id,
    m.owner_id,
    coalesce(m.is_restricted, false)
  into v_ws, v_owner, v_restricted
  from
    public.maps m
  where
    m.id = p_map_id;

  if v_ws is null then
    return false;
  end if;

  if not (
    v_ws = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  ) then
    return false;
  end if;

  if not public.util__auth_user_can_access_resource (
    'map'::public.resource_type,
    p_map_id,
    'viewer'::public.role_level
  ) then
    return false;
  end if;

  if public.util__can_manage_workspace_settings (v_ws) then
    return true;
  end if;

  if v_owner = v_uid then
    return true;
  end if;

  select exists (
    select
      1
    from
      public.resource_shares rs
    where
      rs.workspace_id = v_ws and
      rs.resource_type = 'map'::public.resource_type and
      rs.resource_id = p_map_id and
      (
        rs.principal_type = 'workspace'::public.share_principal_type or
        (
          rs.principal_type = 'user'::public.share_principal_type and
          rs.principal_id = v_uid
        ) or
        (
          rs.principal_type = 'user_group'::public.share_principal_type and
          exists (
            select
              1
            from
              public.user_group_memberships ugm
            where
              ugm.user_group_id = rs.principal_id and
              ugm.user_id = v_uid
          ) and
          (
            rs.requires_app_access = false or
            public.util__get_auth_user_app_role (
              v_ws,
              'gis'::public.app_type
            ) is not null
          )
        )
      )
  )
  into v_has_share;

  -- Restricted rows never inherit workspace app roles; require a share grant.
  if v_restricted then
    return coalesce(v_has_share, false);
  end if;

  v_app_role := public.util__get_auth_user_app_role (
    v_ws,
    'gis'::public.app_type
  );
  v_user_rank := coalesce(public.util__role_level_rank (v_app_role), 0);

  if v_user_rank < v_editor_rank then
    return true;
  end if;

  if v_has_share then
    return true;
  end if;

  return false;
end;
$$;
```

- [ ] **Step 6: Write the RLS policies**

`supabase/schemas/17.rls.maps.sql`:

```sql
/**
 * RLS for `maps`. Requires `16.utils.resource-permissions`.
 *
 *  Resource CRUD matrix (effective role on the row):
 *    viewer: SELECT
 *    editor: SELECT, INSERT (new row in workspace), UPDATE
 *    admin: SELECT, INSERT, UPDATE, DELETE
 *
 *  SELECT also uses `util__auth_user_may_select_map` so workspace editors
 * cannot read other members' unrestricted rows without an explicit share.
 *
 *  There is deliberately NO anon policy. `maps.is_public` is reserved for the
 * Wave E public embed; until that route and its pgTAP land, a map is not
 * readable without authenticating.
 */

-- The inline owner short-circuit lets the row owner pass SELECT RLS without the
-- helper re-fetching the row. Required so `INSERT ... RETURNING *` works for
-- the inserting user: during INSERT, the helper's internal SELECT cannot see
-- the just-inserted row and would otherwise return false.
create policy "Users can read maps they have permissions for" on public.maps for
select
  to authenticated using (
    public.maps.owner_id = (
      select
        auth.uid ()
    ) or
    public.util__auth_user_may_select_map (
      public.maps.id
    )
  );

create policy "Users with editor app role can insert maps" on public.maps for insert to authenticated
with
  check (
    public.util__auth_user_can_insert_workspace_resource (
      public.maps.workspace_id,
      'map'::public.resource_type,
      public.maps.owner_id
    )
  );

create policy "Users with editor access can update maps" on public.maps
for update
  to authenticated using (
    public.util__auth_user_can_update_resource (
      'map'::public.resource_type,
      public.maps.id
    )
  )
with
  check (
    public.util__auth_user_can_update_resource (
      'map'::public.resource_type,
      public.maps.id
    ) and
    public.maps.owner_id = any (
      array(
        select
          public.util__get_workspace_members (
            public.maps.workspace_id
          )
      )
    )
  );

create policy "Users with admin access can delete maps" on public.maps for delete to authenticated using (
  public.util__auth_user_can_delete_resource (
    'map'::public.resource_type,
    public.maps.id
  )
);
```

- [ ] **Step 7: Generate the migration**

Run: `pnpm db:new-migration maps_table_and_map_resource_type`
Expected: a new file under `supabase/migrations/`.

**Read it before doing anything else.** It must contain: `alter type
public.resource_type add value 'map'`, `create table public.maps`, the two
triggers, three indexes, the four `create or replace function` bodies, and the
four policies. It must contain **no `drop policy`** on `storage.objects` and no
unrelated drops. If it does, stop: another worktree's schema is in the shared
local database (see the note under Commands) and the diff is wrong.

> Postgres cannot add an enum value and use it in the same transaction.
> If applying fails with `unsafe use of new value "map" of enum type`, split
> the generated file in two: a first migration holding only the `alter type
... add value 'map'`, and a second holding everything else. Name them
> `<timestamp>_map_resource_type_enum_value.sql` and
> `<timestamp+1>_maps_table.sql`. This is the same split the `gis` app_type
> needed (`20260814010030` / `20260814010031`).

- [ ] **Step 8: Apply it and confirm the table exists**

Run: `pnpm db:apply-migrations`
Then run:

```bash
pnpm db:sql-cmd "select count(*) from public.maps;"
pnpm db:sql-cmd "select enum_range(null::public.resource_type);"
```

Expected: `0` rows, and `{dashboard,dataset,map}`.

- [ ] **Step 9: Regenerate the types and re-check Task 5**

Run: `pnpm db:gen-types && pnpm type-check`
Expected: `shared/types/database.types.ts` gains a `maps` entry, and the
`ZodConsistencyTests` in `AvaMapParsers.ts` now compile. If they do not, the
`DBReadSchema` and the generated `Row` type disagree: fix the schema, not the
generated file.

- [ ] **Step 10: Commit**

```bash
git add supabase/schemas supabase/migrations shared/types/database.types.ts
git commit -m "feat(gis): add public.maps and the map resource type"
```

---

## Task 7: pgTAP for the `maps` policies

`docs/rules/sql.md` is unambiguous: every policy is tested, and the negative
cases are the point. Read
`supabase/tests/database/permissions/resource_rls_role_matrix.test.sql` first
and copy its fixture style; do not invent a new one.

**Files:**

- Create: `supabase/tests/database/permissions/rls_maps.test.sql`

- [ ] **Step 1: Write the fixtures**

```sql
\set ON_ERROR_STOP on

/**
 * RLS for `maps`.
 *
 *   viewer: SELECT
 *   editor: SELECT, UPDATE, INSERT (workspace gis editor+ app role)
 *   admin:  SELECT, UPDATE, DELETE
 *
 * Also covers the two properties specific to maps: a workspace-wide Global
 * Editor with no share cannot read another member's unrestricted map, and
 * `is_public` is inert, so setting it never makes a map anon-readable.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('e2100001-0000-4000-8000-000000000001'::uuid, 'maps_owner@test.dev', 'authenticated', 'authenticated'),
  ('e2100002-0000-4000-8000-000000000002'::uuid, 'maps_viewer@test.dev', 'authenticated', 'authenticated'),
  ('e2100003-0000-4000-8000-000000000003'::uuid, 'maps_editor@test.dev', 'authenticated', 'authenticated'),
  ('e2100004-0000-4000-8000-000000000004'::uuid, 'maps_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('e2101001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'maps rls ws', 'maps-rls-ws'),
  ('e2101002-0000-4000-8000-000000000002'::uuid, 'e2100004-0000-4000-8000-000000000004'::uuid, 'maps other ws', 'maps-other-ws')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('e2102001-0000-4000-8000-000000000001'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid),
  ('e2102002-0000-4000-8000-000000000002'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid, 'e2100002-0000-4000-8000-000000000002'::uuid),
  ('e2102003-0000-4000-8000-000000000003'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid, 'e2100003-0000-4000-8000-000000000003'::uuid),
  ('e2102004-0000-4000-8000-000000000004'::uuid, 'e2101002-0000-4000-8000-000000000002'::uuid, 'e2100004-0000-4000-8000-000000000004'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (id, user_id, workspace_id, membership_id, full_name, display_name)
values
  ('e2103001-0000-4000-8000-000000000001'::uuid, 'e2100001-0000-4000-8000-000000000001'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid, 'e2102001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('e2103002-0000-4000-8000-000000000002'::uuid, 'e2100002-0000-4000-8000-000000000002'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid, 'e2102002-0000-4000-8000-000000000002'::uuid, 'Viewer', 'Viewer'),
  ('e2103003-0000-4000-8000-000000000003'::uuid, 'e2100003-0000-4000-8000-000000000003'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid, 'e2102003-0000-4000-8000-000000000003'::uuid, 'Editor', 'Editor'),
  ('e2103004-0000-4000-8000-000000000004'::uuid, 'e2100004-0000-4000-8000-000000000004'::uuid, 'e2101002-0000-4000-8000-000000000002'::uuid, 'e2102004-0000-4000-8000-000000000004'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- The owner is deliberately NOT a Global Admin: a settings admin short-circuits
-- to admin on every non-private row, which would mask the assertions below.
update public.workspace_memberships wm
set role_group_id = rg.id
from public.role_groups rg
where
  wm.workspace_id = 'e2101001-0000-4000-8000-000000000001'::uuid and
  rg.workspace_id = wm.workspace_id and
  rg.is_builtin and
  rg.name = case wm.user_id
    when 'e2100002-0000-4000-8000-000000000002'::uuid then 'Global Viewer'
    else 'Global Editor'
  end;

insert into public.maps (
  id, workspace_id, owner_id, owner_profile_id, name, description,
  is_public, config, is_restricted
)
values
  -- Restricted and shared: the ordinary sharing path.
  ('e210a001-0000-4000-8000-000000000001'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid,
   'e2100001-0000-4000-8000-000000000001'::uuid, 'e2103001-0000-4000-8000-000000000001'::uuid,
   'shared map', '', false, '{}'::jsonb, true),
  -- Unrestricted with no shares: the row the Global Editor must NOT be able to
  -- read and the Global Viewer must.
  ('e210a002-0000-4000-8000-000000000002'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid,
   'e2100001-0000-4000-8000-000000000001'::uuid, 'e2103001-0000-4000-8000-000000000001'::uuid,
   'unrestricted map', '', false, '{}'::jsonb, false),
  -- is_public true with no shares: proves the column is inert.
  ('e210a003-0000-4000-8000-000000000003'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid,
   'e2100001-0000-4000-8000-000000000001'::uuid, 'e2103001-0000-4000-8000-000000000001'::uuid,
   'public map', '', true, '{}'::jsonb, true)
on conflict (id) do nothing;

insert into public.resource_shares (
  id, workspace_id, resource_type, resource_id, principal_type, principal_id, role
)
values
  ('e2105001-0000-4000-8000-000000000001'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid,
   'map'::public.resource_type, 'e210a001-0000-4000-8000-000000000001'::uuid,
   'user'::public.share_principal_type, 'e2100002-0000-4000-8000-000000000002'::uuid,
   'viewer'::public.role_level),
  ('e2105002-0000-4000-8000-000000000002'::uuid, 'e2101001-0000-4000-8000-000000000001'::uuid,
   'map'::public.resource_type, 'e210a001-0000-4000-8000-000000000001'::uuid,
   'user'::public.share_principal_type, 'e2100003-0000-4000-8000-000000000003'::uuid,
   'editor'::public.role_level)
on conflict (id) do nothing;

select plan (11);
```

> The two `resource_shares` rows are also the assertion that Task 6 Step 3
> landed: without the `map` branch in
> `resource_shares__validate_resource_workspace` these inserts raise 23514 and
> the whole file fails before `plan`.

- [ ] **Step 2: Write the eleven assertions**

Each follows the reference file's shape: a `lives_ok` (or `throws_ok`) whose
body sets the role and the JWT claims, then a `do $chk$` block that raises when
the observed count is wrong.

```sql
-- 1. The owner reads their own restricted map.
select lives_ok ($t1$
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"e2100001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$ begin
    if (select count(*)::int from public.maps m
        where m.id = 'e210a001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'owner cannot select their own map';
    end if;
  end $chk$;
$t1$, 'owner selects their own restricted map');

-- 2. A viewer share reads the restricted map.
select lives_ok ($t2$
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"e2100002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$ begin
    if (select count(*)::int from public.maps m
        where m.id = 'e210a001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'viewer share cannot select the map';
    end if;
  end $chk$;
$t2$, 'a viewer share selects a restricted map');

-- 3. A Global Editor with no share cannot read another member's unrestricted
--    map. This is the whole reason util__auth_user_may_select_map exists.
select lives_ok ($t3$
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$ begin
    if (select count(*)::int from public.maps m
        where m.id = 'e210a002-0000-4000-8000-000000000002'::uuid) <> 0 then
      raise exception 'global editor read an unshared unrestricted map';
    end if;
  end $chk$;
$t3$, 'a global editor with no share cannot read an unrestricted map');

-- 4. A Global Viewer with no share can read it: the app-role path still works
--    below editor.
select lives_ok ($t4$
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"e2100002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$ begin
    if (select count(*)::int from public.maps m
        where m.id = 'e210a002-0000-4000-8000-000000000002'::uuid) <> 1 then
      raise exception 'global viewer cannot read an unrestricted map';
    end if;
  end $chk$;
$t4$, 'a global viewer reads an unrestricted map in their workspace');

-- 5. A member of another workspace reads nothing.
select lives_ok ($t5$
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"e2100004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  do $chk$ begin
    if (select count(*)::int from public.maps m
        where m.workspace_id = 'e2101001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'outsider read maps in another workspace';
    end if;
  end $chk$;
$t5$, 'a user outside the workspace reads no maps');

-- 6. Anonymous reads nothing.
select lives_ok ($t6$
  set local role anon;
  do $chk$ begin
    if (select count(*)::int from public.maps) <> 0 then
      raise exception 'anon read a map';
    end if;
  end $chk$;
$t6$, 'anon reads no maps');

-- 7. is_public does not change that. There is no anon policy on maps until
--    Wave E adds the public embed, and this is the assertion that holds it.
select lives_ok ($t7$
  set local role anon;
  do $chk$ begin
    if (select count(*)::int from public.maps m
        where m.id = 'e210a003-0000-4000-8000-000000000003'::uuid) <> 0 then
      raise exception 'anon read a map marked is_public';
    end if;
  end $chk$;
$t7$, 'is_public does not make a map anon-readable');

-- 8. An outsider cannot insert a map claiming this workspace.
select throws_ok ($t8$
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"e2100004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.maps (
    workspace_id, owner_id, owner_profile_id, name, config
  ) values (
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100004-0000-4000-8000-000000000004'::uuid,
    'e2103004-0000-4000-8000-000000000004'::uuid,
    'smuggled map', '{}'::jsonb
  );
$t8$, '42501', NULL, 'an outsider cannot insert a map into another workspace');

-- 9. A Global Viewer cannot insert: INSERT needs a gis app role of editor+.
select throws_ok ($t9$
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"e2100002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.maps (
    workspace_id, owner_id, owner_profile_id, name, config
  ) values (
    'e2101001-0000-4000-8000-000000000001'::uuid,
    'e2100002-0000-4000-8000-000000000002'::uuid,
    'e2103002-0000-4000-8000-000000000002'::uuid,
    'viewer map', '{}'::jsonb
  );
$t9$, '42501', NULL, 'a viewer app role cannot insert a map');

-- 10. An editor share can update the map, but cannot move it to another
--     workspace. The trigger is what catches the second half.
select lives_ok ($t10a$
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.maps set name = 'renamed by editor'
  where id = 'e210a001-0000-4000-8000-000000000001'::uuid;
  do $chk$ begin
    if (select count(*)::int from public.maps m
        where m.id = 'e210a001-0000-4000-8000-000000000001'::uuid
          and m.name = 'renamed by editor') <> 1 then
      raise exception 'editor share could not update the map';
    end if;
  end $chk$;
$t10a$, 'an editor share updates a map');

select throws_ok ($t10b$
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"e2100003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.maps
  set workspace_id = 'e2101002-0000-4000-8000-000000000002'::uuid
  where id = 'e210a001-0000-4000-8000-000000000001'::uuid;
$t10b$, '23514', NULL, 'a map cannot be moved to another workspace');

-- 11. A viewer share cannot delete. RLS filters the DELETE rather than
--     raising, so the assertion is that the row survives.
select lives_ok ($t11$
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"e2100002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.maps
  where id = 'e210a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$ begin
    if (select count(*)::int from public.maps m
        where m.id = 'e210a001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'a viewer share deleted a map';
    end if;
  end $chk$;
$t11$, 'a viewer share cannot delete a map');

select * from finish();
rollback;
```

> `plan(11)` counts eleven `select ... ok(...)` calls, and assertion 10 is two
> of them (`t10a` and `t10b`). Count the calls, not the comment numbers: if you
> add one, raise the plan. A mismatch fails the file with "planned 11 but ran
> 12", which is the whole point of `plan`.

> `reset role` inside `t11` is needed so the verification `select` runs as the
> superuser and can see the row RLS would otherwise hide from the viewer,
> making "the row survived" distinguishable from "the row is invisible".

- [ ] **Step 3: Run the database tests**

Run: `pnpm test:db`
Expected: the new file passes and no existing file regresses. In particular
`util_resource_effective_role.test.sql` and `resource_rls_role_matrix.test.sql`
must still pass: the four helpers changed in Task 6 are what they cover.

- [ ] **Step 4: Commit**

```bash
git add supabase/tests
git commit -m "test(gis): pgTAP coverage for maps RLS"
```

---

## Task 8: Extend private-resource administration to maps

`maps.owner_id` is `ON DELETE NO ACTION`, so a member who owns a map cannot be
removed from a workspace until their maps are transferred. Without this task,
Wave A makes offboarding fail with no path to fix it.

**Files:**

- Modify: `supabase/schemas/70.rpc_resources__transfer_ownership.sql`
- Modify: `supabase/schemas/71.rpc_workspaces__transfer_all_owned_resources.sql`
- Modify: `supabase/schemas/70.rpc_workspaces__private_resource_counts.sql`
- Modify: `src/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient.ts`
- Modify: `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivateResourcesPanel/PrivateResourceRow.tsx` and its panel's table header
- Modify: `src/views/WorkspaceSettingsPage/WorkspaceUsersTab/usePrivateResourceRemovalState/usePrivateResourceRemovalState.ts` and its test
- Modify: `src/views/WorkspaceSettingsPage/PrivacyLogTab/PrivacyLogTab.test.tsx`

- [ ] **Step 1: Add the map branch to the ownership transfer**

In `70.rpc_resources__transfer_ownership.sql`, add a lookup branch:

```sql
  elsif p_resource_type = 'map' then
    select m.workspace_id, m.owner_id
    into v_workspace_id, v_current_owner_id
    from public.maps m
    where m.id = p_resource_id
    for update;
    v_app := 'gis';
```

Then convert the two-way write near the end into a three-way. The existing
`else` silently means "datasets", which would send a map's update to the wrong
table:

```sql
if p_resource_type = 'dashboard' then
update public.dashboards
set
  owner_id = p_new_owner_id,
  owner_profile_id = v_new_profile_id
where
  id = p_resource_id;

elsif p_resource_type = 'dataset' then
update public.datasets
set
  owner_id = p_new_owner_id,
  owner_profile_id = v_new_profile_id
where
  id = p_resource_id;

else
update public.maps
set
  owner_id = p_new_owner_id,
  owner_profile_id = v_new_profile_id
where
  id = p_resource_id;

end if;
```

Update the docstring: "on both resource tables" becomes "on every resource
table".

- [ ] **Step 2: Transfer maps in the bulk transfer**

In `71.rpc_workspaces__transfer_all_owned_resources.sql`, add a third loop
after the datasets loop, and change the docstring's "every dashboard and
dataset" to "every dashboard, dataset, and map":

```sql
  for v_resource_id in
    select m.id
    from public.maps m
    where
      m.workspace_id = p_workspace_id and
      m.owner_id = p_from_user_id
    for update
  loop
    perform public.rpc_resources__transfer_ownership (
      'map'::public.resource_type,
      v_resource_id,
      p_new_owner_id
    );
    v_moved := v_moved + 1;
  end loop;
```

- [ ] **Step 3: Count private maps**

In `70.rpc_workspaces__private_resource_counts.sql`, add
`private_map_count bigint` to the returns table, a `private_maps` CTE mirroring
`private_datasets` (maps have no `is_public` exclusion, because the column is
inert), the extra select item, and the extra left join:

```sql
  private_maps as (
    select m.owner_id, count(*) as resource_count
    from public.maps m
    where
      m.workspace_id = p_workspace_id and
      m.is_restricted and
      not public.util__has_non_owner_share (
        'map'::public.resource_type,
        m.id,
        m.workspace_id,
        m.owner_id
      )
    group by m.owner_id
  )
```

```sql
select
  wm.user_id,
  coalesce(pd.resource_count, 0),
  coalesce(pds.resource_count, 0),
  coalesce(pm.resource_count, 0)
from
  public.workspace_memberships wm
  left join private_dashboards pd on pd.owner_id = wm.user_id
  left join private_datasets pds on pds.owner_id = wm.user_id
  left join private_maps pm on pm.owner_id = wm.user_id
where
  wm.workspace_id = p_workspace_id;
```

- [ ] **Step 4: Generate and apply the migration**

Run: `pnpm db:new-migration maps_private_resource_administration`

Read the generated file: changing a function's `returns table` requires a
`drop function` before the `create`, and `db diff` does emit that. Confirm the
drop and the recreate are both present and that nothing else was touched.

Run: `pnpm db:apply-migrations && pnpm db:gen-types`

- [ ] **Step 5: Carry the new count through the client**

In `PrivateResourceAdminClient.ts`, add to the mapped row:

```ts
        privateMapCount: row.private_map_count,
```

and add `privateMapCount: number;` to the `PrivateResourceCount` type where it
is declared.

- [ ] **Step 6: Show it, and count it as blocking removal**

In `PrivateResourceRow.tsx`, add the count to the "has private resources"
condition and add a cell:

```tsx
privateResourceCount.privateDashboardCount > 0 ||
  privateResourceCount.privateDatasetCount > 0 ||
  privateResourceCount.privateMapCount > 0;
```

```tsx
<Table.Td>{privateResourceCount.privateMapCount}</Table.Td>
```

Add the matching `<Table.Th>` in the panel that renders the header, labelled
`t\`Maps\``. Then update `usePrivateResourceRemovalState`so its total includes`privateMapCount`, and add `privateMapCount`to the fixtures in both`usePrivateResourceRemovalState.test.tsx`and`PrivacyLogTab.test.tsx`.

- [ ] **Step 7: Assert a map blocks removal**

In `usePrivateResourceRemovalState.test.tsx`, add a case where the only
non-zero count is `privateMapCount: 1` and assert the hook reports the member
as blocked. Without this assertion the map count could be carried through the
client and never consulted, which is exactly the bug this task exists to
prevent.

- [ ] **Step 8: Run the tests**

Run: `pnpm test:db && pnpm test:frontend PrivateResource && pnpm test:frontend PrivacyLogTab && pnpm type-check`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add supabase src/clients/permissions src/views/WorkspaceSettingsPage \
  shared/types/database.types.ts
git commit -m "feat(gis): include maps in private-resource administration"
```

---

## Task 9: Add the `AvaMapClient` and the `map` resource copy

**Files:**

- Create: `src/clients/maps/AvaMapClient.ts`
- Modify: `shared/copy/resourceTypeLabel.ts`
- Modify: `src/components/permissions/ShareResourceModal/shareCopy.ts`

- [ ] **Step 1: Write the client**

`src/clients/maps/AvaMapClient.ts`. `createRdbCrudClient` injects the db
handle, so nothing is passed for it.

```ts
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema";
import { AvaMapParsers } from "$/models/AvaMap/AvaMapParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

export const AvaMapClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "AvaMap",
    tableName: "maps",
    dbTablePrimaryKey: "id",
    parsers: AvaMapParsers,
    mutations: (config) => {
      return {
        /**
         * Persists a map's configuration.
         *
         * Goes through {@link AvaMapConfigSchema.toJson} rather than handing
         * the model object to the parser directly, because the config carries
         * `undefined` on its optional fields and `undefined` is not valid
         * JSON: PostgREST would drop those keys inconsistently. Serializing
         * first makes what is written byte-identical to what
         * {@link AvaMapConfigSchema.fromJson} will read back.
         */
        saveMapConfig: async (params: {
          mapId: AvaMap.Id;
          name: string;
          mapConfig: AvaMapConfig.T;
        }): Promise<AvaMap.T> => {
          const dbUpdate = config.parsers.fromModelUpdateToDBUpdate({
            name: params.name,
            config: AvaMapConfigSchema.toJson(
              params.mapConfig,
            ) as AvaMapConfig.T,
          });
          const { data } = await config.dbClient
            .from("maps")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update(dbUpdate as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .eq("id", params.mapId as any)
            .select("*")
            .single()
            .throwOnError();

          return config.parsers.fromDBReadToModelRead(data);
        },
      };
    },
  }),
  {
    mutationFns: ["saveMapConfig", "insert", "update", "delete"],
  },
);
```

> The two `any` casts and their eslint-disables are copied verbatim from
> `DashboardClient.publishDashboard`. They are the shape `createRdbCrudClient`
> exposes for an escape-hatch mutation, not a shortcut: `config.dbClient` is
> typed against the generated schema and `dbUpdate` is a parser output, and the
> two do not unify without them. Do not invent a different workaround here.

- [ ] **Step 2: Extend the resource-type copy**

`shared/copy/resourceTypeLabel.ts`. `ResourceType` is now a three-member union,
so the ternary stops being exhaustive; use `matchLiteral`, which the repo uses
elsewhere for exactly this:

```ts
import { matchLiteral } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import type { Database } from "$/types/database.types.ts";

type ResourceType = Database["public"]["Enums"]["resource_type"];

/**
 * Returns the human-readable label for a resource type. Shared copy used in
 * headings, tooltips, and summary lines wherever a `ResourceType` is surfaced
 * to the user.
 */
export function resourceTypeLabel(type: ResourceType): string {
  return matchLiteral(type, {
    dashboard: t`dashboard`,
    dataset: t`dataset`,
    map: t`map`,
  });
}
```

- [ ] **Step 3: Map the resource type to its app in the share modal**

`src/components/permissions/ShareResourceModal/shareCopy.ts`:

```ts
/**
 * Maps a `ResourceType` to the workspace app that owns it. Datasets live
 * under `data_sources`, dashboards under `dashboards`, and maps under `gis`.
 */
export function appForResource(type: ResourceType): AppType {
  return matchLiteral(type, {
    dashboard: "dashboards",
    dataset: "data_sources",
    map: "gis",
  });
}
```

with `import { matchLiteral } from "@avandar/utils";`.

- [ ] **Step 4: Verify no other switch on `ResourceType` was missed**

Run: `pnpm type-check`
Expected: no errors. TypeScript catches every exhaustive switch that the new
enum member broke; a non-exhaustive `if/else` will not be caught, so also run:

```bash
grep -rn '=== "dashboard"\|=== "dataset"' src shared | grep -v node_modules
```

and read each hit. Any that means "and everything else is a dataset" needs the
map case adding.

- [ ] **Step 5: Commit**

```bash
git add src/clients/maps shared/copy src/components/permissions
git commit -m "feat(gis): add AvaMapClient and map resource copy"
```

---

## Task 10: Route the map app on a real map id

Today `/map` renders an in-memory map with no id, so nothing can be shared or
reopened. It becomes a directory route: a guarded parent, an index that lists,
and a child that loads one map.

**Files:**

- Create: `src/routes/_auth/$workspaceSlug/map/route.tsx`
- Create: `src/routes/_auth/$workspaceSlug/map/index.tsx`
- Create: `src/routes/_auth/$workspaceSlug/map/$mapId.tsx`
- Delete: `src/routes/_auth/$workspaceSlug/map.tsx`
- Modify: `src/config/AppLinks.tsx`, `src/config/NavbarLinks.tsx`, `src/components/layouts/RootLayout/WorkspaceLayout.tsx`

- [ ] **Step 1: Move the guard to a parent route**

```bash
mkdir -p "src/routes/_auth/\$workspaceSlug/map"
git rm "src/routes/_auth/\$workspaceSlug/map.tsx"
```

`src/routes/_auth/$workspaceSlug/map/route.tsx`:

```tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { appLabel } from "$/copy/appLabel";
import { RouteMiddleware } from "@/utils/RouteMiddleware";

export const Route = createFileRoute("/_auth/$workspaceSlug/map")({
  beforeLoad: RouteMiddleware.BeforeLoad.checkUserPermissions({
    permissionKey: "gis__can_view_map",
    appLabel: () => {
      return appLabel("gis");
    },
    // A map shared with someone who has no gis app role must still open, the
    // same way a shared dashboard does.
    resourceFallback: {
      type: "map",
      idParam: "mapId",
      minRole: "viewer",
    },
  }),
  component: MapLayout,
});

function MapLayout(): JSX.Element {
  return <Outlet />;
}
```

- [ ] **Step 2: Add the editor route**

`src/routes/_auth/$workspaceSlug/map/$mapId.tsx`:

```tsx
import { createFileRoute, notFound } from "@tanstack/react-router";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { GisApp } from "@/views/GisApp/GisApp";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

export const Route = createFileRoute("/_auth/$workspaceSlug/map/$mapId")({
  loader: async ({ params }): Promise<{ avaMap: AvaMap.T }> => {
    const avaMap = await AvaMapClient.getById({
      id: params.mapId as AvaMap.Id,
    });

    if (!avaMap) {
      throw notFound();
    }

    return { avaMap };
  },
  component: MapEditorPage,
});

function MapEditorPage(): JSX.Element {
  const { avaMap } = Route.useLoaderData();
  return <GisApp avaMap={avaMap} />;
}
```

> `GisApp` still takes `workspaceId` at this point. Change its props to
> `{ avaMap }` and read the workspace id from `avaMap.workspaceId`, which is
> the id the map's layers must be queried against regardless of which
> workspace slug the URL carries.

- [ ] **Step 3: Add the index route**

`src/routes/_auth/$workspaceSlug/map/index.tsx`:

```tsx
import { where } from "@avandar/utils";
import { createFileRoute } from "@tanstack/react-router";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { MapListView } from "@/views/GisApp/MapListView/MapListView";

export const Route = createFileRoute("/_auth/$workspaceSlug/map/")({
  component: MapsPage,
});

function MapsPage(): JSX.Element {
  const { workspaceSlug } = Route.useParams();
  const workspace = useCurrentWorkspace();
  const [avaMaps] = AvaMapClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  return <MapListView avaMaps={avaMaps ?? []} workspaceSlug={workspaceSlug} />;
}
```

> Unlike the dashboards index, this does **not** filter on `owner_id`. RLS
> already limits the rows to maps the caller may read, and filtering by owner
> would hide a map that was shared with them, which is the whole point of
> making maps a resource.

- [ ] **Step 4: Add the app link for one map**

In `src/config/AppLinks.tsx`, beside the existing `map` entry:

```tsx
  mapEditor: ({
    workspaceSlug,
    mapId,
  }: {
    workspaceSlug: string;
    mapId: string;
  }) => {
    return {
      key: "mapEditor",
      to: "/$workspaceSlug/map/$mapId",
      params: { workspaceSlug, mapId },
      label: "Map",
      isAvailableOffline: false,
    };
  },
```

Also change the existing `map` entry's label from `"Geo Explorer"` to
`"Maps"`: it is now a list of a shareable resource, and the nav label has to
match what the page shows.

- [ ] **Step 5: Gate the nav entry on the permission, not the feature flag**

The inventory §6.9 records this as a Wave A blocker: the route is guarded on
`gis__can_view_map` but the nav link is guarded on the
`disable-geo-explorer` flag, which is on in `.env.development`, so a shareable
map has no nav entry. Every other app gates its link on the matching
permission.

In `src/config/NavbarLinks.tsx`, delete the `isEnabled` thunk from the `map`
entry:

```tsx
  map: (workspaceSlug: string) => {
    return {
      link: AppLinks.map(workspaceSlug),
      icon: <IconMap size={DEFAULT_ICON_SIZE} stroke={1.5} />,
    };
  },
```

Then in `src/components/layouts/RootLayout/WorkspaceLayout.tsx`, replace the
unconditional `links.push(NavbarLinks.map(workspace.slug))` with a permission
check, matching the four apps above it:

```tsx
const canAccessMaps = useHasPermission("gis__can_view_map");
```

```tsx
if (canAccessMaps) {
  links.push(NavbarLinks.map(workspace.slug));
}
```

Add `canAccessMaps` to that `useMemo`'s dependency array.

> Leave `FeatureFlag.DisableGeoExplorer` in place. It is still the switch for
> turning the app off in an environment, and it is read elsewhere; this change
> is only about the nav link no longer being the thing it gates.

- [ ] **Step 6: Type check and open both routes**

Run: `pnpm type-check`
Expected: the route tree regenerates and there are no errors. If TanStack's
generated `routeTree.gen.ts` is stale, run the dev server once to regenerate
it.

Then run the app (`pnpm dev`), sign in, and confirm: **Maps** appears in the
nav rail, `/{workspaceSlug}/map` renders the list (empty), and navigating to a
non-existent `/{workspaceSlug}/map/<random-uuid>` renders the not-found route
rather than crashing.

- [ ] **Step 7: Commit**

```bash
git add src/routes src/config src/components/layouts
git commit -m "feat(gis): route the map app on a persisted map id"
```

---

## Task 11: Build the map list view

Mirrors `DashboardListView`. Read it before starting; the create-then-navigate
mutation shape is copied from it.

**Files:**

- Create: `src/views/GISApp/MapListView/MapListView.tsx`
- Create: `src/views/GISApp/MapListView/MapCard.tsx`

- [ ] **Step 1: Write the card**

`src/views/GISApp/MapListView/MapCard.tsx`:

```tsx
import { Link, Paper } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconMap } from "@tabler/icons-react";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

type Props = { avaMap: AvaMap.T; workspaceSlug: string };

/** One map in the list: name, layer count, and when it was last saved. */
export function MapCard({ avaMap, workspaceSlug }: Props): ReactNode {
  const { t, i18n } = useLingui();
  const layerCount = avaMap.config.layers.length;
  return (
    <Paper p="md">
      <Link
        to="/$workspaceSlug/map/$mapId"
        params={{ workspaceSlug, mapId: avaMap.id }}
        aria-label={t`Open the map ${avaMap.name}`}
      >
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon variant="light" color="neutral" size="lg">
            <IconMap size={18} stroke={1.5} />
          </ThemeIcon>
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600} size="sm" truncate>
              {avaMap.name}
            </Text>
            <Text c="dimmed" size="xs">
              {layerCount === 1 ? t`1 layer` : t`${layerCount} layers`}
              {" · "}
              {i18n.date(new Date(avaMap.updatedAt), {
                dateStyle: "medium",
              })}
            </Text>
          </Stack>
        </Group>
      </Link>
    </Paper>
  );
}
```

- [ ] **Step 2: Write the list view**

`src/views/GISApp/MapListView/MapListView.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

type Props = { avaMaps: readonly AvaMap.T[]; workspaceSlug: string };

/** Lists the workspace's maps and creates new ones. */
export function MapListView({ avaMaps, workspaceSlug }: Props): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();

  const [insertMap, isCreating] = AvaMapClient.useInsert({
    queryToInvalidate: AvaMapClient.QueryKeys.getAll(),
    onSuccess: (createdMap) => {
      navigate({
        to: "/$workspaceSlug/map/$mapId",
        params: { workspaceSlug, mapId: createdMap.id },
      });
    },
  });

  const onCreateMapClick = (): void => {
    if (!userProfile) {
      return;
    }
    insertMap({
      data: {
        name: t`Untitled map`,
        description: undefined,
        slug: undefined,
        workspaceId: workspace.id,
        ownerId: userProfile.userId,
        ownerProfileId: userProfile.id,
        config: AvaMapConfig.makeEmpty(),
      },
    });
  };

  return (
    <AppLayout title={t`Maps`}>
      <Stack gap="md" p="md">
        <Button
          leftSection={<IconPlus size={16} />}
          loading={isCreating}
          disabled={!userProfile}
          onClick={onCreateMapClick}
          style={{ alignSelf: "flex-start" }}
        >
          {t`New map`}
        </Button>
        {avaMaps.length === 0 ? (
          <Stack gap="xs">
            <Title order={4}>{t`No maps yet`}</Title>
            <Text c="dimmed" size="sm">
              {t`A map plots your datasets, derived datasets, and profiles as layers you can style, save, and share.`}
            </Text>
          </Stack>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {avaMaps.map((avaMap) => {
              return (
                <MapCard
                  key={avaMap.id}
                  avaMap={avaMap}
                  workspaceSlug={workspaceSlug}
                />
              );
            })}
          </SimpleGrid>
        )}
      </Stack>
    </AppLayout>
  );
}
```

Add the `MapCard` import. Check `AppLayout`'s actual prop names against
`src/components/layouts/AppLayout/AppLayout.tsx` before wiring it: match what
`DashboardListView` passes.

- [ ] **Step 3: Verify creating a map works end to end**

Run the app, open `/{workspaceSlug}/map`, press **New map**.
Expected: a row lands in `public.maps` and the browser navigates to
`/{workspaceSlug}/map/<id>`. Confirm the row:

```bash
pnpm db:sql-cmd "select id, name, jsonb_typeof(config) from public.maps;"
```

Expected: one row, `Untitled map`, `object`.

- [ ] **Step 4: Commit**

```bash
git add src/views/GISApp/MapListView
git commit -m "feat(gis): add the map list view"
```

---

# Stage 3: the shell chrome

Direction C: the map is the substrate and every panel floats above it, except
one docked furniture strip. Shell design §3 for the direction, §8 for the
responsive bands, §9 for the keyboard walk, §10.1 for the component list.

## Token translation (read once, applies to every task in Stages 3 to 5)

The prototype's `--*` variables map onto real theme variables. Use the right
column; never re-declare the left column in a CSS module.

| Prototype                                                                                               | Use instead                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--sp-xxxs` … `--sp-xl`                                                                                 | `var(--mantine-spacing-xxxs)` … `var(--mantine-spacing-xl)`                                                                                          |
| `--r-xs` … `--r-xl`                                                                                     | `var(--mantine-radius-xs)` … `var(--mantine-radius-xl)`                                                                                              |
| `--shadow-xs` … `--shadow-lg`                                                                           | `var(--mantine-shadow-xs)` … `var(--mantine-shadow-lg)`                                                                                              |
| `--surface-overlay`, `--surface-raised`, `--surface-sunken`, `--surface-panel-header`, `--surface-body` | `var(--ava-surface-overlay)`, `var(--ava-surface-raised)`, `var(--ava-surface-sunken)`, `var(--ava-surface-panel-header)`, `var(--ava-surface-body)` |
| `--border-default`, `--border-strong`, `--border-focus`                                                 | `var(--ava-border-default)`, `var(--ava-border-strong)`, `var(--ava-border-focus)`                                                                   |
| `--text`, `--text-dimmed`                                                                               | `var(--mantine-color-text)`, `var(--mantine-color-dimmed)`                                                                                           |
| `--blue-0` … `--blue-7`                                                                                 | `var(--mantine-color-primary-0)` … `var(--mantine-color-primary-7)`                                                                                  |
| `--n0` … `--n9`                                                                                         | `var(--mantine-color-neutral-0)` … `var(--mantine-color-neutral-9)`                                                                                  |
| `--warning-0`, `--warning-8`, `--danger-0`, `--danger-6`, `--danger-8`                                  | `var(--mantine-color-warning-0)`, `-8`, `var(--mantine-color-danger-0)`, `-6`, `-8`                                                                  |
| `--dur-fast`, `--dur-normal`                                                                            | `140ms`, `200ms` (`ANIMATION_DURATION.fast` / `.normal`)                                                                                             |
| `--ease-out`                                                                                            | `cubic-bezier(0.16, 1, 0.3, 1)` (`ANIMATION_EASING.out`)                                                                                             |

Three things to know before writing any of it:

1. **`--ava-border-focus` is a neutral in this theme, not blue.** The prototype
   declares it as `--blue-6`, which is one of the few values it invented.
   Shell design §9.6 says the ring is `var(--ava-border-focus)`; use the token
   and accept the neutral. Do not hardcode blue to match the prototype.
2. **The prototype's motion values (180ms, a different curve) are not in the
   theme.** Use the theme's `normal` and `out` from the table above.
3. **Dark theme needs no per-rule work** for surfaces, borders, or text: those
   variables already flip. Only the places the prototype writes a literal
   (`.layer` selected background, badge fills, tooltip inversion) need a
   `[data-mantine-color-scheme="dark"]` rule, and each is called out where it
   appears.

---

## Task 12: Build the shell grid, the skip links, and the hide-chrome shortcut

**Files:**

- Create: `src/views/GISApp/shell/MapShell.tsx`
- Create: `src/views/GISApp/shell/MapShell.module.css`
- Create: `src/views/GISApp/shell/SkipLinks/SkipLinks.tsx`
- Create: `src/views/GISApp/shell/SkipLinks/SkipLinks.module.css`
- Create: `src/views/GISApp/shell/useMapChromeInsets/useMapChromeInsets.ts`

- [ ] **Step 1: Write the insets hook**

The camera must never fly data under an expanded panel (shell design §3, point
5). This measures the panels so `fitBounds` can be given real padding.

`src/views/GISApp/shell/useMapChromeInsets/useMapChromeInsets.ts`:

```ts
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/** Padding, in CSS pixels, that keeps map data clear of floating chrome. */
export type MapChromeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Gutter between a panel's edge and the data the camera fits. */
const GUTTER_PX = 24;

/**
 * Bottom clearance for the tool cluster and the status card.
 *
 * A constant rather than a measurement because the cluster is centred and
 * fixed-height, and the status card appears and disappears: measuring it would
 * make the camera's framing depend on whether a warning happens to be showing.
 */
const BOTTOM_INSET_PX = 88;

/**
 * Measures the floating panels so camera moves can avoid them.
 *
 * Returns refs rather than state on purpose. Padding only matters at the
 * instant the camera moves, so writing it into a ref keeps a panel resize from
 * re-rendering the whole map app.
 */
export function useMapChromeInsets(): {
  topBarRef: RefObject<HTMLDivElement | null>;
  leftColumnRef: RefObject<HTMLDivElement | null>;
  rightColumnRef: RefObject<HTMLDivElement | null>;
  insetsRef: RefObject<MapChromeInsets>;
} {
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const leftColumnRef = useRef<HTMLDivElement | null>(null);
  const rightColumnRef = useRef<HTMLDivElement | null>(null);
  const insetsRef = useRef<MapChromeInsets>({
    top: GUTTER_PX,
    right: GUTTER_PX,
    bottom: BOTTOM_INSET_PX,
    left: GUTTER_PX,
  });

  useEffect(function observeChromeSize() {
    const readInsets = (): void => {
      insetsRef.current = {
        top: (topBarRef.current?.offsetHeight ?? 0) + GUTTER_PX,
        right: (rightColumnRef.current?.offsetWidth ?? 0) + GUTTER_PX,
        bottom: BOTTOM_INSET_PX,
        left: (leftColumnRef.current?.offsetWidth ?? 0) + GUTTER_PX,
      };
    };
    readInsets();
    const observer = new ResizeObserver(readInsets);
    [topBarRef, leftColumnRef, rightColumnRef].forEach((elementRef) => {
      if (elementRef.current) {
        observer.observe(elementRef.current);
      }
    });
    return () => {
      observer.disconnect();
    };
  }, []);

  return { topBarRef, leftColumnRef, rightColumnRef, insetsRef };
}
```

- [ ] **Step 2: Write the skip links**

Shell design §9.2: the first inspector control is tab stop 28 and the first
tool-cluster control is stop 49, so the second link saves 42 key presses.
Landmarks solve this for a screen reader and solve nothing for a sighted
keyboard user.

`src/views/GISApp/shell/SkipLinks/SkipLinks.module.css`:

```css
.skipLinks {
  display: flex;
  gap: var(--mantine-spacing-xs);
  left: 50%;
  position: absolute;
  top: var(--mantine-spacing-xs);
  transform: translateX(-50%);
  z-index: 40;
}

.skipLink {
  clip: rect(0 0 0 0);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.skipLink:focus {
  background: var(--ava-surface-overlay);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  box-shadow: var(--mantine-shadow-md);
  clip: auto;
  color: var(--mantine-color-text);
  font-size: 12px;
  font-weight: 600;
  height: auto;
  padding: var(--mantine-spacing-xxs) var(--mantine-spacing-xs);
  position: static;
  text-decoration: none;
  width: auto;
}
```

`src/views/GISApp/shell/SkipLinks/SkipLinks.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/shell/SkipLinks/SkipLinks.module.css";
import type { ReactNode } from "react";

/**
 * Element ids the skip links target. Exported so the panels that own them
 * cannot drift from the links that point at them.
 */
export const GIS_SKIP_TARGET_IDS = {
  inspectorBody: "gis-inspector-body",
  toolCluster: "gis-map-tools",
} as const;

/** Two links, hidden until focused, that jump past the layer stack. */
export function SkipLinks(): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.skipLinks}>
      <a
        className={css.skipLink}
        href={`#${GIS_SKIP_TARGET_IDS.inspectorBody}`}
      >
        {t`Skip to layer settings`}
      </a>
      <a className={css.skipLink} href={`#${GIS_SKIP_TARGET_IDS.toolCluster}`}>
        {t`Skip to map tools`}
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Write the shell stylesheet**

`src/views/GISApp/shell/MapShell.module.css`. Every value here is the
prototype's, with the token substitutions from the table above.

```css
/*
 * The shell is the map's substrate. It fills the app's content area, and
 * everything except the furniture strip floats above it.
 *
 * The container query is on this element rather than the viewport because the
 * workspace nav rail takes a fixed 200px off every viewport width, so the
 * panels have to respond to the canvas. Canvas 1000px is roughly viewport lg
 * and canvas 792px is roughly viewport md.
 */
.mapShell {
  container-name: mapShell;
  container-type: inline-size;
  display: grid;
  grid-template-rows: 1fr auto;
  height: calc(100dvh - var(--app-shell-header-offset, 0px));
  min-width: 0;
  position: relative;
}

.mapSurface {
  background: var(--ava-surface-sunken);
  overflow: hidden;
  position: relative;
}

/*
 * One grid over the map keeps every panel on the same gutter without
 * absolute-position arithmetic.
 */
.chrome {
  display: grid;
  gap: var(--mantine-spacing-sm);
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr auto;
  inset: 0;
  padding: var(--mantine-spacing-sm);
  pointer-events: none;
  position: absolute;
}

.chrome > * {
  pointer-events: auto;
}

/*
 * Wrap rather than clip. An action that runs off the edge of the map is an
 * action the user cannot reach.
 */
.topBar {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: var(--mantine-spacing-sm);
  grid-column: 1 / -1;
  grid-row: 1;
  justify-content: space-between;
}

.leftColumn {
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-sm);
  grid-column: 1;
  grid-row: 2;
  min-height: 0;
}

.rightColumn {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-sm);
  grid-column: 3;
  grid-row: 2 / 4;
  min-height: 0;
}

.bottomLeft {
  align-self: end;
  grid-column: 1;
  grid-row: 3;
}

/*
 * The tool cluster centres on the map, not on the space between the panels, so
 * it does not jump when a panel collapses. A fixed reference point is what lets
 * a tool cluster become muscle memory.
 */
.bottomCenter {
  align-items: center;
  align-self: end;
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-xs);
  grid-column: 1 / -1;
  grid-row: 3;
  justify-self: center;
}

.firstRun {
  align-self: center;
  grid-column: 1 / -1;
  grid-row: 2;
  justify-self: center;
}

/*
 * Below lg: one panel at a time. The inspector yields first, because the stack
 * is how you navigate a map and the inspector is how you edit one layer.
 * Panel widths themselves live in MapChromePanel.module.css.
 */
@container mapShell (max-width: 792px) {
  .leftColumn,
  .rightColumn {
    align-self: stretch;
    grid-row: 2 / 4;
  }
}

@container mapShell (max-width: 520px) {
  .leftColumn,
  .rightColumn,
  .bottomCenter {
    display: none;
  }
}
```

- [ ] **Step 4: Write the shell component**

`src/views/GISApp/shell/MapShell.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/shell/MapShell.module.css";
import { SkipLinks } from "@/views/GisApp/shell/SkipLinks/SkipLinks";
import type { MapChromeInsets } from "@/views/GisApp/shell/useMapChromeInsets/useMapChromeInsets";
import type { ReactNode, RefObject } from "react";

type Props = {
  /** The map itself, rendered as the substrate under every panel. */
  canvas: ReactNode;
  topBar: ReactNode;
  layerPanel: ReactNode;
  inspector: ReactNode;
  legend: ReactNode;
  toolCluster: ReactNode;
  statusCard: ReactNode;
  furnitureBar: ReactNode;

  /** Centred over the map, shown only when the map has no layers. */
  firstRunCard: ReactNode;

  /** Name announced for the map region, e.g. "Map of Cholera response". */
  mapLabel: string;

  /**
   * When true every floating panel is hidden and only the map and the
   * furniture strip remain, so the author can judge the composition they are
   * about to export.
   */
  isChromeHidden: boolean;

  topBarRef: RefObject<HTMLDivElement | null>;
  leftColumnRef: RefObject<HTMLDivElement | null>;
  rightColumnRef: RefObject<HTMLDivElement | null>;
};

/**
 * The Direction C shell: a full-bleed map with floating chrome and one docked
 * furniture strip.
 *
 * Takes its regions as props rather than composing them itself so the layout
 * and the panels can be reasoned about, and tested, separately. `insetsRef`
 * from {@link useMapChromeInsets} is fed by the three refs this takes.
 */
export function MapShell({
  canvas,
  topBar,
  layerPanel,
  inspector,
  legend,
  toolCluster,
  statusCard,
  furnitureBar,
  firstRunCard,
  mapLabel,
  isChromeHidden,
  topBarRef,
  leftColumnRef,
  rightColumnRef,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.mapShell}>
      <div
        className={css.mapSurface}
        role="application"
        aria-label={t`${mapLabel}. Use the layer panel to change what is shown.`}
      >
        {canvas}
        <div className={css.chrome}>
          <SkipLinks />
          {isChromeHidden ? null : (
            <>
              <div className={css.topBar} ref={topBarRef}>
                {topBar}
              </div>
              {firstRunCard ? (
                <div className={css.firstRun}>{firstRunCard}</div>
              ) : null}
              <div className={css.leftColumn} ref={leftColumnRef}>
                {layerPanel}
              </div>
              <div className={css.rightColumn} ref={rightColumnRef}>
                {inspector}
              </div>
              <div className={css.bottomLeft}>{legend}</div>
              <div className={css.bottomCenter}>
                {statusCard}
                {toolCluster}
              </div>
            </>
          )}
        </div>
      </div>
      {furnitureBar}
    </div>
  );
}
```

> `role="application"` on the map surface is what shell design §9.3 asks for,
> and it is deliberate: MapLibre binds arrow keys, `+` and `-` to the camera,
> and `application` is what stops a screen reader intercepting them.

- [ ] **Step 5: Verify the shell fills the content area exactly**

There is one value here that cannot be derived from the source: whether
`--app-shell-header-offset` is set on desktop. `AppShell` renders an
`AppShell.Header` but passes no `header={{ height }}`.

Run the app on the map route with a placeholder canvas and confirm, in the
browser, that the furniture strip's bottom edge sits flush with the viewport
bottom and the page does not scroll vertically. If it overflows or falls short,
read the computed value:

```js
getComputedStyle(document.documentElement).getPropertyValue(
  "--app-shell-header-offset",
);
```

and change `.mapShell`'s `height` to match what is actually there, leaving a
comment naming the measured value. Do not guess.

- [ ] **Step 6: Type check and lint**

Run: `pnpm type-check && pnpm lint:css`
Expected: no errors. `lint:css` is the one that catches an out-of-order
property, so run it now rather than at the end of the stage.

- [ ] **Step 7: Commit**

```bash
git add src/views/GISApp/shell
git commit -m "feat(gis): add the Direction C map shell and skip links"
```

---

## Task 13: Build the collapsible floating panel

Every floating surface is the same thing: an opaque `Paper` with a compact
header that collapses to a pill. Shell design §3.4 makes the opacity a hard
accessibility requirement, not a style preference: the moment a panel is
translucent over a basemap, contrast becomes a function of what the map is
showing and no contrast minimum can be met.

**Files:**

- Create: `src/views/GISApp/shell/MapChromePanel/MapChromePanel.tsx`
- Create: `src/views/GISApp/shell/MapChromePanel/MapChromePanel.module.css`
- Create: `src/views/GISApp/shell/useChromePanelState/useChromePanelState.ts`
- Test: `src/views/GISApp/shell/useChromePanelState/useChromePanelState.test.ts`

- [ ] **Step 1: Write the failing test for the panel state**

Shell design §3, points 3 and 4, and §8.1: both panels are expanded at `lg` and
above, the inspector collapses first below `lg`, and both start collapsed below
`md`. And §3.4: which panels are expanded is a **per-user preference, not part
of the saved config**, because a shared map should open in the recipient's own
working layout.

`src/views/GISApp/shell/useChromePanelState/useChromePanelState.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getDefaultPanelState } from "@/views/GisApp/shell/useChromePanelState/useChromePanelState";

describe("getDefaultPanelState", () => {
  it("expands both panels on a wide canvas", () => {
    expect(getDefaultPanelState(1200)).toEqual({
      layers: false,
      inspector: false,
      legend: false,
    });
  });

  it("collapses the inspector first below 1000px of canvas", () => {
    expect(getDefaultPanelState(900)).toEqual({
      layers: false,
      inspector: true,
      legend: false,
    });
  });

  it("collapses everything at tablet width", () => {
    expect(getDefaultPanelState(700)).toEqual({
      layers: true,
      inspector: true,
      legend: true,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend useChromePanelState`
Expected: FAIL, cannot resolve `getDefaultPanelState`.

- [ ] **Step 3: Implement the panel state hook**

`src/views/GISApp/shell/useChromePanelState/useChromePanelState.ts`:

```ts
import { useLocalStorage } from "@mantine/hooks";
import { useCallback, useMemo } from "react";

/** The floating panels whose collapse state a user controls. */
export type ChromePanelId = "layers" | "inspector" | "legend";

/** Collapsed state per panel. `true` means collapsed to its header pill. */
export type ChromePanelState = Record<ChromePanelId, boolean>;

/** Canvas width, in px, below which the inspector starts collapsed. */
const INSPECTOR_YIELDS_AT_PX = 1000;

/** Canvas width, in px, below which every panel starts collapsed. */
const TABLET_AT_PX = 792;

/**
 * Which panels start collapsed at a given canvas width.
 *
 * The inspector yields first because the stack is how you navigate a map and
 * the inspector is how you edit one layer: losing the way you navigate costs
 * more, and the inspector is one click away.
 *
 * @param canvasWidth Width of the map canvas in CSS pixels, not the viewport.
 */
export function getDefaultPanelState(canvasWidth: number): ChromePanelState {
  if (canvasWidth < TABLET_AT_PX) {
    return { layers: true, inspector: true, legend: true };
  }
  if (canvasWidth < INSPECTOR_YIELDS_AT_PX) {
    return { layers: false, inspector: true, legend: false };
  }
  return { layers: false, inspector: false, legend: false };
}

/**
 * Per-user panel collapse state, persisted across sessions.
 *
 * Deliberately NOT part of the saved map config: a map shared with a colleague
 * should open in that colleague's own working layout, not in the author's.
 *
 * @param canvasWidth Current canvas width, used only for the first-run
 * default. Once the user has collapsed or expanded a panel their choice wins,
 * because a layout that silently rearranges itself on a window resize is worse
 * than one that is occasionally too narrow.
 */
export function useChromePanelState(canvasWidth: number): {
  panelState: ChromePanelState;
  togglePanel: (panelId: ChromePanelId) => void;
} {
  const defaultState = useMemo(() => {
    return getDefaultPanelState(canvasWidth);
    // The default is a first-run value only, so it must not follow a resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [panelState, setPanelState] = useLocalStorage<ChromePanelState>({
    key: "ava:gis:chrome-panels",
    defaultValue: defaultState,
    getInitialValueInEffect: false,
  });

  const togglePanel = useCallback(
    (panelId: ChromePanelId) => {
      setPanelState((current) => {
        return { ...current, [panelId]: !current[panelId] };
      });
    },
    [setPanelState],
  );

  return { panelState, togglePanel };
}
```

> There is deliberately no `setPanelCollapsed`. The one place the design
> collapses a panel on the user's behalf is the classification editor (shell
> design §4.3), which is Wave B, so a setter would ship with no caller. Add it
> with that editor.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend useChromePanelState`
Expected: PASS.

- [ ] **Step 5: Write the panel stylesheet**

`src/views/GISApp/shell/MapChromePanel/MapChromePanel.module.css`:

```css
/*
 * Opaque, never translucent. Contrast over a map cannot depend on what the map
 * is showing, so the surface is a real fill and the hairline carries the
 * elevation. See the GIS shell design spec section 3.4.
 */
.panel {
  background: var(--ava-surface-overlay);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-md);
  box-shadow: var(--mantine-shadow-md);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  transition: width 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

/*
 * The header is a label, not a surface. Its height is set by its own 24px
 * controls plus 2px of clearance, so padding never inflates it: 29px total,
 * against a 19px line box.
 */
.header {
  align-items: center;
  background: var(--ava-surface-panel-header);
  border-bottom: 1px solid var(--ava-border-default);
  display: flex;
  flex: none;
  gap: var(--mantine-spacing-xs);
  padding: var(--mantine-spacing-xxxs) var(--mantine-spacing-xxxs)
    var(--mantine-spacing-xxxs) var(--mantine-spacing-sm);
}

.title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.2;
  margin: 0;
}

.count {
  color: var(--mantine-color-dimmed);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.spacer {
  flex: 1;
}

/*
 * Header controls are one step smaller than the controls inside a panel body:
 * the header is chrome for the panel, not content in it.
 */
.headerAction {
  height: 24px;
  min-height: 24px;
  min-width: 24px;
  width: 24px;
}

/*
 * The header carries only 2px of vertical padding, which is less clearance
 * than an offset focus ring needs, so its controls draw the ring inside their
 * own box. Tightening the header again without this rule silently clips them.
 */
.headerAction:focus-visible {
  outline-offset: -2px;
}

.body {
  min-height: 0;
  overflow: hidden auto;
}

.panel[data-collapsed="true"] .header {
  border-bottom-color: transparent;
}

/*
 * A collapsed panel shrinks to a pill. Keeping its expanded width would
 * reserve space the map could be using, and at tablet width two reserved 288px
 * columns overflow the content area and push the top bar's actions off the edge
 * of the map. The width is a definite value rather than `auto` so it can
 * animate.
 */
.panel[data-collapsed="true"] {
  max-height: none;
  width: 168px;
}

.panel--layers {
  max-height: 60vh;
  width: 264px;
}

.panel--inspector {
  max-height: 100%;
  width: 320px;
}

.panel--legend {
  width: 232px;
}

@container mapShell (max-width: 1000px) {
  .panel--layers {
    width: 240px;
  }

  .panel--inspector {
    width: 300px;
  }
}

/*
 * Tablet: panels stop floating over the map and become full-height edge
 * sheets, because at this width a floating panel covers the same area a sheet
 * does and a sheet is easier to hit.
 */
@container mapShell (max-width: 792px) {
  .panel--layers,
  .panel--inspector {
    max-height: 100%;
    width: 288px;
  }

  .headerAction {
    height: 36px;
    min-height: 36px;
    min-width: 36px;
    width: 36px;
  }
}
```

- [ ] **Step 6: Write the panel component**

`src/views/GISApp/shell/MapChromePanel/MapChromePanel.tsx`:

```tsx
import { matchLiteral } from "@avandar/utils";
import { ActionIcon, Collapse, Paper } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapChromePanel/MapChromePanel.module.css";
import type { ChromePanelId } from "@/views/GisApp/shell/useChromePanelState/useChromePanelState";
import type { ReactNode } from "react";

type Props = {
  /** Which panel this is, which also picks its width. */
  variant: ChromePanelId;

  /** Stable DOM id prefix for the header and body. */
  id: string;

  title: string;

  /** Shown after the title, e.g. a layer count. */
  count?: number;

  /** Rendered in the header, to the left of the collapse control. */
  headerActions?: ReactNode;

  isCollapsed: boolean;
  onToggleCollapsed: () => void;

  /** Accessible name for the collapse control while the panel is expanded. */
  collapseLabel: string;

  /** Accessible name for it while the panel is collapsed. */
  expandLabel: string;

  /** Id of the element the skip links jump to, when this panel owns one. */
  bodyId?: string;

  children: ReactNode;
};

/**
 * A floating panel over the map: opaque, hairline-bordered, collapsing to its
 * own header pill.
 *
 * The section plus `aria-labelledby` is what promotes this to a landmark
 * region, which is how a screen reader user reaches the layer stack, the
 * inspector, and the legend without walking the whole tab order.
 */
export function MapChromePanel({
  variant,
  id,
  title,
  count,
  headerActions,
  isCollapsed,
  onToggleCollapsed,
  collapseLabel,
  expandLabel,
  bodyId,
  children,
}: Props): ReactNode {
  const titleId = `${id}-title`;
  const resolvedBodyId = bodyId ?? `${id}-body`;
  const variantClassName = matchLiteral(variant, {
    layers: css["panel--layers"],
    inspector: css["panel--inspector"],
    legend: css["panel--legend"],
  });

  return (
    <Paper
      component="section"
      className={`${css.panel} ${variantClassName}`}
      data-collapsed={isCollapsed}
      aria-labelledby={titleId}
      p={0}
      radius={0}
      withBorder={false}
      shadow="none"
    >
      <div className={css.header}>
        <h2 className={css.title} id={titleId}>
          {title}
        </h2>
        {count === undefined ? null : (
          <span className={css.count}>{count}</span>
        )}
        <span className={css.spacer} />
        {headerActions}
        <ActionIcon
          className={css.headerAction}
          variant="subtle"
          color="neutral"
          aria-expanded={!isCollapsed}
          aria-controls={resolvedBodyId}
          aria-label={isCollapsed ? expandLabel : collapseLabel}
          onClick={onToggleCollapsed}
        >
          <IconChevronDown size={16} stroke={1.8} />
        </ActionIcon>
      </div>
      <Collapse className={css.body} id={resolvedBodyId} in={!isCollapsed}>
        {children}
      </Collapse>
    </Paper>
  );
}
```

> `Paper` here is Mantine's, not `@avandar/ui`'s: the wrapper defaults to
> `p="lg"` and `radius="sm"`, and a panel needs `p={0}` with the module's own
> radius, border, and shadow so the collapsed pill and the header hairline
> behave. The `withBorder={false} shadow="none"` pair stops Mantine adding a
> second border and shadow on top of the module's.

> Mantine's `Collapse` animates the measured body height, which is what the
> prototype's comment describes: the `grid-template-rows: 1fr -> 0fr` trick does
> not work in an auto-height panel because every positive `fr` resolves to the
> content height, so the body snaps shut instead of easing. `respectReducedMotion`
> is already true in the theme, so `Collapse` self-disables under
> `prefers-reduced-motion`.

- [ ] **Step 7: Type check and lint**

Run: `pnpm type-check && pnpm lint:css && pnpm test:frontend useChromePanelState`
Expected: no errors, test passes.

- [ ] **Step 8: Commit**

```bash
git add src/views/GISApp/shell
git commit -m "feat(gis): add the collapsible floating map panel"
```

---

## Task 14: Build the furniture bar

The one piece of chrome that docks instead of floating, because attribution and
the disclaimer are mandatory and their legibility must never depend on what the
basemap is showing beneath them. Shell design §5.5 and §8.2 rule 3: it wraps
rather than truncates, because truncating would clip one of them.

**Files:**

- Create: `src/views/GISApp/shell/MapFurnitureBar/MapFurnitureBar.tsx`
- Create: `src/views/GISApp/shell/MapFurnitureBar/MapFurnitureBar.module.css`
- Create: `src/views/GISApp/shell/MapFurnitureBar/useMapPointerCoordinates.ts`
- Create: `src/views/GISApp/shell/MapFurnitureBar/useMapScale/useMapScale.ts`
- Test: `src/views/GISApp/shell/MapFurnitureBar/useMapScale/useMapScale.test.ts`
- Create: `shared/copy/mapDisclaimer.ts`
- Modify: `src/views/GISApp/MapCanvas/MapInstanceHelpers.ts`

- [ ] **Step 1: Write the failing test for the scale bar**

Print §7.2: the scale bar suppresses itself below zoom 4, because a single
scale bar on a Web Mercator map spanning many degrees of latitude is wrong, and
printing a confidently wrong scale bar is worse than printing none.

`src/views/GISApp/shell/MapFurnitureBar/useMapScale/useMapScale.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getMapScaleFromMetersPerPixel } from "@/views/GisApp/shell/MapFurnitureBar/useMapScale/useMapScale";

describe("getMapScaleFromMetersPerPixel", () => {
  it("rounds the bar down to a 1, 2, or 5 times a power of ten", () => {
    expect(
      getMapScaleFromMetersPerPixel({
        metersPerPixel: 100,
        zoom: 10,
        maxWidthPx: 80,
      }),
    ).toEqual({ kind: "bar", widthPx: 50, meters: 5000 });
  });

  it("uses metres below one kilometre", () => {
    expect(
      getMapScaleFromMetersPerPixel({
        metersPerPixel: 2,
        zoom: 16,
        maxWidthPx: 80,
      }),
    ).toEqual({ kind: "bar", widthPx: 50, meters: 100 });
  });

  it("reports varying scale below zoom 4 instead of a bar", () => {
    expect(
      getMapScaleFromMetersPerPixel({
        metersPerPixel: 20000,
        zoom: 3,
        maxWidthPx: 80,
      }),
    ).toEqual({ kind: "varies" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend useMapScale`
Expected: FAIL, cannot resolve `getMapScaleFromMetersPerPixel`.

- [ ] **Step 3: Implement the scale hook**

`src/views/GISApp/shell/MapFurnitureBar/useMapScale/useMapScale.ts`:

```ts
import { useEffect, useState } from "react";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";

/**
 * What the furniture strip should draw for scale.
 *
 * `varies` is not an error state: below zoom 4 the scale genuinely changes
 * across the frame on a Web Mercator map, so a single bar would be a confident
 * lie.
 */
export type MapScale =
  { kind: "bar"; widthPx: number; meters: number } | { kind: "varies" };

/** Zoom at or below which a single scale bar stops being truthful. */
const SCALE_VARIES_BELOW_ZOOM = 4;

/** Widths a scale bar is allowed to represent, as 1, 2, or 5 x 10^n. */
const NICE_MULTIPLES = [1, 2, 5] as const;

/** The largest nice distance that fits in `maxWidthPx`. */
function _getNiceMeters(maxMeters: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxMeters)));
  const fitting = NICE_MULTIPLES.filter((multiple) => {
    return multiple * magnitude <= maxMeters;
  });
  const largest = fitting[fitting.length - 1] ?? 1;
  return largest * magnitude;
}

/**
 * The scale bar for a given map resolution.
 *
 * Pure so the rounding is testable without a map instance.
 *
 * @param params.metersPerPixel Ground distance one screen pixel covers at the
 * centre of the current view.
 * @param params.zoom Current zoom, used only for the suppression threshold.
 * @param params.maxWidthPx The widest bar the strip will draw.
 */
export function getMapScaleFromMetersPerPixel({
  metersPerPixel,
  zoom,
  maxWidthPx,
}: {
  metersPerPixel: number;
  zoom: number;
  maxWidthPx: number;
}): MapScale {
  if (zoom < SCALE_VARIES_BELOW_ZOOM) {
    return { kind: "varies" };
  }
  const meters = _getNiceMeters(metersPerPixel * maxWidthPx);
  return {
    kind: "bar",
    widthPx: Math.round(meters / metersPerPixel),
    meters,
  };
}

/** The widest scale bar the furniture strip draws, in CSS pixels. */
const SCALE_BAR_MAX_WIDTH_PX = 80;

/**
 * Tracks the map's scale as the camera moves.
 *
 * Reads `metersPerPixel` from MapLibre at the view's centre latitude, which is
 * the only place a Mercator scale bar is even approximately right.
 */
export function useMapScale(mapInstance: MapInstance): MapScale | undefined {
  const { mapRef } = mapInstance;
  const [scale, setScale] = useState<MapScale | undefined>(undefined);

  useEffect(
    function trackMapScale() {
      const map = mapRef.current;
      if (!map) {
        return undefined;
      }
      const readScale = (): void => {
        setScale(
          getMapScaleFromMetersPerPixel({
            metersPerPixel: map.transform.getMetersPerPixelAtLatitude(
              map.getCenter().lat,
            ),
            zoom: map.getZoom(),
            maxWidthPx: SCALE_BAR_MAX_WIDTH_PX,
          }),
        );
      };
      readScale();
      map.on("move", readScale);
      return () => {
        map.off("move", readScale);
      };
    },
    [mapRef],
  );

  return scale;
}
```

> `map.transform.getMetersPerPixelAtLatitude` is MapLibre's own helper and it is
> what `ScaleControl` uses. If the property is not on `transform` in the pinned
> MapLibre version, read the two-point distance instead:
> `map.unproject([0, y])` and `map.unproject([SCALE_BAR_MAX_WIDTH_PX, y])`, then
> `distance` between them. Verify against `node_modules/maplibre-gl` before
> writing, and leave a comment saying which you used.

- [ ] **Step 4: Implement the coordinate readout**

`src/views/GISApp/shell/MapFurnitureBar/useMapPointerCoordinates.ts`:

```ts
import { useEffect, useState } from "react";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";

/** Where the pointer is over the map, in degrees. */
export type MapPointerCoordinates = { longitude: number; latitude: number };

/**
 * The geographic position under the pointer, or `undefined` when the pointer
 * is not over the map.
 *
 * Deliberately clears on `mouseout` rather than freezing the last value: a
 * stale coordinate beside a live scale bar reads as the map's position, not as
 * the pointer's.
 */
export function useMapPointerCoordinates(
  mapInstance: MapInstance,
): MapPointerCoordinates | undefined {
  const { mapRef } = mapInstance;
  const [coordinates, setCoordinates] = useState<
    MapPointerCoordinates | undefined
  >(undefined);

  useEffect(
    function trackPointerCoordinates() {
      const map = mapRef.current;
      if (!map) {
        return undefined;
      }
      const onMouseMove = (event: maplibregl.MapMouseEvent): void => {
        setCoordinates({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
        });
      };
      const onMouseOut = (): void => {
        setCoordinates(undefined);
      };
      map.on("mousemove", onMouseMove);
      map.on("mouseout", onMouseOut);
      return () => {
        map.off("mousemove", onMouseMove);
        map.off("mouseout", onMouseOut);
      };
    },
    [mapRef],
  );

  return coordinates;
}
```

Add `import type maplibregl from "maplibre-gl";` for the event type.

- [ ] **Step 5: Add the disclaimer copy**

`shared/copy/mapDisclaimer.ts`:

```ts
import { t } from "@lingui/core/macro";

/**
 * The boundary disclaimer every map carries, on screen and in every export.
 *
 * Not dismissible and not a setting. Wave E's export sheet makes the wording
 * editable per organisation, and clearing it there restores this default;
 * until then this is the only wording.
 */
export function mapDisclaimer(): string {
  return t`The boundaries and names shown do not imply official endorsement or acceptance.`;
}
```

- [ ] **Step 6: Write the furniture stylesheet**

`src/views/GISApp/shell/MapFurnitureBar/MapFurnitureBar.module.css`:

```css
.furnitureBar {
  align-items: center;
  background: var(--ava-surface-raised);
  border-top: 1px solid var(--ava-border-default);
  color: var(--mantine-color-dimmed);
  display: flex;
  font-size: 11px;
  gap: var(--mantine-spacing-sm);
  height: 28px;
  padding: 0 var(--mantine-spacing-sm);
}

.spacer {
  flex: 1;
}

.coordinates {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.scale {
  align-items: center;
  display: inline-flex;
  gap: var(--mantine-spacing-xxs);
  white-space: nowrap;
}

.scaleRule {
  border: 1px solid var(--mantine-color-dimmed);
  border-top: 0;
  height: 6px;
}

.attribution,
.disclaimer {
  white-space: nowrap;
}

/*
 * The strip wraps instead of truncating. Truncating it would clip the
 * attribution or the disclaimer, and neither may ever be clipped.
 */
@container mapShell (max-width: 792px) {
  .furnitureBar {
    flex-wrap: wrap;
    height: auto;
    padding-bottom: var(--mantine-spacing-xxs);
    padding-top: var(--mantine-spacing-xxs);
    row-gap: 2px;
  }

  .spacer {
    flex-basis: 100%;
    height: 0;
  }
}
```

- [ ] **Step 7: Write the furniture component**

`src/views/GISApp/shell/MapFurnitureBar/MapFurnitureBar.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { mapDisclaimer } from "$/copy/mapDisclaimer";
import { match } from "ts-pattern";
import css from "@/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar.module.css";
import { useMapPointerCoordinates } from "@/views/GisApp/shell/MapFurnitureBar/useMapPointerCoordinates/useMapPointerCoordinates";
import { useMapScale } from "@/views/GisApp/shell/MapFurnitureBar/useMapScale/useMapScale";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
import type { ReactNode } from "react";

type Props = {
  mapInstance: MapInstance;

  /** Attribution for the current basemap, never empty. */
  attribution: string;
};

/** Formats one axis with its hemisphere letter, the way sitreps write them. */
function _formatDegrees(value: number, axis: "lat" | "lng"): string {
  const suffix = match({ axis, isNegative: value < 0 })
    .with({ axis: "lat", isNegative: true }, () => {
      return "S";
    })
    .with({ axis: "lat", isNegative: false }, () => {
      return "N";
    })
    .with({ axis: "lng", isNegative: true }, () => {
      return "W";
    })
    .with({ axis: "lng", isNegative: false }, () => {
      return "E";
    })
    .exhaustive();
  return `${Math.abs(value).toFixed(3)} ${suffix}`;
}

/**
 * The docked strip under the map: coordinates, scale, attribution, and the
 * mandatory boundary disclaimer.
 *
 * Docked rather than floating because attribution and the disclaimer may never
 * be illegible, and legibility over a basemap cannot be guaranteed. It is also
 * never a control surface: it is the strip that survives into the print export.
 */
export function MapFurnitureBar({
  mapInstance,
  attribution,
}: Props): ReactNode {
  const { t } = useLingui();
  const coordinates = useMapPointerCoordinates(mapInstance);
  const scale = useMapScale(mapInstance);

  return (
    <div className={css.furnitureBar}>
      <span className={css.coordinates}>
        {coordinates
          ? `${_formatDegrees(coordinates.latitude, "lat")}, ${_formatDegrees(
              coordinates.longitude,
              "lng",
            )}`
          : t`Move the pointer over the map to read a coordinate`}
      </span>
      <span className={css.spacer} />
      {scale?.kind === "bar" ? (
        <span className={css.scale}>
          <span>
            {scale.meters >= 1000
              ? t`${scale.meters / 1000} km`
              : t`${scale.meters} m`}
          </span>
          <span
            aria-hidden
            className={css.scaleRule}
            style={{ width: scale.widthPx }}
          />
        </span>
      ) : null}
      {scale?.kind === "varies" ? (
        <span className={css.scale}>{t`Scale varies across this map`}</span>
      ) : null}
      <span className={css.attribution}>{attribution}</span>
      <span className={css.disclaimer}>{mapDisclaimer()}</span>
    </div>
  );
}
```

> `style={{ width: scale.widthPx }}` is the one inline style allowed here: the
> width is computed at runtime from the map's resolution, which is exactly the
> exception `docs/rules/typescript.md` carves out.

- [ ] **Step 8: Stop MapLibre drawing its own furniture**

The current-state finding in inventory §6.3 is that the scale bar, zoom
buttons, and attribution are MapLibre's own controls in MapLibre's styling,
sitting on the map corners rather than in a product-owned strip. The strip now
owns scale and attribution, so remove MapLibre's.

In `src/views/GISApp/MapCanvas/MapInstanceHelpers.ts`, inside
`_createMapLibreInstance`, delete the `ScaleControl` line and disable the
built-in attribution control, keeping `NavigationControl`:

```ts
const map = new maplibregl.Map({
  container,
  style: BasemapStyle.fromBasemap(basemap),
  center: view.center,
  zoom: view.zoom,
  // The furniture strip owns attribution, so MapLibre's own control would
  // duplicate it in a place the print export cannot inherit. The strip is
  // what satisfies the attribution requirement; this only turns off the
  // second copy.
  attributionControl: false,
});
map.addControl(new maplibregl.NavigationControl(), "top-right");
return map;
```

- [ ] **Step 9: Run the tests, type check, lint**

Run: `pnpm test:frontend useMapScale && pnpm type-check && pnpm lint:css`
Expected: PASS, no errors.

- [ ] **Step 10: Commit**

```bash
git add src/views/GISApp shared/copy/mapDisclaimer.ts
git commit -m "feat(gis): add the map furniture bar with scale, coords, and disclaimer"
```

---

## Task 15: Build the top bar

Map-level identity and output. Nothing layer-specific belongs here (inventory
§1.4). Export is a disabled button with a reason, because the export sheet is
Wave E and an action that opens nothing teaches the wrong thing.

**Files:**

- Create: `src/views/GISApp/shell/MapTopBar/MapTopBar.tsx`
- Create: `src/views/GISApp/shell/MapTopBar/MapTopBar.module.css`
- Create: `src/views/GISApp/shell/MapTopBar/MapTitleInput.tsx`
- Create: `src/views/GISApp/shell/MapTopBar/SaveStateIndicator.tsx`
- Create: `src/views/GISApp/shell/MapTopBar/BasemapControl/BasemapControl.tsx`
- Create: `src/views/GISApp/shell/MapTopBar/BasemapControl/CustomBasemapForm.tsx`
- Create: `src/views/GISApp/shell/MapTopBar/ViewsMenu/ViewsMenu.tsx`

- [ ] **Step 1: Write the top bar stylesheet**

`src/views/GISApp/shell/MapTopBar/MapTopBar.module.css`:

```css
.cluster {
  align-items: center;
  background: var(--ava-surface-overlay);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-md);
  box-shadow: var(--mantine-shadow-md);
  display: flex;
  gap: var(--mantine-spacing-xxs);
  min-width: 0;
  padding: var(--mantine-spacing-xxs);
}

.titleInput {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--mantine-radius-sm);
  color: var(--mantine-color-text);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  padding: 3px var(--mantine-spacing-xs);
  transition:
    background 140ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 140ms cubic-bezier(0.16, 1, 0.3, 1);
  width: 232px;
}

.titleInput:hover {
  background: var(--ava-surface-sunken);
}

.titleInput:focus {
  background: var(--ava-surface-raised);
  border-color: var(--ava-border-focus);
  outline: none;
}

.saveState {
  align-items: center;
  color: var(--mantine-color-dimmed);
  display: inline-flex;
  font-size: 12px;
  gap: var(--mantine-spacing-xxs);
  padding-right: var(--mantine-spacing-xs);
  white-space: nowrap;
}

/*
 * Tablet: the actions drop their labels rather than wrapping or overflowing.
 * Their accessible names stay, which is what keeps them reachable.
 */
@container mapShell (max-width: 792px) {
  .actionLabel {
    display: none;
  }

  .titleInput {
    width: 132px;
  }
}
```

- [ ] **Step 2: Write the title input**

`src/views/GISApp/shell/MapTopBar/MapTitleInput.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import css from "@/views/GisApp/shell/MapTopBar/MapTopBar.module.css";
import type { ReactNode } from "react";

type Props = {
  name: string;
  onNameChange: (name: string) => void;
};

/**
 * The map's name, edited in place.
 *
 * Keeps a local draft so every keystroke does not become a save, and commits
 * on blur or Enter. A blank name commits as the previous name rather than as
 * an empty string: a map with no name is unfindable in the list.
 */
export function MapTitleInput({ name, onNameChange }: Props): ReactNode {
  const { t } = useLingui();
  const [draft, setDraft] = useState(name);

  useEffect(
    function adoptExternalName() {
      setDraft(name);
    },
    [name],
  );

  const commit = (): void => {
    const trimmed = draft.trim();
    if (trimmed === "" || trimmed === name) {
      setDraft(name);
      return;
    }
    onNameChange(trimmed);
  };

  return (
    <input
      className={css.titleInput}
      type="text"
      value={draft}
      aria-label={t`Map name`}
      onChange={(event) => {
        setDraft(event.currentTarget.value);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setDraft(name);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
```

- [ ] **Step 3: Write the save state indicator**

`src/views/GISApp/shell/MapTopBar/SaveStateIndicator.tsx`:

```tsx
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Loader } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconPencil } from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapTopBar/MapTopBar.module.css";
import type { MapSaveState } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import type { ReactNode } from "react";

type Props = { saveState: MapSaveState };

/**
 * What the map's autosave is doing.
 *
 * `role="status"` rather than `role="alert"` even for the failure: the failure
 * copy names a recovery the user can take at their own pace, and an alert
 * interrupts whatever they are reading.
 */
export function SaveStateIndicator({ saveState }: Props): ReactNode {
  const { t } = useLingui();
  const content = matchLiteral(saveState, {
    saved: {
      icon: <IconCheck size={14} stroke={1.8} />,
      label: t`All changes saved`,
    },
    saving: { icon: <Loader size={12} />, label: t`Saving` },
    unsaved: {
      icon: <IconPencil size={14} stroke={1.8} />,
      label: t`Unsaved changes`,
    },
    failed: {
      icon: <IconAlertTriangle size={14} stroke={1.8} />,
      label: t`Could not save. Your last change is still on screen.`,
    },
  });

  return (
    <span className={css.saveState} role="status">
      {content.icon}
      <span className={css.actionLabel}>{content.label}</span>
    </span>
  );
}
```

- [ ] **Step 4: Write the basemap control**

`src/views/GISApp/shell/MapTopBar/BasemapControl/BasemapControl.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Menu } from "@mantine/core";
import { IconStack2 } from "@tabler/icons-react";
import { useState } from "react";
import { MapStyleKeys, MapStyles } from "@/views/GisApp/basemap/MapStyles";
import { CustomBasemapForm } from "@/views/GisApp/shell/MapTopBar/BasemapControl/CustomBasemapForm";
import css from "@/views/GisApp/shell/MapTopBar/MapTopBar.module.css";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

/** Flat background used when the author turns tiles off entirely. */
const NO_BASEMAP_BACKGROUND = "#eaeef2";

type Props = {
  basemap: AvaMapConfig.Basemap;
  onBasemapChange: (basemap: AvaMapConfig.Basemap) => void;
};

/**
 * Picks the map's backdrop: a built-in style, a workspace tile service, or no
 * tiles at all.
 *
 * "No basemap" is not a degraded option, it is the field condition: tile hosts
 * are frequently unreachable and a flat background with the data on top is
 * still a usable map.
 */
export function BasemapControl({ basemap, onBasemapChange }: Props): ReactNode {
  const { t } = useLingui();
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);

  return (
    <>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Button
            variant="subtle"
            color="neutral"
            size="compact-sm"
            leftSection={<IconStack2 size={15} stroke={1.5} />}
          >
            <span className={css.actionLabel}>{t`Basemap`}</span>
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{t`Built in`}</Menu.Label>
          {MapStyleKeys.map((styleKey) => {
            return (
              <Menu.Item
                key={styleKey}
                aria-current={
                  basemap.type === "builtIn" && basemap.style === styleKey
                }
                onClick={() => {
                  onBasemapChange({ type: "builtIn", style: styleKey });
                }}
              >
                {MapStyles[styleKey].name}
              </Menu.Item>
            );
          })}
          <Menu.Divider />
          <Menu.Item
            aria-current={basemap.type === "none"}
            onClick={() => {
              onBasemapChange({
                type: "none",
                background: NO_BASEMAP_BACKGROUND,
              });
            }}
          >
            {t`No basemap`}
          </Menu.Item>
          <Menu.Item
            aria-current={basemap.type === "custom"}
            onClick={() => {
              setIsCustomFormOpen(true);
            }}
          >
            {t`Add a tile service`}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <CustomBasemapForm
        opened={isCustomFormOpen}
        basemap={basemap}
        onClose={() => {
          setIsCustomFormOpen(false);
        }}
        onSubmit={(customBasemap) => {
          onBasemapChange(customBasemap);
          setIsCustomFormOpen(false);
        }}
      />
    </>
  );
}
```

- [ ] **Step 5: Write the custom basemap form**

`src/views/GISApp/shell/MapTopBar/BasemapControl/CustomBasemapForm.tsx`:

```tsx
import { Modal } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Select, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  opened: boolean;
  basemap: AvaMapConfig.Basemap;
  onClose: () => void;
  onSubmit: (basemap: AvaMapConfig.Basemap) => void;
};

/**
 * Points the map at a workspace's own tile service.
 *
 * Asks for the full URL template rather than building one from a server
 * address and a layer name. Guessing a WMS server's layer names and CRS is how
 * you ship a grey rectangle, and the author already has the template their
 * organisation published.
 *
 * Attribution is required, not optional: the furniture strip may never show an
 * unattributed basemap, so a source with no attribution cannot be added.
 */
export function CustomBasemapForm({
  opened,
  basemap,
  onClose,
  onSubmit,
}: Props): ReactNode {
  const { t } = useLingui();
  const initial = basemap.type === "custom" ? basemap : undefined;
  const [kind, setKind] = useState<AvaMapConfig.CustomBasemapKind>(
    initial?.kind ?? "xyz",
  );
  const [url, setUrl] = useState(initial?.url ?? "");
  const [attribution, setAttribution] = useState(initial?.attribution ?? "");

  const isSubmittable = url.trim() !== "" && attribution.trim() !== "";

  return (
    <Modal opened={opened} onClose={onClose} title={t`Add a tile service`}>
      <Stack gap="sm">
        <Select
          label={t`Protocol`}
          data={[
            { value: "xyz", label: t`XYZ tiles` },
            { value: "wms", label: t`WMS` },
            { value: "wmts", label: t`WMTS` },
          ]}
          value={kind}
          allowDeselect={false}
          onChange={(value) => {
            if (value) {
              setKind(value as AvaMapConfig.CustomBasemapKind);
            }
          }}
        />
        <TextInput
          label={t`URL template`}
          description={
            kind === "wms"
              ? t`Include {bbox-epsg-3857} where the server expects the bounding box.`
              : t`Include {z}, {x} and {y} where the server expects the tile index.`
          }
          value={url}
          onChange={(event) => {
            setUrl(event.currentTarget.value);
          }}
        />
        <TextInput
          label={t`Attribution`}
          description={t`Shown under the map and in every export. Required.`}
          value={attribution}
          onChange={(event) => {
            setAttribution(event.currentTarget.value);
          }}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t`Cancel`}
          </Button>
          <Button
            disabled={!isSubmittable}
            onClick={() => {
              onSubmit({
                type: "custom",
                kind,
                url: url.trim(),
                attribution: attribution.trim(),
              });
            }}
          >
            {t`Use this basemap`}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

- [ ] **Step 6: Write the views menu**

`src/views/GISApp/shell/MapTopBar/ViewsMenu/ViewsMenu.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Button, Group, Menu, Text } from "@mantine/core";
import { IconBookmark, IconTrash } from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapTopBar/MapTopBar.module.css";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  bookmarks: readonly AvaMapConfig.Bookmark[];
  onSaveCurrentView: () => void;
  onGoToBookmark: (bookmark: AvaMapConfig.Bookmark) => void;
  onRemoveBookmark: (bookmarkId: AvaMapConfig.BookmarkId) => void;
};

/** Saved camera positions for this map. */
export function ViewsMenu({
  bookmarks,
  onSaveCurrentView,
  onGoToBookmark,
  onRemoveBookmark,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Menu position="bottom-end" withinPortal closeOnItemClick={false}>
      <Menu.Target>
        <Button
          variant="subtle"
          color="neutral"
          size="compact-sm"
          leftSection={<IconBookmark size={15} stroke={1.5} />}
        >
          <span className={css.actionLabel}>{t`Views`}</span>
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={onSaveCurrentView}>
          {t`Save the current view`}
        </Menu.Item>
        {bookmarks.length === 0 ? null : <Menu.Divider />}
        {bookmarks.map((bookmark) => {
          return (
            <Menu.Item
              key={bookmark.id}
              onClick={() => {
                onGoToBookmark(bookmark);
              }}
            >
              <Group gap="xs" justify="space-between" wrap="nowrap">
                <Text size="sm" truncate>
                  {bookmark.name}
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="neutral"
                  size="sm"
                  aria-label={t`Delete the view ${bookmark.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveBookmark(bookmark.id);
                  }}
                >
                  <IconTrash size={14} stroke={1.5} />
                </ActionIcon>
              </Group>
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
```

- [ ] **Step 7: Write the top bar**

`src/views/GISApp/shell/MapTopBar/MapTopBar.tsx`:

```tsx
import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { ShareResourceButton } from "@/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton";
import { BasemapControl } from "@/views/GisApp/shell/MapTopBar/BasemapControl/BasemapControl";
import { MapTitleInput } from "@/views/GisApp/shell/MapTopBar/MapTitleInput/MapTitleInput";
import css from "@/views/GisApp/shell/MapTopBar/MapTopBar.module.css";
import { SaveStateIndicator } from "@/views/GisApp/shell/MapTopBar/SaveStateIndicator/SaveStateIndicator";
import { ViewsMenu } from "@/views/GisApp/shell/MapTopBar/ViewsMenu/ViewsMenu";
import type { MapSaveState } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  avaMapId: AvaMap.Id;
  name: string;
  saveState: MapSaveState;
  basemap: AvaMapConfig.Basemap;
  bookmarks: readonly AvaMapConfig.Bookmark[];
  onNameChange: (name: string) => void;
  onBasemapChange: (basemap: AvaMapConfig.Basemap) => void;
  onSaveCurrentView: () => void;
  onGoToBookmark: (bookmark: AvaMapConfig.Bookmark) => void;
  onRemoveBookmark: (bookmarkId: AvaMapConfig.BookmarkId) => void;
};

/** The map's identity on the left, its output actions on the right. */
export function MapTopBar({
  avaMapId,
  name,
  saveState,
  basemap,
  bookmarks,
  onNameChange,
  onBasemapChange,
  onSaveCurrentView,
  onGoToBookmark,
  onRemoveBookmark,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <div className={css.cluster}>
        <MapTitleInput name={name} onNameChange={onNameChange} />
        <SaveStateIndicator saveState={saveState} />
      </div>
      <div className={css.cluster}>
        <BasemapControl basemap={basemap} onBasemapChange={onBasemapChange} />
        <ViewsMenu
          bookmarks={bookmarks}
          onSaveCurrentView={onSaveCurrentView}
          onGoToBookmark={onGoToBookmark}
          onRemoveBookmark={onRemoveBookmark}
        />
        <ShareResourceButton
          resourceName={name}
          resourceType="map"
          resourceId={avaMapId}
          size="compact-sm"
        />
        <Tooltip label={t`Print and PDF export arrives in a later release.`}>
          <Button
            size="compact-sm"
            leftSection={<IconDownload size={15} stroke={1.5} />}
            aria-disabled
            onClick={(event) => {
              event.preventDefault();
            }}
          >
            <span className={css.actionLabel}>{t`Export`}</span>
          </Button>
        </Tooltip>
      </div>
    </>
  );
}
```

> Export uses `aria-disabled` with a no-op handler rather than `disabled`,
> which is the rule shell design §9.4 states: a `disabled` button leaves the
> tab order, and the explanation attached to it becomes unreachable by
> keyboard. The same rule governs every unavailable control in Stage 5.

- [ ] **Step 8: Type check and lint**

Run: `pnpm type-check && pnpm lint:css`
Expected: errors only on the not-yet-written `MapSaveState` import from
`useAvaMapEditor` (Task 27). If you are running Stage 3 before Stage 6, add the
type temporarily in a scratch file, or write Task 27 first: it is only a hook
and a union.

- [ ] **Step 9: Commit**

```bash
git add src/views/GISApp/shell/MapTopBar
git commit -m "feat(gis): add the map top bar with basemap, views, and share"
```

---

# Stage 4: the layer stack

The stack is the map's table of contents. It answers "what is on this map, in
what order" and nothing else; editing lives in the inspector (inventory §1.1 and
§3.4). Nothing on a row is a settings control except visibility and z-order.

## Task 16: Build the layer panel and its rows

**Files:**

- Create: `src/views/GISApp/layers/MapLayerViewState.ts`
- Create: `src/views/GISApp/panels/LayerPanel/LayerPanel.tsx`
- Create: `src/views/GISApp/panels/LayerPanel/LayerList.tsx`
- Create: `src/views/GISApp/panels/LayerPanel/LayerRow/LayerRow.tsx`
- Create: `src/views/GISApp/panels/LayerPanel/LayerRow/LayerRow.module.css`
- Create: `src/views/GISApp/panels/LayerPanel/LayerRow/LayerSwatch.tsx`
- Create: `src/views/GISApp/panels/LayerPanel/LayerRow/LayerStatusBadge.tsx`

- [ ] **Step 1: Declare the per-layer view state**

Every surface that reports a layer's health reads the same shape: the row's
badge, the status card, and the inspector's lead block. Declaring it once is
what stops those three disagreeing.

`src/views/GISApp/layers/MapLayerViewState.ts`:

```ts
import type { DropReason } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";

/**
 * What the layer panel, the status card, and the inspector need to know about
 * one layer's data.
 *
 * `unbound` is a distinct status from `empty` on purpose: a layer with no
 * geometry columns picked has nothing to run, while a layer whose query
 * returned nothing has run and found nothing, and the two need different copy.
 */
export type MapLayerViewState = {
  status: "unbound" | "loading" | "error" | "empty" | "ready";

  /** Set only when `status` is `error`. Its message is what "Show details" reveals. */
  error: Error | undefined;

  featureCount: number;

  /** Rows the geometry conversion could not place. */
  droppedRowCount: number;

  /**
   * The single drop reason with the highest count, so the status card can name
   * the most common cause without opening anything.
   */
  largestDropReason: DropReason | undefined;

  /** Filter clauses on the layer's query, which is what makes "no rows" legible. */
  filterCount: number;

  /** Re-runs this layer's query. */
  onRetry: () => void;
};
```

- [ ] **Step 2: Write the row stylesheet**

`src/views/GISApp/panels/LayerPanel/LayerRow/LayerRow.module.css`:

```css
.layerList {
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-xxxs);
  list-style: none;
  margin: 0;
  padding: var(--mantine-spacing-xxs);
}

.layerListEmpty {
  color: var(--mantine-color-dimmed);
  font-size: 12px;
  line-height: 1.5;
  padding: var(--mantine-spacing-md) var(--mantine-spacing-sm);
  text-align: center;
}

.layer {
  align-items: center;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--mantine-radius-sm);
  display: grid;
  gap: var(--mantine-spacing-xxs);
  grid-template-columns: 14px 26px 1fr 26px;
  padding: var(--mantine-spacing-xxs) var(--mantine-spacing-xxs)
    var(--mantine-spacing-xxs) 0;
  text-align: left;
  transition: background 140ms cubic-bezier(0.16, 1, 0.3, 1);
  width: 100%;
}

.layer:hover {
  background: var(--ava-surface-sunken);
}

.layer[data-selected="true"] {
  background: var(--mantine-color-primary-0);
  border-color: var(--mantine-color-primary-2);
}

[data-mantine-color-scheme="dark"] .layer[data-selected="true"] {
  background: rgba(21, 99, 254, 0.22);
  border-color: var(--mantine-color-primary-7);
}

.layer[data-dragging="true"] {
  opacity: 0.6;
}

.layer[data-hidden="true"] .name,
.layer[data-hidden="true"] .meta {
  opacity: 0.5;
}

.grip {
  align-items: center;
  color: var(--mantine-color-neutral-3);
  cursor: grab;
  display: flex;
  justify-content: center;
}

/*
 * Selecting a layer is a real button, not a click handler on the row. It is the
 * app's primary navigation, so it has to be reachable by keyboard and it has to
 * announce which layer is current.
 */
.select {
  align-items: center;
  background: none;
  border: 0;
  color: inherit;
  display: grid;
  font: inherit;
  gap: var(--mantine-spacing-xxs);
  grid-template-columns: 18px 1fr;
  min-width: 0;
  padding: 0;
  text-align: left;
}

/*
 * A full-bleed control inside a panel draws its focus ring inside its own box,
 * because the panel clips at its rounded edge and an offset ring is cut off.
 */
.select:focus-visible {
  outline-offset: -2px;
}

.text {
  min-width: 0;
}

.name {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  align-items: center;
  color: var(--mantine-color-dimmed);
  display: flex;
  font-size: 11px;
  gap: var(--mantine-spacing-xxs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.swatch {
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-xs);
  flex: none;
  height: 18px;
  width: 18px;
}

/* The halo is the surface behind it, not literal white, so the swatch reads
   the same way in both themes. */
.swatch--point {
  border-color: var(--ava-surface-overlay);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--ava-border-strong);
  height: 14px;
  margin: 2px;
  width: 14px;
}

.swatch--sized {
  border-color: var(--ava-surface-overlay);
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 3px var(--ava-surface-overlay),
    0 0 0 1px var(--ava-border-strong);
}

/* Touch targets go to 44px on everything a finger has to hit. */
@container mapShell (max-width: 792px) {
  .layer {
    grid-template-columns: 14px 36px 1fr 36px;
  }
}
```

- [ ] **Step 3: Write the swatch**

`src/views/GISApp/panels/LayerPanel/LayerRow/LayerSwatch.tsx`:

```tsx
import { match } from "ts-pattern";
import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { symbology: MapLayer.Symbology };

/**
 * A miniature of how the layer draws, so the stack is readable without
 * selecting anything.
 *
 * A flat circle and a proportional symbol are the same hue, distinguished by
 * the ring: the ring is what says "the size means something".
 */
export function LayerSwatch({ symbology }: Props): ReactNode {
  const variantClassName = match(symbology)
    .with({ type: "circle" }, () => {
      return css["swatch--point"];
    })
    .with({ type: "proportionalSymbol" }, () => {
      return css["swatch--sized"];
    })
    .exhaustive();

  return (
    <span
      aria-hidden
      className={`${css.swatch} ${variantClassName}`}
      style={{ backgroundColor: symbology.color.color }}
    />
  );
}
```

- [ ] **Step 4: Write the status badge**

Shell design §5.1 rule 1: the layer row always carries its own state. With four
layers loaded, a single shared status area cannot say which layer is in
trouble, and the row is the only place that scales.

`src/views/GISApp/panels/LayerPanel/LayerRow/LayerStatusBadge.tsx`:

```tsx
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Badge, Group, Loader } from "@mantine/core";
import { IconAlertTriangle, IconCircleX } from "@tabler/icons-react";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

type Props = { viewState: MapLayerViewState };

/** The layer's own state, inline on its row. */
export function LayerStatusBadge({ viewState }: Props): ReactNode {
  const { t } = useLingui();
  const { droppedRowCount, featureCount, status } = viewState;

  const statusContent = matchLiteral(status, {
    unbound: <>{t`Needs geometry`}</>,
    loading: (
      <Group gap={4} wrap="nowrap">
        <Loader size={11} />
        {t`Loading`}
      </Group>
    ),
    error: (
      <Badge
        color="danger"
        variant="light"
        size="xs"
        leftSection={<IconCircleX size={9} stroke={2.4} />}
      >
        {t`Could not load`}
      </Badge>
    ),
    empty: (
      <Badge color="neutral" variant="light" size="xs">
        {t`No rows`}
      </Badge>
    ),
    ready:
      droppedRowCount > 0 ? (
        <Badge
          color="warning"
          variant="light"
          size="xs"
          leftSection={<IconAlertTriangle size={9} stroke={2.4} />}
        >
          {t`${droppedRowCount} rows unmapped`}
        </Badge>
      ) : (
        <>{featureCount === 1 ? t`1 point` : t`${featureCount} points`}</>
      ),
  });

  return statusContent;
}
```

- [ ] **Step 5: Write the row**

`src/views/GISApp/panels/LayerPanel/LayerRow/LayerRow.tsx`:

```tsx
import { useSortable } from "@dnd-kit/react/sortable";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconEye, IconEyeOff, IconGripVertical } from "@tabler/icons-react";
import { LayerActionsMenu } from "@/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionsMenu";
import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow.module.css";
import { LayerStatusBadge } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerStatusBadge/LayerStatusBadge";
import { LayerSwatch } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerSwatch";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  viewState: MapLayerViewState;
  isSelected: boolean;

  /** Position in the panel's row order, which is what drag reorder sorts on. */
  rowIndex: number;

  onSelect: () => void;
  onToggleVisible: () => void;
  onMoveByOffset: (offset: -1 | 1) => void;
  onRename: () => void;
  onDuplicate: () => void;
  onZoomToLayer: () => void;
  onDelete: () => void;
};

/**
 * One layer in the stack: a drag handle, a visibility toggle, a select button,
 * and an overflow menu.
 *
 * Three separate controls rather than one clickable row. The keyboard walk in
 * shell design §9.5 found that a `div` with a click handler let a keyboard user
 * toggle visibility and open the menu but never *select* a layer, which is the
 * app's primary navigation.
 *
 * Keyboard reorder is `Alt` with the arrow keys on the select button. Drag
 * libraries do not provide a keyboard path, so this is the one the shell design
 * §11 open question 5 asked us to choose, and both paths write through
 * `AvaMapConfig.withStackOrder`.
 */
export function LayerRow({
  layer,
  viewState,
  isSelected,
  rowIndex,
  onSelect,
  onToggleVisible,
  onMoveByOffset,
  onRename,
  onDuplicate,
  onZoomToLayer,
  onDelete,
}: Props): ReactNode {
  const { t } = useLingui();
  const { ref, handleRef, isDragging } = useSortable({
    id: layer.id,
    index: rowIndex,
  });

  return (
    <li ref={ref}>
      <div
        className={css.layer}
        data-selected={isSelected}
        data-dragging={isDragging}
        data-hidden={!layer.isVisible}
      >
        <span
          ref={handleRef}
          className={css.grip}
          aria-hidden
          title={t`Drag to reorder, or hold Alt and press the up or down arrow`}
        >
          <IconGripVertical size={12} stroke={2} />
        </span>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="sm"
          aria-pressed={layer.isVisible}
          aria-label={
            layer.isVisible
              ? t`Hide the layer ${layer.name}`
              : t`Show the layer ${layer.name}`
          }
          onClick={onToggleVisible}
        >
          {layer.isVisible ? (
            <IconEye size={15} stroke={1.5} />
          ) : (
            <IconEyeOff size={15} stroke={1.5} />
          )}
        </ActionIcon>
        <button
          type="button"
          className={css.select}
          aria-current={isSelected}
          onClick={onSelect}
          onKeyDown={(event) => {
            if (!event.altKey) {
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              onMoveByOffset(-1);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              onMoveByOffset(1);
            }
          }}
        >
          <LayerSwatch symbology={layer.symbology} />
          <span className={css.text}>
            <span className={css.name}>{layer.name}</span>
            <span className={css.meta}>
              <LayerStatusBadge viewState={viewState} />
            </span>
          </span>
        </button>
        <LayerActionsMenu
          layerName={layer.name}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onZoomToLayer={onZoomToLayer}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
}
```

- [ ] **Step 6: Write the list and the panel**

`src/views/GISApp/panels/LayerPanel/LayerList.tsx`:

```tsx
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useLingui } from "@lingui/react/macro";
import { LayerRow } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow";
import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow.module.css";
import { getStackOrderWithLayerMoved } from "@/views/GisApp/panels/LayerPanel/makeStackOrderFromLayerMove/makeStackOrderFromLayerMove";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  /** Layers in panel row order: top of the z-order first. */
  rows: readonly MapLayer.T[];
  viewStates: ReadonlyMap<MapLayer.Id, MapLayerViewState>;
  selectedLayerId: MapLayer.Id | undefined;
  onStackOrderChange: (orderedLayerIds: readonly MapLayer.Id[]) => void;
  onSelectLayer: (layerId: MapLayer.Id) => void;
  onToggleLayerVisible: (layerId: MapLayer.Id) => void;
  onRenameLayer: (layerId: MapLayer.Id) => void;
  onDuplicateLayer: (layerId: MapLayer.Id) => void;
  onZoomToLayer: (layerId: MapLayer.Id) => void;
  onDeleteLayer: (layerId: MapLayer.Id) => void;
};

/** The ordered rows, with pointer and keyboard reorder over one primitive. */
export function LayerList({
  rows,
  viewStates,
  selectedLayerId,
  onStackOrderChange,
  onSelectLayer,
  onToggleLayerVisible,
  onRenameLayer,
  onDuplicateLayer,
  onZoomToLayer,
  onDeleteLayer,
}: Props): ReactNode {
  const { t } = useLingui();
  const rowIds = rows.map((layer) => {
    return layer.id;
  });

  if (rows.length === 0) {
    return <div className={css.layerListEmpty}>{t`No layers yet.`}</div>;
  }

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        onStackOrderChange(move([...rowIds], event));
      }}
    >
      <ul className={css.layerList}>
        {rows.map((layer, rowIndex) => {
          const viewState = viewStates.get(layer.id);
          if (!viewState) {
            return null;
          }
          return (
            <LayerRow
              key={layer.id}
              layer={layer}
              viewState={viewState}
              rowIndex={rowIndex}
              isSelected={layer.id === selectedLayerId}
              onSelect={() => {
                onSelectLayer(layer.id);
              }}
              onToggleVisible={() => {
                onToggleLayerVisible(layer.id);
              }}
              onMoveByOffset={(offset) => {
                onStackOrderChange(
                  getStackOrderWithLayerMoved({
                    orderedLayerIds: rowIds,
                    layerId: layer.id,
                    offset,
                  }),
                );
              }}
              onRename={() => {
                onRenameLayer(layer.id);
              }}
              onDuplicate={() => {
                onDuplicateLayer(layer.id);
              }}
              onZoomToLayer={() => {
                onZoomToLayer(layer.id);
              }}
              onDelete={() => {
                onDeleteLayer(layer.id);
              }}
            />
          );
        })}
      </ul>
    </DragDropProvider>
  );
}
```

`src/views/GISApp/panels/LayerPanel/LayerPanel.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { LayerList } from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList";
import { LayerSourcePicker } from "@/views/GisApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePicker";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import css from "@/views/GisApp/shell/MapChromePanel/MapChromePanel.module.css";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { ComponentProps, ReactNode } from "react";

type Props = ComponentProps<typeof LayerList> & {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onAddLayerFromSource: (dataSource: QueryDataSource.T) => void;
};

/** The layer stack panel: a count, an add control, and the ordered rows. */
export function LayerPanel({
  isCollapsed,
  onToggleCollapsed,
  onAddLayerFromSource,
  ...listProps
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <MapChromePanel
      variant="layers"
      id="gis-layers-panel"
      title={t`Layers`}
      count={listProps.rows.length}
      isCollapsed={isCollapsed}
      onToggleCollapsed={onToggleCollapsed}
      collapseLabel={t`Collapse the layers panel`}
      expandLabel={t`Expand the layers panel`}
      headerActions={
        <LayerSourcePicker onSourceSelected={onAddLayerFromSource}>
          {(pickerProps) => {
            return (
              <ActionIcon
                {...pickerProps}
                className={css.headerAction}
                variant="subtle"
                color="neutral"
                aria-label={t`Add layer`}
              >
                <IconPlus size={16} stroke={1.8} />
              </ActionIcon>
            );
          }}
        </LayerSourcePicker>
      }
    >
      <LayerList {...listProps} />
    </MapChromePanel>
  );
}
```

- [ ] **Step 7: Add the drag dependency**

```bash
pnpm add "@dnd-kit/react@0.1.18" "@dnd-kit/helpers@0.1.18"
```

Then confirm the lockfile did not move anything else:

```bash
git diff --stat pnpm-lock.yaml
```

Expected: only the importer entries for the two packages change. Both versions
are already resolved as transitive dependencies of `@puckeditor/core`, so no
new resolution is added and no other package's version changes. If the diff is
larger than that, stop and report it.

- [ ] **Step 8: Type check**

Run: `pnpm type-check`
Expected: errors only for `LayerActionsMenu`, `LayerSourcePicker`, and
`getStackOrderWithLayerMoved`, which Tasks 17 and 18 write. Nothing else.

- [ ] **Step 9: Commit**

```bash
git add src/views/GISApp package.json pnpm-lock.yaml
git commit -m "feat(gis): add the layer stack panel and its rows"
```

---

## Task 17: Make reorder work, and add the row's overflow menu

**Files:**

- Create: `src/views/GISApp/panels/LayerPanel/getStackOrderWithLayerMoved/getStackOrderWithLayerMoved.ts`
- Test: `src/views/GISApp/panels/LayerPanel/getStackOrderWithLayerMoved/getStackOrderWithLayerMoved.test.ts`
- Create: `src/views/GISApp/panels/LayerPanel/LayerActionsMenu.tsx`

- [ ] **Step 1: Write the failing test for keyboard reorder**

`getStackOrderWithLayerMoved.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getStackOrderWithLayerMoved } from "@/views/GisApp/panels/LayerPanel/makeStackOrderFromLayerMove/makeStackOrderFromLayerMove";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const [a, b, c] = ["a", "b", "c"] as unknown as MapLayer.Id[];

describe("getStackOrderWithLayerMoved", () => {
  it("moves a layer one row up", () => {
    expect(
      getStackOrderWithLayerMoved({
        orderedLayerIds: [a!, b!, c!],
        layerId: c!,
        offset: -1,
      }),
    ).toEqual([a, c, b]);
  });

  it("moves a layer one row down", () => {
    expect(
      getStackOrderWithLayerMoved({
        orderedLayerIds: [a!, b!, c!],
        layerId: a!,
        offset: 1,
      }),
    ).toEqual([b, a, c]);
  });

  it("returns the same order when the layer is already at the top", () => {
    const order = [a!, b!, c!];
    expect(
      getStackOrderWithLayerMoved({
        orderedLayerIds: order,
        layerId: a!,
        offset: -1,
      }),
    ).toBe(order);
  });

  it("returns the same order when the layer is already at the bottom", () => {
    const order = [a!, b!, c!];
    expect(
      getStackOrderWithLayerMoved({
        orderedLayerIds: order,
        layerId: c!,
        offset: 1,
      }),
    ).toBe(order);
  });

  it("returns the same order for an unknown layer", () => {
    const order = [a!, b!];
    expect(
      getStackOrderWithLayerMoved({
        orderedLayerIds: order,
        layerId: c!,
        offset: -1,
      }),
    ).toBe(order);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend getStackOrderWithLayerMoved`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Implement it**

```ts
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * The panel row order with one layer moved by one position.
 *
 * Returns the array it was given, by reference, when the move is impossible, so
 * a keyboard user holding the arrow key at the end of the list does not
 * generate a save on every repeat.
 *
 * @param params.orderedLayerIds Every layer id in panel row order.
 * @param params.layerId The layer being moved.
 * @param params.offset `-1` to move it one row up, `1` one row down.
 */
export function getStackOrderWithLayerMoved({
  orderedLayerIds,
  layerId,
  offset,
}: {
  orderedLayerIds: readonly MapLayer.Id[];
  layerId: MapLayer.Id;
  offset: -1 | 1;
}): readonly MapLayer.Id[] {
  const fromIndex = orderedLayerIds.indexOf(layerId);
  const toIndex = fromIndex + offset;
  if (fromIndex === -1 || toIndex < 0 || toIndex >= orderedLayerIds.length) {
    return orderedLayerIds;
  }
  const next = [...orderedLayerIds];
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, layerId);
  return next;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend getStackOrderWithLayerMoved`
Expected: PASS.

- [ ] **Step 5: Write the overflow menu**

Inventory §1.1: rename, duplicate, and delete live in the row's overflow menu.
"Zoom to layer" joins them because it is the only camera action that belongs to
one layer.

`src/views/GISApp/panels/LayerPanel/LayerActionsMenu.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Menu } from "@mantine/core";
import {
  IconCopy,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconZoomScan,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  layerName: string;
  onRename: () => void;
  onDuplicate: () => void;
  onZoomToLayer: () => void;
  onDelete: () => void;
};

/**
 * Per-layer actions.
 *
 * `withinPortal` is not optional here. The layers panel sets
 * `overflow: hidden` so its list can scroll, and a dropdown rendered inside it
 * is clipped at the panel's edge. Shell design §4.1 records the same
 * requirement for the source picker.
 */
export function LayerActionsMenu({
  layerName,
  onRename,
  onDuplicate,
  onZoomToLayer,
  onDelete,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="neutral"
          size="sm"
          aria-label={t`More actions for the layer ${layerName}`}
        >
          <IconDotsVertical size={15} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconPencil size={14} stroke={1.5} />}
          onClick={onRename}
        >
          {t`Rename`}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconZoomScan size={14} stroke={1.5} />}
          onClick={onZoomToLayer}
        >
          {t`Zoom to layer`}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconCopy size={14} stroke={1.5} />}
          onClick={onDuplicate}
        >
          {t`Duplicate`}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="danger"
          leftSection={<IconTrash size={14} stroke={1.5} />}
          onClick={onDelete}
        >
          {t`Delete`}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
```

- [ ] **Step 6: Type check**

Run: `pnpm type-check`
Expected: errors only for `LayerSourcePicker`, which Task 18 writes.

- [ ] **Step 7: Commit**

```bash
git add src/views/GISApp/panels/LayerPanel
git commit -m "feat(gis): add layer reorder and the layer actions menu"
```

---

## Task 18: Build the add-layer flow

Shell design §4.1. Pressing Add layer opens a source picker; choosing a source
is what creates the layer. Everything after that is edited inline in the
inspector, which is already the layer editor. There is no wizard and no modal,
because the source is the only field with no sensible default and asking for
exactly one thing is not a wizard.

**Files:**

- Create: `src/views/GISApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePicker.tsx`
- Create: `src/views/GISApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns.ts`
- Test: `src/views/GISApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns.test.ts`
- Modify: `src/views/GISApp/MapCanvas/useFitMapBounds.ts`
- Modify: `src/views/GISApp/MapCanvas/MapCanvas.tsx`

- [ ] **Step 1: Write the failing test for coordinate inference**

Shell design §4.1 step 2 states the rules exactly: matching is
case-insensitive, on the whole normalized name and never a substring, so
`lat_updated_at` cannot win; both columns must be numeric; and **both** must
match, because half a binding plots every point on the line where latitude
equals longitude, which looks like a real result and is not.

`getGeoBindingGuessFromColumns.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getGeoBindingGuessFromColumns } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";

/** A column as the guesser sees it: a name and whether it holds numbers. */
function _column(name: string, isNumeric = true) {
  return { name, isNumeric };
}

describe("getGeoBindingGuessFromColumns", () => {
  it("matches the common short names", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column("id", false),
        _column("lat"),
        _column("lon"),
      ]),
    ).toEqual({ latitudeColumnName: "lat", longitudeColumnName: "lon" });
  });

  it("matches case insensitively and ignores surrounding punctuation", () => {
    expect(
      getGeoBindingGuessFromColumns([_column("Lat"), _column("Long_")]),
    ).toEqual({ latitudeColumnName: "Lat", longitudeColumnName: "Long_" });
  });

  it("never matches on a substring", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column("lat_updated_at"),
        _column("longitude"),
      ]),
    ).toBeUndefined();
  });

  it("returns nothing when only one axis matches", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column("latitude"),
        _column("name", false),
      ]),
    ).toBeUndefined();
  });

  it("ignores a matching name whose column is not numeric", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column("latitude", false),
        _column("longitude"),
      ]),
    ).toBeUndefined();
  });

  it("prefers the first match when several columns qualify", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column("y"),
        _column("latitude"),
        _column("x"),
      ]),
    ).toEqual({ latitudeColumnName: "y", longitudeColumnName: "x" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend getGeoBindingGuessFromColumns`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Implement the guesser**

```ts
/** A column as the guesser needs to see it. */
export type GeoBindingCandidateColumn = { name: string; isNumeric: boolean };

/** A matched pair of coordinate column names. */
export type GeoBindingGuess = {
  latitudeColumnName: string;
  longitudeColumnName: string;
};

/** Whole normalized names that mean latitude. */
const LATITUDE_NAMES = new Set(["lat", "latitude", "y", "latdd", "latitudedd"]);

/** Whole normalized names that mean longitude. */
const LONGITUDE_NAMES = new Set([
  "lon",
  "lng",
  "long",
  "longitude",
  "x",
  "londd",
  "longitudedd",
]);

/**
 * Lowercases and strips everything that is not a letter or a digit.
 *
 * Stripping separators is what lets `Long_` and `lat_dd` match while keeping
 * the comparison a whole-name one: `lat_updated_at` normalizes to
 * `latupdatedat`, which is not in the set.
 */
function _normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Guesses which two columns carry coordinates.
 *
 * Returns a pair only when **both** axes match a known name and both columns
 * are numeric. One axis on its own is deliberately not enough: a half-bound
 * layer plots every point on the diagonal where latitude equals longitude,
 * which looks like a real result and is not.
 *
 * The caller must always tell the user this happened. A silent correct guess
 * and a silent wrong guess are indistinguishable, and the wrong one becomes a
 * wrong map.
 *
 * @param columns The source's columns, in the order the source lists them.
 * @returns The matched column names, or `undefined` when no pair matched.
 */
export function getGeoBindingGuessFromColumns(
  columns: readonly GeoBindingCandidateColumn[],
): GeoBindingGuess | undefined {
  const numericColumns = columns.filter((column) => {
    return column.isNumeric;
  });
  const latitudeColumn = numericColumns.find((column) => {
    return LATITUDE_NAMES.has(_normalizeColumnName(column.name));
  });
  const longitudeColumn = numericColumns.find((column) => {
    return LONGITUDE_NAMES.has(_normalizeColumnName(column.name));
  });
  return latitudeColumn && longitudeColumn
    ? {
        latitudeColumnName: latitudeColumn.name,
        longitudeColumnName: longitudeColumn.name,
      }
    : undefined;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend getGeoBindingGuessFromColumns`
Expected: PASS.

- [ ] **Step 5: Write the source picker**

`src/views/GISApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePicker.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Popover } from "@mantine/core";
import { useState } from "react";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { ReactNode } from "react";

type TargetProps = { onClick: () => void; "aria-expanded": boolean };

type Props = {
  /** Renders the trigger, given the props that open the popover. */
  children: (targetProps: TargetProps) => ReactNode;
  onSourceSelected: (dataSource: QueryDataSource.T) => void;
};

/**
 * Picks the source that a new layer will query.
 *
 * `withinPortal` is required, not a preference: the layers panel sets
 * `overflow: hidden` so its list can scroll, and a popover rendered inside it
 * is clipped. The published prototype hit exactly this and had to render the
 * picker in flow beneath the panel as an approximation.
 *
 * Datasets, derived datasets, and profiles are one list with one behaviour.
 * Nothing downstream branches on which kind was chosen, because
 * `runStructuredQuery` does not branch either: Phase 1 removed the
 * Dataset-only gate and this must not reintroduce it by giving profile sources
 * a separate path.
 *
 * Dismissing creates nothing.
 */
export function LayerSourcePicker({
  children,
  onSourceSelected,
}: Props): ReactNode {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      opened={isOpen}
      onDismiss={() => {
        setIsOpen(false);
      }}
      position="bottom-start"
      width={288}
      withinPortal
      shadow="lg"
    >
      <Popover.Target>
        {children({
          onClick: () => {
            setIsOpen((current) => {
              return !current;
            });
          },
          "aria-expanded": isOpen,
        })}
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <QueryDataSourceSelect
          label={t`Data source`}
          placeholder={t`Search data sources`}
          searchable
          value={null}
          onChange={(dataSource) => {
            if (!dataSource) {
              return;
            }
            setIsOpen(false);
            onSourceSelected(dataSource);
          }}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
```

> `QueryDataSourceSelect` is passed `value={null}` deliberately. It is
> controlled here so it never auto-selects the workspace's first source (it
> does that when uncontrolled), which would create a layer nobody asked for.
> Check its current props before wiring: `label`, `placeholder`, and
> `searchable` are forwarded to `@avandar/ui`'s `Select`, so confirm the names
> against `packages/web/ui/src/inputs/Select/Select.tsx`.

- [ ] **Step 6: Replace the fit-bounds prop with a request**

`src/views/GISApp/MapCanvas/useFitMapBounds.ts`, rewritten. Phase 1 compared
bounds by value so a background refetch would not undo a user's pan; that guard
also makes "Zoom to layer" a no-op the second time it is pressed on the same
layer. A monotonic id makes both behaviours correct.

```ts
import { useReducedMotion } from "@mantine/hooks";
import { useEffect, useRef } from "react";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";
import type { MapChromeInsets } from "@/views/GisApp/shell/useMapChromeInsets/useMapChromeInsets";

/**
 * A camera move the app has asked for.
 *
 * `id` is monotonic and is the only thing compared, so asking twice for the
 * same bounds moves the camera twice (which is what "Zoom to layer" needs)
 * while a background refetch that produces identical bounds and no new id does
 * not undo the user's pan.
 */
export type FitBoundsRequest = {
  id: number;
  bounds: MapBounds;

  /** Padding that keeps the fitted data clear of the floating panels. */
  padding: MapChromeInsets;
};

/** Camera flight duration when motion is not reduced, in ms. */
const FIT_BOUNDS_DURATION_MS = 800;

/** Applies a fit-bounds request when its id changes. */
export function useFitMapBounds({
  mapInstance,
  request,
}: {
  mapInstance: MapInstance;
  request: FitBoundsRequest | undefined;
}): void {
  const { mapRef } = mapInstance;
  const appliedRequestIdRef = useRef<number | undefined>(undefined);
  // A flown camera is the single most nauseating thing a map does, so reduced
  // motion jumps instead. `fitBounds` is imperative, so the theme's
  // respectReducedMotion cannot cover it.
  const prefersReducedMotion = useReducedMotion();

  useEffect(
    function applyFitBoundsRequest() {
      const map = mapRef.current;
      if (!map || !request) {
        return;
      }
      if (appliedRequestIdRef.current === request.id) {
        return;
      }
      appliedRequestIdRef.current = request.id;
      map.fitBounds(request.bounds, {
        padding: request.padding,
        animate: !prefersReducedMotion,
        duration: prefersReducedMotion ? 0 : FIT_BOUNDS_DURATION_MS,
      });
    },
    [request, mapRef, prefersReducedMotion],
  );
}
```

Then in `MapCanvas.tsx` replace the `fitBounds: MapBounds | undefined` prop
with `fitBoundsRequest: FitBoundsRequest | undefined` and pass it through as
`request`. Also delete the `role="region" aria-label={t\`Map\`}`from the
canvas div:`MapShell`now owns the map's accessible name and`role="application"`, and two nested regions naming the same thing is worse
than one.

- [ ] **Step 7: Run the tests and type check**

Run: `pnpm test:frontend getGeoBindingGuessFromColumns && pnpm type-check`
Expected: the test passes. Type errors remain wherever the old `fitBounds` prop
was passed (`GisMapCanvas`, deleted in Task 30) and for `MapLayerViewState`
producers (Task 25). Note them and continue.

- [ ] **Step 8: Commit**

```bash
git add src/views/GISApp
git commit -m "feat(gis): add the add-layer source picker and coordinate inference"
```

---

# Stage 5: the layer inspector, the legend, and the states

One panel, sectioned by the model's axes so the editing surface and the data
model stay one to one: Data, Style, Sensitivity, Filter, Popup, Legend
(inventory §1.2 and §3.1). Every wave adds fields to existing sections rather
than new panels, which is the property that lets Tiers 1 to 5 land without
reshaping the UI.

## Task 19: Move and extend `MapLayerUpdates`, then build the inspector shell

**Files:**

- Move: `src/views/GISApp/panels/LayerFormPanel/MapLayerUpdates.ts` → `src/views/GISApp/layers/MapLayerUpdates.ts`
- Modify: the moved file
- Test: `src/views/GISApp/layers/MapLayerUpdates.test.ts` (new)
- Create: `src/views/GISApp/panels/LayerInspector/LayerInspector.tsx`
- Create: `src/views/GISApp/panels/LayerInspector/LayerInspector.module.css`
- Create: `src/views/GISApp/panels/LayerInspector/InspectorSection.tsx`

- [ ] **Step 1: Move the updates module**

```bash
git mv src/views/GISApp/panels/LayerFormPanel/MapLayerUpdates.ts \
  src/views/GISApp/layers/MapLayerUpdates.ts
grep -rl "panels/LayerFormPanel/MapLayerUpdates" src \
  | xargs sed -i '' \
    's|panels/LayerFormPanel/MapLayerUpdates|layers/MapLayerUpdates|g'
```

It is no longer the layer form's, so change its docstring from "driven by the
layer form" to "driven by the layer inspector".

- [ ] **Step 2: Write the failing tests for the new updaters**

`src/views/GISApp/layers/MapLayerUpdates.test.ts`. Copy the dataset and column
fixtures from `MapLayerModule.test.ts`; do not invent looser ones.

```ts
describe("withPopupColumns", () => {
  it("selects the columns and adds them to the layer's query", () => {
    const column = _createNumericColumn("cases");
    const layer = MapLayer.makeEmpty("Cases");
    const next = MapLayerUpdates.withPopupColumns(layer, [column]);
    expect(next.popup.columnIds).toEqual([column.id]);
    expect(next.source.queryColumns).toContain(column);
  });

  it("keeps a column the geometry binding needs when it is deselected", () => {
    const bound = _createBoundLayer();
    const next = MapLayerUpdates.withPopupColumns(bound, []);
    expect(next.popup.columnIds).toEqual([]);
    expect(next.source.queryColumns.map(prop("id"))).toEqual(
      expect.arrayContaining([
        bound.geoBinding!.latitude!,
        bound.geoBinding!.longitude!,
      ]),
    );
  });

  it("drops a column that is neither bound nor selected any more", () => {
    const extra = _createNumericColumn("cases");
    const bound = MapLayerUpdates.withPopupColumns(_createBoundLayer(), [
      extra,
    ]);
    const next = MapLayerUpdates.withPopupColumns(bound, []);
    expect(next.source.queryColumns).not.toContain(extra);
  });

  it("does not select the same base column twice under two ids", () => {
    const bound = _createBoundLayer();
    const latitudeColumn = MapLayerUpdates.findQueryColumn(
      bound,
      bound.geoBinding!.latitude,
    )!;
    // A freshly built QueryColumn for the same base column, which is what the
    // multi-select hands back: same baseColumn, different generated id.
    const rebuilt = QueryColumn.makeFromDatasetColumn(
      latitudeColumn.baseColumn as DatasetColumn.T,
    );
    const next = MapLayerUpdates.withPopupColumns(bound, [rebuilt]);
    expect(next.source.queryColumns).toHaveLength(2);
    expect(next.popup.columnIds).toEqual([latitudeColumn.id]);
  });
});

describe("withDefaultPopupColumns", () => {
  it("materializes the source's columns the first time geometry binds", () => {
    const bound = _createBoundLayer();
    const extra = _createNumericColumn("cases");
    const next = MapLayerUpdates.withDefaultPopupColumns(bound, [
      ...bound.source.queryColumns,
      extra,
    ]);
    expect(next.popup.columnIds).toContain(extra.id);
  });

  it("leaves an explicit selection alone", () => {
    const chosen = MapLayerUpdates.withPopupColumns(_createBoundLayer(), []);
    expect(
      MapLayerUpdates.withDefaultPopupColumns(chosen, [
        _createNumericColumn("cases"),
      ]),
    ).toBe(chosen);
  });
});

describe("withSymbology", () => {
  it("carries a single color from a circle to a proportional symbol", () => {
    const column = _createNumericColumn("cases");
    const layer = MapLayerUpdates.withSymbolColor(
      MapLayer.makeEmpty("Cases"),
      "#eb6834",
    );
    const next = MapLayerUpdates.withSymbologyType(layer, {
      nextType: "proportionalSymbol",
      valueColumn: column,
      remembered: undefined,
    });
    expect(next.symbology.color).toEqual({
      type: "single",
      color: "#eb6834",
    });
  });

  it("maps a circle's radius onto the proportional symbol's largest radius", () => {
    const layer = MapLayerUpdates.withCircleRadius(
      MapLayer.makeEmpty("Cases"),
      11,
    );
    const next = MapLayerUpdates.withSymbologyType(layer, {
      nextType: "proportionalSymbol",
      valueColumn: _createNumericColumn("cases"),
      remembered: undefined,
    });
    expect(
      next.symbology.type === "proportionalSymbol" && next.symbology.maxRadius,
    ).toBe(11);
  });

  it("restores a remembered symbology of the target type", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const remembered = {
      type: "circle" as const,
      radius: 3,
      color: { type: "single" as const, color: "#008300" },
      stroke: { width: 2, color: "#ffffff" },
    };
    const next = MapLayerUpdates.withSymbologyType(layer, {
      nextType: "circle",
      valueColumn: undefined,
      remembered,
    });
    expect(next.symbology).toEqual(remembered);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test:frontend MapLayerUpdates`
Expected: FAIL, `MapLayerUpdates.withPopupColumns is not a function`.

- [ ] **Step 4: Implement the new updaters**

Append to `MapLayerUpdates`. Two helpers first:

```ts
/**
 * How many of a source's columns a layer selects into its popup by default.
 *
 * A cap exists because the popup's selection is also the layer's query: a
 * 60-column linelist would put 60 rows in the drawer and 60 properties on every
 * one of thousands of features. Twelve is enough to identify a record and cheap
 * enough to fetch, and the Popup section says so and lets the author change it.
 */
const DEFAULT_POPUP_COLUMN_LIMIT = 12;

/** Column ids the layer needs regardless of what the popup shows. */
function _getRequiredColumnIds(layer: MapLayer.T): ReadonlySet<QueryColumn.Id> {
  const required = new Set<QueryColumn.Id>();
  if (layer.geoBinding?.latitude) {
    required.add(layer.geoBinding.latitude);
  }
  if (layer.geoBinding?.longitude) {
    required.add(layer.geoBinding.longitude);
  }
  if (layer.symbology.type === "proportionalSymbol") {
    required.add(layer.symbology.value);
  }
  return required;
}
```

```ts
  /**
   * Sets which columns a feature's popup shows, and makes the layer's query
   * fetch exactly those plus the ones it structurally needs.
   *
   * The popup selection *is* the projection. Before Wave A the query selected
   * only the bound coordinate columns and the feature builder omitted exactly
   * those, so every popup was empty by construction.
   */
  withPopupColumns: (
    layer: MapLayer.T,
    columns: readonly QueryColumn.T[],
  ): MapLayer.T => {
    const requiredIds = _getRequiredColumnIds(layer);
    // Reuse the layer's own column object whenever the incoming selection names
    // the same base column. `QueryColumn.makeFromDatasetColumn` mints a fresh
    // id on every call, so a re-selected column would otherwise arrive with a
    // new id and end up in the query twice: once for the geometry binding and
    // once for the popup.
    const existingByBaseColumnId = new Map(
      layer.source.queryColumns.map((column) => {
        return [column.baseColumn.id, column];
      }),
    );
    const selected = columns.map((column) => {
      return existingByBaseColumnId.get(column.baseColumn.id) ?? column;
    });
    const selectedIds = new Set(
      selected.map((column) => {
        return column.id;
      }),
    );
    const nextQueryColumns = [
      ...layer.source.queryColumns.filter((column) => {
        return requiredIds.has(column.id) || selectedIds.has(column.id);
      }),
      ...selected.filter((column) => {
        return !layer.source.queryColumns.includes(column);
      }),
    ];
    return {
      ...layer,
      popup: { ...layer.popup, columnIds: selected.map(prop("id")) },
      source: { ...layer.source, queryColumns: nextQueryColumns },
    };
  },

  /**
   * Selects the source's first {@link DEFAULT_POPUP_COLUMN_LIMIT} columns into
   * the popup, but only while the layer is still on the `"all"` default.
   *
   * Called once, when a layer's geometry binding first completes. An author who
   * has chosen their own columns is never overridden.
   */
  withDefaultPopupColumns: (
    layer: MapLayer.T,
    availableColumns: readonly QueryColumn.T[],
  ): MapLayer.T => {
    if (layer.popup.columnIds !== "all") {
      return layer;
    }
    return MapLayerUpdates.withPopupColumns(
      layer,
      availableColumns.slice(0, DEFAULT_POPUP_COLUMN_LIMIT),
    );
  },

  /** Sets the popup's optional click-through link. */
  withPopupAction: (
    layer: MapLayer.T,
    action: MapLayer.PopupAction | undefined,
  ): MapLayer.T => {
    return { ...layer, popup: { ...layer.popup, action } };
  },

  /**
   * Switches the layer's symbology type.
   *
   * Applies the carry-over rules from shell design §4.2: a single color always
   * carries, because the author picked that color for this layer rather than
   * for that symbology, and a tuned radius carries across as the proportional
   * symbol's largest radius so the visual scale survives. A column reference
   * never carries, because it may not apply to the new type.
   *
   * `remembered` is the last symbology of the target type from this session,
   * held by the Style section. Restoring it is what makes switching
   * non-destructive: building a fresh default on every switch makes
   * exploration expensive, and users who pay for exploration stop exploring.
   */
  withSymbologyType: (
    layer: MapLayer.T,
    params: {
      nextType: MapLayer.Symbology["type"];
      valueColumn: QueryColumn.T | undefined;
      remembered: MapLayer.Symbology | undefined;
    },
  ): MapLayer.T => {
    const { nextType, valueColumn, remembered } = params;
    if (layer.symbology.type === nextType) {
      return layer;
    }
    if (remembered && remembered.type === nextType) {
      return { ...layer, symbology: remembered };
    }
    const { color, stroke } = layer.symbology;
    if (nextType === "circle") {
      const radius =
        layer.symbology.type === "proportionalSymbol" ?
          layer.symbology.maxRadius
        : MapLayer.defaultSymbolRadius;
      return {
        ...layer,
        symbology: { type: "circle", radius, color, stroke },
      };
    }
    if (!valueColumn) {
      return layer;
    }
    const maxRadius =
      layer.symbology.type === "circle" ?
        layer.symbology.radius
      : MapLayer.defaultMaxSymbolRadius;
    const withColumn = _withQueryColumn(layer, valueColumn);
    return {
      ...withColumn,
      symbology: {
        type: "proportionalSymbol",
        value: valueColumn.id,
        minRadius: MapLayer.defaultMinSymbolRadius,
        maxRadius,
        scale: "sqrt",
        color,
        stroke,
      },
    };
  },

  /** Sets a flat circle's radius, in pixels. */
  withCircleRadius: (layer: MapLayer.T, radius: number): MapLayer.T => {
    if (layer.symbology.type !== "circle" || layer.symbology.radius === radius) {
      return layer;
    }
    return { ...layer, symbology: { ...layer.symbology, radius } };
  },

  /** Sets a proportional symbol's largest radius, in pixels. */
  withMaxSymbolRadius: (layer: MapLayer.T, maxRadius: number): MapLayer.T => {
    if (
      layer.symbology.type !== "proportionalSymbol" ||
      layer.symbology.maxRadius === maxRadius
    ) {
      return layer;
    }
    return { ...layer, symbology: { ...layer.symbology, maxRadius } };
  },

  /** Sets the symbol outline. */
  withStroke: (
    layer: MapLayer.T,
    stroke: Partial<MapLayer.Symbology["stroke"]>,
  ): MapLayer.T => {
    const next = { ...layer.symbology.stroke, ...stroke };
    if (
      next.color === layer.symbology.stroke.color &&
      next.width === layer.symbology.stroke.width
    ) {
      return layer;
    }
    return { ...layer, symbology: { ...layer.symbology, stroke: next } };
  },

  /** Sets the layer's spatial privacy policy. */
  withSensitivity: (
    layer: MapLayer.T,
    sensitivity: MapLayer.Sensitivity,
  ): MapLayer.T => {
    return { ...layer, sensitivity };
  },

  /** Replaces the layer's filter tree. */
  withFilters: (
    layer: MapLayer.T,
    filters: MapLayer.T["source"]["filters"],
  ): MapLayer.T => {
    if (filters === layer.source.filters) {
      return layer;
    }
    return { ...layer, source: { ...layer.source, filters } };
  },

  /** Patches the layer's legend. */
  withLegend: (
    layer: MapLayer.T,
    legend: Partial<MapLayer.Legend>,
  ): MapLayer.T => {
    return { ...layer, legend: { ...layer.legend, ...legend } };
  },

  /** Renames the layer, keeping its legend title in step until it diverges. */
  withName: (layer: MapLayer.T, name: string): MapLayer.T => {
    if (name === layer.name) {
      return layer;
    }
    const legend =
      layer.legend.title === layer.name ?
        { ...layer.legend, title: name }
      : layer.legend;
    return { ...layer, name, legend };
  },

  /** Shows or hides the layer. */
  withVisibility: (layer: MapLayer.T, isVisible: boolean): MapLayer.T => {
    return isVisible === layer.isVisible ? layer : { ...layer, isVisible };
  },
```

Add `prop` to the `@avandar/utils` import and
`import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";` as a value
import (it is currently type-only in this file).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test:frontend MapLayerUpdates`
Expected: PASS.

- [ ] **Step 6: Write the inspector stylesheet**

`src/views/GISApp/panels/LayerInspector/LayerInspector.module.css`:

```css
.lead {
  border-bottom: 1px solid var(--ava-border-default);
  padding: var(--mantine-spacing-sm) var(--mantine-spacing-sm)
    var(--mantine-spacing-xs);
}

.leadName {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 2px;
}

.leadStatus {
  color: var(--mantine-color-dimmed);
  font-size: 12px;
}

.section {
  border-bottom: 1px solid var(--ava-border-default);
}

.section:last-child {
  border-bottom: 0;
}

.sectionToggle {
  align-items: center;
  background: none;
  border: 0;
  color: var(--mantine-color-text);
  display: flex;
  font-size: 12px;
  font-weight: 600;
  gap: var(--mantine-spacing-xs);
  letter-spacing: 0.02em;
  padding: var(--mantine-spacing-xs) var(--mantine-spacing-sm);
  text-align: left;
  transition: background 140ms cubic-bezier(0.16, 1, 0.3, 1);
  width: 100%;
}

.sectionToggle:hover {
  background: var(--ava-surface-sunken);
}

/* Full-bleed control inside a clipping panel: the ring draws inside. */
.sectionToggle:focus-visible {
  outline-offset: -2px;
}

.sectionChevron {
  color: var(--mantine-color-dimmed);
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.section[data-open="false"] .sectionChevron {
  transform: rotate(-90deg);
}

.section[data-open="false"] .sectionContent {
  display: none;
}

.sectionContent {
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-sm);
  padding: 0 var(--mantine-spacing-sm) var(--mantine-spacing-sm);
}

.sectionNote {
  color: var(--mantine-color-dimmed);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  margin-left: auto;
}

.emptyState {
  color: var(--mantine-color-dimmed);
  font-size: 12px;
  line-height: 1.5;
  padding: var(--mantine-spacing-md) var(--mantine-spacing-sm);
  text-align: center;
}
```

- [ ] **Step 7: Write the section component**

`src/views/GISApp/panels/LayerInspector/InspectorSection.tsx`:

```tsx
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import css from "@/views/GisApp/panels/LayerInspector/LayerInspector.module.css";
import type { ReactNode } from "react";

type Props = {
  title: string;

  /** A one-line summary shown on the right of the header while collapsed. */
  note?: string;

  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * One collapsible inspector section.
 *
 * The content is **hidden with CSS rather than unmounted**, which is
 * load-bearing rather than incidental: the Popup section normalizes the
 * layer's projection when it mounts, and a section that unmounts while
 * collapsed would leave the layer's query selecting nothing.
 */
export function InspectorSection({
  title,
  note,
  defaultOpen = false,
  children,
}: Props): ReactNode {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={css.section} data-open={isOpen}>
      <button
        type="button"
        className={css.sectionToggle}
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => {
            return !current;
          });
        }}
      >
        <IconChevronDown className={css.sectionChevron} size={14} stroke={2} />
        {title}
        {note ? <span className={css.sectionNote}>{note}</span> : null}
      </button>
      <div className={css.sectionContent}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 8: Write the inspector**

`src/views/GISApp/panels/LayerInspector/LayerInspector.tsx`:

```tsx
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";
import { FilterSection } from "@/views/GisApp/panels/LayerInspector/FilterSection/FilterSection";
import css from "@/views/GisApp/panels/LayerInspector/LayerInspector.module.css";
import { LegendSection } from "@/views/GisApp/panels/LayerInspector/LegendSection/LegendSection";
import { PopupSection } from "@/views/GisApp/panels/LayerInspector/PopupSection";
import { SensitivitySection } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivitySection";
import { StyleSection } from "@/views/GisApp/panels/LayerInspector/StyleSection/StyleSection";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

/** An immutable update applied to the selected layer. */
export type LayerChangeHandler = (
  update: (current: MapLayer.T) => MapLayer.T,
) => void;

type Props = {
  layer: MapLayer.T | undefined;
  viewState: MapLayerViewState | undefined;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onLayerChange: LayerChangeHandler;
};

/** One sentence naming what the selected layer's data is doing. */
function _useLeadStatus(viewState: MapLayerViewState | undefined): string {
  const { t } = useLingui();
  if (!viewState) {
    return "";
  }
  const mapped = viewState.featureCount;
  const total = viewState.featureCount + viewState.droppedRowCount;
  return matchLiteral(viewState.status, {
    unbound: t`Not plotted yet`,
    loading: t`Loading`,
    error: t`Could not load`,
    empty: t`0 rows`,
    ready: t`${mapped} of ${total} rows mapped`,
  });
}

/**
 * The selected layer's editor, sectioned by the model's axes.
 *
 * Sections map one to one onto `MapLayer` fields, which is what lets each wave
 * add fields to an existing section instead of inventing a panel. Sensitivity
 * is its own section rather than a Style option because it *constrains* Style,
 * and a control that disables other controls cannot sit inside the thing it
 * disables.
 */
export function LayerInspector({
  layer,
  viewState,
  isCollapsed,
  onToggleCollapsed,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const leadStatus = _useLeadStatus(viewState);

  return (
    <MapChromePanel
      variant="inspector"
      id="gis-inspector"
      bodyId={GIS_SKIP_TARGET_IDS.inspectorBody}
      title={t`Layer`}
      isCollapsed={isCollapsed}
      onToggleCollapsed={onToggleCollapsed}
      collapseLabel={t`Collapse the layer panel`}
      expandLabel={t`Expand the layer panel`}
    >
      {!layer ? (
        <div className={css.emptyState}>
          {t`Select a layer to edit how it is queried and drawn.`}
        </div>
      ) : (
        <>
          <div className={css.lead}>
            <h3 className={css.leadName}>{layer.name}</h3>
            <div className={css.leadStatus}>{leadStatus}</div>
          </div>
          <DataSection layer={layer} onLayerChange={onLayerChange} />
          <StyleSection layer={layer} onLayerChange={onLayerChange} />
          <SensitivitySection layer={layer} onLayerChange={onLayerChange} />
          <FilterSection layer={layer} onLayerChange={onLayerChange} />
          <PopupSection layer={layer} onLayerChange={onLayerChange} />
          <LegendSection layer={layer} onLayerChange={onLayerChange} />
        </>
      )}
    </MapChromePanel>
  );
}
```

- [ ] **Step 9: Type check**

Run: `pnpm type-check && pnpm lint:css`
Expected: errors only for the six not-yet-written sections. Delete
`src/views/GISApp/panels/LayerFormPanel/LayerFormPanel.types.ts`'s
`LayerChangeHandler` re-export if anything still imports it; the type now lives
in `LayerInspector.tsx`.

- [ ] **Step 10: Commit**

```bash
git add src/views/GISApp
git commit -m "feat(gis): add the layer inspector shell and extend MapLayerUpdates"
```

---

## Task 20: Build the Data section

Shell design §4.1, steps 2 to 3, and its exact copy. The three cases are:
inference succeeded, inference failed, and the source has no coordinate columns
at all. Each reads differently, and the third is never a bare disabled
dropdown.

**Files:**

- Create: `src/views/GISApp/panels/LayerInspector/DataSection.tsx`

- [ ] **Step 1: Write the section**

```tsx
import { Model } from "@avandar/models";
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Select, Stack } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { useEffect, useMemo } from "react";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { getGeoBindingGuessFromColumns } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { useLayerSourceColumns } from "@/views/GisApp/panels/LayerInspector/useLayerSourceColumns";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/**
 * The layer's source and how its rows become geometry.
 *
 * The binding type selector holds one option today. It exists anyway, because
 * every later binding (geometry column, boundary join, point-in-polygon,
 * grid binning) is one branch of the `GeoBinding` union and therefore one more
 * option here, never a new panel. Shipping the selector now is what keeps
 * `GeoBinding` and its editor isomorphic.
 */
export function DataSection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  const sourceColumns = useLayerSourceColumns(dataSourceId);

  const latitudeId = layer.geoBinding?.latitude;
  const longitudeId = layer.geoBinding?.longitude;
  const isBound = latitudeId !== undefined && longitudeId !== undefined;

  const guess = useMemo(() => {
    return getGeoBindingGuessFromColumns(
      sourceColumns.map((column) => {
        return {
          name: QueryColumn.getDerivedColumnName(column),
          isNumeric: QueryColumn.isNumeric(column),
        };
      }),
    );
  }, [sourceColumns]);

  const hasCoordinateCandidates = guess !== undefined;

  // Inference runs once per source, and only while nothing is bound. It is
  // never silent: the callout below names the two columns it matched, because
  // a silent correct guess and a silent wrong guess are indistinguishable to
  // the user and the wrong one becomes a wrong map.
  useEffect(
    function applyCoordinateGuess() {
      if (isBound || !guess || sourceColumns.length === 0) {
        return;
      }
      const findColumn = (columnName: string) => {
        return sourceColumns.find((column) => {
          return QueryColumn.getDerivedColumnName(column) === columnName;
        });
      };
      const latitudeColumn = findColumn(guess.latitudeColumnName);
      const longitudeColumn = findColumn(guess.longitudeColumnName);
      if (!latitudeColumn || !longitudeColumn) {
        return;
      }
      onLayerChange((current) => {
        const withLatitude = MapLayerUpdates.withGeoBindingAxis(
          current,
          "latitude",
          latitudeColumn,
        );
        const withBoth = MapLayerUpdates.withGeoBindingAxis(
          withLatitude,
          "longitude",
          longitudeColumn,
        );
        return MapLayerUpdates.withDefaultPopupColumns(withBoth, sourceColumns);
      });
    },
    [guess, isBound, onLayerChange, sourceColumns],
  );

  return (
    <InspectorSection title={t`Data`} defaultOpen>
      <QueryDataSourceSelect
        label={t`Source`}
        value={layer.source.dataSource ?? null}
        onChange={(dataSource) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withDataSource(
              current,
              dataSource ?? undefined,
            );
          });
        }}
      />
      <Select
        label={t`Geometry`}
        data={[
          {
            value: "latLngColumns",
            label: t`Latitude and longitude columns`,
          },
        ]}
        value="latLngColumns"
        allowDeselect={false}
        readOnly
        description={t`Geometry columns, boundary joins, and grid binning arrive in a later release.`}
      />
      {hasCoordinateCandidates || isBound ? (
        <>
          <QueryColumnSingleSelect
            label={t`Latitude`}
            placeholder={t`Select a column`}
            dataSourceId={dataSourceId}
            value={MapLayerUpdates.findQueryColumn(layer, latitudeId) ?? null}
            onChange={(column) => {
              onLayerChange((current) => {
                return MapLayerUpdates.withGeoBindingAxis(
                  current,
                  "latitude",
                  column ?? undefined,
                );
              });
            }}
          />
          <QueryColumnSingleSelect
            label={t`Longitude`}
            placeholder={t`Select a column`}
            dataSourceId={dataSourceId}
            value={MapLayerUpdates.findQueryColumn(layer, longitudeId) ?? null}
            onChange={(column) => {
              onLayerChange((current) => {
                return MapLayerUpdates.withGeoBindingAxis(
                  current,
                  "longitude",
                  column ?? undefined,
                );
              });
            }}
          />
          {isBound && guess ? (
            <Callout>
              {t`Latitude and longitude were matched from the column names ${guess.latitudeColumnName} and ${guess.longitudeColumnName}. Change them above if that is wrong.`}
            </Callout>
          ) : null}
          {!isBound ? (
            <Callout color="warning">
              {t`Pick both a latitude and a longitude column. One on its own plots every point on a diagonal line, which looks like a result and is not.`}
            </Callout>
          ) : null}
        </>
      ) : null}
      {!hasCoordinateCandidates && !isBound && layer.source.dataSource ? (
        <Callout color="warning">
          <Stack gap="xs">
            <span>
              {t`No column in ${layer.source.dataSource.name} holds coordinates. Boundary joins arrive in a later release, so pick a different source.`}
            </span>
          </Stack>
        </Callout>
      ) : null}
    </InspectorSection>
  );
}
```

> Two names to check against the real code before writing this file:
> `Callout`'s prop for its tone (`color`, `variant`, or `tone`) in
> `packages/web/ui/src/Callout/Callout.tsx`, and `QueryColumnSingleSelect`'s
> prop names. `QueryColumn.isNumeric(column)` does exist
> (`shared/models/queries/QueryColumn/QueryColumnModule.ts:48`), so use it
> rather than reaching into `baseColumn.dataType`.

> The "no coordinates at all" copy is the Wave A form of it. Shell design §4.1
> step 3 gives the full sentence with a **[Join to boundaries]** action, and
> says that in Wave A, where `joinToBoundaries` does not exist yet, the second
> sentence becomes "Boundary joins arrive in a later release." and only "Pick a
> different source" is offered. There is no button because the source select is
> three rows above and already is that action.

- [ ] **Step 2: Write the source columns hook**

`src/views/GISApp/panels/LayerInspector/useLayerSourceColumns.ts`. Both the
Data section and the Popup section need the source's full column list. This is
`QueryColumnMultiSelect`'s loading and mapping code with its combobox concerns
removed, so the two read the same list rather than two different ones.

```ts
import { Model } from "@avandar/models";
import { where } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { useMemo } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";

/**
 * Every column a data source offers, as `QueryColumn`s.
 *
 * The memo is load-bearing, not an optimization.
 * `QueryColumn.makeFromDatasetColumn` mints a **fresh uuid** on every call, so
 * an unmemoized version would return columns with new ids on every render. The
 * Data section's inference effect would then bind a different column id each
 * time and append to the layer's query forever. Memoizing on the two loaded
 * arrays, which TanStack keeps referentially stable, is what stops that.
 *
 * Those regenerated ids are also why nothing here should be compared against a
 * *stored* column id. A stored selection is remapped by base column instead,
 * which is what `remapColumnsByBaseId` does inside
 * `QueryColumnMultiSelect`.
 */
export function useLayerSourceColumns(
  dataSourceId: Model.TypedId<QueryDataSource.T> | undefined,
): readonly QueryColumn.T[] {
  const [datasetColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", dataSourceId?.id),
    useQueryOptions: {
      enabled: Model.isOfModelType(dataSourceId, "Dataset"),
    },
  });

  const [entityFieldConfigs] = EntityFieldConfigClient.useGetAll({
    ...where("entity_config_id", "eq", dataSourceId?.id),
    useQueryOptions: {
      enabled: Model.isOfModelType(dataSourceId, "EntityConfig"),
    },
  });

  return useMemo(() => {
    return [
      ...(datasetColumns ?? []).map((column) => {
        return QueryColumn.makeFromDatasetColumn(column);
      }),
      ...(entityFieldConfigs ?? []).map((field) => {
        return QueryColumn.makeFromEntityFieldConfig(field);
      }),
    ];
  }, [datasetColumns, entityFieldConfigs]);
}
```

- [ ] **Step 3: Verify inference in the running app**

Run the app, create a map, add a layer from the
`small-california-covid-sample.csv` dataset that the current-state screenshots
used (import it if the workspace does not have it).

Expected: the layer renders immediately without touching the column selects,
and the Data section shows "Latitude and longitude were matched from the column
names **Lat** and **Long\_**." That dataset is why the guesser's
punctuation-stripping test exists: `Long_` only matches once `_` is stripped.

- [ ] **Step 4: Commit**

```bash
git add src/views/GISApp/panels/LayerInspector
git commit -m "feat(gis): add the inspector Data section with coordinate inference"
```

---

## Task 21: Build the Style section

**Files:**

- Create: `src/views/GISApp/panels/LayerInspector/StyleSection.tsx`

- [ ] **Step 1: Write the section**

```tsx
import { Model } from "@avandar/models";
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ColorInput, Group, NumberInput, Text } from "@mantine/core";
import { useRef } from "react";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import css from "@/views/GisApp/panels/LayerInspector/LayerInspector.module.css";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

/** Symbology kinds the segmented control offers, available or not. */
const SYMBOLOGY_OPTIONS = [
  { type: "circle", isAvailable: true },
  { type: "proportionalSymbol", isAvailable: true },
  { type: "cluster", isAvailable: false },
  { type: "heatmap", isAvailable: false },
] as const;

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/**
 * How the layer's geometry is painted.
 *
 * The two unavailable options are **present and disabled with a stated
 * reason**, never absent. A missing option teaches nothing; an unavailable
 * option with a reason teaches the rule. They use `aria-disabled` rather than
 * the `disabled` attribute so they stay focusable and a keyboard user can reach
 * the reason, and the reason is a hint under the control rather than a hover
 * tooltip so it survives a screenshot.
 */
export function StyleSection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const { symbology } = layer;
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;

  // Switching is not destructive within a session: the last settings for each
  // symbology kind are kept here so Point to Sized and back returns the exact
  // circle the author had. Only the active kind is written to the model, so the
  // persisted config stays a clean discriminated union.
  const rememberedRef = useRef<
    Partial<Record<MapLayer.Symbology["type"], MapLayer.Symbology>>
  >({});
  rememberedRef.current[symbology.type] = symbology;

  const sizeColumn =
    symbology.type === "proportionalSymbol"
      ? MapLayerUpdates.findQueryColumn(layer, symbology.value)
      : undefined;

  const labelFor = (
    type: (typeof SYMBOLOGY_OPTIONS)[number]["type"],
  ): string => {
    if (type === "circle") {
      return t`Point`;
    }
    if (type === "proportionalSymbol") {
      return t`Sized`;
    }
    if (type === "cluster") {
      return t`Cluster`;
    }
    return t`Heat`;
  };

  return (
    <InspectorSection title={t`Style`} defaultOpen>
      <div>
        <Text component="span" size="xs" fw={500} id="gis-symbology-label">
          {t`Symbol`}
        </Text>
        <Group gap={2} role="group" aria-labelledby="gis-symbology-label">
          {SYMBOLOGY_OPTIONS.map((option) => {
            const isActive = option.type === symbology.type;
            return (
              <button
                key={option.type}
                type="button"
                aria-pressed={isActive}
                aria-disabled={!option.isAvailable || undefined}
                aria-describedby={
                  option.isAvailable ? undefined : "gis-symbology-hint"
                }
                onClick={() => {
                  if (!option.isAvailable) {
                    return;
                  }
                  onLayerChange((current) => {
                    return MapLayerUpdates.withSymbologyType(current, {
                      nextType: option.type,
                      valueColumn: sizeColumn,
                      remembered: rememberedRef.current[option.type],
                    });
                  });
                }}
              >
                {labelFor(option.type)}
              </button>
            );
          })}
        </Group>
        <Text component="p" size="xs" c="dimmed" id="gis-symbology-hint">
          {t`Cluster and Heat are unavailable: they arrive in a later release.`}
        </Text>
      </div>
      <ColorInput
        label={t`Color`}
        format="hex"
        value={symbology.color.color}
        onChange={(color) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withSymbolColor(current, color);
          });
        }}
      />
      {symbology.type === "circle" ? (
        <NumberInput
          label={t`Radius`}
          suffix=" px"
          min={1}
          max={40}
          value={symbology.radius}
          onChange={(value) => {
            if (typeof value !== "number") {
              return;
            }
            onLayerChange((current) => {
              return MapLayerUpdates.withCircleRadius(current, value);
            });
          }}
        />
      ) : (
        <>
          <QueryColumnSingleSelect
            label={t`Size by`}
            placeholder={t`Select a column`}
            dataSourceId={dataSourceId}
            value={sizeColumn ?? null}
            onChange={(column) => {
              onLayerChange((current) => {
                return MapLayerUpdates.withSymbolSizeColumn(
                  current,
                  column ?? undefined,
                );
              });
            }}
          />
          <NumberInput
            label={t`Largest radius`}
            suffix=" px"
            min={2}
            max={80}
            value={symbology.maxRadius}
            onChange={(value) => {
              if (typeof value !== "number") {
                return;
              }
              onLayerChange((current) => {
                return MapLayerUpdates.withMaxSymbolRadius(current, value);
              });
            }}
          />
          <Callout>
            {t`Symbol area is proportional to the value, not radius, so a value ten times larger draws a symbol about three times wider.`}
          </Callout>
        </>
      )}
      <Group grow align="flex-start">
        <ColorInput
          label={t`Outline`}
          format="hex"
          value={symbology.stroke.color}
          onChange={(color) => {
            onLayerChange((current) => {
              return MapLayerUpdates.withStroke(current, { color });
            });
          }}
        />
        <NumberInput
          label={t`Outline width`}
          suffix=" px"
          min={0}
          max={6}
          step={0.5}
          value={symbology.stroke.width}
          onChange={(value) => {
            if (typeof value !== "number") {
              return;
            }
            onLayerChange((current) => {
              return MapLayerUpdates.withStroke(current, { width: value });
            });
          }}
        />
      </Group>
    </InspectorSection>
  );
}
```

- [ ] **Step 2: Style the segmented control**

Mantine's `SegmentedControl` cannot render a per-item `aria-disabled` with an
`aria-describedby`, which is why the four options are plain buttons above. Add
the prototype's `.segmented` styling to
`src/views/GISApp/panels/LayerInspector/LayerInspector.module.css` and use it
on the `Group` and its buttons:

```css
.segmented {
  background: var(--ava-surface-sunken);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  display: grid;
  gap: 2px;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  padding: 2px;
}

.segmentedItem {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: var(--mantine-radius-xs);
  color: var(--mantine-color-dimmed);
  display: flex;
  font-size: 12px;
  font-weight: 500;
  gap: 4px;
  height: 26px;
  justify-content: center;
  transition:
    background 140ms cubic-bezier(0.16, 1, 0.3, 1),
    color 140ms cubic-bezier(0.16, 1, 0.3, 1);
}

.segmentedItem[aria-pressed="true"] {
  background: var(--ava-surface-raised);
  box-shadow: var(--mantine-shadow-xs);
  color: var(--mantine-color-text);
}

/*
 * Unavailable controls use aria-disabled, not the disabled attribute, so they
 * stay focusable and a keyboard user can reach the reason. A disabled control
 * whose explanation only appears on hover is not an explanation.
 */
.segmentedItem[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.5;
}

@container mapShell (max-width: 792px) {
  .segmented {
    grid-auto-columns: auto;
    grid-auto-flow: row;
  }

  .segmentedItem {
    height: 40px;
  }
}
```

Replace the `Group` with `<div className={css.segmented} role="group" ...>` and
give each button `className={css.segmentedItem}`.

- [ ] **Step 3: Type check**

Run: `pnpm type-check && pnpm lint:css`
Expected: errors only for the four remaining sections.

- [ ] **Step 4: Commit**

```bash
git add src/views/GISApp/panels/LayerInspector
git commit -m "feat(gis): add the inspector Style section"
```

---

## Task 22: Build the Sensitivity and Filter sections

Sensitivity gets its own section rather than living inside Style because it
**constrains** Style (inventory §3.3). Enforcement is Wave B; Wave A makes the
policy editable and honest about what it does and does not do yet.

**Files:**

- Create: `src/views/GISApp/panels/LayerInspector/SensitivitySection.tsx`
- Create: `src/views/GISApp/panels/LayerInspector/FilterSection.tsx`

- [ ] **Step 1: Write the Sensitivity section**

```tsx
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { NumberInput, Select } from "@mantine/core";
import { match } from "ts-pattern";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

/** Default jitter radius when the author first chooses to displace points. */
const DEFAULT_JITTER_RADIUS_METERS = 500;

/** Default suppression threshold when the author first aggregates. */
const DEFAULT_MIN_CELL_COUNT = 5;

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/**
 * What rendering this layer's data permits.
 *
 * Relaxing a policy is a deliberate act with consequences, so moving back to
 * exact locations names what changes. Tightening never asks.
 *
 * Aggregate only cannot render at all in Wave A: no aggregating geo binding
 * exists yet, so `makeLayerSpecFromMapLayer` throws a
 * `SensitivityViolationError` rather than drawing points. The callout says so,
 * which is the honest version of an option that is selectable but not yet
 * useful.
 */
export function SensitivitySection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const { sensitivity } = layer;

  const note = match(sensitivity)
    .with({ mode: "exact" }, () => {
      return t`Exact locations`;
    })
    .with({ mode: "jitter" }, () => {
      return t`Displaced`;
    })
    .with({ mode: "aggregateOnly" }, () => {
      return t`Aggregate only`;
    })
    .exhaustive();

  const onModeChange = (mode: string | null): void => {
    if (!mode) {
      return;
    }
    if (
      mode === "exact" &&
      sensitivity.mode === "aggregateOnly" &&
      !window.confirm(
        t`Individual locations will be drawn on the map, and suppressed areas will show their real counts. Continue?`,
      )
    ) {
      return;
    }
    onLayerChange((current) => {
      return MapLayerUpdates.withSensitivity(
        current,
        match(mode)
          .with("jitter", () => {
            return {
              mode: "jitter" as const,
              radiusMeters: DEFAULT_JITTER_RADIUS_METERS,
            };
          })
          .with("aggregateOnly", () => {
            return {
              mode: "aggregateOnly" as const,
              minCellCount: DEFAULT_MIN_CELL_COUNT,
              minGeoLevel: "",
            };
          })
          .otherwise(() => {
            return { mode: "exact" as const };
          }),
      );
    });
  };

  return (
    <InspectorSection title={t`Sensitivity`} note={note}>
      <Select
        label={t`Handling`}
        data={[
          { value: "exact", label: t`Show exact locations` },
          { value: "jitter", label: t`Displace` },
          { value: "aggregateOnly", label: t`Aggregate only` },
        ]}
        value={sensitivity.mode}
        allowDeselect={false}
        description={t`Choose Displace or Aggregate only when the layer holds protection or health data that must not be mapped to a household.`}
        onChange={onModeChange}
      />
      {sensitivity.mode === "jitter" ? (
        <NumberInput
          label={t`Displace within`}
          suffix=" m"
          min={10}
          max={20000}
          value={sensitivity.radiusMeters}
          description={t`Each point moves by the same amount every time this map is opened, so a reader cannot average several views back to the real location.`}
          onChange={(value) => {
            if (typeof value !== "number") {
              return;
            }
            onLayerChange((current) => {
              return MapLayerUpdates.withSensitivity(current, {
                mode: "jitter",
                radiusMeters: value,
              });
            });
          }}
        />
      ) : null}
      {sensitivity.mode === "aggregateOnly" ? (
        <>
          <NumberInput
            label={t`Suppress areas below`}
            suffix={t` records`}
            min={1}
            max={100}
            value={sensitivity.minCellCount}
            description={t`Areas with fewer records are drawn as Not reported, never as zero.`}
            onChange={(value) => {
              if (typeof value !== "number") {
                return;
              }
              onLayerChange((current) => {
                return MapLayerUpdates.withSensitivity(current, {
                  mode: "aggregateOnly",
                  minCellCount: value,
                  minGeoLevel: sensitivity.minGeoLevel,
                });
              });
            }}
          />
          <Callout color="warning">
            {t`This layer cannot be drawn yet. Aggregate only needs an area to aggregate into, and boundary joins arrive in a later release.`}
          </Callout>
        </>
      ) : null}
    </InspectorSection>
  );
}
```

> `window.confirm` is a placeholder only if the repo has no confirm helper.
> Check for `DangerousActionButton` in `@avandar/ui` and for a `modals.openConfirmModal`
> pattern in `src/views/**`, and use whichever the repo already uses. A native
> `confirm` in a Mantine app is a visual regression; the copy is what matters
> and it must not change.

- [ ] **Step 2: Write the Filter section**

```tsx
import { useLingui } from "@lingui/react/macro";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/**
 * Which rows the layer draws.
 *
 * Reuses the Data Explorer's filter builder rather than a map-specific one: the
 * layer's source is a `StructuredQuery`, so its filter tree is the same tree,
 * and a second editor would be a second set of operator bugs.
 *
 * The count in the header is load-bearing, not decoration. Shell design §5.2
 * makes "one filter is active on this layer" the sentence that turns a zero-row
 * map from "the product is broken" into "I filtered too hard".
 */
export function FilterSection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const filterCount = layer.source.filters.rules.length;

  return (
    <InspectorSection
      title={t`Filter`}
      note={
        filterCount === 0
          ? undefined
          : filterCount === 1
            ? t`1 filter`
            : t`${filterCount} filters`
      }
    >
      <QueryFiltersField
        columns={layer.source.queryColumns}
        value={layer.source.filters}
        onChange={(filters) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withFilters(current, filters);
          });
        }}
      />
    </InspectorSection>
  );
}
```

> `QueryFiltersField` can only filter on columns the layer's query selects,
> which is now the popup's selection plus the bound columns. That is a real
> consequence worth knowing: to filter on a column, select it in the Popup
> section first. Do not work around it by widening the projection here; a
> filter on an unselected column would silently not compile.

> `layer.source.filters.rules.length` counts top-level rules only. Confirm the
> field name against `shared/models/queries/StructuredQuery/QueryFilter.types.ts`
> and count the same way the Data Explorer does if it has a helper.

- [ ] **Step 3: Type check**

Run: `pnpm type-check`
Expected: errors only for the Popup and Legend sections.

- [ ] **Step 4: Commit**

```bash
git add src/views/GISApp/panels/LayerInspector
git commit -m "feat(gis): add the inspector Sensitivity and Filter sections"
```

---

## Task 23: Make the feature popup carry data

The inventory's §6.7 finding, fixed end to end: the layer's query selects the
popup's columns, the feature builder keeps them, and the drawer renders them.

**Files:**

- Create: `src/views/GISApp/panels/LayerInspector/PopupSection.tsx`
- Create: `src/views/GISApp/panels/FeatureInspector/FeatureInspector.tsx`
- Modify: `src/views/GISApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows.ts`
- Test: `src/views/GISApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows.test.ts`

- [ ] **Step 1: Write the failing tests for feature properties**

Append to `makeFeatureCollectionFromRows.test.ts`:

```ts
describe("feature properties", () => {
  it("keeps only the requested columns", () => {
    const { featureCollection } = makeFeatureCollectionFromRows({
      rows: [{ lat: 1, lng: 2, caseId: "c1", outcome: "recovered" }],
      binding: {
        type: "latLngColumns",
        latitudeColumnName: "lat",
        longitudeColumnName: "lng",
      },
      propertyColumnNames: ["caseId"],
      sensitivity: { mode: "exact" },
      layerId: "layer-1",
    });
    expect(featureCollection.features[0]?.properties).toEqual({
      caseId: "c1",
    });
  });

  it("includes a coordinate column when it is explicitly requested", () => {
    const { featureCollection } = makeFeatureCollectionFromRows({
      rows: [{ lat: 1, lng: 2 }],
      binding: {
        type: "latLngColumns",
        latitudeColumnName: "lat",
        longitudeColumnName: "lng",
      },
      propertyColumnNames: ["lat"],
      sensitivity: { mode: "exact" },
      layerId: "layer-1",
    });
    expect(featureCollection.features[0]?.properties).toEqual({ lat: 1 });
  });

  it("keeps every column except the bound coordinates when asked for all", () => {
    const { featureCollection } = makeFeatureCollectionFromRows({
      rows: [{ lat: 1, lng: 2, caseId: "c1" }],
      binding: {
        type: "latLngColumns",
        latitudeColumnName: "lat",
        longitudeColumnName: "lng",
      },
      propertyColumnNames: "all",
      sensitivity: { mode: "exact" },
      layerId: "layer-1",
    });
    expect(featureCollection.features[0]?.properties).toEqual({
      caseId: "c1",
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:frontend makeFeatureCollectionFromRows`
Expected: FAIL, the existing signature has no `propertyColumnNames`.

- [ ] **Step 3: Make the projection explicit**

In `makeFeatureCollectionFromRows.ts`, replace `_createPointFeature`'s
properties construction and thread the new parameter through `_placeRow` and
the exported function:

```ts
/**
 * Builds a point feature carrying exactly the requested properties.
 *
 * `"all"` keeps every column except the two the geometry came from, because
 * repeating a coordinate as a property is noise. An explicit list is taken
 * literally, coordinate columns included: an author who selected `lat` in the
 * popup asked to see `lat`.
 */
function _createPointFeature({
  binding,
  coordinate,
  propertyColumnNames,
  row,
  rowIndex,
}: {
  binding: MapLayer.GeoBindingColumnNames;
  coordinate: { longitude: number; latitude: number };
  propertyColumnNames: readonly string[] | "all";
  row: UnknownRow;
  rowIndex: number;
}): GeoJSON.Feature {
  const properties: GeoJSON.GeoJsonProperties =
    propertyColumnNames === "all"
      ? omit(row, [binding.latitudeColumnName, binding.longitudeColumnName])
      : pick(row, propertyColumnNames);
  return {
    type: "Feature",
    id: rowIndex,
    geometry: {
      type: "Point",
      coordinates: [coordinate.longitude, coordinate.latitude],
    },
    properties,
  };
}
```

Add `pick` to the `@avandar/utils` import; if that package has no `pick`, write
a `_pickColumns(row, names)` helper in this file that copies only the named keys
that are present. Add `propertyColumnNames` to the exported function's
parameter object with a docstring line:

```ts
 * @param params.propertyColumnNames Which columns become feature properties,
 * from the layer's popup config. `"all"` keeps everything except the bound
 * coordinate columns.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:frontend makeFeatureCollectionFromRows`
Expected: PASS, including the pre-existing drop-reason tests. Update those call
sites to pass `propertyColumnNames: "all"`, which preserves what they asserted.

- [ ] **Step 5: Write the Popup section**

```tsx
import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { Switch, TextInput } from "@mantine/core";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { useLayerSourceColumns } from "@/views/GisApp/panels/LayerInspector/useLayerSourceColumns";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/**
 * What a reader sees when they click a feature.
 *
 * This selection is also the layer's projection: the query fetches exactly
 * these columns. Before Wave A the query selected only the bound coordinate
 * columns and the feature builder omitted exactly those, so clicking a point
 * opened an empty drawer.
 */
export function PopupSection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  const sourceColumns = useLayerSourceColumns(dataSourceId);
  const { columnIds, action } = layer.popup;

  // Read the selection from the layer's OWN query columns, never from
  // `sourceColumns`. `useLayerSourceColumns` mints a fresh id per column on
  // every source load, so a stored id would never match one of those.
  // `QueryColumnMultiSelect` remaps the value onto its options by base column,
  // which is what makes passing the layer's columns work.
  const selectedColumns =
    columnIds === "all"
      ? sourceColumns
      : layer.source.queryColumns.filter((column) => {
          return columnIds.includes(column.id);
        });

  return (
    <InspectorSection
      title={t`Popup`}
      note={
        columnIds === "all"
          ? t`All fields`
          : columnIds.length === 1
            ? t`1 field`
            : t`${columnIds.length} fields`
      }
    >
      <QueryColumnMultiSelect
        label={t`Fields`}
        placeholder={t`Select the fields a reader should see`}
        dataSourceId={dataSourceId}
        value={selectedColumns}
        onChange={(columns) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withPopupColumns(current, columns);
          });
        }}
        description={t`The layer fetches exactly these fields, so adding one also makes it available to filter on.`}
      />
      <Switch
        label={t`Link to the source record`}
        checked={action !== undefined}
        onChange={(event) => {
          const isOn = event.currentTarget.checked;
          onLayerChange((current) => {
            return MapLayerUpdates.withPopupAction(
              current,
              isOn ? { label: "", urlTemplate: "" } : undefined,
            );
          });
        }}
      />
      {action ? (
        <>
          <TextInput
            label={t`Link label`}
            value={action.label}
            onChange={(event) => {
              const label = event.currentTarget.value;
              onLayerChange((current) => {
                return MapLayerUpdates.withPopupAction(current, {
                  ...action,
                  label,
                });
              });
            }}
          />
          <TextInput
            label={t`Link URL`}
            value={action.urlTemplate}
            description={t`Write a field name in braces to fill it from the clicked feature, for example https://example.org/cases/{case_id}.`}
            onChange={(event) => {
              const urlTemplate = event.currentTarget.value;
              onLayerChange((current) => {
                return MapLayerUpdates.withPopupAction(current, {
                  ...action,
                  urlTemplate,
                });
              });
            }}
          />
        </>
      ) : null}
    </InspectorSection>
  );
}
```

- [ ] **Step 6: Rewrite the feature drawer**

`src/views/GISApp/panels/FeatureInspector/FeatureInspector.tsx`. The old one is
deleted in Task 30; this replaces its hand-written translucent surface, which
inventory §6.8 records as unable to meet the light and dark requirement.

```tsx
import { objectEntries } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Anchor, Drawer, Group, Stack, Text } from "@mantine/core";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  opened: boolean;
  onClose: () => void;
  feature: GeoJSON.Feature | undefined;

  /** The popup config of the layer the feature came from. */
  popup: MapLayer.Popup | undefined;
};

/**
 * Fills `{columnName}` placeholders from a feature's properties.
 *
 * A placeholder naming a property the feature does not carry is left literal
 * rather than resolved to `undefined`, so a broken template is visible in the
 * link instead of producing a plausible wrong URL.
 */
function _buildActionUrl(
  urlTemplate: string,
  properties: GeoJSON.GeoJsonProperties,
): string {
  return urlTemplate.replace(/\{([^}]+)\}/g, (placeholder, columnName) => {
    const value = properties?.[columnName];
    return value == null ? placeholder : encodeURIComponent(String(value));
  });
}

/** Lists the clicked feature's fields, and its record link when it has one. */
export function FeatureInspector({
  opened,
  onClose,
  feature,
  popup,
}: Props): ReactNode {
  const { t } = useLingui();
  const properties = feature?.properties ?? {};
  const entries = objectEntries(properties);
  const action = popup?.action;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={t`Feature`}
      position="right"
      withOverlay={false}
      closeOnClickOutside={false}
      size="xs"
    >
      <Stack gap="sm">
        {entries.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t`This layer's popup shows no fields. Choose some in the layer's Popup section.`}
          </Text>
        ) : (
          entries.map(([key, value]) => {
            return (
              <Group
                key={key}
                justify="space-between"
                align="flex-start"
                wrap="nowrap"
              >
                <Text size="sm" fw={500} c="dimmed">
                  {key}
                </Text>
                <Text size="sm" fw={500} ta="right">
                  {value == null ? t`Not reported` : String(value)}
                </Text>
              </Group>
            );
          })
        )}
        {action && action.urlTemplate !== "" ? (
          <Anchor
            href={_buildActionUrl(action.urlTemplate, properties)}
            target="_blank"
            rel="noreferrer"
            size="sm"
          >
            {action.label === "" ? t`Open the record` : action.label}
          </Anchor>
        ) : null}
      </Stack>
    </Drawer>
  );
}
```

> The `styles` override with `rgba(255, 255, 255, 0.8)` and a backdrop blur is
> gone deliberately: Mantine's `Drawer` already uses the theme's surfaces, which
> is what makes it work in dark mode. Do not reintroduce it.

> A null property now renders as "Not reported" rather than "N/A". That is the
> same phrase the map's absence values use (shell design §6.5), and using two
> different words for the same idea in two surfaces of the same map is how a
> reader concludes they mean different things.

- [ ] **Step 7: Run the tests and type check**

Run: `pnpm test:frontend makeFeatureCollectionFromRows && pnpm type-check`
Expected: the tests pass. Type errors remain at
`useLayerFeatureCollection` (deleted in Task 30) which does not pass
`propertyColumnNames`; Task 25's `LayerGeometryCache` replaces it.

- [ ] **Step 8: Commit**

```bash
git add src/views/GISApp
git commit -m "feat(gis): make the feature popup carry the fields the author chose"
```

---

## Task 24: Build the Legend section and the over-map legend

Shell design §6.8. Every legend carries a title; units appear only when the
value has them; entry order is the persisted order, never a re-sort.

**Files:**

- Create: `src/views/GISApp/panels/LayerInspector/LegendSection.tsx`
- Create: `src/views/GISApp/panels/LegendPanel/MapLegend.tsx`
- Create: `src/views/GISApp/panels/LegendPanel/MapLegend.module.css`

- [ ] **Step 1: Write the Legend section**

```tsx
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Select, Switch, TextInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** The layer's legend: what it is called, its units, and where it sits. */
export function LegendSection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const { legend } = layer;

  const positionLabel = matchLiteral(legend.position, {
    bottomLeft: t`Bottom left`,
    bottomRight: t`Bottom right`,
    topRight: t`Top right`,
    hidden: t`Hidden`,
  });

  return (
    <InspectorSection title={t`Legend`} note={positionLabel}>
      <TextInput
        label={t`Title`}
        value={legend.title}
        onChange={(event) => {
          const title = event.currentTarget.value;
          onLayerChange((current) => {
            return MapLayerUpdates.withLegend(current, { title });
          });
        }}
      />
      <TextInput
        label={t`Units`}
        placeholder={t`Leave empty when the value has none`}
        value={legend.units ?? ""}
        onChange={(event) => {
          const value = event.currentTarget.value;
          onLayerChange((current) => {
            return MapLayerUpdates.withLegend(current, {
              units: value === "" ? undefined : value,
            });
          });
        }}
      />
      <Select
        label={t`Position`}
        data={[
          { value: "bottomLeft", label: t`Bottom left` },
          { value: "bottomRight", label: t`Bottom right` },
          { value: "topRight", label: t`Top right` },
          { value: "hidden", label: t`Hidden` },
        ]}
        value={legend.position}
        allowDeselect={false}
        onChange={(value) => {
          if (!value) {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withLegend(current, {
              position: value as MapLayer.Legend["position"],
            });
          });
        }}
      />
      <Switch
        label={t`Show a Not reported entry`}
        checked={legend.showNoData}
        description={t`Kept on for a map that will be printed: a reader cannot otherwise tell an area that reported nothing from an area that reported zero.`}
        onChange={(event) => {
          const showNoData = event.currentTarget.checked;
          onLayerChange((current) => {
            return MapLayerUpdates.withLegend(current, { showNoData });
          });
        }}
      />
    </InspectorSection>
  );
}
```

> `LegendConfig.position` is per layer, and Wave A renders every visible layer's
> legend in one panel at the bottom left. The field is honoured only as
> "hidden or not" until a later wave gives each corner a slot; the Select still
> writes the real value so nothing has to migrate. Note it in the component's
> docstring so the gap is visible in the code, not only here.

- [ ] **Step 2: Write the legend stylesheet**

`src/views/GISApp/panels/LegendPanel/MapLegend.module.css`:

```css
.legendBody {
  padding: var(--mantine-spacing-xs) var(--mantine-spacing-sm)
    var(--mantine-spacing-sm);
}

.legendGroup + .legendGroup {
  border-top: 1px solid var(--ava-border-default);
  margin-top: var(--mantine-spacing-xs);
  padding-top: var(--mantine-spacing-xs);
}

.title {
  font-size: 12px;
  font-weight: 600;
  margin: 0;
}

.units {
  color: var(--mantine-color-dimmed);
  font-size: 11px;
  margin-bottom: var(--mantine-spacing-xs);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--mantine-spacing-xxs);
  list-style: none;
  margin: 0;
  padding: 0;
}

.item {
  align-items: center;
  display: flex;
  font-size: 12px;
  gap: var(--mantine-spacing-xs);
}

.key {
  border: 1px solid var(--ava-surface-overlay);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--ava-border-strong);
  flex: none;
  height: 14px;
  width: 14px;
}
```

- [ ] **Step 3: Write the legend**

`src/views/GISApp/panels/LegendPanel/MapLegend.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.module.css";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  /** Visible layers in panel row order, so the legend reads top down. */
  layers: readonly MapLayer.T[];
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

/**
 * The over-map legend, one group per visible layer.
 *
 * A single-color point layer gets one key and one label and no units row,
 * because there is nothing to scale. A proportional symbol layer gets its
 * value's name, because area is the encoding; the nested-circle size legend
 * shell design §6.8 requires is Wave C, so until then the entry says what is
 * being sized rather than drawing a scale it cannot yet draw correctly.
 */
export function MapLegend({
  layers,
  isCollapsed,
  onToggleCollapsed,
}: Props): ReactNode {
  const { t } = useLingui();
  const shown = layers.filter((layer) => {
    return layer.legend.position !== "hidden";
  });

  if (shown.length === 0) {
    return null;
  }

  return (
    <MapChromePanel
      variant="legend"
      id="gis-legend"
      title={t`Legend`}
      isCollapsed={isCollapsed}
      onToggleCollapsed={onToggleCollapsed}
      collapseLabel={t`Collapse the legend`}
      expandLabel={t`Expand the legend`}
    >
      <div className={css.legendBody}>
        {shown.map((layer) => {
          const entryLabel = match(layer.symbology)
            .with({ type: "circle" }, () => {
              return layer.name;
            })
            .with({ type: "proportionalSymbol" }, () => {
              return t`Sized by value`;
            })
            .exhaustive();
          return (
            <div className={css.legendGroup} key={layer.id}>
              <h3 className={css.title}>{layer.legend.title}</h3>
              {layer.legend.units ? (
                <div className={css.units}>{layer.legend.units}</div>
              ) : null}
              <ul className={css.list}>
                <li className={css.item}>
                  <span
                    className={css.key}
                    style={{ backgroundColor: layer.symbology.color.color }}
                  />
                  {entryLabel}
                </li>
                {layer.legend.showNoData ? (
                  <li className={css.item}>
                    <span
                      className={css.key}
                      style={{ backgroundColor: "#d1d1d1" }}
                    />
                    {t`Not reported`}
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </MapChromePanel>
  );
}
```

> `#d1d1d1` is the light-theme "not reported" neutral from shell design §6.5,
> and §6.7 says the absence greys flip with the theme while the ramps do not. A
> `[data-mantine-color-scheme="dark"]` rule cannot set an inline style, so hoist
> both greys into two CSS classes in the module (`.keyNoData` light and its dark
> override at `#484848`) and use the class instead of the inline style. Do that
> rather than shipping the light grey in both themes: a `#d1d1d1` area on a dark
> basemap would be the brightest thing on the map, which is the opposite of
> receding, and a reader would take it for the highest class.

- [ ] **Step 4: Type check and lint**

Run: `pnpm type-check && pnpm lint:css`
Expected: the inspector and legend compile. Remaining errors belong to Stage 6.

- [ ] **Step 5: Commit**

```bash
git add src/views/GISApp
git commit -m "feat(gis): add the legend section and the over-map legend"
```

---

# Stage 6: the multi-layer runtime, autosave, and verification

Phase 1 already merges several layers into one `MapSpec`
(`makeMapSpecFromLayerSpecs`) and `syncMap` already handles add, remove, and
reorder. This stage runs a query per layer, keeps each layer's GeoJSON
referentially stable, and wires the whole app together.

## Task 25: Run the whole stack

**Files:**

- Create: `src/views/GISApp/layers/LayerGeometryCache/LayerGeometryCache.ts`
- Test: `src/views/GISApp/layers/LayerGeometryCache/LayerGeometryCache.test.ts`
- Create: `src/views/GISApp/layers/useMapLayersData/useMapLayersData.ts`
- Move: `src/views/GISApp/layers/useMapLayerData/MapLayerData.ts` → `src/views/GISApp/layers/useMapLayersData/MapLayerData.ts`
- Move: `src/views/GISApp/layers/useMapLayerData/useMapLayerData.test.ts` → `src/views/GISApp/layers/useMapLayersData/useMapLayersData.test.ts`
- Create: `src/views/GISApp/layers/useAvaMapRender/useAvaMapRender.ts`
- Create: `src/views/GISApp/layers/useFitBoundsRequest/useFitBoundsRequest.ts`

- [ ] **Step 1: Write the failing test for the geometry cache**

Why a cache at all: `syncMap` decides whether to re-upload a source by
comparing the `FeatureCollection` **by reference** (see `_syncSources`'s
docstring). React cannot call a hook per layer, so the whole stack is derived in
one `useMemo`, which without a cache would build a fresh `FeatureCollection` for
every layer on every colour-picker keystroke and re-upload every layer's GeoJSON
each time. The cache is what keeps that reference stable.

`LayerGeometryCache.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createLayerGeometryCache } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const LAYER_ID = "layer-1" as unknown as MapLayer.Id;

const BINDING = {
  type: "latLngColumns",
  latitudeColumnName: "lat",
  longitudeColumnName: "lng",
} as const;

const ROWS = [{ lat: 1, lng: 2, caseId: "c1" }];

function _inputs(overrides: Record<string, unknown> = {}) {
  return {
    layerId: LAYER_ID,
    binding: BINDING,
    sensitivity: { mode: "exact" } as const,
    propertyColumnNames: "all" as const,
    rows: ROWS,
    ...overrides,
  };
}

describe("createLayerGeometryCache", () => {
  it("returns the same feature collection for unchanged inputs", () => {
    const cache = createLayerGeometryCache();
    const first = cache.get(_inputs());
    const second = cache.get(_inputs());
    expect(second.featureCollection).toBe(first.featureCollection);
  });

  it("recomputes when the rows change", () => {
    const cache = createLayerGeometryCache();
    const first = cache.get(_inputs());
    const second = cache.get(_inputs({ rows: [{ lat: 3, lng: 4 }] }));
    expect(second.featureCollection).not.toBe(first.featureCollection);
    expect(second.featureCollection.features[0]?.geometry).toEqual({
      type: "Point",
      coordinates: [4, 3],
    });
  });

  it("recomputes when the bound columns change", () => {
    const cache = createLayerGeometryCache();
    const first = cache.get(_inputs());
    const second = cache.get(
      _inputs({
        binding: { ...BINDING, latitudeColumnName: "latitude" },
      }),
    );
    expect(second.featureCollection).not.toBe(first.featureCollection);
  });

  it("recomputes when the popup selection changes", () => {
    const cache = createLayerGeometryCache();
    const first = cache.get(_inputs());
    const second = cache.get(_inputs({ propertyColumnNames: ["caseId"] }));
    expect(second.featureCollection).not.toBe(first.featureCollection);
  });

  it("returns an empty collection and no error before the rows arrive", () => {
    const cache = createLayerGeometryCache();
    const result = cache.get(_inputs({ rows: undefined }));
    expect(result.featureCollection.features).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  it("reports a sensitivity violation instead of throwing", () => {
    const cache = createLayerGeometryCache();
    const result = cache.get(
      _inputs({
        sensitivity: {
          mode: "aggregateOnly",
          minCellCount: 5,
          minGeoLevel: "",
        },
      }),
    );
    expect(result.error?.name).toBe("SensitivityViolationError");
    expect(result.featureCollection.features).toEqual([]);
  });

  it("forgets a layer that is no longer on the map", () => {
    const cache = createLayerGeometryCache();
    const first = cache.get(_inputs());
    cache.prune(new Set());
    expect(cache.get(_inputs()).featureCollection).not.toBe(
      first.featureCollection,
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend LayerGeometryCache`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 3: Implement the cache**

```ts
import { makeFeatureCollectionFromRows } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { GeometryDropReport } from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Everything one layer's geometry depends on. */
export type LayerGeometryInputs = {
  layerId: MapLayer.Id;
  binding: MapLayer.GeoBindingColumnNames | undefined;
  sensitivity: MapLayer.Sensitivity;
  propertyColumnNames: readonly string[] | "all";

  /** `undefined` while the layer's query has not resolved. */
  rows: readonly UnknownRow[] | undefined;
};

/** One layer's converted geometry, and why rows were lost. */
export type LayerGeometry = {
  featureCollection: GeoJSON.FeatureCollection;
  drops: readonly GeometryDropReport[];

  /**
   * Set when the conversion could not run at all, which today means a
   * sensitivity policy no geometry binding can satisfy.
   */
  error: Error | undefined;
};

const EMPTY_GEOMETRY: LayerGeometry = {
  featureCollection: { type: "FeatureCollection", features: [] },
  drops: [],
  error: undefined,
};

/** A stable string for the inputs that are compared by value, not reference. */
function _buildInputSignature(inputs: LayerGeometryInputs): string {
  return JSON.stringify([
    inputs.binding,
    inputs.sensitivity,
    inputs.propertyColumnNames,
  ]);
}

/**
 * Per-layer memo for the rows-to-GeoJSON conversion.
 *
 * `syncMap` decides whether to re-upload a MapLibre source by comparing the
 * `FeatureCollection` by reference, so a fresh-but-equal object on every render
 * would re-upload every layer's whole GeoJSON on every keystroke in the
 * inspector. React cannot call a hook per layer, so the memo lives here instead
 * of in a `useMemo`, and the render hook holds one of these in a ref.
 *
 * `rows` is compared by reference deliberately: TanStack Query returns the same
 * array until the data actually changes, and deep-comparing thousands of rows
 * would cost more than the conversion it is trying to avoid.
 */
export function createLayerGeometryCache(): {
  get: (inputs: LayerGeometryInputs) => LayerGeometry;
  prune: (liveLayerIds: ReadonlySet<MapLayer.Id>) => void;
} {
  const entries = new Map<
    MapLayer.Id,
    {
      signature: string;
      rows: readonly UnknownRow[] | undefined;
      geometry: LayerGeometry;
    }
  >();

  return {
    get: (inputs) => {
      const signature = _buildInputSignature(inputs);
      const cached = entries.get(inputs.layerId);
      if (
        cached &&
        cached.signature === signature &&
        cached.rows === inputs.rows
      ) {
        return cached.geometry;
      }

      const geometry = ((): LayerGeometry => {
        if (!inputs.binding || !inputs.rows) {
          return EMPTY_GEOMETRY;
        }
        try {
          return {
            ...makeFeatureCollectionFromRows({
              rows: inputs.rows,
              binding: inputs.binding,
              sensitivity: inputs.sensitivity,
              propertyColumnNames: inputs.propertyColumnNames,
              layerId: inputs.layerId,
            }),
            error: undefined,
          };
        } catch (error: unknown) {
          if (error instanceof SensitivityViolationError) {
            return { ...EMPTY_GEOMETRY, error };
          }
          throw error;
        }
      })();

      entries.set(inputs.layerId, {
        signature,
        rows: inputs.rows,
        geometry,
      });
      return geometry;
    },

    prune: (liveLayerIds) => {
      [...entries.keys()].forEach((layerId) => {
        if (!liveLayerIds.has(layerId)) {
          entries.delete(layerId);
        }
      });
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test:frontend LayerGeometryCache`
Expected: PASS. If the sensitivity case fails because
`SensitivityViolationError` does not set `name`, assert
`error instanceof SensitivityViolationError` in the test instead of comparing
`name`.

- [ ] **Step 5: Write the multi-layer query hook**

```bash
git mv src/views/GISApp/layers/useMapLayerData/MapLayerData.ts \
  src/views/GISApp/layers/useMapLayersData/MapLayerData.ts
```

`src/views/GISApp/layers/useMapLayersData/useMapLayersData.ts`:

```ts
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { runStructuredQuery } from "@/clients/queries/runStructuredQuery/runStructuredQuery";
import { MapLayerData } from "@/views/GisApp/layers/useMapLayersData/MapLayerData";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";

/** One layer's query, as the render pipeline needs to see it. */
export type MapLayerQueryState = {
  queryResult: QueryResult.T<UnknownRow> | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
};

/**
 * Runs one query per layer.
 *
 * Uses `useQueries` from TanStack directly rather than the app's `useQuery`
 * wrapper, because a hook cannot be called per layer in a loop and the number
 * of layers changes at runtime. The cost is that a failure is not routed
 * through `useAvaQueryErrorReporter`; the layer's status card surfaces it
 * instead, with the raw message behind "Show details", which is what shell
 * design §5.2 asks for anyway.
 *
 * Each query is keyed on the layer's source and geo binding only, so a
 * symbology edit repaints without refetching.
 */
export function useMapLayersData({
  layers,
  workspaceId,
}: {
  layers: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
}): ReadonlyMap<MapLayer.Id, MapLayerQueryState> {
  const results = useQueries({
    queries: layers.map((layer) => {
      return {
        enabled: MapLayerData.isQueryable(layer),
        queryKey: [workspaceId, ...MapLayerData.makeQueryKey(layer)],
        queryFn: async (): Promise<QueryResult.T<UnknownRow>> => {
          return await runStructuredQuery({
            auth: "workspace",
            workspaceId,
            query: layer.source,
            rawSql: undefined,
          });
        },
      };
    }),
  });

  return useMemo(() => {
    return new Map(
      layers.map((layer, layerIndex) => {
        const result = results[layerIndex];
        return [
          layer.id,
          {
            queryResult: result?.data,
            isLoading: result?.isLoading ?? false,
            error: result?.error ?? undefined,
            refetch: () => {
              void result?.refetch();
            },
          },
        ];
      }),
    );
    // `results` is a fresh array on every render, so this memo recomputes each
    // render. That is deliberate and cheap: the expensive derivation is the
    // GeoJSON conversion, and LayerGeometryCache is what keeps that stable.
  }, [layers, results]);
}
```

- [ ] **Step 5a: Port the existing query test rather than deleting it**

`useMapLayerData.test.ts` is the only integration coverage the query path has,
and Task 30 deletes the directory it lives in. Move it first and adapt it, so
the coverage survives:

```bash
git mv src/views/GISApp/layers/useMapLayerData/useMapLayerData.test.ts \
  src/views/GISApp/layers/useMapLayersData/useMapLayersData.test.ts
```

Then in the moved file:

- Point the dynamic imports at `useMapLayersData` and the moved
  `MapLayerData`.
- Wrap each existing single-layer assertion so it reads through the returned
  map: `result.current.get(layer.id)?.queryResult` rather than the tuple's
  first element.
- Keep the "does not run when the layer has no binding" case: it now asserts
  `runStructuredQueryMock` was not called and the map's entry has
  `queryResult: undefined`.
- Add one case the single-layer hook could not have: **two layers run two
  queries, and each entry carries its own rows.** Give the two layers different
  mocked results and assert both, keyed by layer id. That is the behaviour this
  task introduces, so it is the one that needs a new test.

Run: `pnpm test:frontend useMapLayersData`
Expected: PASS.

- [ ] **Step 6: Write the render hook**

`src/views/GISApp/layers/useAvaMapRender/useAvaMapRender.ts`:

```ts
import { propEq } from "@avandar/utils";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { useMemo, useRef } from "react";
import { createLayerGeometryCache } from "@/views/GisApp/layers/createLayerGeometryCache/createLayerGeometryCache";
import { getBoundsFromFeatureCollection } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import { getLayerStatsFromFeatureCollection } from "@/views/GisApp/layers/getLayerStatsFromFeatureCollection/getLayerStatsFromFeatureCollection";
import { makeLayerSpecFromMapLayer } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeLayerSpecFromMapLayer/makeLayerSpecFromMapLayer";
import { makeMapSpecFromLayerSpecs } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/makeMapSpecFromLayerSpecs";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type {
  DropReason,
  GeometryDropReport,
} from "@/views/GisApp/layers/makeFeatureCollectionFromRows/makeFeatureCollectionFromRows";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayerQueryState } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** The largest single drop reason, or `undefined` when nothing was dropped. */
function _getLargestDropReason(
  drops: readonly GeometryDropReport[],
): DropReason | undefined {
  return [...drops].sort((first, second) => {
    return second.count - first.count;
  })[0]?.reason;
}

/**
 * Turns the whole layer stack plus its query results into one MapLibre spec,
 * one view state per layer, and one bounding box per layer.
 *
 * Only **visible** layers reach the spec, which is how the eye toggle works: a
 * hidden layer is absent from the spec, so `syncMap` removes it rather than
 * setting a MapLibre visibility property. That keeps the spec the single source
 * of truth for what is on the map.
 *
 * Every layer, visible or not, gets a view state, because the stack has to show
 * a hidden layer's error.
 */
export function useAvaMapRender({
  mapConfig,
  layerQueryStates,
}: {
  mapConfig: AvaMapConfig.T;
  layerQueryStates: ReadonlyMap<MapLayer.Id, MapLayerQueryState>;
}): {
  spec: MapSpec;
  interactiveLayerIds: readonly string[];
  layerViewStates: ReadonlyMap<MapLayer.Id, MapLayerViewState>;
  layerBounds: ReadonlyMap<MapLayer.Id, MapBounds | undefined>;
} {
  const geometryCacheRef = useRef(createLayerGeometryCache());

  return useMemo(() => {
    const cache = geometryCacheRef.current;
    cache.prune(
      new Set(
        mapConfig.layers.map((layer) => {
          return layer.id;
        }),
      ),
    );

    const layerSpecs: MapSpec[] = [];
    const interactiveLayerIds: string[] = [];
    const layerViewStates = new Map<MapLayer.Id, MapLayerViewState>();
    const layerBounds = new Map<MapLayer.Id, MapBounds | undefined>();

    mapConfig.layers.forEach((layer) => {
      const queryState = layerQueryStates.get(layer.id);
      const binding = MapLayer.toGeoBinding(layer);
      const geometry = cache.get({
        layerId: layer.id,
        binding,
        sensitivity: layer.sensitivity,
        propertyColumnNames: MapLayer.toPopupColumnNames(layer),
        rows: queryState?.queryResult?.data,
      });

      const droppedRowCount = geometry.drops.reduce((total, drop) => {
        return total + drop.count;
      }, 0);
      const error = queryState?.error ?? geometry.error;
      const status = !binding
        ? "unbound"
        : error
          ? "error"
          : queryState?.isLoading
            ? "loading"
            : geometry.featureCollection.features.length === 0 &&
                droppedRowCount === 0
              ? "empty"
              : "ready";

      layerViewStates.set(layer.id, {
        status,
        error,
        featureCount: geometry.featureCollection.features.length,
        droppedRowCount,
        largestDropReason: _getLargestDropReason(geometry.drops),
        filterCount: layer.source.filters.rules.length,
        onRetry:
          queryState?.refetch ??
          (() => {
            return undefined;
          }),
      } as MapLayerViewState);

      layerBounds.set(
        layer.id,
        getBoundsFromFeatureCollection(geometry.featureCollection),
      );

      if (!layer.isVisible || status !== "ready") {
        return;
      }

      const valueColumn =
        layer.symbology.type === "proportionalSymbol"
          ? layer.source.queryColumns.find(propEq("id", layer.symbology.value))
          : undefined;
      const valueColumnName = valueColumn
        ? QueryColumn.getDerivedColumnName(valueColumn)
        : undefined;

      layerSpecs.push(
        makeLayerSpecFromMapLayer({
          layer,
          featureCollection: geometry.featureCollection,
          stats: getLayerStatsFromFeatureCollection({
            featureCollection: geometry.featureCollection,
            valueColumnName,
          }),
          valueColumnName,
        }),
      );
      interactiveLayerIds.push(MapLayerIds.toLayerId(layer.id));
    });

    return {
      spec: makeMapSpecFromLayerSpecs(layerSpecs),
      interactiveLayerIds,
      layerViewStates,
      layerBounds,
    };
  }, [mapConfig.layers, layerQueryStates]);
}
```

> The `as MapLayerViewState` cast on the view-state object is there because
> `status` is inferred as `string` from the nested ternary. Replace the ternary
> chain with a small `_getLayerStatus` helper returning
> `MapLayerViewState["status"]` and delete the cast: the cast is called out here
> only so it is not left in by accident.

- [ ] **Step 7: Write the fit-bounds request hook**

`src/views/GISApp/layers/useFitBoundsRequest/useFitBoundsRequest.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { FitBoundsRequest } from "@/views/GisApp/MapCanvas/useFitMapBounds/useFitMapBounds";
import type { MapChromeInsets } from "@/views/GisApp/shell/useMapChromeInsets/useMapChromeInsets";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { RefObject } from "react";

/**
 * Issues camera moves with panel-aware padding.
 *
 * Padding is read from the ref at the moment the request is built, so a panel
 * that is collapsed when the user presses "Zoom to layer" does not reserve
 * space the camera then avoids.
 */
export function useFitBoundsRequest(insetsRef: RefObject<MapChromeInsets>): {
  fitBoundsRequest: FitBoundsRequest | undefined;
  requestFitBounds: (bounds: MapBounds) => void;
} {
  const nextIdRef = useRef(0);
  const [fitBoundsRequest, setFitBoundsRequest] = useState<
    FitBoundsRequest | undefined
  >(undefined);

  const requestFitBounds = useCallback(
    (bounds: MapBounds) => {
      nextIdRef.current += 1;
      setFitBoundsRequest({
        id: nextIdRef.current,
        bounds,
        padding: insetsRef.current,
      });
    },
    [insetsRef],
  );

  return { fitBoundsRequest, requestFitBounds };
}

/**
 * Flies to a layer's bounds the first time it renders something, and never
 * again.
 *
 * Shell design §4.1 step 4: subsequent edits never move the camera. An
 * automatic camera move on every symbology tweak is disorienting, and by then
 * the author has usually framed the map deliberately.
 */
export function useAutoFitNewLayers({
  layerBounds,
  requestFitBounds,
}: {
  layerBounds: ReadonlyMap<MapLayer.Id, MapBounds | undefined>;
  requestFitBounds: (bounds: MapBounds) => void;
}): void {
  const fittedLayerIdsRef = useRef(new Set<MapLayer.Id>());

  useEffect(
    function fitFirstRenderOfEachLayer() {
      layerBounds.forEach((bounds, layerId) => {
        if (!bounds || fittedLayerIdsRef.current.has(layerId)) {
          return;
        }
        fittedLayerIdsRef.current.add(layerId);
        requestFitBounds(bounds);
      });
    },
    [layerBounds, requestFitBounds],
  );
}
```

- [ ] **Step 8: Type check**

Run: `pnpm type-check && pnpm test:frontend LayerGeometryCache`
Expected: the cache test passes. Remaining type errors are the old hooks that
Task 30 deletes, plus `GisApp` (Task 27).

- [ ] **Step 9: Commit**

```bash
git add src/views/GISApp
git commit -m "feat(gis): run and render the whole layer stack"
```

---

## Task 26: Build the status card, the first-run card, and the tool cluster

Shell design §5.1 and §5.2. Two rules: the layer row always carries its own
state, and the status card is for the **selected** layer and only when there is
something to do. The card is never the only place a problem appears, so
dismissing it never hides a problem.

**Files:**

- Create: `src/views/GISApp/panels/MapStatusCard/MapStatusCard.tsx`
- Create: `src/views/GISApp/panels/MapStatusCard/MapStatusCard.module.css`
- Create: `src/views/GISApp/panels/MapFirstRunCard/MapFirstRunCard.tsx`
- Create: `src/views/GISApp/shell/MapToolCluster/MapToolCluster.tsx`
- Create: `src/views/GISApp/shell/MapToolCluster/MapToolCluster.module.css`

- [ ] **Step 1: Write the status card stylesheet**

```css
.statusCard {
  align-items: flex-start;
  background: var(--ava-surface-overlay);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-md);
  box-shadow: var(--mantine-shadow-md);
  display: flex;
  font-size: 12px;
  gap: var(--mantine-spacing-xs);
  line-height: 1.45;
  max-width: 440px;
  padding: var(--mantine-spacing-xs) var(--mantine-spacing-sm);
}

.icon {
  flex: none;
  margin-top: 2px;
}

.icon--danger {
  color: var(--mantine-color-danger-6);
}

.icon--warning {
  color: var(--mantine-color-warning-8);
}

.icon--info {
  color: var(--mantine-color-dimmed);
}

.title {
  font-size: 12px;
  font-weight: 600;
}

.body {
  color: var(--mantine-color-dimmed);
  display: block;
}

.actions {
  display: flex;
  gap: var(--mantine-spacing-xs);
  margin-top: var(--mantine-spacing-xs);
}
```

- [ ] **Step 2: Write the status card**

Every string below is final copy from shell design §5.2. Two decisions in it
are corrections of the current build, not preferences: **Retry is required**,
because `MapErrorStatus` has no recovery path at all today, so a transient
failure is indistinguishable from a permanent one; and **Show details is
available in every build**, not only in development as `MapErrorStatus.tsx:13`
gates it, because an IM officer reporting a problem needs something to paste
and the raw engine message behind a disclosure costs nothing.

```tsx
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button, Collapse, Loader, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleX,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useState } from "react";
import css from "@/views/GisApp/panels/MapStatusCard/MapStatusCard.module.css";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T | undefined;
  viewState: MapLayerViewState | undefined;

  /** Opens the selected layer's Filter section. */
  onReviewFilter: () => void;
};

/**
 * The selected layer's status, when it needs an action.
 *
 * Appears above the tool cluster rather than replacing it, and only for the
 * selected layer. With four layers loaded a single shared status area cannot
 * say which layer is in trouble, so the layer row is the surface that scales
 * and this is the surface that explains.
 */
export function MapStatusCard({
  layer,
  viewState,
  onReviewFilter,
}: Props): ReactNode {
  const { t } = useLingui();
  const [areDetailsOpen, setAreDetailsOpen] = useState(false);

  if (!layer || !viewState) {
    return null;
  }
  const { droppedRowCount, featureCount, filterCount, status } = viewState;
  const hasPartialMapping = status === "ready" && droppedRowCount > 0;
  if (status === "unbound" || (status === "ready" && !hasPartialMapping)) {
    return null;
  }

  const totalRowCount = featureCount + droppedRowCount;
  // The class is picked by name rather than built from a template literal, so
  // a renamed CSS class fails the type check instead of silently resolving to
  // undefined.
  const toneClassName = matchLiteral(status, {
    loading: css["icon--info"],
    error: css["icon--danger"],
    empty: css["icon--info"],
    ready: css["icon--warning"],
    unbound: css["icon--info"],
  });

  return (
    <div
      className={css.statusCard}
      role={status === "error" ? "alert" : "status"}
    >
      <span className={`${css.icon} ${toneClassName}`} aria-hidden>
        {status === "loading" ? (
          <Loader size={14} />
        ) : status === "error" ? (
          <IconCircleX size={15} stroke={1.8} />
        ) : hasPartialMapping ? (
          <IconAlertTriangle size={15} stroke={1.8} />
        ) : (
          <IconInfoCircle size={15} stroke={1.8} />
        )}
      </span>
      <span>
        {status === "loading" ? (
          <>
            <span className={css.title}>{t`Loading ${layer.name}`}</span>
            <span className={css.body}>{t`Running the layer's query.`}</span>
          </>
        ) : null}
        {status === "error" ? (
          <>
            <span className={css.title}>{t`Could not load ${layer.name}`}</span>
            <span className={css.body}>
              {t`The layer's query failed. This usually means the dataset has changed or is no longer available in this workspace.`}
            </span>
            <span className={css.actions}>
              <Button
                size="compact-xs"
                variant="default"
                onClick={viewState.onRetry}
              >
                {t`Retry`}
              </Button>
              <Button
                size="compact-xs"
                variant="subtle"
                aria-expanded={areDetailsOpen}
                onClick={() => {
                  setAreDetailsOpen((current) => {
                    return !current;
                  });
                }}
              >
                {t`Show details`}
              </Button>
            </span>
            <Collapse in={areDetailsOpen}>
              <Text
                size="xs"
                c="dimmed"
                mt="xs"
                style={{ wordBreak: "break-word" }}
              >
                {viewState.error?.message}
              </Text>
            </Collapse>
          </>
        ) : null}
        {status === "empty" ? (
          <>
            <span className={css.title}>
              {t`${layer.name} returned no rows`}
            </span>
            <span className={css.body}>
              {filterCount === 0
                ? t`The source has no rows.`
                : filterCount === 1
                  ? t`One filter is active on this layer. It may be excluding everything.`
                  : t`${filterCount} filters are active on this layer. They may be excluding everything.`}
            </span>
            {filterCount > 0 ? (
              <span className={css.actions}>
                <Button
                  size="compact-xs"
                  variant="default"
                  onClick={onReviewFilter}
                >
                  {t`Review filter`}
                </Button>
              </span>
            ) : null}
          </>
        ) : null}
        {hasPartialMapping ? (
          <>
            <span className={css.title}>
              {t`${droppedRowCount} of ${totalRowCount} rows could not be mapped`}
            </span>
            <span className={css.body}>
              {matchLiteral(viewState.largestDropReason ?? "nullCoordinate", {
                suspectedLatLngSwap: t`Some rows look like their latitude and longitude are swapped.`,
                nullIsland: t`Some coordinates are 0, 0.`,
                outOfRange: t`Some coordinates are outside the valid range.`,
                nullCoordinate: t`Some rows have an empty latitude or longitude.`,
                nonNumericCoordinate: t`Some latitudes or longitudes are not numbers.`,
              })}
            </span>
          </>
        ) : null}
      </span>
    </div>
  );
}
```

> The partial-mapping card deliberately has no "See why" button. Shell design
> §5.2 gives it one and §10.5 puts the coordinate validation report it opens in
> Wave C; a button that opens nothing teaches the user that buttons do nothing.
> **When Wave C adds the report, the button goes here**, and the copy above does
> not change.

- [ ] **Step 3: Write the first-run card**

Shell design §5.2. The layers panel **stays** in this state rather than being
replaced by the card, because the panel is where the Add layer control lives in
every other state and moving it would teach the wrong location.

```tsx
import { Paper } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Button, Stack, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { LayerSourcePicker } from "@/views/GisApp/panels/LayerPanel/LayerSourcePicker/LayerSourcePicker";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { ReactNode } from "react";

type Props = {
  onAddLayerFromSource: (dataSource: QueryDataSource.T) => void;
};

/** Centred over the basemap when the map has no layers yet. */
export function MapFirstRunCard({ onAddLayerFromSource }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Paper p="lg" w={380} radius="md" shadow="md">
      <Stack gap="xs" align="center" ta="center">
        <Title order={4} size="15px">
          {t`This map has no layers yet`}
        </Title>
        <Text size="sm" c="dimmed">
          {t`Add a layer to plot a dataset, a derived dataset, or a profile. You can add as many as you need and reorder them.`}
        </Text>
        <LayerSourcePicker onSourceSelected={onAddLayerFromSource}>
          {(pickerProps) => {
            return (
              <Button {...pickerProps} leftSection={<IconPlus size={15} />}>
                {t`Add a layer`}
              </Button>
            );
          }}
        </LayerSourcePicker>
      </Stack>
    </Paper>
  );
}
```

- [ ] **Step 4: Write the tool cluster**

Every tool except Pan is unavailable in Wave A (§10.5 puts the tools in Wave D),
and each carries its own reason, because collapsing three different reasons into
one "unavailable" treatment teaches users to ignore all three.

`src/views/GISApp/shell/MapToolCluster/MapToolCluster.module.css`:

```css
.tools {
  align-items: center;
  background: var(--ava-surface-overlay);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-lg);
  box-shadow: var(--mantine-shadow-md);
  display: flex;
  gap: var(--mantine-spacing-xxxs);
  padding: var(--mantine-spacing-xxs);
}

.separator {
  background: var(--ava-border-default);
  height: 20px;
  margin: 0 var(--mantine-spacing-xxs);
  width: 1px;
}

.tool {
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--mantine-radius-sm);
  color: var(--mantine-color-dimmed);
  display: inline-flex;
  height: 32px;
  justify-content: center;
  transition:
    background 140ms cubic-bezier(0.16, 1, 0.3, 1),
    color 140ms cubic-bezier(0.16, 1, 0.3, 1);
  width: 32px;
}

.tool:hover:not([aria-disabled="true"]) {
  background: var(--ava-surface-sunken);
  color: var(--mantine-color-text);
}

.tool[aria-pressed="true"] {
  background: var(--mantine-color-primary-0);
  border-color: var(--mantine-color-primary-2);
  color: var(--mantine-color-primary-7);
}

[data-mantine-color-scheme="dark"] .tool[aria-pressed="true"] {
  background: rgba(21, 99, 254, 0.24);
  border-color: var(--mantine-color-primary-7);
  color: var(--mantine-color-primary-2);
}

.tool[aria-disabled="true"] {
  color: var(--mantine-color-neutral-4);
  cursor: not-allowed;
}

@container mapShell (max-width: 792px) {
  .tool {
    height: 44px;
    width: 44px;
  }
}
```

`src/views/GISApp/shell/MapToolCluster/MapToolCluster.tsx`:

```tsx
import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import {
  IconCircleDashed,
  IconPencil,
  IconPointer,
  IconRuler2,
  IconSearch,
  IconVector,
} from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks";
import type { ReactNode } from "react";

/** The tool cluster's shape, fixed now so it does not move as tools land. */
export function MapToolCluster(): ReactNode {
  const { t } = useLingui();
  const laterRelease = t`Arrives in a later release.`;
  const tools = [
    {
      key: "area",
      icon: <IconVector size={17} stroke={1.6} />,
      label: t`Draw an area to filter by`,
      reason: laterRelease,
    },
    {
      key: "measure",
      icon: <IconRuler2 size={17} stroke={1.6} />,
      label: t`Measure distance and area`,
      reason: laterRelease,
    },
    {
      key: "buffer",
      icon: <IconCircleDashed size={17} stroke={1.6} />,
      label: t`Buffer around a layer`,
      reason: laterRelease,
    },
    {
      key: "annotate",
      icon: <IconPencil size={17} stroke={1.6} />,
      label: t`Annotate the map`,
      reason: laterRelease,
    },
  ];

  return (
    <div
      className={css.tools}
      id={GIS_SKIP_TARGET_IDS.toolCluster}
      role="toolbar"
      aria-label={t`Map tools`}
      tabIndex={-1}
    >
      <Tooltip label={t`Pan and select`}>
        <button
          type="button"
          className={css.tool}
          aria-pressed
          aria-label={t`Pan and select`}
        >
          <IconPointer size={17} stroke={1.6} />
        </button>
      </Tooltip>
      <span className={css.separator} aria-hidden />
      {tools.map((tool) => {
        return (
          <Tooltip key={tool.key} label={`${tool.label}. ${tool.reason}`}>
            <button
              type="button"
              className={css.tool}
              aria-disabled
              aria-label={`${tool.label}. ${tool.reason}`}
              onClick={(event) => {
                event.preventDefault();
              }}
            >
              {tool.icon}
            </button>
          </Tooltip>
        );
      })}
      <span className={css.separator} aria-hidden />
      <Tooltip label={`${t`Go to a coordinate or P-code`}. ${laterRelease}`}>
        <button
          type="button"
          className={css.tool}
          aria-disabled
          aria-label={`${t`Go to a coordinate or P-code`}. ${laterRelease}`}
          onClick={(event) => {
            event.preventDefault();
          }}
        >
          <IconSearch size={17} stroke={1.6} />
        </button>
      </Tooltip>
    </div>
  );
}
```

> The reason is repeated inside `aria-label` rather than left in the tooltip
> alone. Shell design §4.2 requires an unavailable control's explanation to be
> reachable without a pointer; a Mantine `Tooltip` shows on focus, but the
> accessible name is what a screen reader reads, and it is the only channel that
> works with both.

- [ ] **Step 5: Type check and lint**

Run: `pnpm type-check && pnpm lint:css`
Expected: only `GisApp` errors remain.

- [ ] **Step 6: Commit**

```bash
git add src/views/GISApp
git commit -m "feat(gis): add the status card, first-run card, and tool cluster"
```

---

## Task 27: Autosave the map, and wire the whole app together

**Files:**

- Create: `src/views/GISApp/useAvaMapEditor/useAvaMapEditor.ts`
- Test: `src/views/GISApp/useAvaMapEditor/useAvaMapEditor.test.ts`
- Rewrite: `src/views/GISApp/GisApp.tsx`

- [ ] **Step 1: Write the failing test for the save state machine**

Follow the mocking style in
`src/views/GISApp/layers/useMapLayerData/useMapLayerData.test.ts`: `vi.hoisted`
for the mock, `vi.mock` for the client module, a dynamic `await import` of the
hook after the mock, and `renderHook` from `@/test-utils`.

```ts
describe("useAvaMapEditor", () => {
  it("starts saved and goes unsaved on the first edit", async () => {
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });
    expect(result.current.saveState).toBe("saved");
    act(() => {
      result.current.updateName("Cholera response");
    });
    expect(result.current.saveState).toBe("unsaved");
  });

  it("saves once for a burst of edits", async () => {
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });
    act(() => {
      result.current.updateName("One");
      result.current.updateName("Two");
      result.current.updateName("Three");
    });
    await waitFor(() => {
      expect(result.current.saveState).toBe("saved");
    });
    expect(saveMapConfigMock).toHaveBeenCalledTimes(1);
    expect(saveMapConfigMock.mock.calls[0]?.[0]?.name).toBe("Three");
  });

  it("reports a failed save and keeps the edit on screen", async () => {
    saveMapConfigMock.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });
    act(() => {
      result.current.updateName("Cholera response");
    });
    await waitFor(() => {
      expect(result.current.saveState).toBe("failed");
    });
    expect(result.current.name).toBe("Cholera response");
  });

  it("goes back to unsaved when an edit lands during a save", async () => {
    let releaseSave = (): void => {};
    saveMapConfigMock.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        releaseSave = resolve;
      });
      return _createAvaMap();
    });
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });
    act(() => {
      result.current.updateName("One");
    });
    await waitFor(() => {
      expect(result.current.saveState).toBe("saving");
    });
    act(() => {
      result.current.updateName("Two");
    });
    act(() => {
      releaseSave();
    });
    await waitFor(() => {
      expect(result.current.saveState).not.toBe("saved");
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:frontend useAvaMapEditor`
Expected: FAIL, cannot resolve the hook.

- [ ] **Step 3: Implement the editor hook**

```ts
import { useDebouncedCallback } from "@mantine/hooks";
import { useCallback, useRef, useState } from "react";
import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** What the top bar's indicator reports about persistence. */
export type MapSaveState = "saved" | "saving" | "unsaved" | "failed";

/** How long editing pauses before a save runs, in ms. */
const AUTOSAVE_DELAY_MS = 800;

/**
 * Holds the map being edited and autosaves it.
 *
 * Autosave rather than an explicit Save button, because a map is composed by
 * dozens of small adjustments and an unsaved sitrep map is the failure this
 * feature exists to prevent. `mod+S` still forces an immediate save, because
 * users who have been burned by autosave elsewhere reach for it.
 *
 * A failed save never rolls the config back. The author's last change stays on
 * screen and the indicator says the save failed: discarding work to keep a
 * status label honest is the wrong trade.
 */
export function useAvaMapEditor(avaMap: AvaMap.T): {
  name: string;
  mapConfig: AvaMapConfig.T;
  saveState: MapSaveState;
  updateName: (name: string) => void;
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
  saveNow: () => void;
} {
  const [name, setName] = useState(avaMap.name);
  const [mapConfig, setMapConfig] = useState(avaMap.config);
  const [saveState, setSaveState] = useState<MapSaveState>("saved");

  // The values a save must persist, read at the moment the save runs rather
  // than captured when it was scheduled, so a burst of edits saves once with
  // the last value instead of once per edit with stale ones.
  const pendingRef = useRef({ name: avaMap.name, mapConfig: avaMap.config });

  /** Bumped on every edit, so a save can tell whether it is still current. */
  const editCountRef = useRef(0);

  const runSave = useCallback(async (): Promise<void> => {
    const editCountAtStart = editCountRef.current;
    setSaveState("saving");
    try {
      await AvaMapClient.saveMapConfig({
        mapId: avaMap.id,
        name: pendingRef.current.name,
        mapConfig: pendingRef.current.mapConfig,
      });
      setSaveState(
        editCountRef.current === editCountAtStart ? "saved" : "unsaved",
      );
    } catch {
      setSaveState("failed");
    }
  }, [avaMap.id]);

  const scheduleSave = useDebouncedCallback(() => {
    void runSave();
  }, AUTOSAVE_DELAY_MS);

  const markEdited = useCallback(() => {
    editCountRef.current += 1;
    setSaveState("unsaved");
    scheduleSave();
  }, [scheduleSave]);

  const updateName = useCallback(
    (nextName: string) => {
      pendingRef.current = { ...pendingRef.current, name: nextName };
      setName(nextName);
      markEdited();
    },
    [markEdited],
  );

  const updateConfig = useCallback(
    (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => {
      setMapConfig((current) => {
        const next = update(current);
        if (next === current) {
          return current;
        }
        pendingRef.current = { ...pendingRef.current, mapConfig: next };
        markEdited();
        return next;
      });
    },
    [markEdited],
  );

  const saveNow = useCallback(() => {
    void runSave();
  }, [runSave]);

  return { name, mapConfig, saveState, updateName, updateConfig, saveNow };
}
```

> `markEdited` is called from inside `setMapConfig`'s updater, which React runs
> during render in strict mode. If the test's `saving`/`unsaved` transitions
> flicker, move the bookkeeping out: compute the next config with a plain
> function first, then call `setMapConfig(next)` and `markEdited()` in sequence.
> Do not silence the warning; fix the call order.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test:frontend useAvaMapEditor`
Expected: PASS.

- [ ] **Step 5: Rewrite `GisApp`**

This is the file that composes everything. It is long by necessity; keep every
derivation in a hook so the component stays a wiring diagram.

```tsx
import { useLingui } from "@lingui/react/macro";
import { useHotkeys } from "@mantine/hooks";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { useCallback, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { useAvaMapRender } from "@/views/GisApp/layers/useAvaMapRender";
import {
  useAutoFitNewLayers,
  useFitBoundsRequest,
} from "@/views/GisApp/layers/useFitBoundsRequest/useFitBoundsRequest";
import { useMapLayersData } from "@/views/GisApp/layers/useMapLayersData/useMapLayersData";
import { MapCanvas } from "@/views/GisApp/MapCanvas/MapCanvas";
import { FeatureInspector } from "@/views/GisApp/panels/FeatureInspector/FeatureInspector";
import { LayerInspector } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import { LayerPanel } from "@/views/GisApp/panels/LayerPanel/LayerPanel";
import { MapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend";
import { MapFirstRunCard } from "@/views/GisApp/panels/MapFirstRunCard/MapFirstRunCard";
import { MapStatusCard } from "@/views/GisApp/panels/MapStatusCard/MapStatusCard";
import { MapFurnitureBar } from "@/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar";
import { MapShell } from "@/views/GisApp/shell/MapShell";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import { MapTopBar } from "@/views/GisApp/shell/MapTopBar/MapTopBar";
import { useChromePanelState } from "@/views/GisApp/shell/useChromePanelState/useChromePanelState";
import { useMapChromeInsets } from "@/views/GisApp/shell/useMapChromeInsets/useMapChromeInsets";
import { useAvaMapEditor } from "@/views/GisApp/useAvaMapEditor/useAvaMapEditor";
import { useFeatureInspector } from "@/views/GisApp/useFeatureInspector";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

type Props = { avaMap: AvaMap.T };

/**
 * The GIS app.
 *
 * Owns the editable config and the selection, and does nothing else: every
 * derivation lives in a hook and every surface in a component, so this file
 * stays readable as later waves add sections and tools.
 */
export function GisApp({ avaMap }: Props): ReactNode {
  const { t } = useLingui();
  const { name, mapConfig, saveState, updateName, updateConfig, saveNow } =
    useAvaMapEditor(avaMap);
  const [selectedLayerId, setSelectedLayerId] = useState<
    MapLayer.Id | undefined
  >(mapConfig.layers[mapConfig.layers.length - 1]?.id);
  const [isChromeHidden, setIsChromeHidden] = useState(false);
  const inspector = useFeatureInspector();

  const { topBarRef, leftColumnRef, rightColumnRef, insetsRef } =
    useMapChromeInsets();
  const { panelState, togglePanel } = useChromePanelState(
    window.innerWidth - 200,
  );
  const { fitBoundsRequest, requestFitBounds } = useFitBoundsRequest(insetsRef);

  const layerQueryStates = useMapLayersData({
    layers: mapConfig.layers,
    workspaceId: avaMap.workspaceId,
  });
  const { spec, interactiveLayerIds, layerViewStates, layerBounds } =
    useAvaMapRender({ mapConfig, layerQueryStates });
  useAutoFitNewLayers({ layerBounds, requestFitBounds });

  const mapInstanceRef = useRef<
    Parameters<typeof MapFurnitureBar>[0]["mapInstance"] | undefined
  >(undefined);

  useHotkeys([
    ["mod+S", saveNow],
    [
      "mod+backslash",
      () => {
        setIsChromeHidden((current) => {
          return !current;
        });
      },
    ],
  ]);

  const rows = useMemo(() => {
    return AvaMapConfig.toStackOrder(mapConfig);
  }, [mapConfig]);

  const selectedLayer = mapConfig.layers.find((layer) => {
    return layer.id === selectedLayerId;
  });

  const updateSelectedLayer = useCallback(
    (update: (current: MapLayer.T) => MapLayer.T) => {
      if (!selectedLayerId) {
        return;
      }
      updateConfig((current) => {
        return AvaMapConfig.withLayerReplaced(current, selectedLayerId, update);
      });
    },
    [selectedLayerId, updateConfig],
  );

  return (
    <>
      <MapShell
        mapLabel={t`Map of ${name}`}
        isChromeHidden={isChromeHidden}
        topBarRef={topBarRef}
        leftColumnRef={leftColumnRef}
        rightColumnRef={rightColumnRef}
        canvas={
          <MapCanvas
            basemap={mapConfig.basemap}
            view={mapConfig.view}
            spec={spec}
            fitBoundsRequest={fitBoundsRequest}
            interactiveLayerIds={interactiveLayerIds}
            onFeatureClick={inspector.onFeatureClick}
            onMapInstance={(mapInstance) => {
              mapInstanceRef.current = mapInstance;
            }}
          />
        }
        topBar={
          <MapTopBar
            avaMapId={avaMap.id}
            name={name}
            saveState={saveState}
            basemap={mapConfig.basemap}
            bookmarks={mapConfig.bookmarks}
            onNameChange={updateName}
            onBasemapChange={(basemap) => {
              updateConfig((current) => {
                return { ...current, basemap };
              });
            }}
            onSaveCurrentView={() => {
              updateConfig((current) => {
                return AvaMapConfig.withBookmarkAdded(
                  current,
                  AvaMapConfig.makeBookmark({
                    name: t`View ${current.bookmarks.length + 1}`,
                    view: current.view,
                  }),
                );
              });
            }}
            onGoToBookmark={(bookmark) => {
              updateConfig((current) => {
                return { ...current, view: bookmark.view };
              });
            }}
            onRemoveBookmark={(bookmarkId) => {
              updateConfig((current) => {
                return AvaMapConfig.withBookmarkRemoved(current, bookmarkId);
              });
            }}
          />
        }
        layerPanel={
          <LayerPanel
            rows={rows}
            viewStates={layerViewStates}
            selectedLayerId={selectedLayerId}
            isCollapsed={panelState.layers}
            onToggleCollapsed={() => {
              togglePanel("layers");
            }}
            onAddLayerFromSource={(dataSource) => {
              const layer = MapLayer.makeFromDataSource({
                dataSource,
                name: dataSource.name,
              });
              updateConfig((current) => {
                return AvaMapConfig.withLayerAdded(current, layer);
              });
              setSelectedLayerId(layer.id);
            }}
            onStackOrderChange={(orderedLayerIds) => {
              updateConfig((current) => {
                return AvaMapConfig.withStackOrder(current, orderedLayerIds);
              });
            }}
            onSelectLayer={setSelectedLayerId}
            onToggleLayerVisible={(layerId) => {
              updateConfig((current) => {
                return AvaMapConfig.withLayerReplaced(
                  current,
                  layerId,
                  (layer) => {
                    return MapLayerUpdates.withVisibility(
                      layer,
                      !layer.isVisible,
                    );
                  },
                );
              });
            }}
            onRenameLayer={(layerId) => {
              const layer = mapConfig.layers.find((candidate) => {
                return candidate.id === layerId;
              });
              const nextName = window.prompt(t`Layer name`, layer?.name);
              if (!nextName) {
                return;
              }
              updateConfig((current) => {
                return AvaMapConfig.withLayerReplaced(
                  current,
                  layerId,
                  (currentLayer) => {
                    return MapLayerUpdates.withName(currentLayer, nextName);
                  },
                );
              });
            }}
            onDuplicateLayer={(layerId) => {
              const layer = mapConfig.layers.find((candidate) => {
                return candidate.id === layerId;
              });
              updateConfig((current) => {
                return AvaMapConfig.withLayerDuplicated(
                  current,
                  layerId,
                  t`${layer?.name ?? ""} copy`,
                );
              });
            }}
            onZoomToLayer={(layerId) => {
              const bounds = layerBounds.get(layerId);
              if (bounds) {
                requestFitBounds(bounds);
              }
            }}
            onDeleteLayer={(layerId) => {
              updateConfig((current) => {
                return AvaMapConfig.withLayerRemoved(current, layerId);
              });
              if (layerId === selectedLayerId) {
                setSelectedLayerId(undefined);
              }
            }}
          />
        }
        inspector={
          <LayerInspector
            layer={selectedLayer}
            viewState={
              selectedLayerId ? layerViewStates.get(selectedLayerId) : undefined
            }
            isCollapsed={panelState.inspector}
            onToggleCollapsed={() => {
              togglePanel("inspector");
            }}
            onLayerChange={updateSelectedLayer}
          />
        }
        legend={
          <MapLegend
            layers={rows.filter((layer) => {
              return layer.isVisible;
            })}
            isCollapsed={panelState.legend}
            onToggleCollapsed={() => {
              togglePanel("legend");
            }}
          />
        }
        statusCard={
          <MapStatusCard
            layer={selectedLayer}
            viewState={
              selectedLayerId ? layerViewStates.get(selectedLayerId) : undefined
            }
            onReviewFilter={() => {
              togglePanel("inspector");
            }}
          />
        }
        toolCluster={<MapToolCluster />}
        firstRunCard={
          mapConfig.layers.length === 0 ? (
            <MapFirstRunCard
              onAddLayerFromSource={(dataSource) => {
                const layer = MapLayer.makeFromDataSource({
                  dataSource,
                  name: dataSource.name,
                });
                updateConfig((current) => {
                  return AvaMapConfig.withLayerAdded(current, layer);
                });
                setSelectedLayerId(layer.id);
              }}
            />
          ) : null
        }
        furnitureBar={
          mapInstanceRef.current ? (
            <MapFurnitureBar
              mapInstance={mapInstanceRef.current}
              attribution={
                mapConfig.basemap.type === "custom"
                  ? mapConfig.basemap.attribution
                  : t`MapLibre, OpenStreetMap contributors`
              }
            />
          ) : null
        }
      />
      <FeatureInspector
        opened={inspector.isInspectorOpen}
        onClose={inspector.closeInspector}
        feature={inspector.selectedFeature}
        popup={selectedLayer?.popup}
      />
    </>
  );
}
```

Three things this file needs from elsewhere, so do them in this step:

1. **`MapCanvas` must publish its map instance, and stop taking `children`.**
   Add an `onMapInstance?: (mapInstance: MapInstance) => void` prop and call it
   in an effect once `useMapInstance` has returned; the furniture bar needs the
   live instance for the coordinate readout and the scale bar, and the shell
   renders the bar as a sibling of the canvas rather than inside it. Then delete
   the `children` prop and its render: Phase 1 used it to nest the query popover
   and the status overlay over the map, and `MapShell` owns both of those slots
   now. Leaving it would give the app two ways to put something over the map.
   Holding the instance in a ref means the bar renders one frame late; if that
   flickers, hold it in `useState` instead and accept the extra render.
2. **The "Add layer" and rename flows use `window.prompt`.** Replace both with
   whatever the repo already uses for a one-field prompt (look for
   `InputTextForm` in `@avandar/ui`, and for `modals.open` call sites in
   `src/views/**`). `window.prompt` is a placeholder for the flow, not the
   design.
3. **`useChromePanelState(window.innerWidth - 200)`** reads the viewport once
   for the first-run default. That is correct for the default but crude; if the
   nav rail's width becomes configurable, measure the shell element instead.
   Leave a comment saying which it is.

- [ ] **Step 6: Verify the whole app in the browser**

Run the app and, on a real map: add two layers from two different datasets,
confirm both render; drag one above the other and confirm the draw order
changes; hide one with the eye and confirm it leaves the map; press
`Alt`+`ArrowUp` on a focused layer name and confirm it moves; click a point and
confirm the drawer lists fields; reload the page and confirm every one of those
survived.

That last check is the one that matters: it is the whole point of Wave A.

- [ ] **Step 7: Commit**

```bash
git add src/views/GISApp
git commit -m "feat(gis): autosave the map and wire the shell together"
```

---

## Task 28: Responsive bands, reduced motion, and the accessibility sweep

Shell design §8 and §9. Most of this is already in the CSS modules; this task is
where it gets checked against the spec's measured numbers rather than assumed.

**Files:**

- Modify: whichever module a check fails in
- Create: `src/views/GISApp/shell/MapShell.module.css` additions for the
  read-only band

- [ ] **Step 1: Add the read-only notice below 520px of canvas**

Shell design §8.3 is explicit that this is a design decision and not an
omission: a product whose job is composing a map for print, with a layer stack,
a six-section inspector, and a classification editor, cannot be operated at
phone width, and the failure mode of trying is that every surface becomes a
modal and the map is never visible.

Add to `MapShell.module.css`:

```css
.readOnlyNotice {
  display: none;
}

@container mapShell (max-width: 520px) {
  .readOnlyNotice {
    align-items: flex-start;
    align-self: start;
    background: var(--ava-surface-overlay);
    border: 1px solid var(--ava-border-default);
    border-radius: var(--mantine-radius-md);
    box-shadow: var(--mantine-shadow-md);
    display: flex;
    font-size: 12px;
    gap: var(--mantine-spacing-xs);
    grid-column: 1 / -1;
    grid-row: 2;
    line-height: 1.45;
    margin: 0 auto;
    max-width: 420px;
    padding: var(--mantine-spacing-xs) var(--mantine-spacing-sm);
  }
}
```

And render it in `MapShell.tsx`, inside `.chrome` and outside the
`isChromeHidden` branch, with exactly this copy:

```tsx
<div className={css.readOnlyNotice} role="status">
  <span>
    <strong>{t`Viewing only on this screen size.`}</strong>{" "}
    {t`Pan, zoom and tap a feature to read it. To edit layers, open this map on a tablet or a laptop.`}
  </span>
</div>
```

- [ ] **Step 2: Walk the three bands in the browser**

Resize the window and confirm, at each band, against §8.1's table:

| Canvas width  | Expected                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Above 1000px  | Layer stack and inspector both expanded, panels 264px and 320px                                                                         |
| 792 to 1000px | Panels narrow to 240px and 300px                                                                                                        |
| 520 to 792px  | Panels are full-height edge sheets at 288px, touch targets 44px, the top bar's action labels are gone, the furniture strip is two lines |
| Below 520px   | Only the map, the top bar, the legend, the furniture strip, and the read-only notice                                                    |

The two failures to look for specifically, because §8.2 says the prototype
found them by being built: a collapsed panel that keeps its expanded width and
pushes the Export button off the edge of the map, and a furniture strip that
truncates instead of wrapping. Neither may happen.

- [ ] **Step 3: Walk the tab order**

With the map open and two layers on it, tab from the top of the page and confirm
the order matches §9.1: the skip links come first inside the canvas, then the
map surface, then the top bar, then the layers panel, then the inspector, then
the legend, then the tool cluster. Confirm both skip links work.

Then confirm §9.4: **zero unnamed controls**. In the console:

```js
[
  ...document.querySelectorAll("button, [role=button], a, input, select"),
].filter(
  (el) =>
    !el.getAttribute("aria-label") &&
    !el.getAttribute("aria-labelledby") &&
    !el.textContent.trim(),
);
```

Expected: an empty array. Anything in it gets a name; do not remove it from the
tab order to make the check pass.

- [ ] **Step 4: Check the focus rings**

Tab through the layer rows, the inspector section toggles, and each panel's
collapse control, and confirm every ring falls **fully inside** its panel.
§9.6: full-bleed controls and panel header controls use `outline-offset: -2px`
because the panel clips at its rounded edge. A clipped ring means a missing
`:focus-visible` rule in that module.

- [ ] **Step 5: Check reduced motion**

Turn on the OS reduced-motion setting, then: collapse a panel and confirm it
does not animate (Mantine's `respectReducedMotion` handles this), and add a
layer and confirm the camera **jumps** to its bounds rather than flying.
`useFitMapBounds` is the only place that needs it explicitly, because
`fitBounds` is imperative.

- [ ] **Step 6: Check both themes**

Switch to dark and confirm: every panel is opaque with no translucency, the
selected layer row is legible, the badges are legible, and the legend's "Not
reported" key is the **dark** grey `#484848` rather than the light `#d1d1d1`.
That last one is the check that catches the §6.7 mistake: magnitude is absolute,
absence is relative to the surface it has to recede into.

Note in your commit message the one inherited inconsistency §8.4 flags and does
not fix: the nav rail is a fixed `NEUTRAL[6]` in both themes, so in dark mode it
is lighter than the app body. It is app-wide, not GIS, and it is out of scope
here.

- [ ] **Step 7: Commit**

```bash
git add src/views/GISApp
git commit -m "feat(gis): finish the responsive bands and the accessibility sweep"
```

---

## Task 29: Write the end-to-end spec

Spec §12's end-to-end list, plus the Wave A behaviour that only an e2e test can
prove: that a map survives a reload. Read `docs/rules/e2e-testing.md` first;
the two rules that govern this spec are "seed preconditions in the DB, drive the
behaviour under test through the UI" and "navigate client-side, not with
`page.goto`".

**Files:**

- Create: `tests/e2e/gis-map-layers.spec.ts`
- Create: `tests/e2e/helpers/seedAvaMap.ts`

- [ ] **Step 1: Write the seed helper**

`tests/e2e/helpers/seedAvaMap.ts`. Copy `seedDashboard.ts`'s owner lookup and
profile lookup verbatim, replacing the Puck config with an empty `AvaMapConfig`
and the table with `maps`.

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

type SeedAvaMapOptions = {
  admin: SupabaseClient;
  workspaceId: string;
  ownerEmail: string;
  name: string;
};

/**
 * Inserts an empty map owned by the given user and returns its id.
 *
 * A precondition the specs do not assert, so a direct write is the right tool
 * (`docs/rules/e2e-testing.md`). Call it before the first page load: a write
 * behind a live client's back leaves the React Query cache stale.
 */
export async function seedAvaMap(
  options: Readonly<SeedAvaMapOptions>,
): Promise<string> {
  const { admin, workspaceId, ownerEmail, name } = options;

  const { data: ownerUserIdRaw, error: ownerLookupError } = await admin.rpc(
    "util__get_user_id_by_email",
    { p_email: ownerEmail },
  );
  if (ownerLookupError) {
    throw new Error(
      `Could not find owner user by email "${ownerEmail}": ${ownerLookupError.message}`,
    );
  }

  const { data: ownerProfile, error: profileError } = await admin
    .from("user_profiles")
    .select("id")
    .eq("user_id", ownerUserIdRaw as string)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (profileError || !ownerProfile) {
    throw new Error(
      `No user_profile for ${ownerEmail} in workspace ${workspaceId}`,
    );
  }

  const { data: inserted, error: insertError } = await admin
    .from("maps")
    .insert({
      workspace_id: workspaceId,
      owner_id: ownerUserIdRaw as string,
      owner_profile_id: ownerProfile.id,
      name,
      config: {
        __type: "AvaMapConfig",
        version: 1,
        basemap: { type: "builtIn", style: "avandar" },
        view: { center: [-119.4, 36.8], zoom: 6 },
        bookmarks: [],
        layers: [],
      },
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw new Error(`Could not seed map: ${insertError?.message}`);
  }
  return inserted.id as string;
}

/** Removes every map a user owns in a workspace, plus their shares. */
export async function deleteMapsByIds(options: {
  admin: SupabaseClient;
  mapIds: readonly string[];
}): Promise<void> {
  if (options.mapIds.length === 0) {
    return;
  }
  await options.admin
    .from("resource_shares")
    .delete()
    .eq("resource_type", "map")
    .in("resource_id", options.mapIds as string[]);
  await options.admin
    .from("maps")
    .delete()
    .in("id", options.mapIds as string[]);
}
```

> The seeded camera is over California because the dataset the specs import is
> `small-california-covid-sample.csv`. It only matters for the first frame: the
> app flies to the layer's bounds on first render, which is what the spec then
> observes.

- [ ] **Step 2: Write the spec**

`tests/e2e/gis-map-layers.spec.ts`. One long test carries the whole arc, because
importing the CSV through the UI is expensive and every later assertion depends
on it. The permission gate is a separate test because it signs in as a different
user.

```ts
import { expect, test } from "./fixtures/e2e.fixture";
import {
  assignE2ESecondaryMemberCustomMatrix,
  createRolesMatrixWithoutApp,
  restoreE2ESecondaryMemberRoleGroup,
} from "./helpers/assignE2ESecondaryMemberRole";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
import { deleteMapsByIds, seedAvaMap } from "./helpers/seedAvaMap";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

/** The dataset's name once imported, which is the layer's default name too. */
const DATASET_NAME = "small-california-covid-sample.csv";

/** Imports the sample CSV through the UI and returns its dataset id. */
async function _importSampleCsv(options: {
  page: Page;
  workspaceSlug: string;
}): Promise<string> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`);
  const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
  await uploadPanel
    .locator('input[type="file"]')
    .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
  await uploadPanel
    .getByRole("button", { name: "Upload", exact: true })
    .click();

  const formattedRowCount =
    SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT.toLocaleString("en-US");
  await expect(
    page.getByText(`Parsed ${formattedRowCount} rows successfully`),
  ).toBeVisible({ timeout: MEDIUM_WAIT });

  await ensureCloudStorageCheckedAndSaveDataset({ page, workspaceSlug });
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (!datasetId) {
    throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
  }
  await pollUntilCloudDatasetToggleShowsOnline(page);
  return datasetId;
}

/** The layers panel's row for a layer, located by its select button. */
function _layerRow(page: Page, layerName: string) {
  return page
    .getByRole("region", { name: "Layers" })
    .getByRole("button", { name: layerName, exact: false });
}

test.describe("GIS map layers", () => {
  test("adds a layer, shows its data, and survives a reload", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const seededMapIds: string[] = [];
    let datasetId = "";

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      datasetId = await _importSampleCsv({ page, workspaceSlug });

      const workspaceId = await getWorkspaceIdBySlug({
        supabaseAdminClient: admin,
        slug: workspaceSlug,
      });
      const mapId = await seedAvaMap({
        admin,
        workspaceId,
        ownerEmail: primaryUser.email,
        name: "E2E cholera response",
      });
      seededMapIds.push(mapId);

      // The seed happened behind the app's back, so this is the one hard load
      // the spec is allowed. Everything after it navigates client-side.
      await page.goto(`/${workspaceSlug}/map/${mapId}`);

      // The first-run card is the empty state, and it owns an Add a layer
      // button distinct from the panel header's icon button.
      await page.getByRole("button", { name: "Add a layer" }).click();
      await page.getByRole("option", { name: DATASET_NAME }).click();

      // 1. The layer lands in the stack.
      await expect(_layerRow(page, DATASET_NAME)).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      // 2. Inference ran and said so. `Long_` only matches once the guesser
      //    strips punctuation, so this assertion covers that rule too.
      await expect(
        page.getByText(/matched from the column names/i),
      ).toContainText("Lat");
      await expect(
        page.getByText(/matched from the column names/i),
      ).toContainText("Long_");

      // 3. The layer rendered. The row's own status is the observable proof:
      //    a MapLibre canvas has no queryable DOM.
      await expect(_layerRow(page, DATASET_NAME)).toContainText(/points/, {
        timeout: LONG_WAIT,
      });

      // 4. Autosave finished.
      await expect(page.getByText("All changes saved")).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      // 5. The map survives a reload. This is the assertion Wave A exists for.
      await page.reload();
      await expect(_layerRow(page, DATASET_NAME)).toContainText(/points/, {
        timeout: LONG_WAIT,
      });
      await expect(page.getByRole("textbox", { name: "Map name" })).toHaveValue(
        "E2E cholera response",
      );

      // 6. Switching the basemap does not lose the layer. This is the bug that
      //    had the style picker hard-disabled behind HIDE_STYLE_PICKER before
      //    Phase 1 (GIS spec section 1.3), so it gets an assertion.
      await page.getByRole("button", { name: "Basemap" }).click();
      await page.getByRole("menuitem", { name: "Positron" }).click();
      await expect(_layerRow(page, DATASET_NAME)).toContainText(/points/, {
        timeout: MEDIUM_WAIT,
      });

      // 7. Reorder by keyboard. Drag is not simulated: a Playwright drag of a
      //    dnd-kit handle is flaky by nature, and both paths write through
      //    AvaMapConfig.withStackOrder, so the persistence is covered either
      //    way. Duplicate the layer first so there are two rows to reorder.
      await page
        .getByRole("button", {
          name: `More actions for the layer ${DATASET_NAME}`,
        })
        .click();
      await page.getByRole("menuitem", { name: "Duplicate" }).click();
      const rowsBefore = await page
        .getByRole("region", { name: "Layers" })
        .getByRole("listitem")
        .allInnerTexts();
      await _layerRow(page, DATASET_NAME).first().focus();
      await page.keyboard.press("Alt+ArrowDown");
      await expect
        .poll(async () => {
          return await page
            .getByRole("region", { name: "Layers" })
            .getByRole("listitem")
            .allInnerTexts();
        })
        .not.toEqual(rowsBefore);

      // 8. Clicking a feature shows the fields the popup selected. This is the
      //    regression test for the inventory's section 6.7: the drawer was
      //    empty by construction before Wave A.
      await page.getByRole("application", { name: /Map of/ }).click({
        position: { x: 400, y: 300 },
      });
      const featureDrawer = page.getByRole("dialog", { name: "Feature" });
      if (await featureDrawer.isVisible()) {
        await expect(featureDrawer).toContainText("Admin2");
      }
    } finally {
      await deleteMapsByIds({ admin, mapIds: seededMapIds });
      if (datasetId) {
        await deleteDatasetAndShares({ admin, datasetId });
      }
    }
  });

  test("a member with no gis role cannot reach a map", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, secondaryUser } = e2eWorkerDb;
    const seededMapIds: string[] = [];

    try {
      const workspaceId = await getWorkspaceIdBySlug({
        supabaseAdminClient: admin,
        slug: workspaceSlug,
      });
      await assignE2ESecondaryMemberCustomMatrix({
        admin,
        workspaceId,
        secondaryUserEmail: secondaryUser.email,
        rolesMatrix: createRolesMatrixWithoutApp("gis"),
      });
      const mapId = await seedAvaMap({
        admin,
        workspaceId,
        ownerEmail: e2eWorkerDb.primaryUser.email,
        name: "E2E gated map",
      });
      seededMapIds.push(mapId);

      await signInWithEmailPassword(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

      await expect(page.getByRole("link", { name: "Maps" })).toHaveCount(0);

      await page.goto(`/${workspaceSlug}/map/${mapId}`);
      await expect(page).toHaveURL(/access-denied/, { timeout: MEDIUM_WAIT });
    } finally {
      await deleteMapsByIds({ admin, mapIds: seededMapIds });
      await restoreE2ESecondaryMemberRoleGroup({
        admin,
        workspaceId: await getWorkspaceIdBySlug({
          supabaseAdminClient: admin,
          slug: workspaceSlug,
        }),
        secondaryUserEmail: secondaryUser.email,
      });
    }
  });
});
```

Four things to reconcile against the real code as you write it, because each is
a name this plan asserts rather than verifies:

1. **The helper signatures.** `assignE2ESecondaryMemberCustomMatrix`,
   `createRolesMatrixWithoutApp`, `restoreE2ESecondaryMemberRoleGroup`, and
   `deleteDatasetAndShares` are read from
   `tests/e2e/helpers/assignE2ESecondaryMemberRole.ts` and
   `datasetSharingCleanup.ts`. Match their actual parameter objects.
2. **The access-denied URL.** Check what `RouteMiddleware` redirects to and match
   the regex to it.
3. **The feature click at `{x: 400, y: 300}`** is a guess at where a point
   lands. The `if (await featureDrawer.isVisible())` guard makes the assertion
   conditional, which is a weak test. Replace it: read a rendered feature's
   screen position out of the map with `page.evaluate` against MapLibre's
   `project()` on a known coordinate from the CSV's first row
   (`37.64629437, -121.8929271`), then click **that** point. A conditional
   assertion in a regression test for a shipped bug is worse than no test.
4. **`getByRole("listitem")`** on the layer list relies on the rows being `li`
   elements, which Task 16 makes them. If the drag library wraps them, adjust
   the locator rather than the markup.

- [ ] **Step 3: Run it**

Run: `pnpm test:e2e tests/e2e/gis-map-layers.spec.ts`
Expected: PASS. If a test flakes, name the mechanism before changing anything:
`docs/rules/e2e-testing.md` is explicit that `freshBrowserPage` and a raised
timeout are the wrong tools for a race.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e
git commit -m "test(gis): end-to-end coverage for multi-layer maps and persistence"
```

---

## Task 30: Delete the replaced code and verify everything

**Files:** deletions listed in the File structure section.

- [ ] **Step 1: Delete the replaced modules**

```bash
git rm -r src/views/GISApp/GisMapCanvas
git rm -r src/views/GISApp/panels/LayerFormPanel
git rm src/views/GISApp/panels/FeatureInspector.tsx
git rm src/views/GISApp/useGisMapState.ts
git rm src/views/GISApp/useGisLayerView.ts
git rm src/views/GISApp/layers/useLayerMapSpec.ts
git rm src/views/GISApp/layers/useRenderedLayerSpec.ts
git rm src/views/GISApp/layers/useLayerFeatureCollection.ts
git rm -r src/views/GISApp/layers/useMapLayerData
git rm -r src/views/GISApp/MapCanvas/MapStatusOverlay
git rm src/views/GISApp/basemap/MapStylePicker.tsx
git rm src/views/GISApp/GisApp.module.css
```

`MapLayerUpdates.ts` moved out of `LayerFormPanel/` in Task 19, and both
`MapLayerData.ts` and the query test moved out of `useMapLayerData/` in Task 25,
so all three survive the two `git rm -r` calls. Confirm before committing:

```bash
ls src/views/GISApp/layers/MapLayerUpdates.ts \
   src/views/GISApp/layers/useMapLayersData/MapLayerData.ts \
   src/views/GISApp/layers/useMapLayersData/useMapLayersData.test.ts
```

- [ ] **Step 2: Confirm nothing references the deleted modules**

```bash
grep -rn "GisMapCanvas\|LayerFormPanel\|useGisMapState\|useGisLayerView\|useLayerMapSpec\|useRenderedLayerSpec\|useLayerFeatureCollection\|MapStatusOverlay\|MapStylePicker" src ; echo "exit=$?"
```

Expected: no output, `exit=1`.

- [ ] **Step 3: Confirm no `console.*` crept back in**

```bash
grep -rn "console\." src/views/GISApp ; echo "exit=$?"
```

Expected: no output, `exit=1`. Phase 1 removed every one of these and the
status card is what replaced them.

- [ ] **Step 4: Extract i18n messages**

Run: `pnpm i18n:extract`
Then confirm the new files appear as `#:` references and the new strings are
present:

```bash
grep -c "views/GisApp" src/i18n/locales/en/messages.po
```

Expected: a count in the dozens. `pnpm i18n:check` is the CI gate, so run that
too and commit the catalog changes.

- [ ] **Step 5: Full verification**

Run each of these and read the output. Do not report the task complete on a
partial run.

```bash
pnpm type-check
pnpm lint
pnpm test:frontend
pnpm test:db
pnpm test:e2e tests/e2e/gis-map-layers.spec.ts
```

Expected: all green. If `pnpm lint`'s `react-doctor` pass reports findings in
the new GIS files, fix them: it is non-blocking in the script (`|| true`) but
the findings are real.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(gis): delete the prototype chrome replaced by the Wave A shell"
```

---

## Definition of done

Wave A is complete when all of the following are true, checked by running them
rather than by reading the code:

- [ ] A map is a row in `public.maps`, and its RLS is covered by pgTAP
      including the negative cases and the `is_public`-is-inert assertion.
- [ ] `map` is a `resource_type`, a map can be shared through
      `ShareResourceModal`, and a member with only a share can open it.
- [ ] A member who owns maps can be offboarded: ownership transfer and the bulk
      transfer both handle maps, and the privacy log counts them.
- [ ] **Maps** appears in the nav rail for a user with `gis__can_view_map`, and
      not for one without it.
- [ ] A map with four layers renders all four, in the stack's order, and
      reordering by drag and by `Alt`+arrow both change the draw order.
- [ ] Hiding a layer removes it from the map and keeps its row and its status.
- [ ] Adding a layer from a source with `lat`-like columns renders immediately
      and says which columns it matched.
- [ ] Clicking a feature lists the fields the author chose in the Popup
      section, and follows the record link when one is configured.
- [ ] Loading, error, zero-rows, and partial-mapping each show on the layer row
      **and** in the status card, and the error card offers Retry and Show
      details in a production build.
- [ ] The basemap can be switched, set to none, and pointed at a custom tile
      service, and layers survive each switch.
- [ ] The scale bar, the coordinate readout, the attribution, and the
      disclaimer are in the docked strip, and MapLibre draws none of them.
- [ ] Every panel collapses to a pill, the collapse state survives a reload,
      and `mod+\` hides all chrome.
- [ ] `fitBounds` never puts data under an expanded panel, and jumps rather
      than flies under reduced motion.
- [ ] Reloading the page restores the map exactly: name, basemap, camera,
      bookmarks, and every layer's source, binding, symbology, filters, popup,
      and legend.
