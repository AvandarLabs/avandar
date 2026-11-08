# ODC Parquet cache: spec

**Status:** in progress on `feat/odc-parquet-cache` (branched from
`demo/measles`).

## Problem

An API-backed Open Data Catalog (ODC) listing is read whole, every time,
through the `open-data` edge function's resource route
(`supabase/functions/open-data/OpenDataRoutes.ts`). That route refuses any
source over 25 MB (`MAX_RESOURCE_BYTES`), so a large listing such as NYC's
DOB Violations (2.48M rows) can never be added to a workspace. A listing
under the limit is downloaded from its source again every time a workspace
loads it.

The 25 MB figure was never measured. The edge function holds the source's
bytes in memory, plus a copy it writes to its cache, plus the response it
relays. 25 MB was picked to stay far below the isolate's memory ceiling.
The workspace query path (`GlobalAppConfig.qetl.maxBytesPerAcquire`) uses
150 MB for the same reason. Neither number is a product decision.

The private `open-data-catalog` bucket cache that exists today does not
help. It saves the source's raw bytes (a CSV stays a CSV), only after a
successful relay, so it has the same 25 MB ceiling.

## Goal

Every API-backed listing a workspace uses gets a Parquet copy in the public
`opendata` bucket. Workspaces read that copy straight from Storage, the way
they already read a pipeline listing's Parquet. ODC listings get no size
limit of their own.

**Limit parity with manual uploads.** A manually uploaded file has no
application-level size cap. It is converted to Parquet in the browser and
uploaded to Storage through a resumable (TUS) upload, so the only hard limit
is Storage's upload file size limit (50 MB in `supabase/config.toml`
locally; production's is set in the Supabase dashboard). An ODC Parquet copy
goes through the same Storage limit and nothing stricter.

## Design

### 1. Who builds the copy: the pipeline server

The pipeline server (`apps/pipeline-server`, Bun on Fly) already turns CSVs
into ZSTD Parquet with Node DuckDB (`transformedCsvsToParquetBlobs`) and
uploads them to `opendata` for pipeline listings. It has a disk and no
isolate memory ceiling, so it can stream a source of any size:

1. Read the listing with the service role.
2. Stream the source to a temp file on disk. A CKAN resource is found and
   host-checked exactly as `acquireOpenDataResource` does. A Socrata dataset
   is read from its CSV export with no row limit.
3. `COPY (SELECT * FROM read_csv(...)) TO '<file>.parquet' (FORMAT PARQUET,
   COMPRESSION ZSTD)`. DuckDB streams this, so memory stays flat. A source
   that is already Parquet is uploaded unchanged.
4. Upload the file to
   `opendata/catalog-cache/<listingId>/<sourceVersionHash>.parquet`.
   Naming the object after the source version means a reader holding an
   older URL never sees a half-replaced file.
5. Write the cache columns (below) in one RPC call. Write the Parquet's real
   column types back as verified column types: a full-file read is more
   authoritative than the browser's 10,000-row sample.
6. Delete the temp files, and the listing's previous Parquet object.

A failure records `failed` with a failure code. A failure that says the
dataset itself cannot be loaded marks the listing invalid through
`failureToInvalidDatasetReason`, the same mapping the sample route uses.

**Entry point:** `POST /open-data-cache/:catalogListingId/build` on the
pipeline server, authorized with `AVA_PIPELINE_SERVER_SECRET` like the
existing run route. It answers `202` straight away and builds in the
background. One machine builds one listing at a time: a second request for
a listing already `building` is a no-op.

### 2. When a copy is built: on first use, refreshed when stale

A new edge route, `POST /data-catalog-listings/:id/parquet-cache`, read as
the caller so RLS decides whether they can see the listing:

| Listing state | Response | Side effect |
|---|---|---|
| Copy is `ready` and its source version matches the live freshness token | `200 { status: "ready", url }` | none |
| Copy is `ready` but stale | `200 { status: "ready", url, isStale: true }` | asks the pipeline server for a rebuild |
| No copy, or the last build `failed` with a retryable code | `202 { status: "building" }` | marks `building`, asks the pipeline server to build |
| `building`, started within the last 30 minutes | `202 { status: "building" }` | none |
| `building`, started over 30 minutes ago | `202 { status: "building" }` | treats the build as lost and asks again |

A stale copy is still served while the rebuild runs: an old copy now is
better than a correct one in ten minutes. The freshness check is the
existing `readOpenDataFreshnessToken`.

**Callers:** "Add to workspace" and every later load of an added listing.
Browsing the catalog never starts a build. The preview keeps reading the
start-of-file sample, so opening a listing never pulls a multi-gigabyte
source.

### 3. Who reads the copy

- `DatasetParquetWrapper` (`src/clients/qetl/wrappers/DatasetParquetWrapper`):
  for an `api_resource` listing, it calls the `parquet-cache` route. `ready`
  fetches the public URL, the same code path a pipeline listing uses.
  `building` polls the route until it is `ready`, with a progress label.
- "Add to workspace" shows that the dataset is being prepared while the
  first build runs, rather than failing.
- The data preview can later read a ready copy's first row group with HTTP
  range requests instead of the sample. That is not part of the first cut.

### 4. Schema

New columns on `data_catalog_listings`, replacing the raw-bytes cache
columns (`cached_object_path`, `cached_source_version`, `cached_at`):

| Column | Meaning |
|---|---|
| `parquet_cache_status` | enum: `building`, `ready`, `failed`. Null when no build was ever requested. |
| `parquet_cache_object_path` | Object path in `opendata`. Set exactly when a copy exists. |
| `parquet_cache_source_version` | The freshness token the copy was built from. |
| `parquet_cache_built_at` | When the current copy was written. |
| `parquet_cache_build_started_at` | When the running or last build started. Drives the 30-minute lost-build rule. |
| `parquet_cache_failure_code` | The last build's failure code, when it failed. |
| `parquet_cache_row_count`, `parquet_cache_byte_size` | What was written, for the catalog and for monitoring. |

A check constraint keeps them consistent, as `data_catalog_listings__cache_complete`
does today. Only the service role writes them, through
`rpc_data_catalog_listings__write_parquet_cache` (pipeline server) and
`rpc_data_catalog_listings__request_parquet_cache` (edge function). A
`pipeline_parquet` listing never has a cache.

### 5. Security prerequisite: lock down `opendata` writes

`supabase/schemas/99.storage.sql` lets **any authenticated user** insert or
update **any object** in `opendata` ("Auth users can upload open data
datasets", "Auth users can update open data datasets"). Any signed-in user
can therefore overwrite a pipeline listing's Parquet today, and could
overwrite a cached copy. Both writers (the pipeline server and the edge
function) use the service role, which bypasses storage RLS, so both
policies are dropped and nothing legitimate loses access. This ships first.

### 6. Retirement

Once every reader goes through the Parquet copy, the 25 MB resource route,
the private `open-data-catalog` bucket, `acquireOpenDataResourceWithCache`,
and its cache columns are removed.

## Slices

| # | Slice | Depends on |
|---|---|---|
| S1 | Drop the `opendata` authenticated write policies | none |
| S2 | Pipeline server: the cache builder (stream source to disk, DuckDB to Parquet, upload, record) with every dependency injected | none |
| S3 | Pipeline server: the build route, its auth, and one-build-per-listing | S2 |
| S4 | Schema: the cache columns, constraint, and both RPCs | none |
| S5 | Edge function: the `parquet-cache` route (freshness check, lost-build rule, triggering S3) | S3, S4 |
| S6 | App: `DatasetParquetWrapper` and "Add to workspace" read the copy and show its preparing state | S5 |
| S7 | Remove the 25 MB relay, the private bucket cache, and its columns | S6 |
| S8 | E2E: add a listing over 25 MB and query it | S6 |

## Open questions

1. **Production Storage upload limit.** Large ODC sources only fit if
   production's limit allows them. DOB Violations is about 750 MB of CSV,
   probably 60 to 120 MB as ZSTD Parquet. Manual uploads already depend on
   this same number.
2. **Fly machine sizing.** The builder needs disk for the source CSV plus
   the Parquet. The pipeline server's volume and memory size should be
   checked against the largest listing we expect to cache.
3. **Storage cost.** Copies are only built for listings a workspace adds, so
   cost grows with use, not with the catalog's size. Pre-building copies for
   popular listings is a later option.
