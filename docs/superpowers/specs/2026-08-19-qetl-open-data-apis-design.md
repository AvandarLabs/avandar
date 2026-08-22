# QETL open data APIs and HDX/CKAN acquisition - design

**Status:** Draft for review
**Author:** pablo@avandarlabs.com (brainstormed with Claude)
**Date:** 2026-08-19
**Spec:** Lane B. Parent: `.temp/qetl/final_proposal.md` (revision 7), section 11.1
(open data APIs and the three capability fields), section 11.2 (the two
acquisition modes), section 17 Phase 1
**Related:**
`docs/superpowers/specs/2026-08-18-qetl-google-sheets-design.md` (spec 4, the
closest analogue: a second connector behind the same contract),
`docs/superpowers/specs/2026-08-18-qetl-relation-registry-design.md` (spec 1,
owns `DatasetParquetWrapper`, which is this spec's integration seam),
`docs/superpowers/specs/2026-08-18-qetl-relation-cache-design.md` (spec 2, owns
the relation cache and stores the `SourceVersion` this spec produces),
`shared/models/relations/RelationCapabilities/RelationCapabilities.types.ts`,
`shared/models/relations/SourceWrapper/SourceWrapper.types.ts`,
`shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types.ts`,
`supabase/schemas/10.catalog_entries__open_data.sql`,
`apps/pipeline-server/pipelines/world-bank__wdi/catalogOpenDataInsert.ts`,
`apps/desktop/sync/syncable-tables.ts`

> **Code blocks in this document are illustrative and have not been compiled**,
> except where a block is explicitly marked `verified`. Treat the repository as
> the authority on every signature. Earlier QETL plan documents shipped sample
> code that did not compile; this banner exists so nobody repeats that.
>
> Shell transcripts and measured numbers in section 3 **are** verified: each was
> produced by running the command against the live HDX API on 2026-08-19. They
> are reproducible and each one names its command.

---

## 1. Problem

### 1.1 The catalog models pipeline artifacts, not sources

`supabase/schemas/10.catalog_entries__open_data.sql` requires three columns that
only a pipeline can supply:

```sql
parquet_file_name text not null,
pipeline_name text not null,
pipeline_run_id text not null,
constraint unique_parquet_file_pipeline unique (parquet_file_name, pipeline_name)
```

So a catalog row cannot describe a dataset that Avandar did not itself convert to
Parquet on a pipeline run. The table is a registry of **artifacts we produced**,
not of **sources we can read**. Every open data source that answers over HTTP is
unrepresentable, which is the whole gap this spec closes.

### 1.2 Acquisition is a string heuristic over an untyped URL array

`DatasetParquetWrapper._downloadOpenDataParquet` (on `feat/qetl-registry`) picks
the access path by scanning a free-text array:

```ts
const parquetUrl = catalogEntry?.canonicalUrls?.find((url) => {
  return url.toLowerCase().endsWith(".parquet");
});
```

`canonical_urls` is documented as "the dataset's landing page, the API base URL,
the documentation URL" - a human-facing bibliography. Overloading it as the
machine-readable access path means the access path is untyped, unvalidated, order
dependent, and indistinguishable from documentation. A landing page that happens
to end in `.parquet` would be downloaded as data.

### 1.3 Nothing names the resource

This is the same defect spec 4 calls "the no column names the tab problem", and
on CKAN it is worse. A CKAN dataset holds N resources. Verified against HDX:

```console
$ curl -s 'https://data.humdata.org/api/3/action/package_show?id=movement-range-maps'
435ed157-... | TXT | False |      961 | How To Understand This Data.txt
55a51014-... | zip | False | 73054975 | movement-range-data-2022-05-22.zip
3d77ce5c-... | TXT | False | 56561599 | movement-range-data-2020-03-01--2020-12-31.zip
```

The **first** resource of that dataset is a readme. Spec 4 could afford a
nullable tab column meaning "the first sheet", because the first sheet of a
spreadsheet is usually the data. The first resource of a CKAN dataset is
routinely a readme, a codebook, or a licence. An implicit "first resource" rule
here is not a convenience, it is a wrong answer with a plausible shape.

### 1.4 Consequence

Both halves of the proposal's section 11.2 branch are unreachable today, not
because the branch is missing but because the catalog cannot describe a source
for either half to act on. The capability contract in
`RelationCapabilities.types.ts` already has every field needed
(`wholeRelationAcquirable`, `maxRowsPerCall`, `maxBytesPerCall`,
`aggregatePushdown`); nothing produces honest values for them.

---

## 2. Goals and non-goals

**Goals.**

1. **Generalize `catalog_entries__open_data`** from one pipeline artifact shape
   to a discriminated access shape, with the pipeline shape preserved bit for bit
   (section 6).
2. **A CKAN client and an acquisition module** that turn a catalog entry into
   bytes plus a `SourceVersion`, with an injected HTTP layer, no QETL dependency,
   and no `SourceWrapper` (section 5).
3. **Honest per-resource capability values**, including what
   `wholeRelationAcquirable: "probe"` actually costs and what it actually answers
   on HDX (section 7).
4. **A `SourceVersion` for a CKAN resource**, with its trustworthiness stated
   rather than assumed (section 8).
5. **Back-compat**: every existing pipeline-produced entry keeps working, and the
   pipeline upsert is not modified (section 6.5).

**Non-goals.** Each is named so this spec stays bounded.

- **No `SourceWrapper`, and no change to `createDefaultRegistry`.** Both live on
  `feat/qetl-registry`. This spec delivers the module its
  `_downloadOpenDataParquet` will call (section 5.1).
- **No change to `shared/models/relations/`.** The capability contract already
  has the three fields. This spec produces values behind them; it adds no type
  there. Section 7.4 records the one thing integration must change in
  `DatasetParquetWrapper`'s declaration, and it is smaller than expected.
- **No relation cache, cache key, or result cache.** Spec 2 owns those. This spec
  produces the version token; spec 2 stores and compares it.
- **Socrata is out of scope for this lane.** Section 13.1 gives the reasoning and
  what a follow-up needs.
- **The datastore pushdown path is specified, not implemented.** Section 3.2
  shows why: it is unreachable with the credentials Avandar has. Section 9
  specifies its paging and tearing semantics anyway, because the spec was asked
  to and because a follow-up should not have to re-derive them.
- **The byte proxy is specified, not implemented.** Section 5.3 is the one hard
  external dependency and it is outside this lane's owned file set.
- **No catalog browse or import UI.** This spec makes an API-backed entry
  describable and acquirable. Putting one in front of a user is downstream work.

---

## 3. Verified findings against the live HDX API

**Read this section before section 4.** Five measurements changed the design.
Each names the command that produced it, run 2026-08-19 against
`https://data.humdata.org`.

### 3.1 Metadata is CORS-open; resource bytes are not

```console
$ curl -sI -H 'Origin: https://app.avandar.co' \
    'https://data.humdata.org/api/3/action/package_show?id=movement-range-maps'
HTTP/2 200
access-control-allow-origin: *

$ curl -sI -H 'Origin: https://app.avandar.co' \
    'https://data.humdata.org/dataset/c3429f0e.../resource/435ed157.../download/readme.txt'
HTTP/2 302
location: https://s3.us-east-1.amazonaws.com/hdx-production-filestore/...
access-control-allow-origin: https://data.humdata.org

$ curl -s -o /dev/null -D - -X OPTIONS -H 'Origin: https://app.avandar.co' \
    -H 'Access-Control-Request-Method: GET' '<same download url>'
HTTP/2 200
allow: OPTIONS, HEAD, GET
access-control-allow-origin: https://data.humdata.org
```

**`/api/3/action/*` sends `access-control-allow-origin: *`. The download path
sends `access-control-allow-origin: https://data.humdata.org` and nothing else,
on both the preflight and the simple GET.**

So metadata can be read directly from the browser, and **resource bytes cannot**.
This is the single most consequential finding in this document, and it is a real
break from spec 4: spec 4 fetches Drive bytes in the browser because Drive
endpoints support CORS. HDX's do not.

Note also that the download is a **302 to a presigned S3 URL** carrying an
`Expires` and an `x-amz-security-token`, regenerated per request. Any byte
fetcher must follow redirects, must not cache the redirect target, and must not
log the `Location` header, which contains a credential.

Why today's open data path does not already hit this: verified in
`catalogOpenDataInsert.ts:170`, the Parquet URL written into `canonical_urls` is
`supabase.storage.from(bucket).getPublicUrl(objectPath)`, an **Avandar-owned**
origin that is CORS-open to Avandar. HDX is the first genuinely third-party
origin the catalog has ever pointed at, which is why no proxy exists yet.

### 3.2 Both datastore actions require authentication on HDX

```console
$ curl -s -w '\nHTTP %{http_code}\n' \
    'https://data.humdata.org/api/3/action/datastore_search?resource_id=e3a18c4c-...&limit=2'
{"error": {"__type": "Authorization Error",
           "message": "Access denied: Action datastore_search requires an authenticated user"},
 "success": false}
HTTP 403

$ curl -s --get 'https://data.humdata.org/api/3/action/datastore_search_sql' \
    --data-urlencode 'sql=SELECT count(*) FROM "e3a18c4c-..."'
{"error": {"__type": "Authorization Error",
           "message": "Access denied: Action datastore_search_sql requires an authenticated user"},
 "success": false}

$ curl -s -o /dev/null -w '%{http_code}\n' \
    'https://data.humdata.org/api/3/action/datastore_info?id=e3a18c4c-...'
403
```

The resource id above is a real, `datastore_active: true` resource. The gate is
per action and fires **after** resource lookup, confirmed because a nonexistent
resource id returns `404 Not Found` rather than `403`:

```console
$ curl -s -o /dev/null -w '%{http_code}\n' \
    '.../datastore_search?resource_id=00000000-0000-0000-0000-000000000000&limit=1'
404
```

The proposal's section 11.1 said `datastore_search_sql` is "disabled by default on
most CKAN deployments". On HDX specifically the stronger statement holds:
**`datastore_search`, `datastore_search_sql` and `datastore_info` are all
anonymous-forbidden.** Avandar holds no HDX API key. So the entire pushdown half
of section 11.2 is unreachable for HDX today, and no amount of per-resource
discovery changes that.

### 3.3 `datastore_active` is set on 1 resource in 441

```console
$ curl -s 'https://data.humdata.org/api/3/action/package_search?q=res_format:CSV&rows=200'
resources scanned: 440   datastore_active: 1
```

(A separate 25-row sample found 0 of 441 across both runs bar the one.) The one
hit was `hdx-hapi-operational-presence`. `package_search` reports
`"count": 13854` CSV datasets in total, so the sample is a small slice, but the
direction is unambiguous: **on HDX the datastore is the rare exception.** The
handoff's phrasing that an unpopulated datastore is "the common case, not the
edge" understates it. Combined with 3.2, the resource file is not the fallback,
it is the path.

### 3.4 Which freshness fields are actually populated

Same 440-resource sample:

| Field                   | Non-empty   | Note                                           |
| ----------------------- | ----------- | ---------------------------------------------- |
| `hash`                  | **440/440** | 32 hex chars on every one, i.e. an MD5         |
| `size`                  | 440/440     | bytes                                          |
| `last_modified`         | 440/440     | e.g. `2022-05-24T04:02:33.007599`, no timezone |
| `metadata_modified`     | 440/440     | per resource, and also present per package     |
| `format`                | 440/440     | `CSV` 380, `JSON` 52, `GeoJSON` 4, `XLSX` 4    |
| `mimetype`              | 262/440     | **not** reliable; do not branch on it          |
| `url` == `download_url` | 440/440     | one URL, not two                               |

`hash` looks like the ideal version token and mostly is, but it is **not
guaranteed**: the `readme.txt` resource in 1.3, an older upload, carries
`"hash": ""`. So `hash` is preferred-when-present, never assumed. Section 8.

### 3.5 `url_type: "api"` resources are not files, and may be plain HTTP

```console
url_type: upload 388, api 52
{"name": "CERF Allocations.json", "format": "JSON", "size": 7326657,
 "url": "http://cerfgms-webapi.unocha.org/v1/hdxproject/all.json"}
```

52 of 440 resources have `url_type: "api"`, and their `url` points at a
**third-party host, over plain `http://`**. These are neither HDX-hosted files
nor datastore endpoints: they are arbitrary upstream APIs with no shared contract,
no size guarantee and no TLS. Section 11 rejects them explicitly rather than
downloading them.

---

## 4. Decisions (resolved)

| Decision                                  | Resolution                                                                                                                                                                                                                | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog generalization shape              | **A discriminated `access_kind` enum column plus four typed columns, with CHECK constraints per kind.** Not a JSONB blob                                                                                                  | Proposal section 11 requires "a typed value per connector, not documentation and not JSON config". A discriminant is what makes the TypeScript union exhaustive and the SQL invariant a database fact rather than a convention                                                                                                                                                                                                                             |
| Which existing columns carry the API case | **`external_dataset_id` yes, `external_service_name` no**                                                                                                                                                                 | The handoff nominated both. `external_dataset_id` is genuinely the CKAN dataset id. `external_service_name` holds prose today (`"World Development Indicators API"`, verified in `catalogOpenDataInsert.ts:191`) and its own column comment says "External name of the service"; overloading a display-name column as a machine discriminant is how 1.2 happened. Section 6.1 adds `api_service` instead and leaves `external_service_name` a display name |
| The existing unique constraint            | **Do not touch it.** Add a separate partial unique index for API rows                                                                                                                                                     | Making its columns nullable neither drops nor invalidates it, and the pipeline's `ON CONFLICT (parquet_file_name, pipeline_name)` keeps inferring it. Converting it to a partial index **would** break that upsert, because `ON CONFLICT` inference against a partial index requires the statement to repeat the index predicate, which supabase-js cannot express. Section 6.3                                                                            |
| Resource identity                         | **`api_resource_id` is required for API rows. No implicit first resource**                                                                                                                                                | Section 1.3: the first resource of a real HDX dataset is a readme. This is a deliberate divergence from spec 4's nullable `sheet_name`                                                                                                                                                                                                                                                                                                                     |
| Acquisition mode for HDX                  | **Relation acquisition of the resource file, always**                                                                                                                                                                     | Section 3.2. The pushdown half of section 11.2 is anonymous-forbidden on HDX, so there is nothing to push down. This also means `predicatePushdown: "none"` is correct, which is what `DatasetParquetWrapper` already declares                                                                                                                                                                                                                             |
| How `"probe"` is probed                   | **Read `datastore_active` off the `package_show` response already being fetched. Zero extra calls**                                                                                                                       | Section 7.1. The probe is free because the same call supplies the download URL. Its answer on HDX is constant for reachability reasons (3.2), which is worth recording rather than pretending discovery is live                                                                                                                                                                                                                                            |
| Datastore fetch path                      | **Specified, not implemented**                                                                                                                                                                                            | Section 3.2. Implementing it would be untestable dead code. Section 9 specifies paging and tearing so a follow-up need not re-derive them                                                                                                                                                                                                                                                                                                                  |
| Where bytes are fetched                   | **Through an injected byte fetcher. Default is direct `fetch`, which is correct in Node, in the desktop app, and against Avandar's own storage. The browser needs a proxy, which this lane specifies and does not build** | Section 3.1 and section 5.3. Direct-default is what keeps the existing Supabase-storage Parquet path working unchanged                                                                                                                                                                                                                                                                                                                                     |
| What "bytes" means                        | **A discriminated `{ contentKind: "parquet" \| "csv", bytes }`, not a Parquet blob**                                                                                                                                      | Section 10. Transcoding CSV to Parquet requires DuckDB, and dragging a DuckDB client into this module would break both "no dependency on QETL" and testability against a faked HTTP layer. The caller already owns a DuckDB client                                                                                                                                                                                                                         |
| `SourceVersion`                           | **`hash` when non-empty, else `last_modified` and `size` joined; opaque, never parsed**                                                                                                                                   | Section 3.4 and section 8. Stated as a change **hint**, not proof of sameness                                                                                                                                                                                                                                                                                                                                                                              |
| Socrata                                   | **Out of scope for this lane**                                                                                                                                                                                            | Section 13.1                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Where the module lives                    | **`shared/`, not `src/clients/`**                                                                                                                                                                                         | It must be reachable from the browser, from a Deno proxy route, and from Node tests. `shared/` is the only tree all three can import. It also satisfies the handoff's rule 3, since nothing here is a client singleton                                                                                                                                                                                                                                     |

---

## 5. Architecture

### 5.1 The integration seam

The handoff's constraint is that integration must be a handful of lines in one
function body. `DatasetParquetWrapper._downloadOpenDataParquet` today resolves an
open data dataset to a catalog entry, scans `canonical_urls`, and returns a
`Blob`. This spec delivers a plain async module with pure inputs and outputs:

```text
  Today (feat/qetl-registry)              After integration
  --------------------------              ------------------
  _downloadOpenDataParquet(dataset)       _downloadOpenDataParquet(dataset)
    OpenDataDatasetClient -> source         OpenDataDatasetClient -> source
    OpenDataCatalogEntryClient -> entry     OpenDataCatalogEntryClient -> entry
    canonicalUrls.find(.parquet)   <-.      acquireOpenDataResource({ entry })
    fetch(parquetUrl)                 |       -> { contentKind, bytes,
    return blob                       |            sourceVersion }
                                      |       if csv: DuckDbClient.loadCsv
                    this spec replaces --'     return { blob, sourceVersion }
```

Everything above the dashed line stays on the registry branch. This lane owns
`acquireOpenDataResource` and everything it calls.

Illustrative signature (not compiled):

```ts
export type OpenDataAcquisition = {
  /** How the bytes must be read. `csv` still needs a DuckDB transcode. */
  contentKind: "parquet" | "csv";
  bytes: Uint8Array<ArrayBuffer>;
  /** Opaque change token, compared for equality and never parsed. */
  sourceVersion: SourceVersion | undefined;
  /**
   * Whether the source reported a populated datastore for this resource.
   * Recorded, not acted on: reaching it needs a credential Avandar lacks.
   */
  datastoreActive: boolean;
};

export async function acquireOpenDataResource(params: {
  entry: OpenDataCatalogEntry.T;
  http: OpenDataHttp;
  maxBytes?: number;
}): Promise<OpenDataAcquisition>;
```

`OpenDataHttp` is the injected layer, two functions and no state, so every test
in section 12 runs without a network:

```ts
export type OpenDataHttp = {
  /** CORS-open metadata reads. Returns parsed JSON. */
  getJson: (url: string) => Promise<unknown>;
  /** Byte reads. Must follow redirects. See 5.3 on where this can run. */
  getBytes: (url: string) => Promise<Uint8Array<ArrayBuffer>>;
};
```

The two are separate on purpose: per section 3.1 they have different CORS
answers, so in the browser they need different transports. A single `fetch`-shaped
dependency would hide that.

### 5.2 The CKAN client

`shared/CkanClient/`, no state, every call taking its base URL as an argument:

| Call             | Request                                                                             | Verified                       |
| ---------------- | ----------------------------------------------------------------------------------- | ------------------------------ |
| Dataset metadata | `GET {baseUrl}/api/3/action/package_show?id={datasetId}`                            | yes, 3.1                       |
| Datastore page   | `GET {baseUrl}/api/3/action/datastore_search?resource_id={id}&limit={n}&offset={n}` | yes, 403 anonymous on HDX, 3.2 |
| Resource bytes   | `GET {resource.url}`, following redirects                                           | yes, 3.1                       |

Every CKAN action response is `{ success: boolean, result?: ..., error?: { __type, message } }`,
so the client checks `success` before `result` and maps `error.__type` to a named
error (section 11). A `200` with `success: false` is possible in CKAN and must not
be read as a win.

CKAN's response is validated with Zod at the boundary, and only the fields this
spec uses are required. Per 3.4, `mimetype` is absent on 40% of resources, so it
is optional and never branched on; `format` is required.

### 5.3 The byte proxy: a Supabase edge route, and it is built

Per 3.1, a browser cannot fetch HDX resource bytes. The answer is a Supabase edge
route, and it turned out cheaper than expected: **`ValidReturnType` already
includes `Response`** (`api.types.ts:5`) and MiniServer passes a raw `Response`
straight through (`MiniServer.ts:389`: `response instanceof Response ? response :
responseSuccess(response)`). So no base64 envelope and no 33% tax; `responseSuccess`
is simply not the helper this route uses.

`supabase/functions/open-data/` serves:

```text
GET /open-data/catalog-entries/:catalogEntryId/resource
  -> 200, body = the resource's bytes, Content-Type: application/octet-stream
     X-Ava-Content-Kind:   parquet | csv
     X-Ava-Source-Version: the token from section 8, when there is one
```

Both custom headers are named in `Access-Control-Expose-Headers`. Without that
the fetch succeeds and the headers are invisible, because a cross-origin response
exposes only the CORS-safelisted set. That is a silent failure, not a loud one.

#### 5.3.1 Why this is not an open relay

A proxy that fetches a URL a client supplies is a server-side request forgery
hole: the caller could reach hosts a browser never could. This route never
accepts a URL. The chain is:

1. **The client sends a catalog entry id and nothing else.** A UUID, schema
   checked.
2. **The API root comes from the catalog row**, where a CHECK constraint already
   requires `https` (6.1).
3. **The resource URL comes from CKAN's own `package_show` response**, not from
   the caller.
4. **`getCkanResourceFromPackage` refuses a resource URL whose host is not the
   catalogued one** (`resource-host-mismatch`), compared as an exact host match on
   an `https` URL. An unparseable or `http` URL yields an empty host, so neither
   can ever match.
5. **The size ceiling is checked from metadata**, before any byte is read.
6. **`createOpenDataHttp` bounds the read twice**: against the declared
   `Content-Length`, and again while streaming, because a response that
   under-declares its length would otherwise be unbounded.

Step 4 was added because of this route. It is unnecessary when the fetch runs in
a browser, which is confined by the same CORS rules that made the proxy
necessary; it is load-bearing once the fetch runs server-side. Note the ordering
consequence in 7.2: an exact-match check is what makes a suffix bypass
(`evil-data.humdata.org` against `data.humdata.org`) fail, and there is a test
and a mutation for exactly that.

#### 5.3.2 What is still deliberately not built

**Server-side acquisition into Avandar storage** was the other option: acquire
once, write to the `opendata` bucket, and let the browser read its own origin as
it does today. It is slower to first byte and it reuses the existing storage path
and its caching. Not built, because the relay is enough to make the path work and
the caching question belongs with the lane that owns the relation cache.

**The module still takes `getBytes` as an argument**, so nothing about this route
is load-bearing for the design. In Node and on desktop the direct reader is
correct and the route is unnecessary; the existing Supabase-storage Parquet path
keeps working unchanged in the browser either way, because that origin is
CORS-open to Avandar.

### 5.4 Module layout

```text
shared/open-data/                               new
  CkanClient/
    CkanClient.ts                               package_show, resource bytes
    CkanClient.types.ts                         CkanPackage, CkanResource, OpenDataHttp
    CkanClient.schemas.ts                       Zod at the boundary
    CkanClient.test.ts                          injected http, error mapping
  acquireOpenDataResource.ts                    the seam (5.1)
  acquireOpenDataResource.test.ts
  getCkanResourceFromPackage.ts                 pure: pick + validate the resource
  getCkanResourceFromPackage.test.ts
  buildCkanSourceVersion.ts                     pure: the version token (8)
  buildCkanSourceVersion.test.ts
  buildCsvFromDatastoreRecords.ts               pure: records -> CSV text (10.2)
  __tests__/
    buildCsvFromDatastoreRecords.test.ts        structure only
  openDataErrors.ts                             the failure type (11)

src/lib/openData/__tests__/                     new
  buildCsvFromDatastoreRecords.executed.test.ts DuckDB round-trip
  fixtures/
    hdx-fts-requirements-funding-covid-mwi.csv  a real 235-byte HDX resource
    README.md                                   its provenance URL

shared/models/catalog-entries/OpenDataCatalogEntry/    existing, extended
  OpenDataCatalogEntry.types.ts                 + access columns, + access union
  OpenDataCatalogEntryParsers.ts                + Zod fields
  OpenDataCatalogEntryModule.ts                 new: toAccess(entry)
  OpenDataCatalogEntryModule.test.ts

supabase/schemas/
  00.enum.catalog_entries__open_data__access_kind.sql   new
  00.enum.catalog_entries__open_data__api_service.sql   new
  10.catalog_entries__open_data.sql                     nullability, columns, checks
supabase/migrations/
  <timestamp>_generalize_open_data_catalog_access.sql   generated
supabase/tests/database/
  catalog_entries_open_data_access.test.sql             pgTAP (6.3, 6.5)

apps/desktop/scripts/gen-sqlite-migrations/
  getManualMigrationBodyFromSourceFile.ts               + one override (6.6)
apps/desktop/migrations/
  <timestamp>_generalize_open_data_catalog_access.gen.sql   generated
```

Nothing lands in `shared/models/relations/`, and nothing lands under
`src/clients/qetl/`. `shared/open-data/` holds only pure functions and the
injected-dependency seam, which is what the handoff's rule 3 requires: no client
singleton is importable from any of it, so a Node test cannot drag
`@lingui/core/macro` in through the back door.

Two placements are worth explaining, because neither is the obvious one.

**The CKAN client is inside `shared/open-data/`, not beside it.** It raises the
same failure type as everything else here, so nesting it makes that a sibling
import rather than a client reaching sideways into a feature directory.

**The DuckDB round-trip suite is under `src/`, not beside its module.** It reuses
`withDuckDb` from `src/lib/sql/__tests__/executedDuckDb.ts`, whose driver is
Node-only. Anything under `shared/` is type-checked by Deno and, by
`eslint.config.js:247`, may use only path-alias imports; there is no
Deno-resolvable alias for `src/`, so importing the harness from `shared/` fails
both `deno check shared` and lint. The alternative was a second copy of
`withDuckDb`, whose entire purpose is to be the one place a DuckDB instance is
guaranteed to be closed. The structural assertions stay in
`shared/open-data/__tests__/`; only the ones that need a real reader moved.

Two paths outside the owned set are touched, and both are named in section 15:
the desktop migration override, and the generated desktop migration.

---

## 6. The catalog schema change

### 6.1 The discriminated access shape

Two enums, following the repo's `00.enum.<table>__<field>.sql` convention:

```sql
create type public.catalog_entries__open_data__access_kind as enum(
  'pipeline_parquet',
  'api_resource'
);

create type public.catalog_entries__open_data__api_service as enum('ckan');
```

`api_service` names the **protocol**, not the host: HDX is a CKAN, and a second
CKAN instance is the same client. A one-value enum is deliberate; a Socrata
follow-up (13.1) adds a value rather than reinterpreting a string.

Changes to `catalog_entries__open_data`:

```sql
-- New discriminant. Defaulted so the backfill is implicit for existing rows.
access_kind public.catalog_entries__open_data__access_kind
  not null default 'pipeline_parquet',

-- Was `not null`, now nullable: only a pipeline-produced entry has these.
parquet_file_name text,      -- was: not null
pipeline_name text,          -- was: not null
pipeline_run_id text,        -- was: not null

-- New, API-only. Null on every pipeline row.
api_service public.catalog_entries__open_data__api_service,
api_base_url text,           -- e.g. https://data.humdata.org
api_resource_id text,        -- the CKAN resource id within the dataset
api_resource_format text,    -- CKAN `format`, e.g. CSV. See 6.1.1
```

`external_dataset_id` becomes the CKAN **dataset** id (slug or uuid) for API
rows, as the handoff directs. It stays nullable in the column definition and is
made required for API rows by CHECK, because it is genuinely optional for
pipeline rows today.

The invariant is two CHECK constraints, one per kind, so the discriminant does
real work in the database and not only in TypeScript:

```sql
constraint catalog_entries__open_data__pipeline_access_complete check (
  access_kind <> 'pipeline_parquet'
  or (
    parquet_file_name is not null
    and pipeline_name is not null
    and pipeline_run_id is not null
    and api_service is null
    and api_base_url is null
    and api_resource_id is null
    and api_resource_format is null
  )
),
constraint catalog_entries__open_data__api_access_complete check (
  access_kind <> 'api_resource'
  or (
    api_service is not null
    and api_base_url is not null
    and api_resource_id is not null
    and api_resource_format is not null
    and external_dataset_id is not null
    and parquet_file_name is null
    and pipeline_name is null
    and pipeline_run_id is null
  )
),
```

Both halves matter. The positive half stops an incomplete row; the negative half
("`api_*` must be null on a pipeline row") is what keeps the two shapes from
blurring into one row with every column set and no clear meaning.

`api_base_url` additionally requires `https`, per 3.5:

```sql
constraint catalog_entries__open_data__api_base_url_is_https check (
  api_base_url is null or api_base_url like 'https://%'
),
```

#### 6.1.1 Why `api_resource_format` is stored and not just read live

The format decides how the bytes are parsed, so it is needed at plan time, and
storing it makes an entry's readability checkable without a network call. It is a
**cache of CKAN's `format`**, which can drift if a resource is replaced. The
module therefore treats the stored value as the _expected_ format and the live
`package_show` value as authoritative, raising a named mismatch error rather than
silently parsing bytes as the wrong thing (section 11).

### 6.2 What changes, file by file

| File                                                                   | Change                                                                                                                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/schemas/00.enum.catalog_entries__open_data__access_kind.sql` | New, one `create type`                                                                                                                                                            |
| `supabase/schemas/00.enum.catalog_entries__open_data__api_service.sql` | New, one `create type`                                                                                                                                                            |
| `supabase/schemas/10.catalog_entries__open_data.sql`                   | Nullability on three columns, five new columns, three CHECKs, one partial unique index. The existing `unique_parquet_file_pipeline` is left byte-identical                        |
| `shared/models/catalog-entries/.../OpenDataCatalogEntry.types.ts`      | Three fields become `string \| undefined`; five fields added; the `OpenDataAccess` union added                                                                                    |
| `shared/models/catalog-entries/.../OpenDataCatalogEntryParsers.ts`     | `DBReadSchema` gains the five columns and loosens three to `.nullable()`. The existing `ZodConsistencyTests` block fails to compile if any is missed, which is the intended guard |
| `shared/models/catalog-entries/.../OpenDataCatalogEntryModule.ts`      | New: `toAccess(entry)`                                                                                                                                                            |
| `shared/types/database.types.ts`                                       | Regenerated, not hand-edited                                                                                                                                                      |

### 6.3 How the existing uniqueness constraint survives

The question the handoff asks is whether `unique (parquet_file_name,
pipeline_name)` survives rows where both are null. It does, for three separate
reasons, and each is worth stating because getting any of them wrong breaks the
pipeline.

1. **Making a column nullable does not drop or invalidate its unique index.**
   The constraint and its backing index are untouched by `alter column ... drop
not null`.
2. **Postgres 15 defaults to `NULLS DISTINCT`** (`supabase/config.toml:36` sets
   `major_version = 15`). Two rows with `(null, null)` therefore do not conflict,
   so any number of API rows coexist under the constraint. The constraint simply
   stops constraining them, which is correct: it is a statement about pipeline
   artifacts.
3. **The pipeline upsert keeps working unchanged.**
   `catalogOpenDataInsert.ts:215` does
   `.upsert(rows, { onConflict: "parquet_file_name,pipeline_name" })` and always
   supplies both values. `ON CONFLICT` infers the unchanged unique constraint
   exactly as before.

Point 3 is why the constraint must **not** be converted to a partial index
(`where access_kind = 'pipeline_parquet'`), tidy as that would look.
`ON CONFLICT` inference against a partial index requires the statement to repeat
the index predicate, and supabase-js's `upsert` has no way to express one. A
"cleanup" here silently converts every pipeline re-run from an upsert into a
duplicate-key failure.

API rows get their own rule, as a partial unique index. All four key columns are
CHECK-guaranteed non-null on those rows, so `NULLS DISTINCT` is moot for it:

```sql
create unique index catalog_entries__open_data__api_resource_unique
  on public.catalog_entries__open_data (
    api_service, api_base_url, external_dataset_id, api_resource_id
  )
  where access_kind = 'api_resource';
```

The key includes `api_base_url` because the same dataset slug on two CKAN
instances is two different datasets, and `api_resource_id` because one CKAN
dataset legitimately yields several catalog entries, one per resource (1.3).

pgTAP coverage for all of it is in section 12.2.

### 6.4 Model layer

`OpenDataCatalogEntryRead` gains the columns, and the access shape is exposed as
a union that mirrors the CHECK constraints, so a consumer switches on `kind`
rather than testing four fields for null. Illustrative (not compiled):

```ts
export type OpenDataAccess =
  | {
      kind: "pipeline_parquet";
      parquetFileName: string;
      pipelineName: string;
      pipelineRunId: string;
    }
  | {
      kind: "api_resource";
      apiService: "ckan";
      apiBaseUrl: string;
      ckanDatasetId: string;
      ckanResourceId: string;
      expectedFormat: string;
    };
```

`OpenDataCatalogEntryModule.toAccess(entry)` builds it, and is the only place the
null-checks live. It is named `toAccess` and not `resolveAccess`: it converts the
whole receiver into another representation of itself, which is the `to` shape in
`docs/rules/typescript.md:265`. `resolve` and `_resolve` are banned there, and
`probe` is reserved for `RelationCachePort`, so no function in this spec carries
either name.

`toAccess` must be **total but not lying**. The database guarantees a complete
shape per kind, but a `Read` type reconstructed from a stale client cannot be
trusted to, so `toAccess` returns `undefined` for a row that satisfies neither
shape, and the caller raises a named error. Returning a half-built union would
push the null-checks right back out to every call site.

Note the union deliberately does **not** carry the Parquet URL for the pipeline
case. That URL still comes from `canonical_urls`, unchanged, because changing it
would mean a data migration over live rows for no gain in this lane. Section 13.2
records it as the remaining piece of 1.2 that this spec does not fix.

### 6.5 Back-compat for existing entries

Existing rows are unaffected by construction:

- `access_kind` has `default 'pipeline_parquet'`, so `alter table add column`
  stamps every existing row with the right discriminant in one pass. No separate
  backfill statement, and no window in which a row has no kind.
- The three columns going nullable were `not null`, so every existing row already
  holds a value, and the `pipeline_access_complete` CHECK is satisfied the moment
  it is created.
- The new `api_*` columns are null on every existing row, which is exactly what
  that CHECK's negative half requires.
- `unique_parquet_file_pipeline` is untouched (6.3), so the pipeline upsert is
  untouched.
- `canonical_urls` and the `.parquet` scan are untouched, so
  `_downloadOpenDataParquet` keeps working for pipeline rows after integration.

**The CHECK constraints arrive as `not valid` followed by a `validate
constraint` pass, and this needs no hand-editing.** `supabase db diff` emits that
pair for a CHECK by itself, verified in two existing migrations:
`20260517193144_requires_app_access_column.sql:14` and
`20260816020200_dashboard_snapshot_transitions.sql:152`. `not valid` keeps the
full-table scan out of the `ACCESS EXCLUSIVE` window and the validation pass then
verifies existing rows under a weaker lock. Worth knowing because the generated
migration must not be hand-completed (`supabase-declarative-schema`: the only
permitted hand-edits are removing view churn and adding omitted ACL statements,
and `pnpm db:new-migration` already appends the latter). If the generated
migration does **not** contain the pair, that is a signal to re-read it, not to
add the statements manually.

Section 12.2's pgTAP test asserts the back-compat claims against rows inserted
the old way, not against fixtures, because every claim here is a claim about
existing data.

### 6.6 The desktop SQLite mirror

`catalog_entries__open_data` is listed in `apps/desktop/sync/syncable-tables.ts:40`,
so rows arrive on the desktop client from Postgres. The mirror's current
definition carries the NOT NULLs:

```sql
-- apps/desktop/migrations/20260329222138_...gen.sql:16, verified
ALTER TABLE "catalog_entries__open_data" ADD COLUMN "parquet_file_name" TEXT NOT NULL;
```

**So an API-kind row would fail to insert on the desktop client.** This is not
cosmetic drift; it is a sync failure, and it is the most likely way this spec
ships looking green and breaks on one platform.

SQLite has no `ALTER COLUMN`, and
`apps/desktop/scripts/gen-sqlite-migrations/partition.ts:45` routes `ALTER COLUMN`
to `needsHandEdit` precisely because it cannot be transpiled. The mechanism for
this already exists: `getManualMigrationBodyFromSourceFile.ts` holds checked-in
SQLite bodies keyed by Postgres migration basename, with three precedents. This
spec adds a fourth, doing the standard SQLite table rebuild (create the relaxed
table, copy, drop, rename) plus the new columns.

Following the precedent's reasoning, the CHECK constraints and the enums are
**not** mirrored: SQLite has no enums, cannot `ADD CONSTRAINT`, and the mirror
receives only rows a Postgres already validated. The partial unique index is
mirrorable and should be mirrored, since SQLite supports partial indexes.

#### The generator cannot currently run, for a reason that predates this work

`pnpm desktop:sqlite:gen-migrations` fails before it reaches this migration:

```console
$ pnpm desktop:sqlite:gen-migrations
error: gen-sqlite-migrations: 20260818182843_normalize_exact_data_api_grants.sql
  has 2 unhandled statement(s).
  - [unrecognised leading keyword] alter default privileges for role postgres ...
  - [unrecognised leading keyword] alter default privileges for role postgres ...
```

That migration is on the base commit and this work does not touch it. Two
consequences, both verified:

- **The mirror is already one migration stale.** There is no
  `20260818182843_*.gen.sql` under `apps/desktop/migrations/`, so the 1-to-1
  invariant that directory's own README states is already broken.
- **Nothing gates on it.** `pnpm test:desktop` is green (87 tests), so the
  breakage is latent rather than loud.

`classifyStatement` in `parse.ts` is where the generator itself says the fix goes,
and `alter default privileges` is a privilege statement of exactly the kind
already dropped for SQLite. Fixing it is a small change and it is **another
lane's defect**: doing it here would also mean generating another lane's missing
mirror file. So this spec writes the override body, which is source, and leaves
the `.gen.sql` ungenerated. Hand-writing one is not an option; those files are
generated and their headers say so.

**The override body is verified independently of the generator.** It was applied
with `sqlite3` 3.51 to a table rebuilt from the real desktop migration history,
holding one existing pipeline row, and checked: the row survives with
`access_kind = 'pipeline_parquet'`, an API row with null Parquet and pipeline
columns inserts where it previously could not, the partial unique index rejects a
duplicate resource, and two API rows with null keys coexist under
`unique_parquet_file_pipeline`.

Note also that `pnpm desktop:sqlite:gen-migrations` needs Python and `uv` for
`sqlglot`, a developer-machine dependency, though both are present here and are
not what is failing.

---

## 7. Capabilities, per resource

### 7.1 The probe: what it costs, what it answers, when it may be cached

`wholeRelationAcquirable: "probe"` exists, per its own doc comment, because one
HDX dataset may offer a downloadable file while another offers only a row-capped
query endpoint. The probe is:

**One `package_show` call, which is zero extra calls.** The response carries, per
resource and in the same document: `datastore_active`, `url`, `format`, `size`,
`hash`, `last_modified`. Acquisition needs the URL regardless, so the probe rides
along on a call already being made. There is no cheaper probe and no reason to
defer it.

**What it answers on HDX, honestly.** Two facts from section 3 combine:
`datastore_active` is true on ~1 resource in 441 (3.3), and every datastore action
is anonymous-forbidden regardless (3.2). So the probe's _reachability_ answer is
constant: **the resource file, every time.** `datastore_active` varies; whether
Avandar can use it does not.

This spec therefore reads `datastore_active`, returns it as
`OpenDataAcquisition.datastoreActive`, and **does not branch on it**. Recording it
costs nothing, tells us how the ratio in 3.3 moves over time, and means a
follow-up that obtains an HDX API key has real data instead of a guess. Branching
on it today would create a path no test can reach.

**When the probe result may be cached.** Keyed on the package's
`metadata_modified`, which is a package-level metadata version distinct from the
data's `last_modified`: `movement-range-maps` reports
`metadata_modified: 2025-11-19T10:29:46` against
`last_modified: 2022-05-24T04:02:33` (verified, 3.1). Adding, removing or
re-pointing a resource is a metadata change, so it bumps `metadata_modified`.
Cache rule: **a probe result is reusable while the package's `metadata_modified`
is unchanged, and must be re-read when it changes.** Since the probe is free and
rides on a call acquisition makes anyway, this spec caches nothing itself; the
rule is recorded for spec 2, which owns caching.

### 7.2 The ladder, and what "not populated" means in practice

For one resource, in order:

1. **`url_type` is `"api"`** -> refuse with a named error (3.5). Not a file, not a
   datastore, arbitrary third-party host, possibly plain HTTP.
2. **`format` is not readable** (not CSV, XLSX, JSON or Parquet) -> refuse with a
   named error naming the format. `zip` and `TXT` from 1.3 land here.
3. **`size` exceeds the configured ceiling** -> refuse **before downloading**.
   `size` is populated 440/440 (3.4), so this is a free pre-flight, and 3.1's
   73 MB resource shows why it is needed.
4. **Otherwise, download `resource.url` following redirects** -> bytes.

The datastore is not step 0 and not a fallback: per 3.2 it is not a step at all.
The two cases the handoff asks about, "a datastore endpoint exists but is not
populated" and "`datastore_search_sql` is disabled", are therefore **not error
paths in this design**. They cannot fail acquisition, because acquisition never
consults the datastore. That is the strongest available answer to the question and
it is a direct consequence of 3.2 and 3.3.

### 7.3 The values, per resource

| Field                     | Value for a CKAN resource file | Note                                                   |
| ------------------------- | ------------------------------ | ------------------------------------------------------ |
| `relations`               | `"single"`                     | One catalog entry names one resource                   |
| `acquisitionUnit`         | `{ kind: "whole-relation" }`   | It is a file                                           |
| `predicatePushdown`       | `"none"`                       | A file answers no questions                            |
| `aggregatePushdown`       | `false`                        |                                                        |
| `wholeRelationAcquirable` | `"yes"`                        | Per 7.1, `"probe"`'s answer is constant here. See 7.4  |
| `maxRowsPerCall`          | `"unbounded"`                  | Bounded by bytes, not rows                             |
| `maxBytesPerCall`         | the configured ceiling         | Enforced by this spec, not by CKAN, which caps nothing |
| `freshnessSignal`         | `"version-token"`              | The token in section 8                                 |
| `rowIdentity`             | `"positional"`                 | CKAN resource files carry no key                       |
| `multiCallAtomicity`      | `true`                         | One download, one snapshot                             |
| `quotaScope`              | `{ kind: "per-host", host }`   | HDX rate-limits and returns 429 (proposal 11.1)        |
| `grantedScope`            | `[]`                           | Anonymous                                              |

### 7.4 What integration must change in the wrapper's declaration

Almost nothing, which is the useful result. `DatasetParquetWrapper`'s existing
`CAPABILITIES` already declares `predicatePushdown: "none"`,
`wholeRelationAcquirable: "yes"`, `acquisitionUnit: { kind: "whole-relation" }`,
`aggregatePushdown: false` and `rowIdentity: "positional"` - every one of which
7.3 confirms for a CKAN resource file.

Two fields become stale once this spec's module is wired in, and the merge session
should update both in the same commit that replaces the function body:

- **`freshnessSignal`** is `"none"` today, with a doc comment saying "the open
  data catalog entry's modified time is not consulted". After integration a CKAN
  entry does produce a token, so this becomes `"version-token"` and the wrapper
  gains a `readFreshness`. Leaving it `"none"` is safe but throws the token away.
- **`maxBytesPerCall`** is `"unbounded"` today. Once 7.2 step 3 enforces a
  ceiling, the declaration should say so.

Both are one-line changes in a file this lane must not touch, so they are listed
in section 15 rather than made here.

---

## 8. `SourceVersion`, and whether it is trustworthy

**The token.** Preferred: the resource's `hash`, non-empty on 440/440 sampled
resources and always 32 hex chars, i.e. an MD5 of the content (3.4). Fallback,
when `hash` is empty as it is on the older `readme.txt` resource in 1.3: the
resource's `last_modified` and `size`, joined into one opaque delimited string.

The token is prefixed with which inputs produced it, so a hash-derived token and a
mtime-derived token can never compare equal by coincidence:

```text
ckan:hash:32e316c0337f8a9b9117999a595f8e86
ckan:mtime:2022-05-24T04:02:33.007599:961
```

It is a `SourceVersion`, which `RelationCapabilities.types.ts` defines as "a
source version token, compared for equality and never parsed". Nothing downstream
may split it.

**Is it trustworthy? Partially, and asymmetrically.** State it this way:

- **A changed token is strong evidence the data changed.** Both `hash` and
  `(last_modified, size)` move when a resource is replaced.
- **An unchanged token is _not_ proof the data is unchanged.** For the
  `hash` case the residual risk is small and is CKAN's own bookkeeping: the field
  is metadata CKAN maintains, not a checksum Avandar computed over the bytes it
  received, so a resource replaced without CKAN updating `hash` is
  indistinguishable from an unchanged one. For the `mtime` fallback the risk is
  material: `last_modified` is uploader-supplied on HDX, has no timezone
  (`2022-05-24T04:02:33.007599`, 3.4), and a same-size in-place replacement is
  invisible to it.

**Consequence for spec 2.** The token is safe as a **cache invalidation trigger**
and unsafe as a **freshness guarantee**. A cache hit means "no evidence of
change", not "verified current". A user-facing claim of freshness must come from
an explicit refresh, the same conclusion spec 4 reached about Drive
`File.version` from the opposite direction: `File.version` changes too often, and
CKAN `hash` risks changing too rarely.

**Rejected candidates**, so nobody re-proposes them:

- **The S3 `ETag`** on the download response is a real content hash
  (`"c086fe47cb06dfe2fa770043eb3f973c"`, verified in 3.1) and is strictly better
  evidence than CKAN's metadata. It is rejected because obtaining it means
  following the presigned redirect and issuing the byte request, which defeats the
  purpose of a _cheap_ change token: `RelationCapabilities` describes
  `freshnessSignal` as "a cheap token that says the source changed, **without
  refetching it**". It is worth capturing _after_ a download as a stronger token
  for the next comparison, which section 13.3 records as a follow-up.
- **The package's `metadata_modified`** tracks metadata edits, not data (3.1's
  three-year gap between the two fields), so it would invalidate the cache on a
  description typo fix.
- **`resource.mimetype`** as any part of the token: absent on 40% of resources
  (3.4).

---

## 9. Paging, and whether a multi-page read can tear

This section specifies the datastore path that section 3.2 makes unreachable and
this lane does not implement. It is written so a follow-up with an HDX API key
does not re-derive it, and because the answer is a correctness statement, not an
implementation detail.

**The paging shape.** `datastore_search` takes `limit` and `offset`, defaults to
100 rows and caps at `ckan.datastore.search.rows_max`, 32,000 by default
(proposal 11.1). A relation larger than the cap needs `ceil(total / 32000)`
calls, `total` coming from the first page's response.

**Can a multi-page read return a torn result? Yes.** Plainly: each
`datastore_search` call is an independent request in its own transaction, so
offset paging over a table that changes mid-read is not a snapshot. If rows are
inserted before the current offset, the next page re-returns rows already
collected, giving **duplicates**. If rows are deleted, the next page skips rows
never collected, giving **omissions**. Neither is detectable from the rows
themselves, because `rowIdentity` for CKAN is `"positional"`: with no stable key
there is no way to notice that page 3 starts where page 2 already was. This is
exactly what `multiCallAtomicity: false` declares, and the declaration is what
makes the unsoundness a stated fact rather than an argument.

**What to do about it: detect, discard, retry once, then fail.** Not paper over.

1. Read the package's `metadata_modified` and the first page's `total` before
   collecting.
2. Collect every page.
3. Re-read `metadata_modified` and the last page's `total`.
4. If either changed, **discard the whole acquisition** and retry once from step
   1. If it changes again, fail with a named error rather than return rows.

This is a detector, not a fix, and it should be labelled as one. It cannot see a
change that leaves both `total` and `metadata_modified` unchanged, such as an
in-place update of one field in one row. It converts the common tearing cases from
silent corruption into a visible, bounded failure, which is the best available
outcome without server-side snapshots or a stable row key. `LIMIT`/`OFFSET` paging
without `ORDER BY` is additionally not guaranteed to be a stable ordering in
Postgres, so a follow-up must pass an explicit sort, and must not assume CKAN
supplies one.

**Why a single-request read is preferable whenever it fits.** A relation under
32,000 rows is one call, and one call cannot tear. That is a strong argument for
preferring the resource file even where the datastore is reachable: a file
download is always one request, which is why `multiCallAtomicity: true` in 7.3.

---

## 10. Normalization: what "bytes" means

### 10.1 Why the module does not return Parquet

`AcquiredRelation.parquetBlob` is a Parquet `Blob`, so something must transcode.
That something cannot be this module: transcoding needs DuckDB, and importing a
DuckDB client here would drag a browser-only client singleton into a Node test,
which is the exact failure the handoff's rule 3 records. It would also make the
module untestable against a faked HTTP layer, which is its stated done-bar.

So the module returns `{ contentKind, bytes }` and the caller transcodes.
`DatasetParquetWrapper` already holds a `DuckDbClient`, and spec 4 established the
precedent in the other direction: the Sheets wrapper calls
`DuckDbClient.loadXlsx` and hands back the resulting `parquetData` rather than
re-transcoding. This is the same split, drawn at the same place.

Format mapping:

| CKAN `format`     | `contentKind`          | Caller does                                 |
| ----------------- | ---------------------- | ------------------------------------------- |
| `Parquet`         | `"parquet"`            | Uses the bytes directly                     |
| `CSV`             | `"csv"`                | `DuckDbClient.loadCsv`, takes `parquetData` |
| `XLSX`            | out of scope this lane | 13.4                                        |
| `JSON`, `GeoJSON` | out of scope this lane | 13.4                                        |

CSV is the case that matters: 380 of 440 sampled resources (3.4).

### 10.2 The datastore records case, and rule 4

The datastore path is not implemented (3.2), but `buildCsvFromDatastoreRecords`
**is**, because it is pure, cheap, and the one piece a follow-up would otherwise
get wrong. `datastore_search` returns `fields: [{ id, type }]` and `records:
[{...}]`, i.e. JSON records that must become CSV text for DuckDB to read.

Column order comes from `fields`, never from `Object.keys` of the first record:
JSON key order is not a contract, and a record missing an optional key would
shift every later column on that row. Quoting, embedded delimiters, embedded
newlines, embedded quotes, and null-versus-empty-string all have to be right.

**This is tested by round-tripping through real DuckDB, not by asserting on the
string.** `docs/rules/testing.md` and the handoff's rule 4 both require it, and
the handoff records that this exact approach caught two bugs in an earlier CSV
writer that a string assertion passed. The harness exists:
`src/lib/sql/__tests__/executedDuckDb.ts` exposes `withDuckDb`, and
`vitest.executed.config.ts` includes `**/*.executed.test.ts` outside `apps/**` and
`packages/**`.

**And it earned its keep immediately.** Measured against real DuckDB 1.x while
building this:

```console
csv:  a,b,c / 1,,x / 2,"",y

read_csv(header=true, all_varchar=true)                      -> b is NULL, b is NULL
read_csv(header=true, all_varchar=true, allow_quoted_nulls=false)
                                                             -> b is NULL, b is ""
```

**DuckDB's default reader collapses an unquoted empty field and a quoted empty
field to the same NULL.** So the writer's distinction between an absent value and
an empty string is real in the bytes and invisible to the default reader; only
`allow_quoted_nulls=false` recovers it.

This matters twice. It is exactly the claim a string assertion would have
"proved" and got wrong, which is the case for rule 4 restated. And it is a fact
the caller needs: `DuckDbClient.loadCsv` owns the read options, so **whether an
empty CKAN cell arrives as NULL or as an empty string is the caller's choice, not
this module's.** Recorded here rather than left for someone to discover from a
column of unexpected nulls.

---

## 11. Errors

Every failure a caller can hit is a named type, so the caller can branch, and none
of them is a bare `Error` with a formatted string. None is user-facing copy: per
`AGENTS.md`, these modules return structured data and the component that displays
it translates.

**One error type, `OpenDataAcquisitionFailed`, with a machine-readable `code`
and per-code context.** Not a class per condition: the only thing a caller does
differently per condition is read the code, since every one of them aborts the
same acquisition. This follows
`src/clients/qetl/assertWorkspaceMembership/WorkspaceMembershipDenied.ts`, which
is the repo's existing shape for exactly this. `AvaHTTPError` is deliberately
not reused: it models a status to send back to a client and imports the Supabase
and Resend clients, neither of which belongs in an acquisition path.

The context fields are a discriminated union, so a size refusal cannot carry a
format and a format mismatch cannot carry a byte count.

| `code`                        | When                                                           | Verified cause                 |
| ----------------------------- | -------------------------------------------------------------- | ------------------------------ |
| `ckan-action-failed`          | `200` with `success: false`, carrying CKAN's `error.__type`    | CKAN's envelope, 5.2           |
| `ckan-authorization-required` | CKAN's `error.__type` is `Authorization Error`                 | 3.2                            |
| `resource-not-found`          | `api_resource_id` absent from `package_show`                   | Resource deleted or re-pointed |
| `resource-is-remote-api`      | `url_type` is not `upload`                                     | 3.5                            |
| `resource-format-unsupported` | `format` is not readable, naming it                            | 1.3's `zip` and `TXT`          |
| `resource-format-changed`     | live `format` differs from `api_resource_format`               | 6.1.1                          |
| `resource-too-large`          | `size` exceeds the ceiling, raised before download             | 3.1's 73 MB resource           |
| `resource-unreachable`        | byte read failed, including the CORS case                      | 3.1                            |
| `access-shape-invalid`        | `toAccess` returned `undefined`, or the entry is pipeline-kind | 6.4                            |

Two logging rules, both from section 3.1: never log the download `Location`
header or the URL it yields, since a presigned S3 URL is a credential; and never
put response bytes in an error message. **No member of the union carries a URL at
all**, which is what makes the first rule enforceable rather than a convention,
and there is a test that fails if one starts to.

`CkanResourceUnreachable` deserves a note. In the browser, per 3.1, a CORS
failure surfaces as an opaque `TypeError` from `fetch` with no status, so this
error cannot distinguish "blocked by CORS" from "host down". Until the proxy in
5.3 exists, its message should say so rather than guess, because guessing wrong
here sends the next debugger to the network tab instead of to this document.

---

## 12. Testing

### 12.1 Unit, against a faked HTTP layer

The done-bar from the handoff: **an HDX resource resolves to bytes plus a
`SourceVersion`, with no dependency on QETL.** Every test below injects
`OpenDataHttp` and touches no network.

| Area                 | Test                                                                                                                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CkanClient`         | `package_show` builds the right URL; a `200` with `success: false` raises `CkanActionFailed` carrying `error.__type`; a `403` on a datastore action raises `CkanAuthorizationRequired`. Zod rejects a response missing `resources`                             |
| `mimetype` tolerance | A resource with `mimetype: null` parses, since 40% of real ones are (3.4)                                                                                                                                                                                      |
| Resource selection   | The named `api_resource_id` is selected **from a package whose first resource is a readme**, which is the 1.3 shape and the test that would catch a first-resource fallback creeping back in                                                                   |
| Refusals             | Each row of section 11's table, asserted case by case                                                                                                                                                                                                          |
| Size ceiling         | A resource whose `size` exceeds the ceiling raises `CkanResourceTooLarge` **and `getBytes` is never called**. Paired with a positive control in the same file where `getBytes` **is** called, so the `not.toHaveBeenCalled()` cannot pass for the wrong reason |
| `SourceVersion`      | Non-empty `hash` produces the `ckan:hash:` token; empty `hash` falls back to `ckan:mtime:`; the two forms cannot collide                                                                                                                                       |
| Acquisition          | A CSV resource returns `contentKind: "csv"`, the exact bytes `getBytes` yielded, and the expected token                                                                                                                                                        |
| `toAccess`           | Round-trips both kinds; returns `undefined` for a row satisfying neither                                                                                                                                                                                       |
| Parsers              | `OpenDataCatalogEntryParsers` round-trips an API row and a pipeline row. The existing `ZodConsistencyTests` block covers the type side at compile time                                                                                                         |

### 12.2 pgTAP, for the claims in section 6

Section 6.3 and 6.5 are claims about database behaviour, so they are asserted in
SQL, in `supabase/tests/database/`:

| Claim                    | Assertion                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Back-compat              | A row inserted the **old** way (three pipeline columns, no `access_kind`) succeeds and reads back `access_kind = 'pipeline_parquet'`                                                                                                                    |
| The upsert still works   | `insert ... on conflict (parquet_file_name, pipeline_name) do update` succeeds and updates rather than duplicating. This is the pipeline's exact statement shape and the highest-value test here                                                        |
| `NULLS DISTINCT`         | Two API rows with null `parquet_file_name` and null `pipeline_name` both insert                                                                                                                                                                         |
| API uniqueness           | Two API rows identical on all four index columns: the second fails                                                                                                                                                                                      |
| API uniqueness is scoped | Same dataset and resource id under a **different** `api_base_url`: both insert                                                                                                                                                                          |
| CHECK, positive half     | An API row missing `api_resource_id` fails                                                                                                                                                                                                              |
| CHECK, negative half     | A pipeline row with `api_service` set fails                                                                                                                                                                                                             |
| https CHECK              | `api_base_url` of `http://...` fails                                                                                                                                                                                                                    |
| RLS unchanged            | `authenticated` selects; an unauthenticated role does not; `authenticated` cannot insert. Per `docs/rules/sql.md`, the negative cases are the point, and this table's policy is `select`-only to `authenticated` with writes reserved to `service_role` |

### 12.3 Executed, against the real reader

`buildCsvFromDatastoreRecords` output is loaded by real DuckDB via `withDuckDb`
and read back as rows (10.2). Cases: an embedded comma, an embedded double quote,
an embedded newline, a null against an empty string, and a record missing an
optional key, which must land in the right column rather than shift the row. The
assertion is on the **rows DuckDB returns**, never on the CSV string.

A real HDX CSV is checked in as a small fixture, with its provenance URL in a
comment: the 235-byte `fts_requirements_funding_covid_mwi.csv` verified in section 3. It gives the suite one case that is real rather than authored.

If `uv` or Python is unavailable and `pnpm desktop:sqlite:gen-migrations` cannot
run, the desktop migration is **not** hand-written into
`apps/desktop/migrations/`: those files are generated and say so in their header.
Report the blocker instead. The manual **override body** in
`getManualMigrationBodyFromSourceFile.ts` is source, not generated, and is written
either way.

### 12.4 Mutation testing

Per the handoff's rule 1, every behavioural claim above is mutation-tested: break
the implementation, watch the specific test go red, restore, confirm the file is
byte-identical, and report which mutation each test caught. Mutants live in the
session scratch directory, **outside the repo**, so the type-checker never sees
them.

The mutations that matter most, because each is a plausible real defect:

1. Select the first resource instead of the named one -> the 1.3-shaped selection
   test must go red.
2. Take column order from `Object.keys(records[0])` instead of `fields` -> the
   missing-optional-key DuckDB round-trip must go red.
3. Drop the `size` pre-flight -> the ceiling test must go red **and** its positive
   control must stay green.
4. Prefer `last_modified` over `hash` -> the token test must go red.
5. Drop the `ckan:hash:` / `ckan:mtime:` prefix -> the collision test must go red.
6. Return `success`-less CKAN payloads as results -> `CkanActionFailed` must go red.
7. Convert `unique_parquet_file_pipeline` to a partial index -> the pgTAP upsert
   test must go red. This one is worth doing explicitly, because it is the
   "cleanup" 6.3 warns about and a future reader will be tempted by it.

### 12.5 The manual end-to-end check

**This runs today, against the live HDX API, and it passes.** Reproduce it on a
switched local Supabase (`ava supabase switch feat-qetl-hdx`):

```bash
pnpm fns:update-env                # .env.development.edge -> supabase/functions/.env
supabase stop && supabase start    # the runtime reads that file at container start
pnpm db:reset

psql "$SUPABASE_POSTGRES_URL" <<'SQL'
insert into public.catalog_entries__open_data
  (id, display_name, external_organization_name, access_kind, api_service,
   api_base_url, external_dataset_id, api_resource_id, api_resource_format)
values ('aaaaaaaa-0000-4000-8000-000000000001',
        'Malawi COVID-19 requirements and funding', 'OCHA FTS',
        'api_resource', 'ckan', 'https://data.humdata.org',
        'mwi-requirements-and-funding-data',
        '9da55974-adf5-4106-988c-d3c92333ea0a', 'CSV');
SQL

# Sign in as the seeded user for a token, then:
curl -i -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
  "$API/functions/v1/open-data/catalog-entries/aaaaaaaa-0000-4000-8000-000000000001/resource"
```

Observed, 2026-08-19:

```console
HTTP/1.1 200 OK
Content-Type: application/octet-stream
access-control-expose-headers: X-Ava-Content-Kind, X-Ava-Source-Version
x-ava-content-kind: csv
x-ava-source-version: ckan:hash:504e0963f4bb3a7a7712af0f51714fdf

countryCode,id,name,code,typeId,typeName,startDate,endDate,year,requirements,...
MWI,1104,Malawi Flash Appeal 2022,FMWI22,5,Flash appeal,2022-02-26,2022-05-31,...
```

**The refusal ladder, also verified live against HDX:**

| Catalogued resource                                                      | Result                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| The 235-byte CSV above                                                   | `200`, 235 bytes, content kind `csv`                       |
| `movement-range-maps`' readme (`TXT`, that dataset's **first** resource) | `409 resource-format-unsupported`                          |
| A real 66.7 MB `iati-ukr` CSV, ceiling 25 MB                             | `413 resource-too-large` in **0.33 s**, nothing downloaded |
| A `pipeline_parquet` entry                                               | `409 access-shape-invalid`                                 |
| An unknown catalog entry id                                              | `404 catalog-entry-not-found`                              |
| No bearer token                                                          | `401`                                                      |

The 66.7 MB case is the one to re-run after any change to section 7.2: a
sub-second refusal is the evidence that the guard read the size from metadata
rather than downloading and then measuring.

**Two setup traps, both hit while verifying this.** Neither is a defect in this
work, and both cost time:

- **The edge runtime reads `supabase/functions/.env`, which `ava supabase switch`
  does not update.** A freshly switched worktree leaves the previous stack's
  `SB_JWT_ISSUER` in that file, and every authenticated call then fails with
  `401 JWTClaimValidationFailed: unexpected "iss" claim value`. Run
  `pnpm fns:update-env` **and restart the stack**: the value is read at container
  start, so editing the file alone changes nothing.
- **`supabase start` can fail with `supabase_vector_… is not ready: unhealthy`.**
  A stop-and-start retry cleared it.

**What this check does not cover: the browser.** Nothing calls this route from the
app yet, because the app-side call site belongs to another lane (section 15). So
CORS from a real page origin is still unexercised, and it is the one claim in
section 3.1 that only a browser can confirm.

---

## 13. What this spec deliberately leaves open

Recorded so the next reader does not mistake silence for an answer.

### 13.1 Socrata

**Out of scope for this lane, and not merely deferred for time.** Socrata is the
one source in the proposal's table with `aggregatePushdown: true`, which selects
the **second** acquisition mode in section 11.2: pushdown, with the result cached
under exact query identity. That needs a `pushDown` implementation on a
`SourceWrapper` this lane must not write, and a result cache spec 2 owns. Socrata
is therefore a different lane's shape, not a bigger version of this one. What a
follow-up inherits: the `api_service` enum gains `'socrata'`, and `api_base_url`
plus `external_dataset_id` already carry a SODA endpoint and dataset identifier
without further migration.

### 13.2 `canonical_urls` still carries the pipeline Parquet URL

Section 1.2's string heuristic is **not** removed for pipeline rows. Fixing it
means a typed `parquet_url` column and a data migration over live rows, for no
gain in this lane. The heuristic is now confined to one kind of one union member
instead of being the only access mechanism, which is the part that blocked
generalization.

### 13.3 A content-hash token captured after download

Section 8 rejects the S3 `ETag` as a _cheap_ freshness signal, correctly. It is
still the strongest available evidence, and it is free once bytes have been
fetched. Capturing it after a download and preferring it on the next comparison
would give CKAN a real content token. It needs a place to live, which is spec 2's
cache row, so it is a follow-up and not a change here.

### 13.4 Formats beyond CSV and Parquet

`XLSX` (4 of 440) and `JSON`/`GeoJSON` (56 of 440) are refused with a named error
rather than parsed. XLSX is nearly free once spec 4's `loadXlsx` path lands, and
is the natural next format. JSON needs a records-to-columns decision that
`buildCsvFromDatastoreRecords` partly answers but not for nested documents.

### 13.5 Per-service quota counting

Proposal 11.1 requires the quota counter to be per external service, and notes
HDX returns `429`. `quotaScope: { kind: "per-host", host }` in 7.3 declares the
scope; nothing counts against it yet, exactly as spec 4 found for Sheets. This
spec adds no counter and no retry-after handling.

### 13.6 Which resource a user picks, and how

This spec makes one resource describable and acquirable. Choosing among a
dataset's resources in a UI, with `format` and `size` shown so a user does not
pick the readme, is downstream work. Until it exists, catalog rows are written by
a backend, which matches the table's `select`-only grant to `authenticated`.

---

## 14. Risks

| Risk                                                                                                                                     | Likelihood                                                                                                                                                        | Mitigation                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nothing in the app calls the acquisition path, so it can rot unnoticed**                                                               | High. The two candidate call sites both belong to other lanes                                                                                                     | The proxy itself is built and verified live (5.3, 12.5), so the remaining step is small. But until it is taken, no product code reaches any of this, and only 12.5 exercises it. This is the top risk in this document                                                                                                                                                                    |
| **The edge route is reachable by any authenticated user of any workspace**                                                               | Medium                                                                                                                                                            | The catalog is a public, workspace-independent table with `select` granted to `authenticated`, so this matches the read it already permits. Worth revisiting if catalog entries ever become workspace-scoped, because the route would then leak across workspaces                                                                                                                         |
| **A CKAN instance returns a resource URL on a host it does not control**                                                                 | Low, and the reason step 4 of 5.3.1 exists                                                                                                                        | Exact-host match on an `https` URL, with a test for the suffix bypass and a mutation proving it fires                                                                                                                                                                                                                                                                                     |
| **The desktop mirror keeps `NOT NULL` and API rows fail to sync**                                                                        | **Live, not hypothetical.** The override body exists and is SQLite-verified, but the generator that would emit the `.gen.sql` is broken for a pre-existing reason | 6.6. The mirror stays stale until the generator is fixed, which is another lane's defect. Escalated in section 15                                                                                                                                                                                                                                                                         |
| **Someone "tidies" the unique constraint into a partial index**                                                                          | Medium. It looks like an improvement                                                                                                                              | 6.3 explains it; 12.2 tests the pipeline's exact upsert; 12.4 mutation 7 proves the test fires                                                                                                                                                                                                                                                                                            |
| **HXL tag rows break CSV type detection.** HDX CSVs may carry a second header row of `#hashtags`, which would make every column a string | Unquantified                                                                                                                                                      | Measured 0 of 10 sampled HDX CSVs, **but the sample is biased**: the small-CSV filter drew almost entirely from one provider's FTS exports. Treat the 0 as "not measured" rather than "does not happen". Left open here, because it is a CSV-sniffing concern in the DuckDB path the caller owns, not in this module. Flagged so the first wrong-typed HDX import is diagnosed in minutes |
| **`hash` silently stops changing on a replaced resource**                                                                                | Low but undetectable                                                                                                                                              | 8 states the asymmetry, so no code treats a cache hit as verified freshness                                                                                                                                                                                                                                                                                                               |
| **`format` drifts from `api_resource_format`**                                                                                           | Low                                                                                                                                                               | `CkanResourceFormatChanged`, 6.1.1. Fails loudly rather than parsing bytes as the wrong format                                                                                                                                                                                                                                                                                            |
| **A CKAN instance that is not HDX behaves differently**                                                                                  | Medium                                                                                                                                                            | Every finding in section 3 is HDX-specific and labelled as such. `api_base_url` in the uniqueness key (6.3) means a second instance is separable, so a per-instance difference is representable rather than a global assumption                                                                                                                                                           |

---

## 15. What integration must do

For the merge session, so nothing here is guessed. This lane touches no file it
does not own; these are the changes it cannot make.

1. **Replace `_downloadOpenDataParquet`'s body** in
   `src/clients/qetl/wrappers/DatasetParquetWrapper/DatasetParquetWrapper.ts`:
   keep the source-record and catalog-entry reads, drop the `canonicalUrls`
   `.parquet` scan for API-kind entries, call `acquireOpenDataResource`, and
   transcode when `contentKind` is `"csv"` (10.1). Pipeline-kind entries keep the
   existing path unchanged (13.2).
2. **Thread `sourceVersion` through `acquire`.** It currently hardcodes
   `sourceVersion: undefined`.
3. **Update two `CAPABILITIES` fields**: `freshnessSignal` to `"version-token"`
   and `maxBytesPerCall` to the ceiling, and add `readFreshness` (7.4).
4. ~~Decide and build the byte proxy~~ **Done**: `supabase/functions/open-data/`
   (5.3), verified live against HDX (12.5). What remains is **calling it from the
   app**. On this lane's base that call site is
   `src/clients/qetl/QetlClient/qetlFactLoading.ts:85` (`_downloadOpenDataFact`);
   on `feat/qetl-registry` it is `DatasetParquetWrapper`. Both belong to other
   lanes, so this lane wired neither. Until one is wired **nothing in the product
   reaches this code**, and 12.5 is the only way to exercise it.
5. **Fix `classifyStatement` in
   `apps/desktop/scripts/gen-sqlite-migrations/parse.ts`** so it skips
   `alter default privileges`, then run `pnpm desktop:sqlite:gen-migrations`
   (6.6). This is a pre-existing defect, not one this work introduced, and it
   already leaves the desktop mirror a migration behind. The SQLite override body
   for this migration is written and verified, so the generator run is all that
   is missing.

Files this lane changed outside its owned set: two, both in
`apps/desktop/` (the manual migration override, and the generated desktop
migration), both required by 6.6 and neither owned by another QETL lane.
