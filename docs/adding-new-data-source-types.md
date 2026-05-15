# Adding a new dataset source type

This document describes how `datasets.source_type` (Postgres enum
`public.datasets__source_type`) flows through the stack, what to add for a new
value, and where to update UI and clients. Use it as a human checklist and as
an implementation guide for agents.

**Naming:** new enum values are `snake_case` (e.g. `parquet_file`). Each source
type usually has a matching table `public.datasets__<snake_case>`, an RPC
`public.rpc_datasets__add_<snake_case>_dataset`, and a shared model folder under
`shared/models/datasets/`.

---

## 1. Discovery commands (run before and after changes)

Re-scan the repo for switch points. Paths move over time; these patterns find
most call sites:

```bash
rg 'datasets__source_type|DatasetSource\.(SourceTypes|canBeOfflineOnly|getSourceType|isManuallyUploadable)|sourceType' --glob '*.ts' --glob '*.tsx'
rg 'match\(|matchLiteral\(' src shared --glob '*Dataset*'
rg 'rpc_datasets__add_' supabase/schemas
```

---

## 2. Database (Supabase / Postgres)

Follow the declarative schema workflow in repo rules (`supabase/schemas`,
migrations, `pnpm db:apply-migrations`).

For each new source type, you typically add:

1. **Enum value** — extend `public.datasets__source_type` in
   `supabase/schemas/10.datasets.sql` (and a migration). The `datasets` row
   stores this in `source_type`.

2. **Per-type table** — e.g. `public.datasets__csv_file`,
   `public.datasets__xlsx_file`, with `dataset_id` FK to `public.datasets`, RLS
   aligned with other `datasets__*` tables. See existing files:
   `supabase/schemas/20.datasets__csv_file.sql`,
   `20.datasets__google_sheets.sql`, `20.datasets__virtual.sql`,
   `20.datasets__open_data.sql`, `20.datasets__xlsx_file.sql`.

3. **RPC to create workspace datasets** — e.g.
   `rpc_datasets__add_csv_file_dataset` in
   `supabase/schemas/70.rpc_datasets__add_csv_file_dataset.sql` (pattern:
   insert `datasets` with the new `source_type`, insert the typed row, return the
   dataset). Mirror naming for your type.

4. **Regenerate TS types** — `pnpm db:gen-types` so
   `shared/types/database.types.ts` includes the new enum and tables.

---

## 3. Shared models (`shared/models/datasets/`)

1. **CRUD model** for the new table — types, parsers, namespace export (see
   existing `CsvFileDataset`, `XlsxFileDataset`, `GoogleSheetsDataset`,
   `OpenDataDataset`, `VirtualDataset`). Dataset models live under
   `shared/models/datasets/<ModelName>/`.

2. **`DatasetSource.types.ts`** — extend:
   - `DatasetSourceRegistry` with the new model type.
   - **Optional narrowed types** (only if the new type fits the semantics):
     - `ImportableDatasetSourceType` — today excludes `virtual` and
       `open_data` (types that are not “imported” like file/connector imports).
     - `ManuallyUploadableDatasetSourceType` / `CanBeOfflineOnlyDatasetSourceType`
       — today only `csv_file` and `xlsx_file` (file upload + offline behavior).

3. **`DatasetSourceModule.ts`** — update:
   - `SourceTypes` registry keys (all enum values).
   - `getSourceType()` mapping from model tag → enum string.
   - `canBeOfflineOnly` / `isManuallyUploadable` only if your type participates
     in offline/file workflows (extend the `ts-pattern` `match` branches).

4. **`Dataset/DatasetParsers.ts`** — `source_type` Zod enum must list every
   `DatasetSource.SourceTypes` value.

---

## 4. Clients (`src/clients/datasets/` and related)

1. **`src/clients/datasets/source-datasets/<Type>DatasetClient.ts`** — CRUD
   client for the per-type table (follow `CsvFileDatasetClient`,
   `XlsxFileDatasetClient`, etc.).

2. **`SourceDatasetClient.ts`** — add the new client to
   `SourceDatasetClientRegistry` keyed by `DatasetSource.SourceType`.

3. **`DatasetClient.ts`** — extend:
   - `getSourceDataset`: `matchLiteral` / branches for `sourceType`.
   - **Mutations:** add `insert<YourType>Dataset` calling the matching
     `rpc_datasets__add_*` and register it in `mutationFns`.

4. **QETL / query execution** — `src/clients/qetl/QETLClient.ts`:
   - `match`/`matchLiteral` on `sourceType` for building **Dice extractors**
     and loading data paths. Any new type that participates in workspace SQL must
     be wired here (follow `csv_file`, `xlsx_file`, `google_sheets`,
     `open_data`, `virtual`).

5. **Dashboard publishing** — `src/clients/dashboards/DashboardClient.ts`:
   - `virtual` and `open_data` have special publish paths; other types fall
     through to downloading Parquet from workspace storage. Add a branch if the
     new type needs custom public-bucket materialization.

6. **Parquet upload / cloud sync** —
   `src/clients/storage/DatasetParquetStorageClient/startDatasetUpload.ts` uses
   `SourceDatasetClient` generically; ensure the per-type row supports
   `isInCloudStorage` (or equivalent) if users sync uploads.

7. **Local / IndexedDB** — `src/clients/datasets/LocalDatasetClient.ts`:
   - If the type stores raw bytes in the browser (CSV/XLSX pattern), add
     load helpers (see `storeLocalCSV`, `storeLocalExcel`) and any new DuckDB
     loaders in `DuckDbClient` if the file format is new.

---

## 5. Feature-oriented checklist

Use this when reviewing a PR that introduces a source type. Files listed are
the main touch points today; re-run the ripgrep commands in §1 to catch strays.

### Import / upload UX

| File / area                                                               | Why                                                                          |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/views/DataManagerApp/DataImportView/DataImportView.tsx`              | Tabs: add a tab or extend **Upload** / **Connectors** / **Open data** flows. |
| `.../ManualUploadView/ManualUploadView.tsx`                               | MIME → `sourceType` mapping for file uploads.                                |
| `.../ManualUploadView/useLoadManualUploadFile/useLoadManualUploadFile.ts` | Parse + local storage path per `parseOptions.type`.                          |
| `.../DatasetImportForm/DatasetImportForm.tsx`                             | Props unions for `sourceType` + `parseOptions`.                              |
| `.../DatasetImportForm/useSaveDataset/useSaveDataset.ts`                  | `ts-pattern` branches calling `DatasetClient.insert*`.                       |
| `.../DatasetImportForm/DatasetParseControls.tsx`                          | Controls per source type.                                                    |
| `.../DatasetImportForm/useImportedColumns/useImportedColumns.ts`          | Column preview by metadata shape.                                            |
| `.../GoogleSheetsImportView/GoogleSheetsImportView.tsx`                   | Reference for **connector**-style import (non-file).                         |
| `.../OpenDataCatalogView/*`                                               | Reference for **catalog**-style import (`open_data`).                        |

### Resync (pull fresh data from upstream)

| File / area                                                          | Why                                                                                                                                |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/views/DataManagerApp/ResyncDatasetsBlock/ResyncDatasetCard.tsx` | `match` on `sourceType`: only types with a defined resync path (today CSV/XLSX file replay). Throw or no-op for unsupported types. |

### Offline storage & “offline only” (manually uploadable sources)

| File / area                                                                                | Why                                                                   |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `shared/models/datasets/DatasetSource/DatasetSourceModule.ts`                              | `canBeOfflineOnly` / `isManuallyUploadable` membership.               |
| `src/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.tsx`          | Offline-only toggle visibility.                                       |
| `src/views/DataManagerApp/DatasetMetaView/ToggleOfflineOnlyButton.tsx`                     | Uses `DatasetSource` helpers.                                         |
| `src/views/DataManagerApp/DatasetMetaView/DatasetMetaView.tsx`                             | Conditions for local / upload-related UI.                             |
| `src/components/common/layouts/RootLayout/useRootWorkspaceChecks/useSyncLocalDatasets.tsx` | `source_type in (...)` for datasets that **must** exist in IndexedDB. |
| `src/clients/datasets/LocalDatasetClient.ts`                                               | Persist Parquet + DuckDB load for local-first types.                  |

### Parquet → Supabase Storage (sync online)

| File / area                                                             | Why                                                                               |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/clients/storage/DatasetParquetStorageClient/startDatasetUpload.ts` | End-to-end upload; relies on `SourceDatasetClient.update` for `isInCloudStorage`. |
| Per-type `datasets__*` columns                                          | e.g. `is_in_cloud_storage` where applicable.                                      |

### Querying (workspace Data Explorer, QETL)

| File / area                                                       | Why                                                                              |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/clients/qetl/QETLClient.ts`                                  | **Required** for extractor + dataset hydration behavior.                         |
| `src/clients/qetl/WorkspaceQETLClient.ts`                         | Mostly generic; ensure factory still receives correct dataset IDs from SQL.      |
| `src/views/DataExplorerApp/useDataQuery.tsx`                      | Dataset queries go through QETL; usually no per-type branch if QETL is complete. |
| `src/views/DataExplorerApp/OpenDatasetModal/OpenDatasetModal.tsx` | Example: filters `virtual` for some flows — adjust if new type should appear.    |

### Data Explorer: labels & grouping

| File / area                                           | Why                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/views/DataExplorerApp/QueryDataSourceSelect.tsx` | `match` on `sourceType` for **group titles** in the data source picker. |

### Dataset metadata & navigation

| File / area                                                        | Why                                                                                      |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `src/views/DataManagerApp/DatasetMetaView/DatasetMetadataList.tsx` | `matchLiteral` for human-readable `sourceType` labels; extend `source` union type.       |
| `src/views/DataManagerApp/DatasetNavbar.tsx`                       | Uses `DatasetSource.SourceTypes` to order links — stays correct if registry is complete. |
| `src/components/common/SourceBadge.tsx`                            | Icon + tooltip per `sourceType`.                                                         |

### Dashboards (public / published)

| File / area                                 | Why                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/clients/dashboards/DashboardClient.ts` | `publishDashboard`: special cases for `virtual` and `open_data`; default path uses `DatasetParquetStorageClient.downloadDataset`. |

### GIS / maps (reuses Explorer controls)

| File / area                                                               | Why                                                                                                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/components/GISApp/DataMap/QueryFormContainer/QueryFormContainer.tsx` | Uses `QueryDataSourceSelect`; grouping changes apply automatically once §Data Explorer is updated. |

### Entity Manager (dataset-backed fields)

| File / area                                                  | Why                                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `src/components/EntityManagerApp/SingleEntityView/index.tsx` | `SourceBadge` for provenance — badge list must support new type. |

### Tests & fixtures

| File / area                                             | Why                                                                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `tests/e2e/*import*.spec.ts`                            | Add or extend flows for new import path.                                                              |
| `src/views/DataManagerApp/DataImportView/**/**.test.ts` | Unit tests for hooks/forms (`useSaveDataset`, `useImportedColumns`, `useLoadManualUploadFile`, etc.). |
| `tests/e2e/helpers/*`                                   | Helpers that create/delete datasets may assume `sourceType`.                                          |

---

## 6. Optional / situational

- **Virtual / SQL-derived datasets** — separate RPC and `VirtualDataset` model;
  often created from Explorer, not Import tabs.
- **Open Data catalog** — separate catalog tables and `insertOpenDataDataset`;
  new catalog-backed types may mirror this pattern.
- **Seed data** — `seed/SeedConfig.ts` and SQL seeds if demo workspaces need
  the new type.
- **Documentation** — update this file and any user-facing copy in Import
  views.

---

## 7. Verification

1. `pnpm db:gen-types` — no drift between SQL and `database.types.ts`.
2. Typecheck — exhaustive `match` / `matchLiteral` on `DatasetSource.SourceType`
   should compile (TypeScript catches missing enum cases where used).
3. **Smoke paths** — import once, open in Data Explorer, resync (if applicable),
   toggle offline-only (if applicable), publish a dashboard that references the
   dataset (if applicable).
