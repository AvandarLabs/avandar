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

A build is an on-demand copy of one listing, started when a user adds it to
a workspace (section 2). It is not part of the scheduled data pipeline and
transforms nothing: it downloads the source, converts it to Parquet without
changing any value, uploads it, and records it. It runs on the pipeline
server only because that server is the right host. The pipeline server
(`apps/pipeline-server`, Bun on Fly) already turns CSVs into ZSTD Parquet
with Node DuckDB (`transformedCsvsToParquetBlobs`) and uploads them to
`opendata` for pipeline listings. It has a disk and no isolate time or
memory ceiling, so it can stream a source of any size, where the edge
function cannot:

1. Read the listing with the service role.
2. Stream the source to a temp file on disk. A CKAN resource is found and
   host-checked exactly as `acquireOpenDataResource` does. A Socrata dataset
   is read from its CSV export with no row limit.
3. `COPY (SELECT * FROM read_csv(...)) TO '<file>.parquet' (FORMAT PARQUET,
   COMPRESSION ZSTD)`. DuckDB streams this, so memory stays flat. A source
   that is already Parquet is uploaded unchanged. How the CSV is read
   matters, and was settled against the real DOB Violations file:
   - Column types are detected from every row (`sample_size=-1`), since a
     column that looks numeric for its first 20,000 rows often is not.
   - The dialect (delimiter, quote, escape) is detected from the start of
     the file and pinned. Detected from every row, DuckDB reads a file with
     one malformed row as a single text column, without an error.
   - Strict mode, never `strict_mode=false`. The lenient mode merged two DOB
     rows into one where a quoted value ends in an apostrophe, without an
     error. A malformed row now fails the build, naming its line.
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
existing run route, carrying the build id the edge function claimed. It
answers `202` straight away and builds in the background.

**The pipeline server runs as an always-on server.** Its Fly config keeps
one machine running (`auto_stop_machines = "off"`,
`min_machines_running = 1`), like the dev-fanout server. Fly would otherwise
stop a machine with no open requests, and a background build outlives the
request that started it: DOB Violations takes over four minutes to download.
A build is still lost when a deploy or crash restarts the machine. The
lost-build rule in section 2 recovers it on the listing's next load.

**One build per listing** is enforced in the database, not in a machine's
memory, so it holds across Fly machines:
`rpc_data_catalog_listings__request_parquet_cache` claims a build under a
new build id, or returns null when one is already running. A build records
its result only while its build id is still current, so a build given up
as lost cannot overwrite the one that replaced it.

**Measured on DOB Violations** (2,477,724 rows, 18 columns): the CSV is
790 MB and took 264 s to stream from Socrata. Converting it took 2 s and
produced a 79.7 MB ZSTD Parquet file.

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
| `parquet_cache_build_id` | The running build's id. Null when no build runs. |
| `parquet_cache_build_started_at` | When the running or last build started. Drives the lost-build rule. |
| `parquet_cache_failure_code` | The last build's failure code. Set exactly when the status is `failed`. |
| `parquet_cache_object_path` | Object path in `opendata`. Set exactly when a copy exists. |
| `parquet_cache_source_version` | The freshness token the copy was built from. |
| `parquet_cache_built_at` | When the current copy was written. |
| `parquet_cache_row_count`, `parquet_cache_byte_size` | What was written, for the catalog and for monitoring. |

Two check constraints keep them consistent: the copy columns are set
together or not at all, and each status carries exactly what it means (a
`building` listing has a build id, a `ready` one has a copy, a `failed` one
says why; `building` and `failed` keep any earlier copy). Only the service
role writes them, through three RPCs:

| RPC | Caller | Does |
|---|---|---|
| `rpc_data_catalog_listings__request_parquet_cache` | edge function | Claims a build and returns its id, or null when one runs |
| `rpc_data_catalog_listings__write_parquet_cache` | pipeline server | Records a ready copy; returns the copy it replaced, for deletion |
| `rpc_data_catalog_listings__fail_parquet_cache` | pipeline server | Records a failure; keeps the earlier copy |

A `pipeline_parquet` listing never has a cache. The raw-bytes cache columns
(`cached_*`) stay until S7 removes the relay that writes them.

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
| S1 | Drop the `opendata` authenticated write policies. **Done.** | none |
| S2 | Pipeline server: the cache builder (stream source to disk, DuckDB to Parquet, upload) with every dependency injected. **Done.** | none |
| S3 | Pipeline server: the build route, its auth, and one-build-per-listing. The always-on Fly config is **done**. | S2 |
| S4 | Schema: the cache columns, constraints, and the three RPCs. **Done.** | none |
| S5 | Edge function: the `parquet-cache` route (freshness check, lost-build rule, triggering S3) | S3, S4 |
| S6 | App: `DatasetParquetWrapper` and "Add to workspace" read the copy and show its preparing state | S5 |
| S7 | Remove the 25 MB relay, the private bucket cache, and its columns | S6 |
| S8 | E2E: add a listing over 25 MB and query it | S6 |

## Open questions

1. **Production Storage upload limit.** Large ODC sources only fit if
   production's limit allows them. DOB Violations is 79.7 MB as ZSTD
   Parquet, which the 50 MB local limit in `supabase/config.toml` would
   already refuse. Manual uploads already depend on this same number.
2. **Fly machine sizing and cost.** The builder needs disk for the source
   CSV plus the Parquet (870 MB for DOB Violations). The pipeline server's
   disk and memory should be checked against the largest listing we expect
   to cache. Keeping one machine always on also means paying for it around
   the clock instead of only while it serves requests.
3. **Storage cost.** Copies are only built for listings a workspace adds, so
   cost grows with use, not with the catalog's size. Pre-building copies for
   popular listings is a later option.
