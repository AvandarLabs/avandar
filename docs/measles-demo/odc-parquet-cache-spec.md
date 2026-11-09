# ODC Parquet cache: spec

**Status:** done on `feat/odc-parquet-cache` (branched from
`demo/measles`). Drift handling is tracked separately (open question 4).

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

**The pipeline server knows no API.** It reads the listing with the service
role and loads the manifest of the pipeline that wrote it
(`pipelines/<pipeline_name>/<pipeline_name>.pipeline.yaml`). The manifest's
`download` block says whether that pipeline's API pages, and names a
download script in the pipeline's own folder that says where each page or
file is:

```yaml
# socrata.pipeline.yaml
download:
  paging: true
  pageRows: 100000
  script: ./download/socrataListingDownload.ts

# hdx.pipeline.yaml
download:
  paging: false
  script: ./download/hdxListingDownload.ts
```

The script's contract (`ListingDownload` in `@avandar/etl`) is the only
thing the server and a pipeline share. A pipeline whose manifest has no
`download` block has listings that cannot be copied.

**A paged source** (Socrata) is never held whole on disk:

1. The script reads the dataset's schema and declares each column's type
   from it (`number` as `DOUBLE`, `checkbox` as `BOOLEAN`, dates as
   `TIMESTAMP`, everything else as `VARCHAR`). A page cannot see the rows
   after it, so types come from the source's schema, which Socrata enforces
   on every row, rather than from the data.
2. The server downloads one page (`pageRows` rows) of RFC 4180 CSV, ordered
   by Socrata's row id, and converts it to Parquet with the declared types in
   strict mode. The next page asks for the rows after the last row id of
   this one (`$where=:id > '<last id>'`): measured, this stays fast however
   deep into a 343 million row dataset it goes, where `$offset` timed out.
   A failed page download is retried twice, so a dropped connection costs
   one page.
3. Converted pages are staged until they reach about 32 MB, then merged into
   the next part (without the row id), uploaded, and deleted. The disk only
   ever holds about one part.
4. Once every page is in, the source's freshness token is read again. A
   source that changed mid-download would mix two versions, so the build
   fails and deletes what it uploaded.

**A source that is one file** (CKAN, as on HDX) is streamed to disk, gzipped
as it arrives when it is a CSV, so it takes a fraction of the space. DuckDB
converts it straight into parts of about 32 MB, with the reading rules
settled against the real DOB Violations file:

- Column types are detected from every row (`sample_size=-1`), since a
  column that looks numeric for its first 20,000 rows often is not.
- The dialect (delimiter, quote, escape) is detected from the start of the
  file and pinned. Detected from every row, DuckDB reads a file with one
  malformed row as a single text column, without an error.
- Strict mode, never `strict_mode=false`. The lenient mode merged two DOB
  rows into one where a quoted value ends in an apostrophe, without an
  error. A malformed row now fails the build, naming its line.

**Either way**, the copy is a folder of parts,
`opendata/catalog-cache/<listingId>/<buildId>/part-00000.parquet` onward.
Naming the folder after the build means a reader holding an older copy
never sees it change, and a failed build deletes its own parts without
touching another build's. Every part stays under the 50 MB local upload
limit, so no part needs a resumable upload. The caller then writes the cache
columns (below) in one RPC call, writes the copy's column types back as
verified column types, and deletes the copy it replaced.

A failure records `failed` with a failure code. A failure that says the
dataset itself cannot be loaded marks the listing invalid through
`failureToInvalidDatasetReason`, the same mapping the sample route uses.

**Entry point:** `POST /open-data-cache/:catalogListingId/build` on the
pipeline server, authorized with `AVA_PIPELINE_SERVER_SECRET` like the
existing run route, carrying the build id the edge function claimed. The
server keeps no Supabase credentials: like a pipeline run, the request names
the project to read the listing from and upload into, in the
`X-Ava-Supabase-Url` and `X-Ava-Supabase-Service-Role-Key` headers. The edge
function sends its own project's URL and service role key, so each Avandar
instance's copies land in its own project through the same server. It
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

**Measured on DOB Violations** (2,477,724 rows, 18 columns), as one file:
the CSV is 790 MB and took 264 s to stream from Socrata. Converting it took
2 s and produced a 79.7 MB ZSTD Parquet file, with a peak of under 0.6 GB of
memory on one thread. Paged, through the real Socrata API into local
Storage: 25 pages of 100,000 rows became 4 parts totalling 81.6 MB in 316 s
end to end, with a peak of about 100 MB on disk instead of 870 MB. The row
count matched Socrata's live count exactly.

### 2. When a copy is built: on first use, refreshed when stale

An edge route in the `open-data` function,
`POST /data-catalog-listings/:id/parquet-cache` with a body of `{}`, or of
`{ completeSample: { token, csvText } }` (see "A complete sample becomes the
copy" below), reads the listing as the caller so RLS decides whether they
can see it, then decides with `requestParquetCache`:

| Listing state | Response | Side effect |
|---|---|---|
| Has a copy, and its source version matches the live freshness token | `200 { status: "ready", partPaths, rowCount, byteSize, sourceVersion, isStale: false }` | none |
| Has a copy, but the token moved | `200 { ..., isStale: true }` | claims a rebuild and asks the pipeline server for it |
| Has a copy while a rebuild runs | `200` with the copy | claims again only if the build counts as lost |
| No copy | `202 { status: "building" }` | claims a build and asks the pipeline server for it |
| `building`, started within the last 30 minutes | `202 { status: "building" }` | none: the claim returns no id |
| `building`, started over 30 minutes ago | `202 { status: "building" }` | the claim treats the build as lost and gives a new id |
| `failed`, under 15 minutes ago, or the listing is invalid, or `copy-unsupported` | `409 { status: "failed", failureCode }` | none |
| `failed`, over 15 minutes ago, or under 15 minutes ago with a vouched complete sample | `202 { status: "building" }` | retries the build |
| The pipeline server does not accept the build | `409 { status: "failed", failureCode: "pipeline-server-unreachable" }` | releases the claim as that failure, so a later request retries |
| Not API-backed | `409 { status: "unavailable", reason: "not-api-backed" }` | none |
| No pipeline server configured | `503 { status: "unavailable", reason: "copies-unavailable" }` | none; an existing copy is still served |

`partPaths` are the copy's parts in the `opendata` bucket, in row order
(`buildParquetCachePartPaths`). A stale copy is still served while the
rebuild runs: an old copy now is better than a correct one in ten minutes.
The freshness check is the existing `readOpenDataFreshnessToken`, and a
check that fails serves the copy as current.

The function reaches the pipeline server through `AVA_PIPELINE_SERVER_URL`
and `AVA_PIPELINE_SERVER_SECRET`, and sends its own project's URL and secret
key with each build. Locally the function runs in Docker and sees its
project as `http://kong:8000`, so `AVA_PIPELINE_SERVER_SUPABASE_URL` gives the
URL the pipeline server can reach instead (see `.env.example.edge`). The
Demo deploy workflow sets both on the demo project from the `Staging`
environment's `AVA_PIPELINE_SERVER_URL` variable and secret. Staging and
production edge secrets are set by hand.

**Callers:** "Add to workspace" and every later load of an added listing,
plus a column type verification whose sample turned out to be the whole
source. Browsing the catalog otherwise never starts a build. The preview
reads a stored Parquet copy when one exists, so opening a listing does not
call the source API. A CSV or OData listing with no copy yet still reads
the start-of-file sample, which is capped, so browsing never pulls a
multi-gigabyte source. While a column recheck is reading that sample, the
preview keeps showing the copy and replaces it only if the sample's rows
differ.

#### A complete sample becomes the copy

The column type sample route reads up to 10,000 rows of a Socrata export or
the first 5 MB of a CKAN file. When that read is the whole source (fewer
than 10,000 rows, counted without splitting quoted line breaks, or a CKAN
file that ended before 5 MB), the route answers
`X-Ava-Column-Type-Sample-Complete: true` and signs the SHA-256 of the
sample's text, as a browser decodes it, into the sample token.

The browser hands that text back with its token to `/parquet-cache`:
right after it writes the verified column types, and again on "Add to
workspace" if the preview read a complete sample in the last 14 minutes.
The route copies the text only when the token is valid for the listing and
the text hashes to the signed value, so a caller cannot put rows of its own
into a copy every workspace reads. Anything else is ignored and the build
reads the source as usual. A vouched sample also skips the 15-minute wait
after a failed build, since the build no longer reads the source that
failed it.

The edge function forwards the text to the pipeline server as
`completeSampleCsv` in the build request (the route accepts bodies up to
64 MB). The build still asks the pipeline's download script for the
source's version, a metadata read only, then converts the text with the
whole-file CSV reader, so its column types come from every row rather than
from the Socrata schema the paged reader uses.

### 3. Who reads the copy

- `DatasetParquetWrapper` (`src/clients/qetl/wrappers/DatasetParquetWrapper`):
  for an `api_resource` listing, it calls the `parquet-cache` route through
  `fetchOpenDataParquetCopy` (`src/lib/openData/`).
  - `ready`: it downloads each part from the bucket's public URL, the way a
    pipeline listing's Parquet is read. A copy of several parts is merged
    into one Parquet blob in DuckDB (`DuckDbClient.mergeParquetBlobs`),
    since the relation cache and loader hold one blob per dataset. A stale
    copy is cached for only 5 minutes, so the next load reads the rebuilt
    copy.
  - `building`: it asks again, waiting from 2 s up to 15 s between asks, for
    up to 10 minutes. The load shows its usual loading state meanwhile. Past
    that it fails with `OpenDataParquetCopyError` (`still-preparing`), and the
    build keeps running.
  - `failed`: it fails with `OpenDataParquetCopyError` and the failure code.
  - `unavailable` (no pipeline server configured): it fails with
    `OpenDataParquetCopyError` (`unavailable`). An instance that serves API
    listings must have a pipeline server.
- "Add to workspace" requests the copy as the dataset is saved, so the first
  build starts before the dataset is first opened. While it builds, a
  notification says the data is being prepared and that large datasets can
  take a few minutes to open the first time. A failed build gets a warning
  that the dataset may not open.
- The catalog preview reads an API-backed listing from its copy's first
  part when a copy is stored, straight from Storage, so browsing never
  starts a build and does not call the source API. A CSV or OData listing
  with no copy yet is read from the column-type sample route. Any other
  API-backed listing shows the preview's error state until a workspace
  adds it and the copy is built. While a CSV listing's column types are
  being rechecked, the preview still shows the copy first and replaces it
  only if the recheck's rows differ.

### 4. Schema

New columns on `data_catalog_listings`, replacing the raw-bytes cache
columns (`cached_object_path`, `cached_source_version`, `cached_at`):

| Column | Meaning |
|---|---|
| `parquet_cache_status` | enum: `building`, `ready`, `failed`. Null when no build was ever requested. |
| `parquet_cache_build_id` | The running build's id. Null when no build runs. |
| `parquet_cache_build_started_at` | When the running or last build started. Drives the lost-build rule. |
| `parquet_cache_failure_code` | The last build's failure code. Set exactly when the status is `failed`. |
| `parquet_cache_folder_path` | The `opendata` folder holding the copy's parts. Set exactly when a copy exists. |
| `parquet_cache_part_count` | How many parts the folder holds, at least one. |
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
| `rpc_data_catalog_listings__write_parquet_cache` | pipeline server | Records a ready copy; returns the folder of the copy it replaced, for deletion |
| `rpc_data_catalog_listings__fail_parquet_cache` | pipeline server | Records a failure; keeps the earlier copy |

A `pipeline_parquet` listing never has a cache.

### 5. Security prerequisite: lock down `opendata` writes

`supabase/schemas/99.storage.sql` lets **any authenticated user** insert or
update **any object** in `opendata` ("Auth users can upload open data
datasets", "Auth users can update open data datasets"). Any signed-in user
can therefore overwrite a pipeline listing's Parquet today, and could
overwrite a cached copy. Both writers (the pipeline server and the edge
function) use the service role, which bypasses storage RLS, so both
policies are dropped and nothing legitimate loses access. This ships first.

### 6. Retirement

Every reader goes through the Parquet copy, so S7 removed the 25 MB
`/resource` route, `acquireOpenDataResource`,
`acquireOpenDataResourceWithCache`, `AvandarSupabaseStorageClient`, the
app's `fetchOpenDataCatalogResource`, and the `cached_object_path`,
`cached_source_version`, and `cached_at` columns (migration
`20261109021620_drop_odc_raw_bytes_cache.sql`).

The private `open-data-catalog` bucket goes too. Storage refuses deletes
from SQL unless a transaction sets `storage.allow_delete_query`, so that a
deleted object row cannot orphan its stored file. Migration
`20261109030000_STORAGE-drop-open-data-catalog-bucket.sql` therefore
deletes the bucket only once it holds no objects. On a project whose bucket
still has files, empty it through the Storage API or the dashboard
(Storage → `open-data-catalog` → select all → Delete); the migration then
removes the bucket on the next deploy, or a re-run of it does. Its objects
are raw-bytes copies of sources, so nothing is lost.

## Slices

| # | Slice | Depends on |
|---|---|---|
| S1 | Drop the `opendata` authenticated write policies. **Done.** | none |
| S2 | Pipeline server: the cache builder, driven by each pipeline's `download` manifest block. Paged sources are copied one part at a time; one-file sources are gzipped on disk. **Done.** | none |
| S3 | Pipeline server: the build route, its auth, and one-build-per-listing. Builds run one at a time; a build whose claim was taken over is skipped, and one superseded while it ran deletes its copy. On start, it deletes temp folders a killed build left behind. **Done.** | S2 |
| S4 | Schema: the cache columns, constraints, and the three RPCs. **Done.** | none |
| S5 | Edge function: the `parquet-cache` route (freshness check, lost-build rule, retry backoff, triggering S3), and its env in `.env.example.edge` and the Demo workflow. **Done.** | S3, S4 |
| S6 | App: `DatasetParquetWrapper` and "Add to workspace" read the copy and show its preparing state. **Done.** | S5 |
| S7 | Remove the 25 MB relay, the private bucket cache, and its columns. **Done.** A bucket that still has files is emptied by hand first (section 6). | S6 |
| S8 | E2E: add a listing whose copy has several parts and query it. **Done** (`tests/e2e/odc-parquet-copy.spec.ts`). Setup seeds a built copy of three parts, since the build is the pipeline server's and is tested there; the test adds the listing, opens the dataset, and checks the row count and row order across parts. | S6 |

## Open questions

1. **Production Storage upload limit.** No longer a blocker: every part is
   about 32 MB, under even the 50 MB local limit. Production's limit only has
   to allow 32 MB files.
2. **Fly machine.** Settled: `performance-1x` with 2 GB of memory and a 10 GB
   volume at `/data`, about $35 a month. See
   `docs/measles-demo/pipeline-server-fly-runbook.md`. The largest Socrata
   dataset on our drives, Lobbyist Bi-Monthly Reports on data.ny.gov (343M
   rows, about 239 GB of CSV), still takes about a day to download at the
   2.2 MB/s Socrata serves it, but no longer needs a large disk.
3. **Storage cost.** Copies are only built for listings a workspace adds, so
   cost grows with use, not with the catalog's size. Pre-building copies for
   popular listings is a later option.
4. **Source drift.** A workspace keeps the columns it copied when it added a
   listing, while its data comes from the listing's current copy, so a
   changed source can leave the two disagreeing. A rebuild also deletes the
   copy it replaced, which a dataset a user chose to freeze would still need.
   Handling every drift case is tracked as P6.11 in
   `docs/production-plan-world-humanitarian-day.md` and is out of scope here.
