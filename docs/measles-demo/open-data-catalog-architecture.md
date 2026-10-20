# Open Data Catalog architecture

This is the reference for how the Open Data Catalog works: which connectors
serve it, how a relation's bytes actually get acquired today, what changes
once a Socrata connector and a write-back cache exist, and what stays
deferred. It assumes
[`connector-nomenclature.md`](connector-nomenclature.md) (drive, connection,
relation, drive index, the connector-vs-discovery distinction) and
[`qetl-architecture.md`](../qetl-architecture.md) section 2.1 (client vs.
wrapper). Facts are as of 2026-10-16 (`feat/demo/measles`, with
`feat/postgres-connector` merged in); section 8 lists what is proposed rather
than built.

**The one rule everything here follows, because the user who commissioned
this doc was explicit about it:** the Open Data Catalog is not a special
data-loading mechanism. It is connectors - CKAN, a future Socrata, and
`AvandarSupabaseStorage` - plugged into QETL with no special exceptions. A
catalog listing becomes an ordinary `datasets` row with `source_type:
"open_data"`, and `DatasetParquetWrapper` acquires it the same way it
acquires any other dataset: through a `SourceWrapper`, with capabilities
declared in `RelationCapabilities`, with no bespoke code path anywhere in
QETL itself.

## 1. Current state, verified

Three facts, each confirmed by reading the code or by a live request against
a real endpoint, not assumed:

1. **CKAN has no caching tier at all.** `_downloadApiOpenData` in
   `DatasetParquetWrapper.ts` calls `fetchApiOpenDataResource` on every single
   `acquire`, for every workspace, every time. The `open-data` edge function
   (`supabase/functions/open-data/OpenDataRoutes.ts`) proxies straight through
   to `acquireOpenDataResource`, which re-fetches CKAN's bytes fresh on every
   call. Nothing is ever written back to storage. The design spec that built
   this (`superpowers/specs/2026-08-19-qetl-open-data-apis-design.md` section
   5.3.2) considered a write-back cache and explicitly did not build it.
2. **Socrata is CORS-open everywhere CKAN is not.** Verified live against
   `data.cityofnewyork.us` and `api.us.socrata.com`: the SODA data endpoint
   (`/resource/{id}.json`), the metadata endpoint (`/api/views/{id}.json`),
   and the cross-portal Discovery API (`api.us.socrata.com/api/catalog/v1`)
   all send `Access-Control-Allow-Origin: *`. CKAN needs a server-side proxy
   because its resource download redirects to a presigned URL CORS-locked to
   its own origin; Socrata needs no such proxy for any of these three calls.
3. **Every dataset source type except `virtual` already reads through some
   protocol client, including uploads.** An online-synced (`isInCloudStorage:
   true`) `csv_file`/`xlsx_file`/`pdf_file` dataset is read back by
   `DatasetParquetStorageClient.downloadDataset`, from the `workspaces`
   bucket, by any team member, on any device - a connector-shaped read, just
   one with no discovery above it (`connector-nomenclature.md`, "Not every
   dataset source type is a connector"). This, `OpenDatasetParquetStorageClient`
   (the catalog's own Parquet), `DatasetOriginalFileStorageClient` (retained
   PDF originals), and `PublicDatasetParquetStorageClient` (published
   dashboard snapshots) are four separately-implemented clients today, all
   reading the same Supabase Storage project - though, verified while
   designing section 3's cache, three of the four have a workspace-scoped,
   resumable-upload shape different enough from the Open Data Catalog's own
   storage that this spec does not attempt to unify them (section 3's note).

## 2. The three acquisition tiers, current vs. target

| Tier | What it means | Exists today? | Target |
| --- | --- | --- | --- |
| Preloaded | Built once by the Avandar pipeline, read from a stable storage object forever after | Yes - `pipeline_parquet` entries | Unchanged |
| Dataset-connect lazy load | Fetched live once, written back to storage, every later read (any workspace) served from that cached copy until a cheap freshness check says otherwise | **No** - `api_resource` entries re-fetch live on every acquire, with no write-back | **This spec's build scope**, for both CKAN and a new Socrata connector |
| Query-time lazy load (pushdown) | A predicate or aggregate sent to the source, only the matching rows fetched | No - anticipated in `RelationCapabilities`/`SourceWrapper.pushDown`, unimplemented everywhere (`ConceptWrapper`'s own docstring admits its `pushDown` is an unused stub) | **Explicitly deferred** (section 8). Needs the capability-driven planner `qetl-architecture.md` section 9 already names as not built, for every source type, not just Socrata |

## 3. Module layout

```text
shared/connectors/                                   renamed from shared/open-data/
  open-data/
    CkanClient/                                       unchanged, moved
    SocrataClient/                                    new - getMetadata, getRows
    SocrataDiscoveryClient/                            new - the drive index client (section 7)
    AvandarSupabaseStorageClient/                      new - the Open Data Catalog's own
                                                        storage drive (narrower than first
                                                        drafted - see the note below)
    acquireOpenDataResource.ts                        extended: dispatches on api_service,
                                                       then tries the cache before either client
    openDataErrors.ts
    __tests__/

src/clients/storage/                                  unchanged, not touched by this spec
  DatasetParquetStorageClient/                         (workspace-scoped, authenticated,
  DatasetOriginalFileStorageClient/                     resumable-upload clients - a different
  PublicDatasetParquetStorageClient/                    auth model and upload strategy from
                                                        the Open Data Catalog's own storage;
                                                        see the note below for why these stay
                                                        separate rather than adopting
                                                        AvandarSupabaseStorageClient now)

supabase/functions/
  open-data/                                          unchanged name. Gains the cache-check
                                                        route (section 6). Stays the Open Data
                                                        Catalog's own server-side surface -
                                                        shared, cross-workspace, not
                                                        workspace-owned.
  connectors/                                         renamed from external-datasets. Stays
                                                        scoped to private, workspace-owned
                                                        connections (Postgres today, Sheets
                                                        later). Gains no Socrata route: Socrata
                                                        needs no proxy (fact 2, section 1).
```

**Narrowed from the first draft of this section, and why.** Verifying the
four existing storage clients directly (not just by name) found two
different access models hiding under one idea: `DatasetParquetStorageClient`
and `DatasetOriginalFileStorageClient` are workspace-scoped, authenticated,
and use a resumable TUS upload for large files; `PublicDatasetParquetStorageClient`
additionally lists, paginates, and batch-deletes across a dashboard's whole
generation folder - operations a simple `{download, upload, remove}`
transport cannot express without growing well past what this spec needs.
Forcing all four onto one transport now would be unrelated design work on
already-shipped, already-tested code, not something Socrata or the cache
needs. So `AvandarSupabaseStorageClient` in this spec is scoped to exactly
one thing: the Open Data Catalog's own storage, which has neither of those
complications (a flat set of catalog-entry-keyed objects, no per-workspace
scoping, no resumable upload needed at the sizes a cached resource runs to).
Unifying the other three remains a real idea, tracked as deferred work
(section 7), not abandoned.

`AvandarSupabaseStorageClient`'s shape, reflecting what the cache actually
needs - a private, non-workspace-scoped bucket (`open-data-catalog`, new),
read by any authenticated user (matching `data_catalog_listings`'s own
`select`-to-`authenticated` grant), written only by the `open-data` edge
function's service-role client:

```ts
export type AvandarSupabaseStorageClient = {
  downloadCachedResource: (objectPath: string) => Promise<Blob | undefined>;
  uploadCachedResource: (objectPath: string, blob: Blob) => Promise<void>;
  removeCachedResource: (objectPath: string) => Promise<void>;
};
```

It takes an injected Supabase Storage handle (`SupabaseClient["storage"]`),
the same injection shape `CkanClient` already uses for `OpenDataHttp` - the
browser's default handle is the authenticated client already in use
everywhere else in `src/`; the edge function's is the service-role client.
This keeps the module itself reachable from `shared/` with no client
singleton baked in, while every caller still gets a real, non-mocked storage
handle by default.

A `pipeline_parquet` entry's read is **not** touched by this spec: it keeps
reading a public URL out of `canonical_urls` exactly as it does today
(`OpenDatasetParquetStorageClient`), because that path already works,
nothing about Socrata requires changing it, and migrating ten-plus live
production catalog rows onto a new private bucket is an unrelated, separate
decision this spec does not make.

**`DatasetParquetWrapper` does not change at all, and that is the point, not
a gap** (the same conclusion the Postgres connector spec reached for the
mediator, section 5.4a there). Caching is invisible above the HTTP boundary.
Today, for an `api_resource` entry, the wrapper calls its injected
`fetchApiOpenDataResource(catalogEntryId)`, wired in `createDefaultRegistry.ts`
to `fetchOpenDataCatalogResource` - the browser function that calls
`GET /open-data/catalog-entries/:id/resource`. That edge-function route
today calls `acquireOpenDataResource` directly, always live
(`OpenDataRoutes.ts`). The only thing this spec changes is **what that one
route does on the server**, behind the exact same request and response
contract (bytes, `X-Ava-Content-Kind`, `X-Ava-Source-Version`):

```text
Today:
  GET /catalog-entries/:id/resource
    -> acquireOpenDataResource(entry)   (CkanClient, always live)
    -> return bytes

Target:
  GET /catalog-entries/:id/resource
    -> acquireOpenDataResourceWithCache(entry, SupabaseAdmin)
         1. ask the connector (CkanClient or SocrataClient, by api_service)
            for the live freshness token (section 5)
         2. live token === entry.cached_source_version?
              yes: read open-data-catalog/<objectPath> (AvandarSupabaseStorageClient)
              no:  acquireOpenDataResource(entry)   (now dispatches by api_service too)
                   write the bytes to open-data-catalog/<objectPath>
                   update the catalog listing's cache_* columns (service-role)
    -> return bytes, same headers as today
```

No change to `DatasetParquetWrapper.ts`, `createDefaultRegistry.ts`, or
`fetchOpenDataCatalogResource.ts`. A `pipeline_parquet` entry never reaches
this route at all, today or after this spec:
`acquireOpenDataResource` already refuses pipeline-kind entries
(`access-shape-invalid`), because the browser reads that case directly from
its own public Storage URL (`OpenDatasetParquetStorageClient`).

No new `SourceWrapper`, and `DatasetParquetWrapper.ts` is not edited by this
spec at all: `predicatePushdown: "none"`, `wholeRelationAcquirable: "yes"`,
`acquisitionUnit: { kind: "whole-relation" }`, and `freshnessSignal: "none"`
all still hold, unchanged, for a cached, whole-relation Socrata/CKAN read.
(`freshnessSignal` under-declaring a token the wrapper already threads
through today, for CKAN, is pre-existing, out-of-scope debt the CKAN
generalization spec flagged and did not fix either - section 7.4 there - not
something Socrata or the cache introduces or is required to resolve.)

## 4. Schema changes

`data_catalog_listings__api_service` (currently `enum('ckan')`) gains
`'socrata'`. No other new enum: `api_base_url` and `external_dataset_id`
already carry a SODA endpoint and a 4x4 dataset id without further migration,
exactly as the CKAN generalization spec predicted (section 13.1 there).

Three new nullable columns on `data_catalog_listings`, written only by
`access_kind = 'api_resource'` rows, mirroring the existing `api_*` columns'
pattern:

```sql
-- Where the cached copy lives, once one has been written. Null until the
-- first successful fetch.
cached_object_path text,
-- The freshness token captured when the cache was last written. Compared
-- against a fresh metadata read before deciding to serve the cache
-- (section 6); never parsed.
cached_source_version text,
-- When the cache was last written. Informational; cached_source_version is
-- what correctness actually depends on.
cached_at timestamptz,
```

Extend the existing CHECK constraints rather than add new ones, following the
same all-or-nothing shape the spec that introduced `access_kind` already
established:

```sql
-- pipeline_access_complete gains, in its negative half:
and cached_object_path is null
and cached_source_version is null
and cached_at is null

-- a new constraint, grouped the same way api_access_complete is:
constraint data_catalog_listings__cache_complete check (
  (cached_object_path is null and cached_source_version is null and cached_at is null)
  or
  (cached_object_path is not null and cached_source_version is not null and cached_at is not null)
)
```

The cached object lives in a new, dedicated, private bucket
(`open-data-catalog`), not the pipeline's existing public bucket
(`catalogOpenDataInsert.ts`'s target). Unlike the pipeline's bucket, nothing
ever reads this one directly: every reader is the `open-data` edge function's
`SupabaseAdmin` (service-role) client, which bypasses storage RLS entirely
(section 5), so the bucket needs no `authenticated`-facing storage policy at
all - the browser never learns this bucket exists, the same way it never
sees `vault.decrypted_secrets` in the Postgres connector (section 5.2 there).
`cached_object_path` is a bucket-relative path (e.g. `<catalogEntryId>.parquet`),
not a URL, the same shape `parquet_file_name` already is for pipeline rows
and deliberately not the `canonical_urls` free-text-array shape the original
CKAN generalization spec called a mistake (section 13.2 there).

## 5. The freshness-check and write-back cache flow

One function (`acquireOpenDataResourceWithCache`), shared across both
connectors, called from the `open-data` edge function's existing route
(`OpenDataRoutes.ts`) in place of today's direct `acquireOpenDataResource`
call - nothing above the HTTP boundary (section 3) changes:

```text
acquire an api_resource entry:
  1. Read the catalog listing's cached_source_version (may be null - no cache yet).
  2. Ask the connector (CkanClient.getPackage / SocrataClient.getMetadata) for
     the live freshness token. This is a separate call from whatever step 4's
     live acquisition makes - on a cache miss or a stale token, the metadata
     is genuinely fetched twice (once here, once again inside
     acquireOpenDataResource's CKAN/Socrata branch), not shared. This is a
     cheap request either way (no row data fetched), and de-duplicating the
     two calls is a natural future optimization, not something this flow
     does today.
  3. If cached_source_version is set AND equals the live token:
       read cached_object_path through AvandarSupabaseStorageClient. Done.
  4. Otherwise (no cache, or token changed):
       fetch the full resource live (CkanClient.getResourceBytes /
       SocrataClient.getRows),
       write those same raw bytes to AvandarSupabaseStorageClient, unchanged
       in contentKind - no transcode happens here or ever on this path,
       update cached_object_path / cached_source_version / cached_at
       on the catalog listing,
       return the freshly-fetched bytes.
```

**The cache stores exactly what the connector returned - raw CSV or Parquet
bytes, never a transcode.** This matters for where this code can run, not
just for simplicity: a Deno edge function has no DuckDB-WASM, so it could
never produce a Parquet transcode even if asked to. Nothing needs to ask:
`contentKind` (`"csv" | "parquet"`) already travels with the bytes today
(`OpenDataAcquisition.contentKind`), the cache simply persists both together,
and the CSV-to-Parquet transcode stays exactly where it already is -
client-side, in `DatasetParquetWrapper`, via the injected
`transcodeCsvToParquet`, run identically whether the bytes came from a cache
hit or a live fetch. Caching removes the network round trip to a third-party
API; it was never meant to remove the local, already-cheap transcode step.

This is a cache-aside read, the same shape QETL's own storage tier already
uses (`qetl-architecture.md` section 6), one level further out: QETL's
existing IndexedDB tier still sits in front of all of this and is
untouched - a workspace that already has this relation resident never
reaches step 1 at all. What's new here is purely the *catalog listing's own*
cache, shared across every workspace, which is what makes the first
workspace to query a given catalog listing pay the live-fetch cost and every
subsequent workspace (and every subsequent session of the same workspace,
after IndexedDB eviction) get the fast path.

**Why all four steps run server-side, even though Socrata needs no proxy for
any of them.** This is a trust boundary, not a CORS problem
(`connector-nomenclature.md`, "A connector's drive does not have to be a
third party"): a shared, cross-workspace cache should not be writable
directly by any authenticated client. Since `DatasetParquetWrapper` already
calls this route for every `api_resource` entry today regardless of
`api_service` (section 3), adding the cache check inside the route it already
calls is also simply the smaller change - no new call site, no new decision
point for the browser to make about which entries are Socrata versus CKAN.
Running Socrata's cheap, CORS-open calls server-side anyway costs nothing
real and keeps the version-token race (two workspaces' requests landing
inside the "is this stale" window at the same time) inside one process
instead of two browsers.

## 6. Drive index: prebuilt, from a hardcoded list of drives

**Revised 2026-10-16: no longer deferred.** The original version of this
section called the drive index "live, not prebuilt, for v1" and pushed the
prebuilt shape to future work. That is reversed: Avandar now prebuilds the
drive index for a short, hardcoded list of drives, via a new pipeline. The
live-search capability this section previously described
(`SocrataDiscoveryClient`) is not removed - it is still the right tool for
letting a human *pick which drives to add* to that list - but it is no longer
how a workspace finds a candidate dataset to query. That now comes from
`data_catalog_listings` rows a pipeline already wrote.

**Why prebuilt now:** there is currently no way to get an `api_resource` row
into `data_catalog_listings` at all - no pipeline, no admin UI, no CLI
command. A `pipeline_parquet` row gets there because a pipeline writes it;
an `api_resource` row had no equivalent path. Building that path as "a
pipeline that enumerates a drive and upserts rows" is strictly simpler than
building a live picker UI with its own query/pagination/caching concerns, and
it reuses infrastructure (`ava pipeline run <name>`, the `pipeline-server`
app) that already exists for exactly this kind of scheduled, code-reviewed,
re-runnable job.

### 6.1 Both CKAN and Socrata have drives

`connector-nomenclature.md` already names both: "A Socrata open-data portal's
base URL (e.g. `data.cityofnewyork.us`)" and "A CKAN deployment's base URL
(e.g. `data.humdata.org`)" are both layer-1 drive examples. The difference
between them is not whether a drive exists - it is whether there is a
federated index *across* drives:

| | Socrata | CKAN |
| --- | --- | --- |
| One drive | One portal's base URL (`data.cityofnewyork.us`) | One deployment's base URL (`data.humdata.org`) |
| Enumerate everything in one drive | `SocrataDiscoveryClient.search({domains: [drive]})` with no query (new - see 6.3) | `package_list` action against that one deployment (new - `CkanDiscoveryClient`, see 6.3) |
| Enumerate across drives in one call | Yes - `api.us.socrata.com/api/catalog/v1`, CORS-open, federates every opted-in portal | No - each CKAN deployment only knows its own datasets; there is no cross-deployment CKAN index |

So the pipeline's drive registry (6.2) always enumerates one drive at a time
for both services. Socrata's cross-drive discovery stays useful for a human
deciding *which* drives to add to that registry - "is there a Chicago
portal" - but the pipeline itself never relies on it, since it already knows
which drives to enumerate.

### 6.2 The drive registry

**Split per pipeline, not one shared registry** - see
`connector-nomenclature.md`'s "One pipeline per service" section for why. Each
pipeline owns its own config, with no `apiService` field in either shape:
single-service pipelines don't need to discriminate a field that only ever
has one value.

`apps/pipeline-server/pipelines/hdx/hdxDrive.ts` - a single optional value,
not an array, because HDX is one specific CKAN deployment, not a list of
them:

```ts
export type HdxDrive = {
  baseUrl: string;
  organizationName: string;
};

export const HDX_DRIVE: HdxDrive | undefined = {
  baseUrl: "https://data.humdata.org",
  organizationName: "Humanitarian Data Exchange",
};
```

`apps/pipeline-server/pipelines/socrata/configuredDrives/configuredDrives.ts` -
an array, because Socrata genuinely has many independent portals:

```ts
export type ConfiguredDrive = {
  baseUrl: string;
  /**
   * Used as every discovered dataset's `external_organization_name`. Neither
   * client parses an organization field from its own API today (CKAN's
   * `package_show` has one, Socrata's Discovery API has a different one, and
   * the two are not alike enough to normalize), so the registry names it
   * once per drive instead of extending either client's schema just for
   * this.
   */
  organizationName: string;
};

export const CONFIGURED_DRIVES: readonly ConfiguredDrive[] = [
  // A handful of entries, picked by whoever maintains this Avandar
  // deployment. A fork maintains its own list.
];
```

This is the "short list of drives" - a handful of entries, not thousands of
per-dataset rows. Adding a new Socrata drive is a one-line addition here, not
a schema change or a new connector.

### 6.3 New discovery capabilities needed

Neither existing client can enumerate "everything in this drive" today:

- **`SocrataDiscoveryClient.search()` requires a non-empty `query`.** Real
  Socrata Discovery API calls can omit `q` entirely to list a domain's full
  catalog; this client's signature does not allow that yet. Widen `query` to
  optional (backward compatible - nothing besides its own test file calls
  this method today).
- **CKAN has no listing client at all.** `CkanClient` only reads one *named*
  dataset (`getPackage`). A new `CkanDiscoveryClient`, mirroring
  `SocrataDiscoveryClient`'s separate-module shape, wraps CKAN's
  `package_list` action (`GET {baseUrl}/api/3/action/package_list`) to
  return every dataset slug in one drive. `package_list` takes no domain
  parameter - a CKAN drive has nothing else to scope by, matching 6.1.

### 6.4 Which resources become rows

Socrata and CKAN differ here too, for the same reason `connector-nomenclature.md`
already gives: a Socrata dataset does not subdivide, so dataset and resource
are the same object (layer 2 and layer 3 collapse); a CKAN dataset routinely
lists several resources side by side.

- **Socrata:** one discovered dataset is one catalog row.
  `api_resource_format` is always `"CSV"` - not read from any metadata field,
  because `SocrataClient.getRows` always fetches the `.csv` export
  regardless of what else the dataset offers, so `"CSV"` is simply what this
  row will actually be read as.
- **CKAN:** one discovered dataset can become zero, one, or several catalog
  rows - one per resource that passes the exact same readability filter
  `getCkanResourceFromPackage.ts` already enforces at acquisition time
  (format is `csv` or `parquet`, case-insensitively, and `url_type ===
  "upload"`). That filter is extracted out of `getCkanResourceFromPackage.ts`
  into an exported, reusable predicate so the pipeline and the acquisition
  path can never drift out of sync on what counts as readable.

### 6.5 Upsert semantics

The pipeline writes rows with `access_kind: 'api_resource'`, hand-built as
plain snake_case objects, matching the existing (not `@avandar/models`-based)
convention `apps/pipeline-server/pipelines/world-bank__wdi/catalogOpenDataInsert.ts`
already uses for `pipeline_parquet` rows. It upserts against the existing
partial unique index:

```sql
-- already exists, from section 4 / the original schema:
create unique index data_catalog_listings__api_resource_unique on public.data_catalog_listings (
  api_service, api_base_url, external_dataset_id, api_resource_id
) where access_kind = 'api_resource';
```

Re-running the pipeline is safe and idempotent: a dataset's `display_name`,
`external_organization_name`, or `api_resource_format` can change on a
re-run (upstream renamed something), but **the upserted row objects never
include `cached_object_path`, `cached_source_version`, or `cached_at`** - so
those columns are left untouched by the upsert for every row that already
has a cache, and stay `null` for every row that doesn't. The write-back
cache (section 5) is completely unaffected by this pipeline; it still
populates on the first live query, exactly as before.

**Deliberately deferred:** the pipeline is additive-only. If a drive stops
listing a dataset it previously had, the pipeline does not prune or
deactivate that dataset's row. Handling removal (a status column, a
last-seen timestamp, a prune pass) is future work, not required for a short,
hand-curated drive list where removal is rare and can be handled by hand
when it happens.

### 6.6 Where this runs

Three pipelines run on `@avandar/etl`'s `EtlEngine`: `hdx`, `socrata`, and
`world-bank__wdi`, each runnable with `ava pipeline run <name>` (the
presence of `run.ts` is the only registration step). Each supplies its
drives, an `extract` that pages through a drive's datasets, and a
`transform` that turns a dataset into listings. The engine does the load:
it writes `data_catalog_listings` rows and relation columns, and Parquet
objects for `world-bank__wdi`, writing only rows that changed.

`hdx` and `socrata` crawl each drive oldest-modified first (`hdx` by
`metadata_modified` with `package_search` keyset paging, `socrata` by
`updatedAt`) and save each page before fetching the next. `ava pipeline run
<name> --incremental` therefore resumes each drive from the newest
`date_of_last_update` it already holds, whether the last run finished, was
cancelled, or stopped at `--limit`. See the
[engine spec](../superpowers/specs/2026-10-20-etl-engine-supabase-load-and-incremental-runs-design.md).

Both send every request through an `HttpClientFactory` client with
`withRateLimit({ minTimeMs: 1000 })`. HDX also retries an HTTP 429 three
times with exponential backoff, since it sends no `Retry-After`. The Socrata
pipeline shares one client across all of its drives, because every drive is
read through the same Discovery API host.

### 6.7 What every pipeline must write

Every pipeline under `apps/pipeline-server/pipelines/` must always upsert a
`data_catalog_listings` row for each dataset it discovers, regardless of
`access_kind`. A dataset a pipeline knows about but never upserts into the
drive index does not exist for query or discovery purposes - there is no
other path by which `data_catalog_listings` gets populated.

Prebuilding a Parquet file is not symmetric across `access_kind`:

- `access_kind = 'api_resource'` (`hdx`, `socrata`): prebuilding Parquet is
  optional. These pipelines only enumerate drives and upsert metadata; the
  write-back cache (section 5) builds the Parquet object lazily on first live
  query instead.
- `access_kind = 'pipeline_parquet'` (`world-bank__wdi` and any future
  `EtlEngine`-based pipeline): prebuilding Parquet is mandatory. A
  `pipeline_parquet` row with no corresponding Parquet object is invalid data,
  not a lazily-filled cache miss - nothing else will ever populate it. This
  is also what the `data_catalog_listings__pipeline_access_complete` CHECK
  constraint (`supabase/schemas/10.data_catalog_listings.sql`) enforces at the
  database level for the columns it covers.

The engine upholds both halves: it writes a listing for every relation a
pipeline's `transform` returns, and it uploads a `pipeline_parquet`
relation's object before writing the row that points at it.

## 7. What this spec builds vs. what it does not

**In scope, built by this spec:**

- `SocrataClient` and `SocrataDiscoveryClient` in `shared/connectors/open-data/`.
- `api_service` gains `'socrata'`; the `OpenDataAccess` union's `ckanDatasetId`/
  `ckanResourceId` fields are renamed to `externalDatasetId`/`apiResourceId`
  (matching the already-generic DB column names), since those names are
  reused by a non-CKAN connector starting now.
- The write-back cache (section 5), for both CKAN and Socrata, including the
  new `open-data-catalog` bucket and `AvandarSupabaseStorageClient`.
- The `shared/open-data/` to `shared/connectors/open-data/` rename.
- The `external-datasets` to `connectors` edge function rename.
- The prebuilt drive index pipelines (section 6): `CkanDiscoveryClient`;
  widening `SocrataDiscoveryClient.search()`'s `query` to optional; the
  `hdx` and `socrata` pipelines and their per-service drive configs;
  extracting `getCkanResourceFromPackage.ts`'s readable-resource filter into
  a reusable, exported predicate.

**Explicitly deferred, not designed here, tracked in Linear and in
`production-plan-world-humanitarian-day.md`:**

1. Query-time pushdown (tier 3, section 2). Needs the capability-driven
   planner this repo does not have yet, for any source type.
2. Retrofitting Google Sheets and Postgres onto the drive/connection/relation
   model this spec and `connector-nomenclature.md` describe - specifically,
   multi-account Google Sheets support (a real `drive` entity, today
   implicit) and a Postgres server-level drive above today's one-database-per-
   connection shape.
3. Pruning or deactivating a drive index row once its drive stops listing the
   dataset (section 6.5) - the pipeline is additive-only for now.
4. Unifying `DatasetParquetStorageClient`, `DatasetOriginalFileStorageClient`,
   and `PublicDatasetParquetStorageClient` onto `AvandarSupabaseStorageClient`
   (or a sibling client with a richer transport). Section 3's module-layout
   note explains why these three stay untouched for now: a different auth
   model (workspace-scoped, resumable TUS upload) and, for the public
   snapshot client, list/paginate/batch-delete operations a simple
   download/upload/remove transport does not cover.
5. Migrating `pipeline_parquet`'s existing public-URL read
   (`OpenDatasetParquetStorageClient`) onto the new private bucket. Not
   needed for Socrata or the cache, and a separate decision touching live
   production catalog rows.
6. Retry and backoff beyond HTTP 429. HDX's client retries a 429 with
   exponential backoff, and both drive-index pipelines resume an interrupted
   drive with `--incremental`, so a rate-limited run loses nothing it already
   saved. Other transient failures still fail the drive for that run.

## 8. Testing references to add

Following `qetl-architecture.md` section 12's table shape:

| Behaviour | Pinned by |
| --- | --- |
| Freshness check reads the cache before either live client | new test on the shared acquisition function (section 5), asserting `getBytes`/`getRows` is not called when the live token matches `cached_source_version` |
| A changed token re-fetches live and overwrites the cache | same file, opposite case |
| `AvandarSupabaseStorageClient` reads and writes the `open-data-catalog` bucket correctly, under an injected storage handle | unit test against a faked `SupabaseClient["storage"]`, no network |
| `OpenDatasetParquetStorageClient`'s existing `pipeline_parquet` read is unchanged by this spec | existing test suite stays green, untouched |
| `SocrataClient`/`SocrataDiscoveryClient` against a faked HTTP layer, no network | mirrors `CkanClient.test.ts`'s shape |
| CHECK constraints: cache columns are all-null or all-set; never set on a `pipeline_parquet` row | pgTAP, mirroring `catalog_listings_open_data_access.test.sql` |
| The `connectors` edge function rename does not change any route's behavior, only its path prefix | existing Postgres connector e2e spec, updated for the new prefix |
| `CkanDiscoveryClient` lists every dataset slug in one drive, no network | unit test against a faked HTTP layer, mirrors `SocrataDiscoveryClient.test.ts`'s shape |
| `SocrataDiscoveryClient.search()` with no `query` lists a domain's full catalog | extends `SocrataDiscoveryClient.test.ts` |
| The `hdx` pipeline upserts one row per qualifying CKAN resource and the `socrata` pipeline upserts one row per Socrata dataset, both using the shared readable-resource predicate | unit test on each pipeline's pure row-building functions, no network or DB |
| Re-running the pipeline never overwrites an existing row's cache columns | unit test asserting the upserted row object never carries `cached_*` keys |

## 9. Related documents

- [`connector-nomenclature.md`](connector-nomenclature.md): drive, connection,
  relation, drive index, the connector-vs-discovery distinction this spec
  builds on throughout.
- [`qetl-architecture.md`](../qetl-architecture.md) section 2.1 (client vs.
  wrapper), section 9 (capability record is declarative only, no planner
  yet), section 10 (adding a new connector).
- [`superpowers/specs/2026-08-19-qetl-open-data-apis-design.md`](../superpowers/specs/2026-08-19-qetl-open-data-apis-design.md):
  the CKAN acquisition model this spec extends, including why Socrata was
  explicitly out of scope there (section 13.1) and what it predicted a
  Socrata follow-up would need (true: no further catalog migration beyond the
  enum value).
- [`superpowers/specs/2026-10-13-qetl-postgres-connector-design/`](../superpowers/specs/2026-10-13-qetl-postgres-connector-design/2026-10-13-qetl-postgres-connector-design.md):
  where "connection" and "relation" were first fixed as shared vocabulary,
  and the precedent for a connector-agnostic edge function (section 5.4
  there, `connectors` here).
- [`measles-outbreak-response.md`](measles-outbreak-response.md) section 7.1:
  the demo-driven question that prompted this doc. Its own open design
  question is answered here; see section 7 above for what is actually being
  built versus deferred.
