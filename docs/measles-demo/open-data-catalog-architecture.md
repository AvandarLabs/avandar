# Open Data Catalog architecture

This is the reference for how the Open Data Catalog works: which connectors
serve it, how a relation's bytes actually get acquired today, what changes
once a Socrata connector and a write-back cache exist, and what stays
deferred. It assumes
[`connector-nomenclature.md`](connector-nomenclature.md) (drive, connection,
relation, metacatalog, the connector-vs-discovery distinction) and
[`qetl-architecture.md`](../qetl-architecture.md) section 2.1 (client vs.
wrapper). Facts are as of 2026-10-16 (`feat/demo/measles`, with
`feat/postgres-connector` merged in); section 8 lists what is proposed rather
than built.

**The one rule everything here follows, because the user who commissioned
this doc was explicit about it:** the Open Data Catalog is not a special
data-loading mechanism. It is connectors - CKAN, a future Socrata, and
`AvandarSupabaseStorage` - plugged into QETL with no special exceptions. A
catalog entry becomes an ordinary `datasets` row with `source_type:
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
    SocrataDiscoveryClient/                            new - the metacatalog client (section 7)
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
read by any authenticated user (matching `catalog_entries__open_data`'s own
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
                   update the catalog entry's cache_* columns (service-role)
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

`catalog_entries__open_data__api_service` (currently `enum('ckan')`) gains
`'socrata'`. No other new enum: `api_base_url` and `external_dataset_id`
already carry a SODA endpoint and a 4x4 dataset id without further migration,
exactly as the CKAN generalization spec predicted (section 13.1 there).

Three new nullable columns on `catalog_entries__open_data`, written only by
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
constraint catalog_entries__open_data__cache_complete check (
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
  1. Read the catalog entry's cached_source_version (may be null - no cache yet).
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
       on the catalog entry,
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
reaches step 1 at all. What's new here is purely the *catalog entry's own*
cache, shared across every workspace, which is what makes the first
workspace to query a given catalog entry pay the live-fetch cost and every
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

## 6. Metacatalog: live, not prebuilt, for v1

Verified: `api.us.socrata.com/api/catalog/v1?q=measles` returned results from
both `data.cityofnewyork.us` and `data.cdc.gov` in one call - a single
federated index Socrata already runs across every opted-in portal, CORS-open,
supporting a domain-scoped search (`?domains=data.cityofnewyork.us`) for
searching within one already-chosen drive. This is a real, live metacatalog
Avandar does not have to build.

`SocrataDiscoveryClient` wraps two jobs against this one API: drive search
(free text or `?domains=`, "is there a Chicago portal") and relation search
within a chosen drive (`?domains=<drive>&q=...`, "is there a measles dataset
here"). No prebuild for v1. A prebuilt regional slice
(`connector-nomenclature.md`'s "Prebuilt" metacatalog shape) stays documented
future work, for if the live API ever proves rate-limited or too slow for a
picker UI, not a v1 requirement.

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

**Explicitly deferred, not designed here, tracked in Linear and in
`production-plan-world-humanitarian-day.md`:**

1. Query-time pushdown (tier 3, section 2). Needs the capability-driven
   planner this repo does not have yet, for any source type.
2. Retrofitting Google Sheets and Postgres onto the drive/connection/relation
   model this spec and `connector-nomenclature.md` describe - specifically,
   multi-account Google Sheets support (a real `drive` entity, today
   implicit) and a Postgres server-level drive above today's one-database-per-
   connection shape.
3. A prebuilt Socrata metacatalog slice (section 6), should the live Discovery
   API prove insufficient.
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

## 8. Testing references to add

Following `qetl-architecture.md` section 12's table shape:

| Behaviour | Pinned by |
| --- | --- |
| Freshness check reads the cache before either live client | new test on the shared acquisition function (section 5), asserting `getBytes`/`getRows` is not called when the live token matches `cached_source_version` |
| A changed token re-fetches live and overwrites the cache | same file, opposite case |
| `AvandarSupabaseStorageClient` reads and writes the `open-data-catalog` bucket correctly, under an injected storage handle | unit test against a faked `SupabaseClient["storage"]`, no network |
| `OpenDatasetParquetStorageClient`'s existing `pipeline_parquet` read is unchanged by this spec | existing test suite stays green, untouched |
| `SocrataClient`/`SocrataDiscoveryClient` against a faked HTTP layer, no network | mirrors `CkanClient.test.ts`'s shape |
| CHECK constraints: cache columns are all-null or all-set; never set on a `pipeline_parquet` row | pgTAP, mirroring `catalog_entries_open_data_access.test.sql` |
| The `connectors` edge function rename does not change any route's behavior, only its path prefix | existing Postgres connector e2e spec, updated for the new prefix |

## 9. Related documents

- [`connector-nomenclature.md`](connector-nomenclature.md): drive, connection,
  relation, metacatalog, the connector-vs-discovery distinction this spec
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
