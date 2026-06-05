# 001 — Async dataset import pipeline

- **Slug**: `async-dataset-import-pipeline`
- **Source branch**: `feat/ict4d-demo`
- **Target branch**: `develop`
- **Refactor branch**: `refactor-001/async-dataset-import-pipeline`
- **Depends on**: `none` (foundational; rows #2 and #3 depend on **this** one)
- **Estimated PR size**: ~13 canonical files changed, +1.2k / −0.3k lines (excluding test-fixture churn already counted in the dependent rows)

## What this feature is

Replaces the synchronous CSV/XLSX → DuckDB TABLE → parquet export path with a two-phase streaming pipeline:

- **Phase A (fast)** sniffs the file (CSV/XLSX metadata + 200-row preview) in hundreds of ms. XLSX sniff runs off the main thread via a Web Worker (`xlsxSniff.worker.ts` using SheetJS); CSV sniff runs in-process via DuckDB. Phase A returns `{ columns, previewRows, datasetId }` so the import form can render immediately and the user can confirm column types while Phase B runs in the background.
- **Phase B (background)** streams the source through DuckDB (`COPY (SELECT * FROM read_csv(...)) TO parquet` / `read_xlsx`), peak memory bounded to one row group. Parquet output replaces the old temporary-TABLE export — on the 420 MB COVID dataset this reduces peak memory by ~4.5×.

The pipeline supports **resume after refresh**: source bytes below 200 MB are cached in Dexie (1 GB cumulative LRU cap). Closing the tab mid-import resumes automatically on next workspace load. `ImportJobsManager` tracks in-flight Phase B jobs and exposes a status indicator in the `DatasetNavbar`.

This row also bundles all downstream adaptations that landed alongside the pipeline (per the operator rule "migrate refactored code, not legacy"): XLSX column-inference improvements, `GoogleSheetsImportView` adapted to the new entry points, `ResyncDatasetCard` rewritten against the new pipeline, dataset-name/CSV-name display + tooltips + import validation, and subsequent parser/status-tracking fixes. The original retired rows #4/#5/#6/#7 are folded into this one.

Sources: CHECKPOINT 1 (PRs #234/#235/#236) at `docs/ict4d-demo/CHECKPOINTS.md`; spec at `docs/superpowers/plans/2026-05-19-async-dataset-import.md`.

## Steps to migrate

**Step 0** — `/deslop undrift async-dataset-import-pipeline` (the skill runs this before the steps below).

1. From the current `develop` HEAD, create the refactor branch:
   ```sh
   git fetch origin develop
   git checkout -b refactor-001/async-dataset-import-pipeline origin/develop
   ```
2. Bring code over from `feat/ict4d-demo`. Prefer path-scoped checkout for the new files (clean), manual port for the modified files (most have surgical edits over existing logic).
3. Resolve any conflicts in `LocalDatasetClient.ts` and `DatasetQueryClient.ts` (these are the largest rewrites). Prefer the `feat/ict4d-demo` version verbatim — `develop`'s versions are the pre-streaming originals.
4. Confirm the **Dexie schema bump (v4 → v5)** lands as part of `LocalDataset.types.ts` / `LocalDatasetClient.ts`. Verify the upgrader backfills `parseStatus = "ready"` for existing rows and that existing parquet-backed datasets stay queryable after the bump.
5. Phase 1 introduced no new Supabase tables for this feature, so no new `*Client` files are needed. (LocalDataset is Dexie-backed; the bump above is application-level.)
6. Run the verification commands in `Verification` below.

### Files to copy verbatim

These do not exist on `develop` and can be checked out path-scoped from `feat/ict4d-demo`.

```
src/workers/xlsxSniff.worker.ts
src/clients/datasets/xlsxSniff.ts
src/clients/datasets/ImportJobsManager.ts
src/clients/datasets/useBeforeUnloadGuard.ts
src/views/DataManagerApp/DataImportView/DataImportTabs.tsx
src/views/DataManagerApp/DataImportView/DataImportView.module.css
src/views/DataManagerApp/DataImportView/DatasetParseStatusIndicator.tsx
src/views/DataManagerApp/DataImportView/useCanAddDataset.ts
```

### Files to surgically edit on `develop`

For each, port the `feat/ict4d-demo` version. The list below describes the **kind** of change so a reviewer can sanity-check.

- `src/clients/datasets/LocalDatasetClient.ts`
  - **Rewritten**. Replaces synchronous `storeLocalCSV` / `storeLocalExcel` with `startCsvImport(file, workspace, userId)`, `startXlsxImport(file, workspace, userId)`, and `resumeImport(datasetId)`. Phase A returns `{ columns, previewRows }`; Phase B kicks off via `_runPhaseB`. Adds source-bytes caching (200 MB/file, 1 GB cumulative LRU) and column reconciliation against Supabase Dataset rows.
- `src/clients/datasets/DatasetQueryClient.ts`
  - **Refactored** for streaming preview queries and projection/LIMIT pushdown on CSV sniff queries. Adds a `sniffCsv` method.
- `src/clients/datasets/DatasetClient.ts`
  - Minor signature updates to align with the new result types.
- `src/clients/datasets/DatasetColumnClient.ts`
  - Minor import/export adjustments.
- `src/views/DataManagerApp/DataImportView/DataImportView.tsx`
  - Rewired to orchestrate Phase A → Phase B against the new entry points.
- `src/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.tsx` (and its sibling form files in the same folder)
  - Updated to consume `DuckDbLoadCsvResult` / `DuckDbLoadXlsxResult` which now carry the parquet `Blob` directly.
- `src/views/DataManagerApp/DataImportView/GoogleSheetsImportView/GoogleSheetsImportView.tsx`
  - Switched from the deleted `storeLocalExcel` to `startXlsxImport`.
- `src/views/DataManagerApp/DataImportView/ManualUploadView/*.tsx` (incl. `useLoadManualUploadFile.ts`)
  - Use the new Phase A API. `ManualUploadView.tsx` absorbs the responsibilities of the deleted `ManualUploadDropzone.tsx`.
- `src/views/DataManagerApp/ResyncDatasetsBlock/ResyncDatasetCard.tsx`
  - Rewritten to call `startCsvImport` / `startXlsxImport` instead of the deleted sync methods.
- `src/views/DataManagerApp/DatasetNavbar.tsx`
  - Mounts `DatasetParseStatusIndicator` for in-flight imports.
- `src/views/DataManagerApp/DatasetMetaView/EditDatasetView.tsx`
  - Cosmetic updates for the new import flow.
- `src/models/LocalDataset/LocalDataset.types.ts` (and the Dexie schema definition file that declares the v5 indexes)
  - Add new columns: `parseStatus` (enum: `ready` / `parsing` / `failed`), `parseStartedAt`, `parseFailedReason`, `sourceBytes` (Blob, optional), `sourceFileName`, `sourceFileType` (`csv` | `xlsx`), `sourceFileSize`, `lastSourceAccessedAt`, `parseOptions` (discriminated union for CSV/XLSX resume options). Add a `parseStatus` Dexie index for bootstrap lookup of in-flight imports.
- Test fixtures: `DatasetImportForm.test.tsx`, `GoogleSheetsImportView.test.tsx`, `ManualUploadView.test.tsx`, `useLoadManualUploadFile.test.ts`
  - Add `parquetData` to load-result mocks.

### Files to delete

```
src/views/DataManagerApp/DataImportView/ManualUploadView/ManualUploadDropzone.tsx
```

(Its responsibilities are absorbed into the rewritten `ManualUploadView.tsx`.)

### Dependency changes

No new runtime dependencies. The pipeline uses already-installed libs:

- DuckDB (`@duckdb/duckdb-wasm`) — already present.
- SheetJS (`xlsx`) — already present.
- Browser-native APIs (Web Worker, IndexedDB via Dexie).

`papaparse` is **not** added; DuckDB's `read_csv` replaces it for Phase B.

## Verification

### Automated

```sh
pnpm tsc -b --noEmit
pnpm lint
pnpm vitest run \
  src/clients/datasets \
  src/views/DataManagerApp/DataImportView \
  src/views/DataManagerApp/ResyncDatasetsBlock
```

All must pass green. No expected pre-existing warnings in this surface.

### Manual

Drive a browser. The operator should verify:

1. Start the dev server (`pnpm dev`).
2. From the workspace landing page, open the dataset importer (the `Data` page or `+ Import` action).
3. Drop or pick a small CSV (~5 MB). Confirm Phase A renders columns + preview within ~1 s, and the import form is immediately interactive.
4. Submit the form. Confirm Phase B runs in the background — the navbar shows `DatasetParseStatusIndicator` and the dataset is queryable once it disappears.
5. Drop a larger XLSX (~50 MB). Confirm the **XLSX sniff worker** boots and Phase A returns columns within a few seconds without freezing the main thread.
6. Mid-Phase B on a large file, refresh the tab. Confirm the import **resumes automatically** (status indicator reappears) and finishes.
7. From the Resync card on an existing dataset, trigger a resync. Confirm it goes through the new pipeline and not the old sync path.
8. Open the Google Sheets import view, paste a public sheet URL, and confirm it lands via the new `startXlsxImport` entry point.

If the dev environment doesn't have DuckDB's `parquet` extension pre-cached, Phase B will block on first import until `extensions.duckdb.org` responds. This is a known limitation noted in the spec — not a regression.

## Risks + things to look out for

- **Dexie schema bump (v4 → v5).** The upgrader runs on every existing user's first load after this ships. Test with a populated `LocalDataset` table that the upgrader doesn't drop data. Existing rows must end up with `parseStatus = "ready"` and the new optional fields left undefined.
- **DuckDB parquet extension fetch (offline blocker).** Phase B requires the `parquet` extension which on first load fetches from `extensions.duckdb.org`. In network-restricted environments this stalls the entire import. The spec notes this as a post-Phase 1 follow-up; do **not** try to fix it as part of this migration.
- **Source-bytes LRU eviction.** Files > 200 MB skip the cache and require re-upload on resume. The 1 GB cumulative cap evicts least-recently-used entries; verify no surprise eviction during a single import.
- **Column reconciliation race.** `_reconcileColumns` is a no-op if the Supabase Dataset row hasn't been created yet (form not submitted). The new-row path picks up the Phase B schema directly.
- **Web Worker lifecycle.** The XLSX sniff worker is spawned per import and terminates after returning results. If the user closes the import form mid-sniff, the worker is GC'd; no explicit cleanup needed. Watch for leaks in test runs.
- **No OPFS.** Source caching and parquet blobs live entirely in IndexedDB. Don't introduce OPFS in this migration — it's an explicit non-goal in the spec.

## How to mark this feature completed

When the operator runs `/deslop complete async-dataset-import-pipeline`:

1. Verify the merge:
   ```sh
   git fetch origin develop
   git merge-base --is-ancestor origin/refactor-001/async-dataset-import-pipeline origin/develop \
     && echo merged \
     || echo NOT-merged
   ```
   If `NOT-merged`, stop and tell the operator. Do nothing else.
2. If merged:
   - `MERGE_SHA=$(git rev-parse --short origin/develop)`
   - `git branch -D refactor-001/async-dataset-import-pipeline 2>/dev/null || true`
   - `git push origin --delete refactor-001/async-dataset-import-pipeline`
   - `rm docs/deslop/001-async-dataset-import-pipeline.md`
   - `docs/deslop/ALL_FEATURES.md`: flip row #1 from `[~]` (or `[ ]`) to `[x] ($MERGE_SHA)`.
   - `docs/deslop/STATE.md`: remove the entry from `In-flight migrations`; append to `Completed migrations log` with today's date and `$MERGE_SHA`.
   - Commit `chore(deslop): mark async-dataset-import-pipeline as completed ($MERGE_SHA)` and push to `feat/ict4d-demo`.

## Notes for future you

- This row absorbs four retired ALL_FEATURES rows (#4 `dataset-upload-fixes`, #5 `xlsx-column-inference`, #6 `google-sheets-import-resilience`, #7 `resync-dataset-card`). If you find a commit on `feat/ict4d-demo` that looks like it belongs to one of those folded rows, it lives **here**, not as a separate migration.
- The merge order for CHECKPOINT 1 was #234 → #235 → #236 → drop-in PRs. The diff is byte-clean as a single PR off `develop`, so the merge ordering doesn't have to be preserved in this migration.
- Rows #2 (`app-wide-dropzone`) and #3 (`dataset-drawer`) both depend on the new `startCsvImport` / `startXlsxImport` entry points. They must land **after** this row merges into `develop`.
- The full feature inventory line for this row also references PTRCK-004 (commit `6098c3ef`) — dataset-name / CSV-name display + tooltips + import validation. That commit's diff folds in here.
