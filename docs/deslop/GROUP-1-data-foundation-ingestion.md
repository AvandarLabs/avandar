# Group 1 — Data foundation & ingestion

- **Group**: 1 of 5
- **Name**: Data foundation & ingestion
- **Refactor branch**: `refactor-g1/data-foundation-ingestion`
- **Base**: `origin/develop` @ `6ec98d45`
- **Source branch**: `feat/ict4d-demo`
- **Migration strategy:** one PR per group — the whole group lands as a single PR off `refactor-g1/data-foundation-ingestion`; the per-row order below is the in-branch build sequence.
- **Constituent rows** (in migration order):
  - `#077` `analytics-client-events`
  - `#094` `chat-models-catalog-regeneration`
  - `#001` `async-dataset-import-pipeline` (absorbs retired rows #4/#5/#6/#7 + PTRCK-004)
  - `#002` `app-wide-dropzone`
  - `#003` `dataset-drawer`
- **Depends on**: nothing remaining. The three prerequisites are already merged into
  `develop` at the base SHA: `#078 lingui-scaffold` (PR #242, `2881b0bb`),
  `#083 billing-ptrck-series` (PR #237, `a40d64a3`), `#061 web-offline-mode`
  (PR #252, `6ec98d45`). See Notes for one **partially-satisfied** caveat on #061.
- **Estimated size** (net, `git diff --stat origin/develop..feat/ict4d-demo` per surface):
  - #077: 2 files, +68 / −0
  - #094: 7 files, +1679 / −8
  - #001 (feature surface): 51 files, +3505 / −1104
  - #001 (DuckDbClient fold-in): 12 files, +1819 / −322
  - #002: 8 files, +541 / −16
  - #003: 8 files, +1122 / −254
  - **Group total ≈ 88 files, +8734 / −1704 (net ≈ +7.0k LoC).** This is large,
    but it ships as a **single PR** off `refactor-g1/...`. The numbered order below
    is the in-branch build sequence (the order to port the rows as commits on the
    branch), NOT a list of separate PRs. (Fallback the operator declined for now:
    if the single PR proves intractable to review, the natural seam is the
    `#077`/`#094` infra prerequisites vs. the `#001`/`#002`/`#003` feature surface.)

---

## Notes for future you

> Per the deslop template rule, surprises and judgment calls live at the TOP.

### Multi-feature hotspot files (merge-risk — same file touched by >1 row in this group)

The only true overlap inside the group is the **`ManualUploadView/` folder**, edited by
both `#001` and `#002`:

- `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView.tsx`
- `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView.test.tsx`
- `src/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile.ts`
- `src/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile.test.ts`
- `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadDropzone.tsx` (**deleted by #001**)

  Resolution: `#001` lands the rewritten `ManualUploadView.tsx` (new Phase A API,
  absorbs the deleted `ManualUploadDropzone.tsx` responsibilities) FIRST. `#002` then
  adds only its incremental `initialFile?` / `onAfterSave?` props on top. If they are
  ever ported out of order the `ManualUploadView.tsx` rewrite must win as the base and
  #002's two props are re-applied as a small diff.

Two further cross-row couplings that are NOT file overlaps but are real sequencing
constraints:

- `#002` and `#003` both consume the `startCsvImport` / `startXlsxImport` entry points
  and `DataImportTabs` introduced by `#001`. They must be built (committed) AFTER #001
  on the branch.
- `#077`'s `analyticsClient.write(...)` call sites: only the call sites that already
  exist on develop's current code get wired in #077's own commit. The `dataset.imported`
  call site lives in #001's surface (`useSaveDataset.ts`) — wire it opportunistically
  during the #001 port (it costs one line), rather than leaving a follow-up.
  `#001`'s `useSaveDataset.ts` already imports `@/lib/analytics/analyticsClient`, so
  #077 must precede #001 (it does in this order).

### Drift found vs current develop (`6ec98d45`)

- **#078 lingui — SATISFIED.** `@lingui/*` v6.2.0 deps and `i18n:*` scripts are present
  in develop's `package.json`. Ported TSX may keep `@lingui/react/macro` imports verbatim.
- **#083 billing — SATISFIED.** `shared/models/Subscription/SubscriptionModule/SubscriptionModule.ts`
  exists on develop and exports `doesSubscriptionGrantEntitlements` /
  `resolveFeaturePlanTypeForWorkspace`. `#001`'s `useCanAddDataset.ts` import of
  `$/models/Subscription/SubscriptionModule/SubscriptionModule` resolves. (Note the
  `$/models` alias maps to `shared/models`, NOT `packages/shared/models/src`.)
- **#061 web-offline — PARTIALLY SATISFIED. ⚠️ OPERATOR DECISION NEEDED.**
  The #061 port (PR #252) **restructured the offline modules into directories** and did
  NOT carry over the flat-path hooks that #001's ported files import. Concretely, #001's
  ported TSX import these five symbols:
  - `@/components/offline/OfflineGated` — on develop only the **nested** form exists
    (`src/components/offline/OfflineGated/OfflineGated.tsx`, no barrel `index.ts`). The
    bare `@/components/offline/OfflineGated` import will **fail to resolve** against the
    directory; develop's own code uses `@/components/offline/OfflineGated/OfflineGated`.
  - `@/components/offline/OfflineUnavailableTooltipLabel` — **EXISTS** on develop (flat
    `.tsx`). OK.
  - `@/lib/offline/useIsOnline` — **MISSING at that path.** develop relocated it to
    `src/lib/hooks/browser/useIsOnline/useIsOnline.ts`.
  - `@/lib/offline/useOfflineGate` — **ABSENT on develop entirely.**
  - `@/lib/offline/useLocalDatasetIds` — **ABSENT on develop entirely.**

  This is the single biggest landmine in the group and the reason the 2026-06-10 #001
  attempt produced ~40 type errors. **#001's undrift must pick one of two resolutions**
  (flag to operator before porting):
  1. **Rewrite the imports** in the ported #001 files to develop's actual paths
     (`@/components/offline/OfflineGated/OfflineGated`,
     `@/lib/hooks/browser/useIsOnline/useIsOnline`) and **fold the two genuinely-missing
     hooks** (`useOfflineGate.ts`, `useLocalDatasetIds.ts`) into #001's "Files to copy
     verbatim" from `feat/ict4d-demo:src/lib/offline/`. This keeps #061 as-merged and
     treats the missing hooks as #001's own surface (defensible: `useLocalDatasetIds` is
     dataset-scoped).
  2. **Treat it as a #061 regression** and ask the operator whether a small follow-up
     to #061 should land the flat re-export + the two hooks on develop first. Cleaner
     boundary, but adds a pre-step outside this group.

  **Recommendation: option (1)** — fold `useOfflineGate.ts` + `useLocalDatasetIds.ts`
  and rewrite the `OfflineGated` / `useIsOnline` import paths inside #001. It keeps the
  group self-contained and avoids reopening a merged row. Confirm with operator at #001
  undrift time.

- **#077 analytics — NOT on develop.** `src/lib/analytics/` does not exist on develop;
  #077 creates it. Phase 1 added the `usage_analytics_events` table (this row authors the
  TS client). Confirm during undrift.
- **#094 chat-models — NOT on develop.** `shared/types/chat.types.ts` is absent on
  develop (develop has the other `shared/types/*` files but not `chat.types.ts`). The
  `Model/ModelModule/` reorg target path in the #094 plan
  (`packages/shared/models/src/Model/ModelModule/`) is **correct** — verified: on feat the
  reorg is `git mv` of `packages/shared/models/src/Model/ModelModule.ts` →
  `.../Model/ModelModule/ModelModule.ts` (R100) plus the test rename (R062). Note
  `shared/` and `packages/shared/models/src/` are **two distinct trees** in this repo;
  `chat.types.ts`/`zodHelpers.ts` live under `shared/`, the Model reorg lives under
  `packages/shared/models/src/`. Don't conflate them.

### The DuckDbClient expansion #001 folds in

`#001`'s `LocalDatasetClient.ts` calls `duckdb.sniffCsv(...)` and reads `parquetData` off
`DuckDbLoadCsvResult` / `DuckDbLoadXlsxResult` — none of which exist on develop's
`src/clients/DuckDbClient/`. The diff there is **12 files, +1819 / −322**, including a new
`csvParse/` subdir (`csvParseOptions.ts`, `csvQuoteProbe.ts`), `duckDbManualBundles`, and
`shouldLoadDuckDbNetworkExtensions`. This is part of #001's surface and must be added to
#001's port (it was missing from the original #001 plan; the plan's Notes already flag it).
Add `src/clients/DuckDbClient/**` to #001's files-to-port.

### Intra-group sequencing rationale

- `#077` + `#094` are the **type/infra prerequisites** for `#001`: #001's
  `useSaveDataset.ts` imports the analytics client (#077), and #001's `DatasetClient.ts`
  imports new types from `shared/types/chat.types` (#094). Both must precede #001.
- `#077` before `#094` is arbitrary (independent); #077 is tiny (+68) so it goes first.
- `#001` is the heavy core. `#002` and `#003` both build on #001's new entry points and
  must follow it. #002 before #003 because #003's Import tab reuses the same
  `ManualUploadView` choreography #002 finalizes (no hard dep, but lower-risk ordering).

### Operator decisions to surface

1. The **#061 offline-import drift** above (recommend option 1: fold the two missing
   hooks + rewrite two import paths inside #001).
2. **Dexie schema bump v4→v5** in #001 runs on every existing user's first load. Verify
   the upgrader backfills `parseStatus = "ready"` and doesn't drop data — operator should
   test against a populated `LocalDataset` table.
3. **DuckDB `parquet` extension fetch** (Phase B) hits `extensions.duckdb.org` on first
   import in network-restricted envs. Known limitation, NOT a regression — do not "fix" in
   this group.
4. #003 ships an `OpenDatasetModal` inside a folder named `OpenDatasetDrawer/` (the row
   name says "drawer"). Intentional — preserve feat's on-disk state; reviewers will ask.

---

## Migration order within this group

1. `#077` `analytics-client-events` — client + types, wire develop-existing call sites.
2. `#094` `chat-models-catalog-regeneration` — chat.types, zodHelpers, ModelModule reorg,
   generated catalog + regen script.
3. `#001` `async-dataset-import-pipeline` — the streaming pipeline + DuckDbClient
   expansion + Dexie v5 bump; folds #4/#5/#6/#7 + PTRCK-004; resolves the #061 offline
   import drift.
4. `#002` `app-wide-dropzone` — global `<AppDropzone>`, builds on #001 entry points.
5. `#003` `dataset-drawer` — `OpenDatasetModal` embedding `DataImportTabs` from #001.

---

## Consolidated changes (deduped across the 5 rows)

### Files to copy verbatim (new files, path-scoped checkout from `feat/ict4d-demo`)

**#077:**
```
src/lib/analytics/analyticsClient.ts
src/lib/analytics/analyticsEventTypes.ts
```

**#094:**
```
supabase/functions/chat/chat-models-catalog.gen.json
scripts/regenerateChatModels.ts
packages/shared/models/src/Model/ModelModule/**   (via git mv — preserve history)
```

**#001:**
```
src/workers/xlsxSniff.worker.ts
src/clients/datasets/xlsxSniff.ts
src/clients/datasets/ImportJobsManager.ts
src/clients/datasets/useBeforeUnloadGuard.ts
src/views/DataManagerApp/DataImportView/DataImportTabs.tsx
src/views/DataManagerApp/DataImportView/DataImportView.module.css
src/views/DataManagerApp/DataImportView/DatasetParseStatusIndicator.tsx
src/views/DataManagerApp/DataImportView/useCanAddDataset.ts
src/clients/DuckDbClient/**   (new files in this tree: csvParse/, duckDbManualBundles, shouldLoadDuckDbNetworkExtensions, etc.)
# Drift fold-in (see Notes #061):
src/lib/offline/useOfflineGate.ts
src/lib/offline/useLocalDatasetIds.ts
```

**#002:**
```
src/components/AppDropzone/AppDropzone.tsx
src/components/AppDropzone/AppDropzone.module.css
src/components/AppDropzone/AppDropzone.test.tsx
src/components/AppDropzone/onAppDropzoneDrop.ts
src/components/AppDropzone/openFileImportFlow.tsx
src/components/AppDropzone/openFileImportFlow.test.tsx
src/components/AppDropzone/ImportConfirmBody.tsx
```

**#003:**
```
src/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal.tsx
src/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal.module.css
src/views/DataExplorerApp/OpenDatasetDrawer/SavedDatasetsView.tsx
src/views/DataExplorerApp/OpenDatasetDrawer/ImportDatasetView.tsx
src/views/DataExplorerApp/OpenDatasetDrawer/datasetPreviewSQL.ts
packages/web/ui/src/Drawer/Drawer.tsx
packages/web/ui/src/Drawer/Drawer.module.css
```

### Files to surgically edit on `develop`

| File | Row(s) | Change |
|---|---|---|
| 7 existing analytics call sites (search feat for `analyticsClient.write(`) | #077 | Add `analyticsClient.write(...)`; only wire sites already present on develop. `dataset.imported` site (`useSaveDataset.ts`) wired during #001 port. |
| `shared/types/chat.types.ts` | #094 | Add new model-spec types (file is new on develop — +253). |
| `shared/lib/zodHelpers.ts` | #094 | Add helpers used by the regen script. |
| `packages/shared/models/src/Model/Model.ts` | #094 | Modified for ModelModule reorg. |
| Any develop import of old `Model/ModelModule.ts` | #094 | Repoint to `Model/ModelModule/ModelModule`. |
| `src/clients/datasets/LocalDatasetClient.ts` | #001 | Rewritten — `startCsvImport`/`startXlsxImport`/`resumeImport`, source-byte LRU cache, column reconciliation. Prefer feat version verbatim. |
| `src/clients/datasets/DatasetQueryClient.ts` | #001 | Refactored; adds `sniffCsv`. Prefer feat version verbatim. |
| `src/clients/datasets/DatasetClient.ts` | #001 | Signature alignment to new result types (imports `shared/types/chat.types` from #094). |
| `src/clients/datasets/DatasetColumnClient.ts` | #001 | Minor import/export adjustments. |
| `src/clients/DuckDbClient/**` (existing files) | #001 | Streaming parquet + CSV sniff (+1819/−322 across 12 files). |
| `src/views/DataManagerApp/DataImportView/DataImportView.tsx` | #001 | Phase A → Phase B orchestration. |
| `src/views/DataManagerApp/DataImportView/DatasetImportForm/*` | #001 | Consume `DuckDbLoadCsvResult`/`DuckDbLoadXlsxResult` carrying parquet Blob; `DatasetParseControls.tsx`, `useImportedColumns/*`. |
| `src/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView.tsx` | #001 | `storeLocalExcel` → `startXlsxImport`. |
| `src/views/DataManagerApp/DataImportView/OpenDataCatalogView/*` | #001 | New entry points. |
| `src/views/DataManagerApp/DataImportView/DatasetLimitReachedModal/DatasetLimitReachedModal.tsx` | #001 | Modified. |
| `src/views/DataManagerApp/DataImportView/useSaveDataset/useSaveDataset.ts` | #001 (+#077) | New pipeline; wire `dataset.imported` analytics here. |
| `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView.tsx` | **#001 + #002** | #001 rewrites (absorbs deleted dropzone); #002 adds `initialFile?` + `onAfterSave?` props. Land #001 first. |
| `src/views/DataManagerApp/DataImportView/ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile.ts` | **#001 + #002** | New Phase A API. |
| `src/views/DataManagerApp/ResyncDatasetsBlock/ResyncDatasetsBlock.tsx` + `ResyncDatasetCard.tsx` | #001 | Rewritten against new pipeline. |
| `src/views/DataManagerApp/DatasetNavbar.tsx` | #001 | Mounts `DatasetParseStatusIndicator`. |
| `src/views/DataManagerApp/DatasetMetaView/EditDatasetView.tsx` | #001 | Cosmetic. |
| `src/views/DataManagerApp/DataImportView/DatasetParseStatusIndicator.tsx` location | #001 | Actual feat path is `DataImportView/DatasetParseStatusIndicator.tsx` (already in copy list). |
| `src/models/LocalDataset/LocalDataset.types.ts` + Dexie schema file | #001 | **v4→v5 bump**: add `parseStatus`/`parseStartedAt`/`parseFailedReason`/`sourceBytes`/`sourceFileName`/`sourceFileType`/`sourceFileSize`/`lastSourceAccessedAt`/`parseOptions`; add `parseStatus` index; upgrader backfills `parseStatus="ready"`. |
| `src/models/LocalDataset/LocalDatasetParsers.ts` | #001 | Modified (+27). |
| #001 ported files importing offline hooks | #001 | Rewrite `@/components/offline/OfflineGated` → `.../OfflineGated/OfflineGated`; `@/lib/offline/useIsOnline` → `@/lib/hooks/browser/useIsOnline/useIsOnline` (see Notes #061). |
| Test fixtures: `DatasetImportForm.test.tsx`, `GoogleSheetsImportView.test.tsx`, `ManualUploadView.test.tsx`, `useLoadManualUploadFile.test.ts` | #001 | Add `parquetData` to load-result mocks. |
| `src/components/layouts/RootLayout/WorkspaceLayout.tsx` | #002 | Wrap `<AppShell>` with `<AppDropzone>` inside existing `<ChatPanelProvider>` (+77/−16). |
| `src/views/DataExplorerApp/DataExplorerApp.tsx` | #003 | Swap inline `modals.open(...)` for `<OpenDatasetModal>` + `useDisclosure`; wire "Open" button; preserve per-virtual-dataset Save menu guard. |

### Files to delete

```
src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadView/ManualUploadDropzone.tsx   # #001 — absorbed into ManualUploadView.tsx
```
(Actual path: `src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadDropzone.tsx`.)

Plus, for **#094**, delete any retired flat `Model/ModelModule.ts` superseded by the
`Model/ModelModule/` reorg — but use `git mv` so the move shows as a rename rather than
delete+add. Verify against the diff before deleting.

### Dependency changes

**None across the entire group.** All five rows reuse already-installed packages:
`@duckdb/duckdb-wasm`, `xlsx` (SheetJS), `@mantine/dropzone` (`^9.2.0`),
`@mantine/core`/`@mantine/hooks`, `@tabler/icons-react`, `@lingui/*` (`^6.2.0`, from #078),
`zod`. `papaparse` is explicitly NOT added (DuckDB `read_csv` replaces it). Verify the
regen script's deps (`zod`, `node:fs`) are present before running it.

---

## Per-feature breakdown

### 1. `#077` analytics-client-events  → `docs/deslop/077-analytics-client-events.md`
- **Copy:** `src/lib/analytics/analyticsClient.ts`, `analyticsEventTypes.ts`.
- **Edit:** wire `analyticsClient.write(...)` at the call sites that already exist on
  develop (search feat for `analyticsClient.write(`). Defer feature-surface call sites to
  their owning rows; wire `dataset.imported` during #001.
- **Delete / deps:** none.
- Size ~+68 LoC. `analyticsEventTypes` is a typed allowlist — never accept arbitrary
  strings. Detailed source of truth: the 077 plan.

### 2. `#094` chat-models-catalog-regeneration  → `docs/deslop/094-chat-models-catalog-regeneration.md`
- **Copy:** `supabase/functions/chat/chat-models-catalog.gen.json`,
  `scripts/regenerateChatModels.ts`, all new files under
  `packages/shared/models/src/Model/ModelModule/` (via `git mv`).
- **Edit:** `shared/types/chat.types.ts` (+253 new types), `shared/lib/zodHelpers.ts`,
  `packages/shared/models/src/Model/Model.ts`, any develop import of the old
  `Model/ModelModule.ts`.
- **Delete:** retired flat `Model/` files replaced by the reorg (prefer `git mv`).
- **Deps:** none. Do NOT bring the `Subscription*` portions of driver commits
  `09e1a97e` / `32ea53b6` — those rode along with the already-merged #083.
- The catalog JSON is generated; never hand-edit — re-run the script. Detailed source of
  truth: the 094 plan.

### 3. `#001` async-dataset-import-pipeline  → `docs/deslop/001-async-dataset-import-pipeline.md`
- **Copy:** 8 new feature files (workers/sniff/import-jobs/tabs/status-indicator/can-add)
  + new files under `src/clients/DuckDbClient/**` + the two folded offline hooks
  (`useOfflineGate.ts`, `useLocalDatasetIds.ts`).
- **Edit:** ~31 files — `LocalDatasetClient.ts` / `DatasetQueryClient.ts` rewrites,
  DuckDbClient streaming, the DataImportView surface, Resync block, navbar status,
  Dexie **v4→v5** bump in `LocalDataset.types.ts`, parquet mock fixtures, and the
  offline-import-path rewrites (Notes #061).
- **Delete:** `src/views/.../ManualUploadView/ManualUploadDropzone.tsx`.
- **Deps:** none. Absorbs retired rows #4/#5/#6/#7 + PTRCK-004.
- Largest + riskiest row (Dexie migration, DuckDbClient expansion, offline drift).
  Detailed source of truth: the 001 plan (its Notes already capture the DuckDbClient and
  offline blockers).

### 4. `#002` app-wide-dropzone  → `docs/deslop/002-app-wide-dropzone.md`
- **Copy:** 7 `src/components/AppDropzone/*` files.
- **Edit:** `WorkspaceLayout.tsx` (mount `<AppDropzone>` inside `<ChatPanelProvider>`,
  wrapping `<AppShell>`); `ManualUploadView.tsx` (+ `initialFile?` / `onAfterSave?`,
  preserve existing `onSaveSuccess` from #003).
- **Delete / deps:** none.
- Must land after #001 (uses `startCsvImport`/`startXlsxImport`). Watch z-index of
  `Dropzone.FullScreen` vs other drag surfaces, and `queueMicrotask` modal choreography.
  Detailed source of truth: the 002 plan.

### 5. `#003` dataset-drawer  → `docs/deslop/003-dataset-drawer.md`
- **Copy:** 5 `OpenDatasetDrawer/*` files + `packages/web/ui/src/Drawer/Drawer.{tsx,module.css}`.
- **Edit:** `DataExplorerApp.tsx` (swap inline `modals.open` for `<OpenDatasetModal>` +
  `useDisclosure`; preserve per-virtual-dataset Save menu guard).
- **Delete / deps:** none.
- Must land after #001 (Import tab embeds `DataImportTabs`). Ships an `OpenDatasetModal`
  inside an `OpenDatasetDrawer/` folder — intentional, preserve feat state. Detailed
  source of truth: the 003 plan.

---

## Verification

### Automated

Run after each row's commit on the branch; a full green pass (type-check +
vitest + eslint + relevant e2e) is required before opening the single group PR.

```sh
# Whole-group baseline (run after each row lands on the refactor branch)
pnpm type-check          # alias for: pnpm tsc -b --noEmit
pnpm lint

# #077
pnpm exec eslint src/lib/analytics
pnpm exec vitest run src/lib/analytics

# #094
pnpm exec eslint shared/types/chat.types.ts shared/lib/zodHelpers.ts packages/shared/models/src/Model
pnpm exec vitest run shared packages/shared
pnpm tsx scripts/regenerateChatModels.ts --dry-run    # deterministic; diff vs committed JSON must be empty

# #001
pnpm exec eslint src/clients/datasets src/clients/DuckDbClient src/views/DataManagerApp/DataImportView src/models/LocalDataset
pnpm exec vitest run \
  src/clients/datasets \
  src/clients/DuckDbClient \
  src/views/DataManagerApp/DataImportView \
  src/views/DataManagerApp/ResyncDatasetsBlock

# #002
pnpm exec eslint src/components/AppDropzone src/components/layouts/RootLayout/WorkspaceLayout.tsx
pnpm exec vitest run src/components/AppDropzone

# #003
pnpm exec eslint src/views/DataExplorerApp/OpenDatasetDrawer packages/web/ui/src/Drawer src/views/DataExplorerApp/DataExplorerApp.tsx
pnpm exec vitest run \
  src/views/DataExplorerApp/OpenDatasetDrawer \
  packages/web/ui/src/Drawer
```

No e2e/Playwright spec is owned by this group (the drop flow is covered by Vitest
DOM tests in `AppDropzone.test.tsx` / `openFileImportFlow.test.tsx`; #094 has no e2e).

### Manual (browser / live-LLM checklist — operator drives)

1. `pnpm dev` + local Supabase stack.
2. **#077:** trigger one wired event (e.g. import a dataset) and confirm a row lands in
   `usage_analytics_events`.
3. **#094 (live-LLM):** open the chat panel → model picker; confirm the list matches
   `chat-models-catalog.gen.json`. Re-run `pnpm tsx scripts/regenerateChatModels.ts` and
   confirm an empty diff (deterministic).
4. **#001:** open the importer; drop a ~5 MB CSV → Phase A columns+preview within ~1 s and
   form interactive; submit → Phase B in background, `DatasetParseStatusIndicator` in
   navbar, dataset queryable after. Drop a ~50 MB XLSX → sniff worker boots without
   freezing the main thread. Mid-Phase B refresh → import resumes automatically. Resync an
   existing dataset → goes through the new pipeline. Google Sheets import → lands via
   `startXlsxImport`. (Note: first parquet-extension fetch may stall in network-restricted
   envs — known, not a regression.)
5. **#001 Dexie bump:** load with a populated `LocalDataset` table from before the bump;
   confirm existing rows survive and get `parseStatus="ready"`.
6. **#002:** drag a CSV anywhere → full-screen overlay (green icon) → drop → confirm
   dialog → `ManualUploadView` opens pre-loaded → submit lands via async pipeline. Drag a
   PDF → reject (red X). Repeat with XLSX.
7. **#003:** open Data Explorer → "Open" button → tabbed modal (Saved + Import). Saved tab
   filters/opens saved + virtual datasets (rehydrate path for virtual). Import tab renders
   `DataImportTabs`; importing a CSV completes and closes via `onAfterSave`. Save-over
   menu item appears only for virtual datasets and is disabled with no `rawSQL`.

Items requiring production-only state (live LLM model catalog, live Supabase storage for
analytics rows) — flag to operator; do not claim if not runnable locally.

---

## How to mark this group completed

The group ships as a **single PR** off `refactor-g1/data-foundation-ingestion`. The
operator opens exactly one PR for the group against `develop`. On merge:

1. Verify the refactor branch merged into `develop`
   (`git merge-base --is-ancestor refactor-g1/data-foundation-ingestion origin/develop`).
2. Flip ALL five constituent rows (`#077`, `#094`, `#001`, `#002`, `#003`) to
   `[x] (<merge-sha>)` in `docs/deslop/ALL_FEATURES.md` (the same merge SHA for all).
3. Log the group completion in `docs/deslop/STATE.md`: move the rows from `In-flight
   migrations` to the `Completed migrations log` with date + merge SHA.
4. Delete all of the group's per-feature plan files:
   `rm docs/deslop/077-analytics-client-events.md docs/deslop/094-chat-models-catalog-regeneration.md docs/deslop/001-async-dataset-import-pipeline.md docs/deslop/002-app-wide-dropzone.md docs/deslop/003-dataset-drawer.md`
5. Delete this group plan:
   `rm docs/deslop/GROUP-1-data-foundation-ingestion.md`
6. Delete the refactor branch `refactor-g1/data-foundation-ingestion` locally + remote.
7. Commit + push the bookkeeping to `feat/ict4d-demo`.
