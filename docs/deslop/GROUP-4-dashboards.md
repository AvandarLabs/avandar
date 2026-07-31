# Group 4 — Dashboards (+ dataset summary view)

- **Group**: 4 of 5 (deslop consolidated migration groups)
- **Refactor branch**: `refactor-g4/dashboards`
- **Migration strategy:** one PR per group — the whole group lands as a single PR off `refactor-g4/dashboards`; the per-row order below is the in-branch build sequence.
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Base**: `origin/develop` at `c703e5c2` (refreshed 2026-07-31, after G1
  `914bcbba` + G2 `59cdb59c` + G3 `c703e5c2` all merged). The
  `refactor-g4/dashboards` branch + worktree are cut from this tip.
  **Drift note:** originally authored against `6ec98d45`; this whole plan was
  re-verified path-by-path against `origin/develop @ c703e5c2` and
  `origin/feat/ict4d-demo @ b80b0418` on 2026-07-31. See "What the 2026-07-31
  refresh changed" in Notes below. If you land this much later, re-fetch and
  re-diff — the file paths below are current as of the refresh.
- **Constituent rows** (from `ALL_FEATURES.md`):
  - `#064` dashboard-design-tokens
  - `#065` dashboard-chat-in-editor
  - `#066` dashboard-export-buttons-polish
  - `#067` dashboard-modal-styles
  - `#068` dashboard-global-filters
  - `#069` dashboard-per-viz-filters
  - `#070` dashboard-view-before-publish
  - `#071` dashboard-publish-modal
  - `#072` dashboard-vanity-url
  - `#073` dashboard-share-url-row-qr
  - `#074` dashboard-slice-aware-publish
  - `#075` dashboard-pdf-export-annotate
  - `#076` summary-view-redesign
  - `#048` sql-form-sync-dashboards (moved here from §F: it is the
    dashboard-block application of the query-form machinery)
- **Depends on (other groups):**
  - **Group 1** (data ingestion / dataset foundations) — `#076` summary view
    reads dataset metadata/column summaries via `DatasetQueryClient`.
  - **Group 2** (viz + SQL-form machinery) — `#009` viz chart suite is the V3
    migration this group's V4 builds on; `#044/#045/#046/#047` SQL↔form
    machinery is the prerequisite for `#048` and feeds the slice/filter SQL.
  - **Group 3** (chat panel) — `#065` chat-in-editor needs the chat panel and
    its tool-registration plumbing (the `addDashboardBlock` tool).
- **Estimated size**: **large.** The dashboard-area delta
  (`src/views/DashboardApp/` + `src/components/Dashboard/` + `AvaPage`) alone is
  ~70 files / +7.8k / −1.4k. With the summary view, the chat tool wiring, the
  slice builder, and dependency installs, the realistic working total is
  **~80–90 files, ~9–10k lines**. This is large, but it ships as a **single PR**
  off `refactor-g4/dashboards`. The numbered order below is the in-branch build
  sequence (the order to port the rows as commits on the branch), NOT a list of
  separate PRs. (Fallback the operator declined for now: if the single PR proves
  intractable to review, the natural seam is the publishing chain
  `#070`–`#075` vs. the design-token/filter rows vs. the independent
  `#076` summary view.)

---

## Notes for future you

Read this whole section before touching anything. The per-feature plan files
(`064`..`076`, `048`) were authored in Session 3 from commit subjects and
guessed at file paths. **Almost every path in those plans is wrong.** The real
code lives under `src/views/DashboardApp/`, not `src/components/AvaPage`,
`src/components/Dashboard/blocks`, `src/lib/url`, `shared/models/dashboard`, or
`supabase/functions/chat/tools`. The "Consolidated changes" section below has
the verified real paths. Trust this file over the individual plans.

### What the 2026-07-31 refresh changed (drift since `6ec98d45`)

This plan was re-verified path-by-path against the post-G3 develop
(`c703e5c2`). The material deltas since it was authored:

- **AvaPage V3 is now ON develop.** The TOP RISK below is largely retired: G2
  `#009` landed V3, so develop is at `CURRENT_SCHEMA_VERSION = 3` with
  `versionTransforms = [V1, V2, V3]`. G4 now registers **V4 only**.
- **`AvaPageDataMigrationV2.types.ts` is now identical on both branches** (the
  old "~116-line delta" landed with V3). Its surgical-edit entry was removed —
  do not touch V2 types.
- **Most deps already landed.** `html-to-image`, `roughjs`, `node-sql-parser`,
  `react-querybuilder`, `@react-querybuilder/mantine` are all on develop
  (via G2/G3). Only **`qrcode`, `@types/qrcode`, `jspdf`** still need installing.
- **`#065` server wiring is mostly already on develop.** The chat routes file
  was renamed `chat.routes.ts` → `ChatRoutes.ts` (G3 PascalCase) AND the
  `addDashboardBlock` tool was refactored out of it into
  `supabase/functions/chat/PostChatMessages/{parsing/parseDashboardBlock.ts,
  prompt/buildChatToolConfig.ts, prompt/buildSystemPrompts.ts}` — which G3
  already merged. Re-scope `#065`'s server side against those files; do not
  expect to port a monolithic `chat.routes.ts` edit.
- **Offline-chat surgical target does not exist on develop.**
  `src/lib/offlineChat/buildOfflinePrompts.ts` (and the whole
  `src/lib/offlineChat/` dir) is feat-only — the offline-chat subsystem is a
  **G5** deliverable and has NOT landed. Drop it from G4's `#065` scope; the
  offline `addDashboardBlock` prompt wiring rides with G5.
- **`#069` per-viz-filter files sit one dir deeper on feat** (nested
  `DataVizPBlock/DataVizPBlock/`). Corrected in the copy list.
- Five files the old draft called "surgically edit" are actually **new**
  (absent on develop) → moved to the copy-verbatim list.

### TOP RISK (mostly retired) — AvaPage data-migration VERSION ordering

Get this wrong and existing saved dashboards silently corrupt or fail to load.
As of the 2026-07-31 refresh the dangerous prerequisite is **satisfied**: V3 is
already on develop, so G4 only appends V4. Still verify before touching it.

- The migration chain lives at
  `src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV{1,2,3,4}/`.
  Each migration declares a `downgradedVersion` → `upgradedVersion` pair and is
  registered, **in order**, in
  `src/views/DashboardApp/AvaPage/utils/upgradeAvaPageData.ts`.
- **`develop @ c703e5c2` has V1, V2, and V3.** `upgradeAvaPageData.ts`
  registers `[V1, V2, V3]`, and
  `shared/models/Dashboard/DashboardConfig/constants.ts` has
  `CURRENT_SCHEMA_VERSION = 3`. (Confirmed at refresh.)
- **`feat/ict4d-demo` has V1–V4.** It registers `[V1, V2, V3, V4]` and sets
  `CURRENT_SCHEMA_VERSION = 4`.
- Therefore G4's only migration-chain work is the V3 → V4 step:
  - **V4 ships with Group 4 `#069`** (per-viz filters). Registering V4 means:
    copy the `AvaPageDataMigrationV4/` directory, add `AvaPageDataMigrationV4`
    to the `versionTransforms` array in `upgradeAvaPageData.ts` (after V3), and
    bump `CURRENT_SCHEMA_VERSION` 3 → 4 in
    `shared/models/Dashboard/DashboardConfig/constants.ts`.
  - Re-confirm at migration time that develop still shows V3 +
    `CURRENT_SCHEMA_VERSION = 3` before appending V4. If someone has since
    bumped it, reconcile — never register V4 twice or against a stale base.
  - `AvaPageDataMigrationV2.types.ts` is now identical on both branches — leave
    it alone (do not overwrite develop's V2 types).
- **Acceptance gate:** after V4 lands, the migrator's own tests
  (`AvaPageDataMigrationV3.test.ts`, `AvaPageDataMigrationV4.test.ts`) must pass,
  and a V1/V2-era saved dashboard must upgrade cleanly all the way to V4. Run
  the migrator test suite (paths in Verification) as the hard gate.

### Multi-feature hotspot files (edited by several rows — merge carefully)

These files are touched by more than one row in this group. Migrate them
**once, cumulatively, in migration order** rather than re-porting them per
feature. When you reach a later feature, surgically extend the already-ported
version instead of overwriting.

- `src/views/DashboardApp/AvaPage/AvaPage.types.ts` — design tokens (`#064`),
  filter/migration field shapes (`#068`/`#069`). Root/block prop additions.
- `src/views/DashboardApp/DashboardEditorView/DashboardEditorView.tsx`
  (+`.test.tsx`) — the big one (~172-line diff). Touched by chat-in-editor
  (`#065`), publish/export button wiring (`#066`/`#070`/`#071`/`#075`),
  filters, and slice publish. This is the integration seam for almost the whole
  group.
- `src/views/DashboardApp/DashboardEditorView/getDashboardPuckConfig.tsx`
  (~2126-line diff — the largest single file) — the Puck config registry.
  Registers the Filter P-block (`#068`), the DataViz block changes
  (`#048`/`#069`), NLQueryPField tabs (`#048`), design-token fields (`#064`).
  Nearly every feature in the group registers something here. Port it
  cumulatively; do not split its blocks across commits in a way that leaves the
  config referencing not-yet-ported components.
- `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx`
  and `buildDataVizPBlockConfig.tsx` — DataViz block render + config. Touched by
  filters (`#068`/`#069`), per-block SQL form (`#048`), and chat pending blocks
  (`#065`).
- `src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/` — the
  whole modal directory is shared by `#071` (modal), `#072` (vanity slug field),
  `#073` (ShareUrlRow + QR), `#074` (PublishSliceSection / data scope). Land
  `#071` first, then layer the others into the same modal.
- `src/views/DashboardApp/DashboardEditorView/PublishDashboardButton.tsx`
  (~126-line diff) — replaces the old `confirm()` call site (`#071`) and is
  where slice config (`#074`) is applied on publish.
- `src/views/DashboardApp/DashboardViewerView/DashboardViewerView.tsx`
  (~119-line diff) — gains `mode: "public" | "preview"` (`#070`) and is the
  renderer behind both the preview route and the public `/d/$slug` route
  (`#072`). Also where global filters render at view time.
- `src/views/DashboardApp/AvaPage/utils/upgradeAvaPageData.ts` and
  `shared/models/Dashboard/DashboardConfig/constants.ts` — the migration
  registry + version constant (see TOP RISK).
- Modal/button CSS (`#066` export-buttons + `#067` modal-styles): these are
  pure styling rows that touch the same modal chrome the Publish (`#071`) and
  Export (`#075`) features render into. Land `#066`/`#067` early (right after
  design tokens) so later modal features render against the final chrome and you
  don't re-touch CSS. They interact with the modal-refresh used by
  Publish/Export — that is expected, not a conflict.

### `#075` — `HIDE_EXPORT_AS_PDF` flag (must ship OFF)

The PDF export feature is gated behind a local constant
`const HIDE_EXPORT_AS_PDF = true;` at the top of
`src/views/DashboardApp/DashboardEditorView/ExportPdfButton.tsx` (line 11; the
button early-returns `null` when true, line 32). **Migrate the flag in its
`true` state** so the feature ships hidden/defaulted-off. Flipping it to `false`
to actually expose the PDF export is a separate operator decision, not part of
this migration. Do not remove the gate.

### Cross-group dependency reminders

- `#065` dashboard-chat-in-editor needs **Group 3**'s chat panel + tool
  registration — **which is already on develop (`c703e5c2`).** The
  `addDashboardBlock` tool is wired server-side under
  `supabase/functions/chat/PostChatMessages/` (`parsing/parseDashboardBlock.ts`,
  `prompt/buildChatToolConfig.ts`, `prompt/buildSystemPrompts.ts`) — G3
  refactored it OUT of the old monolithic routes file (now renamed
  `chat.routes.ts` → `ChatRoutes.ts`). So the server side of `#065` is
  **largely already done**; verify those files register `addDashboardBlock`
  before assuming any server port is owed. `#065`'s remaining work is
  client-side: unlock the composer on dashboards and consume pending blocks in
  `DashboardEditorView.tsx` via `DashboardEditorStateManager` +
  `DashboardChatPendingBlocksSync`. The per-feature plan's claim of a standalone
  `supabase/functions/chat/tools/addDashboardBlock.ts` file is WRONG — no such
  file exists. **Do not** wire the offline `addDashboardBlock` prompt path here:
  `src/lib/offlineChat/` is feat-only and lands with **G5**, not G4. Also
  confirm `#015` (chat-disabled-visual-feedback) — it is `[x]` via G3.
- `#048` sql-form-sync-dashboards needs **Group 2**'s SQL-form machinery
  (`#044` sql→structured, `#045` structured→sql, `#047` data-explorer hook
  shape). `useDashboardManualQueryState` is the per-block analogue of
  `useSqlFormSync`.
- `#074` slice-aware-publish needs `node-sql-parser` (Group 2 dep) for column
  extraction. The slice builder is `src/clients/dashboards/sliceBuilder.ts`
  (NOT `src/lib/dashboard/buildSliceSql.ts` as the plan guessed).

### Sequencing within the group

- Design tokens (`#064`) and the two pure-CSS polish rows (`#066`, `#067`) come
  **first** so every feature that renders into a card/modal renders against the
  final styling.
- Global filters (`#068`) before per-viz filters (`#069`) — `#069`'s opt-out is
  defined relative to the global-filter mechanism, and `#069` carries the V4
  migration that depends on V3 (Group 2) being present.
- The publishing chain is strictly sequential because every feature layers into
  the same modal/button: `#070` (preview route + `mode` prop) → `#071` (publish
  modal) → `#072` (vanity slug field in the modal) → `#073` (ShareUrlRow + QR in
  the modal) → `#074` (slice/data-scope section in the modal) → `#075` (PDF
  export button next to Publish).
- `#076` summary view is independent (DataManagerApp, not DashboardApp) — land
  it whenever; it has no intra-group coupling.
- `#048` last within the group — it depends on Group 2 and edits the same
  DataViz block / Puck config hotspots, so doing it after the filter rows keeps
  those merges linear.

### Operator decisions to surface

1. **One PR per group (decided).** The group ships as a single PR off
   `refactor-g4/dashboards`, built row-by-row in the migration order below. The
   raw delta is large (~9–10k lines); if review proves intractable, the declined
   fallback seam is documented in Estimated size above.
2. **`HIDE_EXPORT_AS_PDF` stays `true`.** Confirm the operator wants PDF export
   shipped hidden (we ship the gate ON). Flipping it is a deliberate later call.
3. **V4 cannot land before V3.** Group 2 `#009` (which ships V3 + bumps
   `CURRENT_SCHEMA_VERSION` to 3) is a hard prerequisite for `#069`. If Group 2
   has not landed V3, pause `#069` and the rest of the migration-bearing work.
4. **Vanity-URL DB uniqueness constraint** is assumed to be a Phase-1 schema
   item (workspace-scoped unique slug on the dashboards table). Confirm it
   exists on develop before `#072`; if absent, that is a Phase-1 bug to flag,
   not something to add here.
5. **Public route shape.** The real public route is `src/routes/d/$slug.tsx`
   (slug only), NOT `/d/<workspaceSlug>/<slug>` as the `#072` plan and
   `ALL_FEATURES.md` row say. Resolution is presumably workspace-scoped inside
   the loader. Flag the row description as stale.

---

## Migration order within this group

Numbered dependency order. Land each before starting the next where a hotspot
file is shared.

1. **`#064` dashboard-design-tokens** — token types + CSS variables + polished
   header/card. No deps.
2. **`#066` dashboard-export-buttons-polish** — CSS-only. No deps. (Land early
   so modal/button chrome is final.)
3. **`#067` dashboard-modal-styles** — CSS-only. No deps.
4. **`#065` dashboard-chat-in-editor** — Group 3 chat plumbing + `#015` are
   **already on develop**; the `addDashboardBlock` server tool already exists
   under `PostChatMessages/`. Remaining work is client-side: unlock the composer
   on dashboards and consume pending blocks. Skip the `src/lib/offlineChat/`
   path (feat-only, G5). See cross-group reminders above.
5. **`#068` dashboard-global-filters** — Filter P-block + state manager + SQL
   wrap. No intra-group dep, but must precede `#069`.
6. **`#069` dashboard-per-viz-filters** — **ships `AvaPageDataMigrationV4`.**
   Depends on `#068`. Group 2 `#009` V3 is **already registered on develop**
   (`CURRENT_SCHEMA_VERSION = 3`); G4 appends V4 and bumps 3 → 4. See TOP RISK.
7. **`#070` dashboard-view-before-publish** — preview route + `mode` prop on
   `DashboardViewerView`. Head of the publishing chain.
8. **`#071` dashboard-publish-modal** — real Mantine modal replacing
   `confirm()`. Depends on `#070`.
9. **`#072` dashboard-vanity-url** — slug input + live preview + public
   `/d/$slug` route. Depends on `#071`; assumes Phase-1 uniqueness constraint.
10. **`#073` dashboard-share-url-row-qr** — `ShareUrlRow` + 256×256 QR PNG
    (client-side `qrcode`). Depends on `#072`.
11. **`#074` dashboard-slice-aware-publish** — data-scope section + slice
    builder. Depends on `#071` and **Group 2 `#044`** (`node-sql-parser`).
12. **`#075` dashboard-pdf-export-annotate** — export button + annotator + PDF
    pipeline, gated `HIDE_EXPORT_AS_PDF = true`. Depends on `#071`.
13. **`#076` summary-view-redesign** — independent (DataManagerApp). Depends on
    **Group 1** dataset client.
14. **`#048` sql-form-sync-dashboards** — per-block SQL↔form + 3-tab
    NLQueryPField. Depends on **Group 2 `#044`/`#045`/`#047`**. Last because it
    re-touches DataViz block + Puck config hotspots.

---

## Consolidated changes

All paths verified against `feat/ict4d-demo` and `origin/develop` at authoring
time. Prefer path-scoped `git checkout feat/ict4d-demo -- <path>` for the
copy-verbatim files; surgically port the shared hotspot files.

### Files to copy verbatim (new on develop)

```
# --- #064 design tokens ---
src/views/DashboardApp/AvaPage/utils/dashboardDesignTokens.ts
src/views/DashboardApp/AvaPage/utils/dashboardDesignTokens.test.ts

# --- #065 chat-in-editor (client side) ---
src/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager.ts
src/views/DashboardApp/DashboardEditorView/DashboardChatPendingBlocksSync.tsx
src/views/DashboardApp/DashboardEditorView/DashboardChatPendingBlocksSync.test.tsx
src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/buildPendingDataVizBlock.ts
src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/buildPendingDataVizBlock.test.ts
src/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock.ts
src/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock.test.ts

# --- #068 global filters ---
src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock.tsx
src/views/DashboardApp/AvaPage/pblocks/FilterPBlock/buildFilterPBlockConfig.tsx
src/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager.ts
src/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql.ts
src/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql.test.ts
src/views/DashboardApp/DashboardFilterStateManager/useApplyDashboardFiltersToSql.ts
src/views/DashboardApp/AvaPage/pfields/GlobalFilterSubscriptionPField/GlobalFilterSubscriptionPField.tsx
src/views/DashboardApp/AvaPage/pfields/GlobalFilterSubscriptionPField/buildGlobalFilterSubscriptionPFieldConfig.tsx

# --- #069 per-viz filters (+ V4 migration) ---
src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV4/AvaPageDataMigrationV4.ts
src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV4/AvaPageDataMigrationV4.types.ts
src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV4/AvaPageDataMigrationV4.test.ts
# NOTE: these 4 sit in the NESTED DataVizPBlock/DataVizPBlock/ dir on feat (beside DataVizPBlock.tsx), not one level up.
src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizLocalFilters.tsx
src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters.ts
src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters.test.ts
src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/useLocalFilterState.ts
src/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFiltersPField.tsx
src/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/buildLocalFiltersPFieldConfig.tsx

# --- #070 preview before publish ---
src/routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx

# --- #071 publish modal + #072/#073/#074 layered into the same dir ---
src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModal.tsx
src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishSliceSection.tsx   # #074
src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/ShareUrlRow.tsx           # #073
src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/buildShareUrls.ts         # #072/#073
src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/slug.ts                   # #072 (== toVanitySlug)
src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/slug.test.ts              # #072 (the "8 unit tests")

# --- #072 public route ---
src/routes/d/$slug.tsx

# --- #074 slice builder ---
src/clients/dashboards/sliceBuilder.ts

# --- #075 PDF export + annotate (ships gated OFF) ---
src/views/DashboardApp/DashboardEditorView/ExportPdfButton.tsx
src/views/DashboardApp/DashboardEditorView/ExportPdfModal/ExportPdfModal.tsx
src/views/DashboardApp/DashboardEditorView/ExportPdfModal/PdfAnnotator.tsx
src/views/DashboardApp/DashboardEditorView/ExportPdfModal/pdfExport.ts

# --- #076 summary view redesign ---
src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetSummaryView.tsx
src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetSummaryView.module.css
src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSummaryBody.tsx
src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/NumberColumnSummary.tsx
src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/TextColumnSummary.tsx
src/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/columnVisuals/DateColumnSummary.tsx

# --- #048 per-block SQL form sync ---
src/views/DashboardApp/AvaPage/pfields/NLQueryPField/useDashboardManualQueryState.ts

# --- reclassified: NEW on develop (the 2026-07-31 audit found these are additive,
#     not surgical edits — they do not exist on develop) ---
src/views/DashboardApp/DashboardEditorView/getDashboardPuckConfig.module.css                 # #064/#065/#068/#069/#048
src/views/DashboardApp/DashboardEditorView/dashboardPuckDrawerLabel.ts                        # puck drawer label helper
src/views/DashboardApp/DashboardEditorView/dashboardToolbarButtonSize.ts                      # toolbar button sizing helper
src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/resolveDataVizPBlockProps.ts  # #068/#069/#048 (nested dir)
src/views/DashboardApp/DashboardEditorView/SaveDashboardButton.module.css                     # #066 button polish
```

> The `slug.ts`/`slug.test.ts` files are the real form of the plan's
> "`toVanitySlug` + 8 unit tests". The slice builder is `sliceBuilder.ts`, not
> `buildSliceSql.ts`/`extractReferencedColumns.ts`. The PDF pipeline uses
> `html-to-image`'s `toCanvas` + `jspdf` + `roughjs`, not `html2canvas`.

### Files to surgically edit on develop (annotate feature(s))

- `src/views/DashboardApp/AvaPage/AvaPage.types.ts` — add `theme`/`typography`
  root props (`#064`); add filter/opt-out/local-filter block field shapes
  (`#068`/`#069`).
- ~~`AvaPageDataMigrationV2.types.ts`~~ — **no longer drifted.** As of the
  2026-07-31 refresh this file is identical on both branches (the old ~116-line
  delta landed with V3/Group 2). Do not touch it.
- `src/views/DashboardApp/AvaPage/utils/upgradeAvaPageData.ts` — append `V4`
  (`#069`) to `versionTransforms`. develop already has `[V1, V2, V3]`;
  **append V4 after V3. Ordering critical.**
- `shared/models/Dashboard/DashboardConfig/constants.ts` — bump
  `CURRENT_SCHEMA_VERSION` 3 → 4 (`#069`). develop is already at 3.
- `src/views/DashboardApp/DashboardEditorView/getDashboardPuckConfig.tsx`
  — register Filter P-block (`#068`), local-filters/opt-out fields (`#069`),
  NLQueryPField tabs (`#048`), design-token fields (`#064`). Port cumulatively.
  (Its siblings `getDashboardPuckConfig.module.css`, `dashboardPuckDrawerLabel.ts`,
  `dashboardToolbarButtonSize.ts` are NEW → see the copy-verbatim list.)
- `src/views/DashboardApp/DashboardEditorView/DashboardEditorView.tsx`
  (+`.test.tsx`) — chat composer unlock + pending-blocks sync (`#065`); publish
  modal trigger (`#071`); export button (`#075`); filter state manager wiring
  (`#068`/`#069`).
- `src/views/DashboardApp/DashboardEditorView/PublishDashboardButton.tsx` —
  replace `confirm()` with the modal (`#071`); apply slice on publish (`#074`).
- `src/views/DashboardApp/DashboardViewerView/DashboardViewerView.tsx` — add
  `mode: "public" | "preview"` (`#070`); render global filters at view time
  (`#068`); back the public `/d/$slug` route (`#072`).
- `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx`
  + `buildDataVizPBlockConfig.tsx` — apply global + local filters via the SQL
  wrapper (`#068`/`#069`); render 3-tab NLQueryPField (`#048`); consume pending
  chat blocks (`#065`). (Sibling `resolveDataVizPBlockProps.ts` is NEW → copy
  list, same nested dir.)
- `src/views/DashboardApp/AvaPage/pfields/NLQueryPField/NLQueryPField.tsx`
  + `buildNLQueryFieldConfig.tsx` — 3-tab Prompt/Manual/SQL UI (`#048`).
- `src/views/DashboardApp/AvaPage/pfields/VizConfigPField/*`,
  `ContainerMaxWidthPField/*` — minor field deltas riding along with the above.
- `src/views/DashboardApp/DashboardEditorView/SaveDashboardButton.tsx`,
  `ViewDashboardButton.tsx`, `DeleteDashboardButton.tsx`, `DashboardListView/*`
  — button/styling polish (`#066`/`#067`). (`SaveDashboardButton.module.css` is
  NEW → copy list.)
- `supabase/functions/chat/PostChatMessages/{parsing/parseDashboardBlock.ts,
  prompt/buildChatToolConfig.ts, prompt/buildSystemPrompts.ts}` — the
  `addDashboardBlock` tool server-side (`#065`). **Likely already present on
  develop** (G3 refactored it here out of the old `chat.routes.ts`, now
  `ChatRoutes.ts`). Verify it registers `addDashboardBlock`; only edit if a gap
  remains. There is NO server port of a monolithic `chat.routes.ts`.
- ~~`src/lib/offlineChat/buildOfflinePrompts.ts`~~ — **NOT a G4 target.** The
  whole `src/lib/offlineChat/` dir is feat-only and lands with **G5** (offline
  chat). Do not add it here; the offline `addDashboardBlock` prompt wiring rides
  with G5.
- `src/clients/datasets/DatasetQueryClient.ts` — add `getDatasetMeta` /
  `getColumnSummary` methods (`#076`). Confirm the develop client shape first.
- `src/components/ChatPanel/ChatEmptyState/getCachedDatasetColumnSummaries.ts`
  — may need the new client method (`#076`); verify.
- TanStack Router route tree (auto-generated `routeTree.gen.ts` / equivalent) —
  will regenerate to include the new `dashboards/preview/$dashboardId` and
  `d/$slug` routes (`#070`/`#072`). Run the route generator, don't hand-edit.

### Files to delete

None expected. All work is additive or surgical. (If the old `confirm()`-based
publish path lived in a helper that `#071` fully replaces, delete it then — but
the diff shows the replacement is in-place in `PublishDashboardButton.tsx`, so
likely nothing to delete.)

### Dependency changes

**As of the 2026-07-31 refresh, only three packages still need installing** —
the rest already landed on develop via G2/G3:

```sh
pnpm add qrcode            # #073 client-side QR PNG (^1.5.4)
pnpm add -D @types/qrcode  # #073 types (^1.5.6)
pnpm add jspdf             # #075 PDF generation (^4.2.1)
```

**Already on develop — do NOT re-add:**

| Dep | On develop | Landed via |
|---|---|---|
| `html-to-image` (^1.11.13) | ✅ | G-series (PDF capture `toCanvas`, NOT html2canvas) |
| `roughjs` (^4.6.6) | ✅ | G-series (`#075` annotator strokes) |
| `node-sql-parser` (^5.4.0) | ✅ | Group 2 `#044` (`#074` columnList extraction) |
| `react-querybuilder` (^8.16.1) | ✅ | Group 2 `#046` |
| `@react-querybuilder/mantine` (^8.16.1) | ✅ | Group 2 `#046` |

**Note on the plans' dependency lists:** `#075`'s per-feature plan says
`pnpm add html2canvas jspdf roughjs`. **`html2canvas` is wrong** — the real code
imports `toCanvas` from `html-to-image` (already installed). Only `jspdf` is
owed from that line.

### AvaPage data-migration files + version sequence (explicit)

Directory: `src/views/DashboardApp/AvaPage/migrations/`

```
AvaPageDataMigrationV1/   already on develop   (no-op for this group)
AvaPageDataMigrationV2/   already on develop   (V2.types.ts now identical — leave alone)
AvaPageDataMigrationV3/   already on develop    (landed with Group 2 #009)
AvaPageDataMigrationV4/   NEW — ships with Group 4 #069
AvaPageDataMigrator.ts        already on develop
config.ts                     already on develop (re-exports CURRENT_SCHEMA_VERSION)
getVersionFromAvaPageData.ts  already on develop
```

Version sequence (develop already advanced to V3 as of the 2026-07-31 refresh):

```
develop @ c703e5c2:  CURRENT_SCHEMA_VERSION = 3 ; versionTransforms = [V1, V2, V3]
after #069:          CURRENT_SCHEMA_VERSION = 4 ; versionTransforms = [V1, V2, V3, V4]
```

G4's only migration-chain change is appending V4 and bumping 3 → 4. Re-confirm
develop still shows V3 + `CURRENT_SCHEMA_VERSION = 3` at migration time; never
register V4 without V3 present, and never bump the constant without registering
the matching migration in the same change.

---

## Per-feature breakdown

Each subsection is concise; the original per-feature plan file has the row's
narrative (but trust THIS file's paths/deps over those).

1. **`#064` dashboard-design-tokens** → `064-dashboard-design-tokens.md`.
   `theme` (6 variants) + `typography` (3 variants) on AvaPage root props,
   polished header/card. Real impl: `AvaPage/utils/dashboardDesignTokens.ts`
   + `AvaPage.types.ts` edits + Puck config field. No CSS module named
   `themes.module.css` exists; tokens are computed in `dashboardDesignTokens.ts`.

2. **`#066` dashboard-export-buttons-polish** → `066-dashboard-export-buttons-polish.md`.
   CSS-only button/export styling (driver commits `9d4ac78`, `7abad7d`). Touches
   the Save/View/Publish/Export button components + their `.module.css`.

3. **`#067` dashboard-modal-styles** → `067-dashboard-modal-styles.md`. CSS-only
   modal chrome refresh (drivers `98dc225`, `5eed96a`). Same modal chrome
   Publish/Export render into.

4. **`#065` dashboard-chat-in-editor** → `065-dashboard-chat-in-editor.md`.
   Unlock composer on dashboards; the `addDashboardBlock` server tool is
   **already on develop** under `supabase/functions/chat/PostChatMessages/`
   (G3 refactored it out of the old `chat.routes.ts`, now `ChatRoutes.ts`) —
   verify, don't re-port. Client side:
   `DashboardEditorStateManager` + `DashboardChatPendingBlocksSync` queue/apply
   blocks; `buildPendingDataVizBlock`/`buildPendingDashboardBlock` build drafts.
   Skip the `src/lib/offlineChat/` path (feat-only, G5).
   **Dep: Group 3 chat panel + `#015` — both already `[x]`.**

5. **`#068` dashboard-global-filters** → `068-dashboard-global-filters.md`.
   `FilterPBlock` (single/multi/contains) + `DashboardFilterStateManager` +
   `applyDashboardFiltersToSql` (subselect wrap, never inline WHERE) +
   `GlobalFilterSubscriptionPField`.

6. **`#069` dashboard-per-viz-filters** → `069-dashboard-per-viz-filters.md`.
   Per-block All/Some/None opt-out + independent local filters; **ships V4**.
   `DataVizLocalFilters.tsx`, `dataVizFilters.ts`, `useLocalFilterState.ts`,
   `LocalFiltersPField`. **Dep: `#068` + Group 2 V3.** See TOP RISK.

7. **`#070` dashboard-view-before-publish** → `070-dashboard-view-before-publish.md`.
   Auth-gated `routes/_auth/$workspaceSlug/dashboards/preview/$dashboardId.tsx`;
   `DashboardViewerView` gains `mode` prop + preview banner.

8. **`#071` dashboard-publish-modal** → `071-dashboard-publish-modal.md`.
   `PublishDashboardModal.tsx` replaces `confirm()`. URL-first copy. **Dep: `#070`.**

9. **`#072` dashboard-vanity-url** → `072-dashboard-vanity-url.md`. `slug.ts`
   (the real `toVanitySlug`; `slug.test.ts` = the "8 tests"), live preview in
   the modal, public `routes/d/$slug.tsx` (slug-only, NOT `/d/<ws>/<slug>` —
   stale row). **Dep: `#071` + Phase-1 uniqueness constraint.**

10. **`#073` dashboard-share-url-row-qr** → `073-dashboard-share-url-row-qr.md`.
    `ShareUrlRow.tsx` + `buildShareUrls.ts`; 256×256 client-side QR via
    `qrcode`. **Dep: `#072` + `qrcode`.**

11. **`#074` dashboard-slice-aware-publish** → `074-dashboard-slice-aware-publish.md`.
    `PublishSliceSection.tsx` (data-scope: queried/all_columns/custom);
    `sliceBuilder.ts` uses `node-sql-parser` `columnList`; `unparseable`
    sentinel → publish-nothing fallback; persists in `dashboard.config`.
    **Dep: `#071` + Group 2 `#044` + `node-sql-parser`.**

12. **`#075` dashboard-pdf-export-annotate** → `075-dashboard-pdf-export-annotate.md`.
    `ExportPdfButton.tsx` (gated `HIDE_EXPORT_AS_PDF = true`), `ExportPdfModal`,
    `PdfAnnotator` (RoughJS freehand/arrow/text), `pdfExport.ts`
    (`html-to-image` `toCanvas` 2× → `jspdf` portrait letter, paginated).
    **Dep: `#071` + `html-to-image`/`jspdf`/`roughjs`. Ship gate ON.**

13. **`#076` summary-view-redesign** → `076-summary-view-redesign.md`.
    `DatasetSummaryView` doc-style outline + per-column sections
    (`ColumnSummaryBody`, `columnVisuals/{Number,Text,Date}ColumnSummary`),
    lazy `useIntersection`, missing-rate `RingProgress`. New
    `getDatasetMeta`/`getColumnSummary` on `DatasetQueryClient`. **Dep: Group 1.**
    Real path is under `DatasetMetaView/DatasetSummaryView/` (not the plan's
    flat path); there is no separate `StickyTOC.tsx`/`ColumnSummarySection.tsx`.

14. **`#048` sql-form-sync-dashboards** → `048-sql-form-sync-dashboards.md`.
    `useDashboardManualQueryState.ts` (per-block analogue of `useSqlFormSync`)
    + 3-tab `NLQueryPField`. **Dep: Group 2 `#044`/`#045`/`#047`.**

---

## Verification

### Automated

Run after each row's commit on the branch; a full green pass (type-check +
vitest + eslint + relevant e2e) is required before opening the single group PR.
Each must pass cleanly; note any pre-existing develop warnings.

```sh
# Type-check the whole project (catches cross-feature import drift).
pnpm tsc -b --noEmit          # or: pnpm type-check

# Lint.
pnpm lint                     # eslint (neostandard / eslint9 config)

# Migration chain — the hard gate for #069 / version ordering.
# V3 already on develop; V4 is what G4 adds. Run both to prove the full chain upgrades.
pnpm vitest run \
  src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV3/AvaPageDataMigrationV3.test.ts \
  src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV4/AvaPageDataMigrationV4.test.ts

# Vanity-slug unit tests (#072 — the "8 tests").
pnpm vitest run \
  src/views/DashboardApp/DashboardEditorView/PublishDashboardModal/slug.test.ts

# Filter SQL wrapping (#068) + per-viz filters (#069).
pnpm vitest run \
  src/views/DashboardApp/DashboardFilterStateManager/applyDashboardFiltersToSql.test.ts \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters.test.ts

# Chat pending blocks (#065).
pnpm vitest run \
  src/views/DashboardApp/DashboardEditorView/DashboardChatPendingBlocksSync.test.tsx \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/buildPendingDataVizBlock.test.ts \
  src/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock.test.ts

# Slice publish (#074) — if sliceBuilder has tests; otherwise covered by tsc.
pnpm vitest run src/clients/dashboards   # adjust to actual test paths

# Editor / viewer / pfield component tests touched by the group.
pnpm vitest run \
  src/views/DashboardApp/DashboardEditorView/DashboardEditorView.test.tsx \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock.test.tsx \
  src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.test.tsx
```

If any feature has a Playwright spec (publish flow / dashboard render), run it;
otherwise flag the e2e checks to the operator as manual (below). Spec paths were
not confirmed in this pass — grep `e2e`/`tests/` for `dashboard`/`publish`
before claiming an e2e command.

### Manual (browser — flag to operator; agent cannot fully drive prod state)

1. **Design tokens (`#064`):** open a dashboard editor; switch theme across all
   6 themes × 3 typography variants; confirm header accent strip + uppercase
   byline + polished DataViz card render.
2. **Chat-in-editor (`#065`):** on a dashboard, confirm the chat composer is
   enabled; ask the model to add a chart; confirm a pending DataViz block
   appears and lands on approval. (Needs live LLM — operator.)
3. **Global filters (`#068`):** add a Filter block (single/multi/contains);
   confirm every DataViz updates via SQL subselect, original SQL unchanged.
4. **Per-viz filters (`#069`):** set a viz to All/Some/None opt-out; add a local
   filter to one viz; confirm independence from global filters. **Load an OLD
   (V2/V3-era) saved dashboard and confirm it upgrades to V4 cleanly.**
5. **Preview (`#070`):** hit `/<ws>/dashboards/preview/<id>` as an editor;
   confirm "Back to editor" banner; confirm a public viewer is blocked.
6. **Publish modal (`#071`):** click Publish; confirm the Mantine modal (not
   `confirm()`) with URL-first copy and a preview link.
7. **Vanity URL (`#072`):** type a slug; confirm live URL preview + kebab-case
   sanitization; publish; open `/d/<slug>` in a fresh/incognito session.
8. **QR (`#073`):** confirm `ShareUrlRow` shows canonical + vanity URLs with
   copy buttons; download the 256×256 QR PNG; scan it → resolves to the vanity
   URL. (Client-side, no network.)
9. **Slice publish (`#074`):** set data scope to queried/all_columns/custom;
   publish; confirm the published view exposes only the chosen columns; feed an
   unparseable SQL and confirm safe "publish nothing" fallback.
10. **PDF export (`#075`):** confirm the export button is **hidden** by default
    (`HIDE_EXPORT_AS_PDF = true`). Then, with the flag temporarily flipped
    locally, export a PDF and exercise the annotator (freehand/arrow/text,
    roughness/stroke/fill sliders, undo, clear); confirm annotations composite
    into the paginated portrait-letter PDF. (Operator decides whether to ship
    the flag off.)
11. **Summary view (`#076`):** open a dataset summary; confirm sticky-TOC
    doc-style layout, plain-language headlines, type-appropriate viz, missing-
    rate ring only when nonzero, lazy section fetch on scroll.
12. **SQL↔form sync (`#048`):** on a DataViz block, switch Prompt/Manual/SQL
    tabs; confirm round-trip parity and that tab state is per-block.

---

## How to mark this group completed

This group ships as a **single PR** off `refactor-g4/dashboards`. The operator
opens exactly one PR for the group against `develop`. On merge:

1. Verify the refactor branch merged into `develop`
   (`git merge-base --is-ancestor refactor-g4/dashboards origin/develop`).
2. Flip ALL constituent rows (`#048`, `#064`–`#076`) in
   `docs/deslop/ALL_FEATURES.md` from `[ ]` to `[x] (<merge-sha>)` (the same
   merge SHA for all).
3. Log the group completion in `docs/deslop/STATE.md` — move the rows from
   `In-flight migrations` to the `Completed migrations log` with date + merge
   SHA; append to the Update log.
4. Delete all of the group's per-feature plan files:
   `rm docs/deslop/{048,064,065,066,067,068,069,070,071,072,073,074,075,076}-*.md`.
5. Delete this group plan: `rm docs/deslop/GROUP-4-dashboards.md`.
6. Delete the refactor branch `refactor-g4/dashboards` locally and on origin.
7. Confirm the AvaPage version sequence on develop ends at
   `CURRENT_SCHEMA_VERSION = 4` with `versionTransforms = [V1, V2, V3, V4]` and
   that `HIDE_EXPORT_AS_PDF` is still `true` unless the operator decided
   otherwise.
