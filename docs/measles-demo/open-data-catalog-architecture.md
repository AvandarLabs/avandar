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
   reading the same Supabase Storage project.

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
    AvandarSupabaseStorageClient/                      new - unifies the four clients below
    acquireOpenDataResource.ts                        extended: dispatches on api_service,
                                                       then tries the cache before either client
    openDataErrors.ts
    __tests__/

src/clients/storage/                                  unchanged paths, now documented as
  DatasetParquetStorageClient/                         four drives of one connector rather
  DatasetOriginalFileStorageClient/                    than four unrelated clients. Actually
  OpenDatasetParquetStorageClient/                      unifying their implementations behind
  PublicDatasetParquetStorageClient/                    AvandarSupabaseStorageClient is this
                                                        spec's proposal, not forced on day one:
                                                        each can adopt it independently, since
                                                        all four already read the same project.

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

`AvandarSupabaseStorageClient` takes an injected storage transport, the same
pattern `CkanClient` already uses for `OpenDataHttp` (`getJson`/`getBytes`):

```ts
export type AvandarStorageTransport = {
  download: (bucket: string, path: string) => Promise<Uint8Array<ArrayBuffer> | undefined>;
  upload: (bucket: string, path: string, bytes: Uint8Array<ArrayBuffer>) => Promise<void>;
  remove: (bucket: string, path: string) => Promise<void>;
};
```

This is necessary, not cosmetic: `src/clients/storage/*` today call
`AvaSupabase.db().storage.from(...)` directly, which is a browser-only client
singleton. `shared/` must stay reachable from the browser, Deno edge
functions, and Node with no such singleton (the same rule that already keeps
`CkanClient` injectable). The browser's default transport wraps the
authenticated Supabase JS client exactly as today; the pipeline/edge-function
default transport uses the service-role client. Each of the four existing
callers keeps its own call sites; only the bucket-and-path logic and the
actual network call move behind the shared client.

`DatasetParquetWrapper`'s dispatch gains one more named arm. Today:

```text
sourceType === "open_data"
  -> access_kind === "pipeline_parquet": anonymous fetch(parquetUrl)
  -> access_kind === "api_resource": CkanClient, always live
```

Target:

```text
sourceType === "open_data"
  -> access_kind === "pipeline_parquet": AvandarSupabaseStorageClient
  -> access_kind === "api_resource":
       check cache freshness (section 6)
       -> fresh:  AvandarSupabaseStorageClient (cache hit)
       -> stale:  CkanClient or SocrataClient, by api_service,
                  then write back through AvandarSupabaseStorageClient
```

No new `SourceWrapper`. `DatasetParquetWrapper`'s `CAPABILITIES` are
unchanged by this spec (`predicatePushdown: "none"`,
`wholeRelationAcquirable: "yes"`, `acquisitionUnit: { kind: "whole-relation" }`
all still hold for a cached, whole-relation Socrata/CKAN read); only
`freshnessSignal` moves from `"none"` to `"version-token"`, which the CKAN
generalization spec already flagged as pending integration work (section 7.4
there).

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

The cached object's bucket and path convention are an implementation detail
for whoever builds this (the exact bucket `catalogOpenDataInsert.ts` already
writes pipeline Parquet to should be confirmed and reused rather than
inventing a second one); the schema only needs `cached_object_path` to be
enough to resolve it unambiguously, the same way `parquet_file_name` already
is for pipeline rows.

## 5. The freshness-check and write-back cache flow

One function, shared across both connectors, called from
`_downloadApiOpenData` before either client is touched:

```text
acquire an api_resource entry:
  1. Read the catalog entry's cached_source_version (may be null - no cache yet).
  2. Ask the connector (CkanClient.getPackage / SocrataClient.getMetadata) for
     the live freshness token. This is the one call acquisition needs anyway
     (CKAN: package_show supplies the download URL too; Socrata: the metadata
     call is separate from the data call, but still one cheap request, no
     row data fetched).
  3. If cached_source_version is set AND equals the live token:
       read cached_object_path through AvandarSupabaseStorageClient. Done.
  4. Otherwise (no cache, or token changed):
       fetch the full resource live (CkanClient.getResourceBytes /
       SocrataClient.getRows), transcode to Parquet if needed (unchanged:
       DatasetParquetWrapper already owns this step for CSV),
       write the bytes to AvandarSupabaseStorageClient,
       update cached_object_path / cached_source_version / cached_at
       on the catalog entry,
       return the freshly-fetched bytes.
```

This is a cache-aside read, the same shape QETL's own storage tier already
uses (`qetl-architecture.md` section 6), one level further out: QETL's
existing IndexedDB tier still sits in front of all of this and is
untouched - a workspace that already has this relation resident never
reaches step 1 at all. What's new here is purely the *catalog entry's own*
cache, shared across every workspace, which is what makes the first
workspace to query a given catalog entry pay the live-fetch cost and every
subsequent workspace (and every subsequent session of the same workspace,
after IndexedDB eviction) get the fast path.

**Where this runs.** The write (step 4's storage write and catalog-entry
update) is a trust boundary, not a CORS problem (`connector-nomenclature.md`,
"A connector's drive does not have to be a third party"): a shared,
cross-workspace object should not be writable directly by any authenticated
client, even though Socrata's own fetch needs no proxy. So step 4's write
goes through the `open-data` edge function (service-role) for both
connectors. Socrata's steps 1-2 and the live-fetch half of step 4 *can* run
directly in the browser (no CORS problem), but routing all of it through one
server-side call keeps one code path instead of two, and keeps the
version-token race (two workspaces racing to write different outcomes of the
"is this stale" check) inside one process instead of two browsers.

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
- `api_service` gains `'socrata'`.
- The write-back cache (section 5), for both CKAN and Socrata.
- `AvandarSupabaseStorageClient`, unifying the four existing storage clients
  behind one injectable transport.
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

## 8. Testing references to add

Following `qetl-architecture.md` section 12's table shape:

| Behaviour | Pinned by |
| --- | --- |
| Freshness check reads the cache before either live client | new test on the shared acquisition function (section 5), asserting `getBytes`/`getRows` is not called when the live token matches `cached_source_version` |
| A changed token re-fetches live and overwrites the cache | same file, opposite case |
| `AvandarSupabaseStorageClient`'s four callers (`DatasetParquetStorageClient`, `DatasetOriginalFileStorageClient`, `OpenDatasetParquetStorageClient`, `PublicDatasetParquetStorageClient`) keep their existing behavior once rebased onto the shared transport | characterization tests per existing caller, asserting bucket and path are unchanged |
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
