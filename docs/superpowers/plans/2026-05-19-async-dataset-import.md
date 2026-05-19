# Async Dataset Import — Implementation Plan & Status

> **Status as of 2026-05-19:** All seven phases below are **implemented** on
> `feat/ict4d-demo` via PRs #234 / #235 / #236 (merge commit `94c63d7`).
> This document captures the design and the verification path so the work
> is recoverable from the repo if the original PR notes are ever lost.

## Goal

CSV / XLSX imports used to OOM the browser tab on any file bigger than ~1
GB. They blocked the import form for ~tens of seconds even on the
medium-sized COVID sample, because the *only* path was a synchronous
materialize-as-TABLE-then-export-parquet pipeline that doubled peak
memory and held the UI hostage.

This work splits dataset import into two phases:

- **Phase A — Sniff (fast, blocking).** A `read_csv(LIMIT N)` /
  off-main-thread SheetJS sniff that returns the column schema and a
  200-row preview in a few hundred ms regardless of file size. This
  unblocks the import form so the user can immediately confirm column
  types, edit names, etc.
- **Phase B — Transcode (slow, background).** A streaming `read_csv` /
  `read_xlsx` → parquet COPY that runs in the background while the
  user keeps using the app. Peak memory is bounded by *one row group*,
  not by the input file size, so multi-GB imports complete on
  memory-constrained devices.

## Architecture

```text
file selected
   │
   ▼
LocalDatasetClient.startCsvImport / startXlsxImport       (Phase A — sync)
   │   sniffCsv (DuckDB read_csv LIMIT 200) / xlsxSniff worker
   │   insert LocalDataset row with parseStatus = "parsing"
   │   resolve to caller with { columns, previewRows, csvSniff }
   ▼
ImportJobsManager.startJob(...)                            (background)
   │
   ▼
_runPhaseB
   │   DuckDbClient.loadCsv / loadXlsx
   │     ─ COPY (SELECT * FROM read_csv(...))  TO parquet
   │     ─ copyFileToBuffer → JS Blob
   │     ─ dropFile staging
   │     ─ loadParquet (registers VIEW on the new parquet)
   │   reconcile DatasetColumn.detectedDataType vs Supabase
   │   update LocalDataset row: parseStatus = "ready", store parquetData
   │   ImportJobsManager.markSucceeded → notifySuccess toast
```

## Phase 1 — `loadCsv` / `loadXlsx` rewrite (PR #235, commit `01154d0`)

**Goal:** Stream `read_csv` / `read_xlsx` directly into a parquet file
in DuckDB's MEMFS so no in-memory TABLE is ever materialized.

- [x] `DuckDbClient.loadCsv` — `COPY (SELECT * FROM read_csv(...,
      store_rejects=true)) TO 'memfs.parquet' (FORMAT PARQUET,
      COMPRESSION ZSTD)`. Rejects are populated by `read_csv`
      internally; parquet bytes are pulled out via `copyFileToBuffer`
      into a JS `Blob` and re-registered via `loadParquet`. Staging
      files are dropped from MEMFS.
- [x] `DuckDbClient.loadXlsx` — same streaming COPY but reading
      `read_xlsx(file, sheet, header)`.
- [x] Downstream queries (preview / summary / exploration) hit a parquet
      VIEW, so projection and LIMIT pushdown apply.
- [x] `DuckDbLoadCsvResult` / `DuckDbLoadXlsxResult` carry the parquet
      `Blob` on the return value (`parquetData`).
- [x] `LocalDatasetClient.storeLocalCSV` / `storeLocalExcel` no longer
      call `exportTableAsParquet` a second time — they store the Blob
      handed back by the loader.

**Verification:**

- `scripts/benchmark-large-file-parsing.mjs` against a 420 MB COVID
  dataset (`scripts/generate-large-test-files.mjs`):
  - **Streaming COPY peak RSS: 154 MB** (single-threaded native CLI).
  - **Pre-optimization baseline peak RSS: 697 MB.** ~4.5× reduction.
  - Output parquet: ~2.9 MB (140× compression on this dataset).

## Phase 2 — Sniff + 200-row preview (PR #234 + part of #236)

**Goal:** Return enough information to render the import form
without waiting on the full transcode.

- [x] `DuckDbClient.sniffCsv(file, parseOptions, maxPreviewRows=200)` —
      registers the file via `BROWSER_FILEREADER` (no full read),
      runs `DESCRIBE SELECT * FROM read_csv(file, ...)` for the schema,
      then `SELECT * FROM read_csv(file, ...) LIMIT 200` for the
      preview. Both queries respect `LIMIT` pushdown on the CSV reader
      so they complete in hundreds of ms regardless of file size.
- [x] `xlsxSniff.worker.ts` — SheetJS-backed sniff off the main thread.
      DuckDB's `read_xlsx` doesn't support partial reads, so we keep
      SheetJS for Phase A and switch to DuckDB only in Phase B.
- [x] `LocalDatasetClient.startCsvImport` / `startXlsxImport` are the
      single entry points the import UI calls; they return the sniff
      result and fire-and-forget Phase B.

## Phase 3 — Lifecycle + Dexie schema (part of PR #236)

**Goal:** Persist enough state on the LocalDataset row that the import
can resume across page refreshes, and the UI can show "still parsing"
indicators.

- [x] Dexie v5 migration: added `parseStatus`, `parseStartedAt`,
      `parseFailedReason`, `sourceBytes`, `sourceFileName`,
      `sourceFileType`, `sourceFileSize`, `lastSourceAccessedAt`,
      `parseOptions`. `parquetData` became optional.
- [x] Existing rows backfilled to `parseStatus = "ready"`.
- [x] `_runPhaseB` updates the row through `parsing → ready / failed`.

## Phase 4 — `ImportJobsManager` (in-memory job registry, part of PR #236)

**Goal:** Drive UI indicators and let cross-cutting code wait on
Phase B completions without polling IndexedDB.

- [x] Module-scoped store at `src/clients/datasets/ImportJobsManager.ts`
      with `startJob` / `markSucceeded` / `markFailed` / `clearJob`,
      plus `waitForCompletion` (promise) and `hasActiveJob` for the
      `beforeunload` guard.
- [x] `useImportJob(datasetId)` / `useImportJobsState()` hooks expose
      the store to React via `useSyncExternalStore`.
- [x] `estimateRemainingFromJob` provides a fuzzy
      "approximately X minutes remaining" string for the tooltip.

## Phase 5 — UI surfaces (part of PR #236)

- [x] `DatasetParseStatusIndicator` — spinner + ETA tooltip while
      `running`, warning icon + reason tooltip on `failed`, hidden when
      `ready`. Wired into `DatasetNavbar` next to the dataset name.
- [x] `notifySuccess({ title: "Dataset ready", message: ... })` toast on
      Phase B success.
- [x] `notifyError({ title: "Dataset failed to process", ... })` on
      Phase B failure.
- [x] `useBeforeUnloadGuard` warns when the user closes the tab while
      a Phase B job is in flight.

## Phase 6 — Resume after refresh (part of PR #236)

- [x] When `_maybeCacheSourceBytes` decides the source is small enough
      to cache, the source `Blob` is stored on the LocalDataset row.
- [x] `LocalDatasetClient.resumeImport` reconstructs a `File` from the
      cached `Blob` and re-runs `_runPhaseB`, restoring the in-flight
      job in the registry.
- [x] LRU eviction on `lastSourceAccessedAt` keeps the cache from
      growing without bound.

## Phase 7 — Column reconciliation (part of PR #236)

**Goal:** Phase A's preview schema is an approximation (XLSX preview
goes through SheetJS, which can't infer DuckDB types). Phase B fixes
the schema once we have the real parquet.

- [x] `_reconcileColumns` compares Phase A's `DatasetColumn` rows
      against Phase B's actual column schema, updates Supabase, and
      counts changes.
- [x] On reconciliation, a `notifyWarning` toast surfaces the count of
      columns whose detected type changed between the preview and the
      final parquet.

## Open follow-ups (not blockers for the demo)

- [ ] **Pre-bundle the DuckDB-WASM `parquet` extension** so the import
      pipeline works in offline / network-restricted environments.
      Today the WASM build fetches `parquet.duckdb_extension.wasm` from
      `extensions.duckdb.org` on first `LOAD parquet` — that fetch
      stalls the entire DuckDB init when the host is blocked. The
      `DisableDuckDbSpatial` feature flag introduced alongside this
      plan also skips the `LOAD excel;` fetch as a stopgap, but
      `parquet` itself cannot be skipped because the COPY-to-parquet
      path requires it.
- [ ] **Resume cap.** `sourceBytes` cache currently has only LRU
      eviction; should also have an aggregate cap so a few huge
      imports don't push out everything else.
- [ ] **Real progress signal.** ETA is wall-clock-elapsed-based, not
      bytes-emitted-based. A `read_csv` progress callback would let
      us show real percentage.
- [ ] **Failure UX.** "Resume" today triggers automatically when a
      stalled row is detected; users have no explicit "retry this
      import" affordance if they want to retry without refreshing.

## Verification checklist

- `scripts/generate-large-test-files.mjs` — regenerates the 420 MB
  COVID CSV + XLSX (gitignored under `tests/data/large/`).
- `scripts/benchmark-large-file-parsing.mjs` — runs the streaming COPY
  and the pre-optimization baseline against the native `duckdb` CLI
  (single-threaded, to approximate the WASM heap profile). Writes
  `tests/data/large/benchmark-report.{json,md}`.
- E2E coverage: `tests/e2e/csv-import.spec.ts` already exercises the
  Phase A → Phase B happy path on a 14,700-row CSV. Extending it to
  the 420 MB fixture is intentionally left as a manual step (CI
  shouldn't generate 420 MB of test data on every run).
