# WHO GHO pipeline: spec

**Status:** built on `feat/gho-pipeline` (branched from `demo/measles`),
except what section 9 defers. A full run against the real API on 2026-11-09
wrote 3,091 indicator and 202 dimension listings. PR units: F29 and F30 in
[`pr-feature-log.md`](pr-feature-log.md).

This spec adds the World Health Organization's Global Health Observatory
(GHO) OData API to the Open Data Catalog (ODC). It also covers three changes
the GHO work needs or exposes, which apply to every API-backed listing:

1. **Recommended listings.** A listing can name other listings that are
   usually added with it, such as the list of country codes an indicator's
   `SpatialDim` column holds.
2. **Copies expire in the browser.** Today a workspace never re-checks an
   API-backed listing whose copy was current when it loaded.
3. **Freshness checks are throttled and described by the listing**, rather
   than hardcoded per API in the edge function.

Related: [`odc-parquet-cache-spec.md`](odc-parquet-cache-spec.md) (the
Parquet copy this spec builds on),
[`open-data-catalog-architecture.md`](open-data-catalog-architecture.md),
[`connector-nomenclature.md`](connector-nomenclature.md),
[`catalog-field-mapping-design.md`](catalog-field-mapping-design.md), and
[`qetl-architecture.md`](../qetl-architecture.md).

## Problem

GHO holds WHO's health statistics, measles cases among them, and Avandar
cannot read it. It is neither a CKAN deployment nor a Socrata portal, so
neither existing pipeline can list it, and the Parquet copy builder cannot
download it: it only reads CSV and Parquet, and GHO serves only JSON.

GHO also updates continuously. That exposed a gap that already affects every
Socrata and HDX listing: once a workspace has loaded a current copy, it never
asks for a newer one (section 6.1).

## Decision: GHO is a drive, and each indicator is a listing

GHO looks like one live database, but it is a drive. It holds 3,091
indicators, and every indicator has the same 25-column long-format schema
(measured below). This spec models each indicator as one `api_resource`
listing, the way a Socrata dataset is one listing.

Each indicator is small enough to copy whole, so QETL needs no new
capability. A workspace adds "Measles - number of reported cases" as a
dataset, and joins it to Postgres or anything else the usual way.

The other option was one listing for all of GHO, with SQL filters sent to
the API ("partitioned live connections"). It was considered and deferred:
see section 9.

## Facts about the GHO API

Every number here was measured against `https://ghoapi.azureedge.net/api`
on 2026-11-09.

| Fact | Value |
|---|---|
| Protocol | OData v4, JSON only. `$format=csv` and `Accept: text/csv` are ignored |
| Auth | None. No API key |
| CORS | None. Every call must run server-side |
| Indicators (`GET /Indicator`) | 3,091, each `{IndicatorCode, IndicatorName, Language}`. No description, no modified time |
| Archived indicators | 34 are named "Archived, see ..." |
| Indicators with no rows | 600 |
| Rows per indicator | median 194, p90 3,352, p99 64,510, max 268,128 (seven `LIFE_*` life tables). 9.55M rows in total |
| Largest download | `LIFE_0000000029`: 159 MB of JSON in 41 s, in one response |
| Paging | An unpaged request returns every row. `$top` is capped at 1,000. Keyset paging (`$filter=Id gt <n>&$orderby=Id`) works |
| Query options that work | `$filter` on dimensions (`eq`, `ge`, `in`, `and`), `$select`, `$orderby`, `$top`, `$skip`, `$count` |
| Query options that fail | `$apply` (aggregation), and `$filter` on `Date`. Both answer 200, then break off partway through the body |
| Freshness headers | No ETag or Last-Modified. `cache-control: public, max-age=3600` |
| Cheap freshness check | `?$orderby=Date desc&$top=1&$select=Date&$count=true`: the newest row's modified time and the row count, in one small request |
| Schema (`GET /$metadata`, 12 MB) | Every indicator's entity type has the same 25 properties, in varying order. Types: `Edm.Int64` (`Id`), `Edm.Int32` (`TimeDim`), `Edm.Decimal` (`NumericValue`, `Low`, `High`), `Edm.DateTimeOffset` (`Date`, `TimeDimensionBegin`, `TimeDimensionEnd`), `Edm.String` (the rest) |
| Dimensions (`GET /Dimension`) | 202, each `{Code, Title}`. Values: `GET /DIMENSION/<code>/DimensionValues`, each `{Code, Title, Dimension, ParentDimension, ParentCode, ParentTitle}`. `COUNTRY` has 234 values |
| Which dimensions an indicator uses (`GET /IndicatorDimension`) | 6,522 rows, but **only 1,789 of the 3,091 indicators** are listed. Not reliable enough to use alone |
| Generic dimension columns | `Dim1`-`Dim3`, `SpatialDim` and `DataSourceDim` hold codes. What each holds is in its `*Type` column (`SEX`, `AGEGROUP`, `COUNTRY`, `REGION`, ...) and varies per indicator and per row |

Converting the largest indicator from JSON to Parquet in Node DuckDB, with
the 25 declared column types, took 5.6 s and peaked at about 1 GB of memory
(0.99 GB on one thread, 1.08 GB on four). The 159 MB of JSON became 3.4 MB of
ZSTD Parquet.

GHO timestamps carry a UTC offset (`2016-09-21T13:42:00+02:00`). Read as
`TIMESTAMP`, DuckDB keeps the local clock time and drops the offset, which is
wrong by two hours. Read as `TIMESTAMPTZ` with the session time zone set to
UTC and then cast to `TIMESTAMP`, the value is correct
(`2016-09-21 11:42:00`).

## Design

### 1. What becomes a listing

The `gho` pipeline has one drive, `https://ghoapi.azureedge.net/api`, and
two scopes.

**`indicators` scope: one listing per indicator.**

| Listing field | Value |
|---|---|
| `api_service` | `odata` (new enum value). The service is the protocol GHO speaks, as `ckan` is for HDX ([`connector-nomenclature.md`](connector-nomenclature.md), layer 0) |
| `api_base_url` | `https://ghoapi.azureedge.net/api` |
| `external_dataset_id`, `api_resource_id` | The indicator code, e.g. `WHS3_62` |
| `api_resource_format` | `ODATA` (new format label, not in `etl.config.yaml`'s unloadable list) |
| `source_asset_type` | `indicator` |
| `display_name` | `IndicatorName` |
| `organization1_name`, `organization2_name` | `World Health Organization`, `Global Health Observatory` |
| `tags` | `Archived` for an indicator whose name starts with "Archived" |
| `source_url` | The indicator's API URL, e.g. `https://ghoapi.azureedge.net/api/WHS3_62` (decision 1) |
| `is_workspace_loadable` | `false` when the indicator has no rows (decision 2) |
| `metadata` | `{ "row_count": <n> }`, from the probe. The detail view reads it to say "This dataset has no data yet" rather than "Avandar can't add this kind of dataset yet" (decision 2) |
| `date_of_last_update` | The newest row's `Date` |
| `api_freshness_probe` | New column, section 3 |
| `companion_listings` | New column, section 5 |
| Relation columns | The 25 declared columns, typed from the schema (below), with `columnTypesVerifiedAt` set to the run time |

**`dimensions` scope: one listing per dimension.** Each is that dimension's
value list, e.g. "Country (GHO dimension values)". Its `external_dataset_id`
is `DIMENSION/<code>` and its `api_resource_id` is
`DIMENSION/<code>/DimensionValues`. Its `source_asset_type` is `dimension`
and its six columns are all `VARCHAR`. An empty dimension is not loadable.

**Column types come from GHO's own schema**, as Postgres's do, so no sample
is ever sniffed. Each `Edm` type maps to one of the catalog's
`DuckDbSniffableDataType` values:

| `Edm` type | Catalog type |
|---|---|
| `Edm.Int32`, `Edm.Int64` | `BIGINT` |
| `Edm.Decimal`, `Edm.Double` | `DOUBLE` |
| `Edm.DateTimeOffset` | `TIMESTAMP`, normalized to UTC (see the facts above) |
| `Edm.Boolean` | `BOOLEAN` |
| anything else | `VARCHAR` |

The 25 columns are one constant in the pipeline (`GHO_FACT_COLUMNS`). Each
run reads `$metadata` once and checks every indicator's entity type against
it. An indicator whose properties differ is listed as not loadable and logged
as a warning, so a schema change at WHO never produces a copy whose types
disagree with its listing.

Because types are declared rather than inferred, the pipeline sets
`columnTypesVerifiedAt`. That satisfies the `datasets__open_data` trigger
that refuses a listing whose types were never verified, with no sample
route call.

### 2. The pipeline

`apps/pipeline-server/pipelines/gho/`, on `@avandar/etl`'s `EtlEngine` like
`hdx` and `socrata`:

```text
gho/
  gho.pipeline.yaml            drive, organization labels, field mappings, download block
  run.ts
  createGhoEtlEngine/          service: "odata"; scopes: indicators, dimensions
  createGhoHttpClient/         HttpClientFactory + withRetryOnTooManyRequests + withRateLimit
  extractGhoDrive/             the requests below, one page per batch of indicators
  makeGhoIndicatorRelation/    an indicator and its probe result become an ApiResourceRelation
  makeGhoDimensionRelation/
  ghoFactColumns.ts            GHO_FACT_COLUMNS and the Edm type mapping
  download/ghoListingDownload.ts
  mappers/
```

**Requests in one full run**, about 3,300:

| Request | Count | Gives |
|---|---|---|
| `GET /Indicator` | 1 | Every indicator code and name |
| `GET /$metadata` | 1 | The schema check above |
| `GET /Dimension` | 1 | Every dimension code and title |
| Indicator probe: `GET /<code>?$orderby=Date desc&$top=1000&$select=Date,SpatialDimType,Dim1Type,Dim2Type,Dim3Type,DataSourceDimType&$count=true` | 3,091 | The row count, the newest `Date` (first row), and which dimension each code column holds in the 1,000 newest rows (section 5) |
| Dimension probe: `GET /DIMENSION/<code>/DimensionValues` | 202 | The value count and the body hash |

The client runs four requests a second (`withRateLimit({ minTimeMs: 250 })`)
and retries an HTTP 429 three times with backoff, as HDX's does. A full
run took 55 minutes on 2026-11-09 (53 for indicators, whose probes return up
to 1,000 rows each, and 2 for dimensions). It runs weekly (decision 4).

**No incremental runs.** `/Indicator` has no modified time and cannot be
sorted by one, so there is no checkpoint to resume from. Every run probes
every indicator. The engine already writes only rows that changed, so an
unchanged indicator costs one request and no database write. The factory
passes no `incremental` option. The implementation must check that
`ava pipeline run gho --incremental` fails with a clear message rather than
silently running in full.

### 3. Freshness probes belong to the listing

Today `readOpenDataFreshnessToken` has a hardcoded branch per `api_service`
(`.exhaustive()` over `ckan` and `socrata`), and the edge function runs it.
The edge function cannot load a pipeline's YAML or scripts, so instead the
pipeline writes the probe onto each listing. The edge function then runs
whatever probe the listing describes, with no code per API.

New nullable column `data_catalog_listings.api_freshness_probe jsonb`:

```json
{
  "url": "https://ghoapi.azureedge.net/api/WHS3_62?$orderby=Date%20desc&$top=1&$select=Date&$count=true",
  "token": { "kind": "json-paths", "paths": [["value", 0, "Date"], ["@odata.count"]] }
}
```

- **`url`** is fetched with a GET, capped at 1 MB. It must be `https` and
  start with the listing's `api_base_url` followed by `/`. The probe is only
  ever written by the service role, but the check still stops a bad row from
  sending the edge function to another host.
- **`token`** says how the response becomes a token. There are two kinds:
  - **`json-paths`**: paths into the JSON body, given as arrays of keys and
    indexes because keys such as `@odata.count` contain dots. The token is
    the values at those paths, in order, joined by `|`. A missing path fails
    the check with the new failure code `freshness-probe-invalid`.
  - **`body-sha256`**: the SHA-256 of the whole response body. It suits a
    small source with no modified time.
- A dimension listing's probe is the whole value list
  (`DIMENSION/<code>/DimensionValues`) with `body-sha256`, because dimension
  values carry no modified time. `COUNTRY`'s list is 31 KB, well under the
  1 MB cap, and a renamed value changes the hash (decision 3).

One shared function, `readFreshnessProbeToken` in
`shared/connectors/open-data/`, runs a probe. **Both the edge function and
the copy builder must call it**, because a copy records the token it was
built from and the edge function compares that with a fresh one. If the two
computed the token differently, every check would call the copy stale and
rebuild it on every load.

- `readOpenDataFreshnessToken` uses the listing's probe when it has one,
  whatever its `api_service`. Its `odata` arm is reached only by an `odata`
  listing with no probe, and fails with `access-shape-invalid`. The `ckan`
  and `socrata` arms are unchanged. Moving them onto probes is optional
  follow-up work.
- The copy builder (`buildOpenDataParquetCache`) reads the listing's probe
  before and after a whole-file download, and fails the build when the token
  moved, as paged copies already do. `DownloadableListing` gains
  `freshnessProbe`. When a listing has one, the builder ignores the
  `sourceVersion` its download script returned.

### 4. Downloading an indicator: a JSON whole-file download

`WholeFileListingDownload` gains a JSON variant:

```ts
export type WholeFileListingDownload =
  | Readonly<{
      paging: false;
      url: string;
      contentKind: "csv" | "parquet";
      sourceVersion: string | undefined;
    }>
  | Readonly<{
      paging: false;
      url: string;
      contentKind: "json";
      /** The top-level field holding the array of row objects, e.g. `value`. */
      recordsField: string;
      /** Every column, typed by the source's schema. */
      columns: readonly ListingDownloadColumn[];
      sourceVersion: string | undefined;
    }>;
```

`ghoListingDownload.ts` answers
`{ paging: false, url: <apiBaseUrl>/<apiResourceId>, contentKind: "json", recordsField: "value", columns }`.
It answers the same way for an indicator and a dimension listing, with each
one's own columns.

`buildOpenDataParquetCache`'s `_copyWholeFile` changes:

- The `=== "csv"` check becomes an exhaustive `match` on `contentKind`.
- A JSON source is streamed to `source.json.gz`, gzipped as it arrives, like
  a CSV.
- A new `convertJsonFileToParquetParts`, beside `convertCsvFileToParquetParts`,
  first runs `SET TimeZone = 'UTC'`, then:

```sql
COPY (
  SELECT <each column, TIMESTAMP ones as "<name>"::TIMESTAMP>
  FROM (
    SELECT unnest("value", recursive := true)
    FROM read_json(
      '<path>',
      maximum_object_size = <uncompressed size, rounded up>,
      columns = {"value": 'STRUCT(<each column, TIMESTAMP ones as TIMESTAMPTZ>)[]'}
    )
  )
) TO '<dir>' (FORMAT PARQUET, COMPRESSION ZSTD, FILE_SIZE_BYTES <n>, FILENAME_PATTERN 'raw-{i}')
```

- The records field and every column name are quoted as identifiers, and
  rejected unless they match the names the source declared.
- A value whose type does not match its declared type fails the build. It
  is never coerced to null.

**Memory.** The JSON reader holds the whole response as one object, which
peaked at about 1 GB for the largest indicator on a 2 GB Fly machine. The
build sets a DuckDB `memory_limit` of 1.5 GB on its connection, so a larger
source fails that one build with `copy-too-large` (new failure code) rather
than taking the machine down mid-build for every other listing.
Downloading a source too big for this in 1,000-row JSON pages is follow-up
work (section 9).

### 5. Recommended listings

A listing can name other listings that are usually added with it. GHO is the
first to need this: an indicator's `SpatialDim` holds codes like `SDN`, and a
user who adds it almost always wants the country names too.

**Wording.** The column is `companion_listings`, and a member is a
*companion*. Users see "recommended", never "companion". This follows the
copy rule in `CLAUDE.md`, which keeps internal names and the words users see
separate on purpose.

**Schema.** New column `data_catalog_listings.companion_listings jsonb not
null default '[]'`, with a check that it is a JSON array. Each member:

```ts
/** One listing recommended alongside another, in the same drive. */
type DataCatalogListingCompanion = Readonly<{
  /** Why it is recommended. `lookup`: it names the codes a column holds. */
  kind: "lookup";
  /** The companion's API identity, in the same drive as this listing. */
  externalDatasetId: string;
  apiResourceId: string;
  /** Column pairs that join this listing to the companion. */
  joinOn: ReadonlyArray<Readonly<{ column: string; companionColumn: string }>>;
}>;
```

- **Companions are named by API identity, not by id.** Listing ids are
  created when a row is first written, and a companion may be written later
  in the same run, in another scope, or in a later run. The pair
  `(external_dataset_id, api_resource_id)`, together with this listing's own
  `api_service` and `api_base_url`, is exactly the
  `data_catalog_listings__api_resource_unique` key. That makes resolving a
  companion one indexed lookup. A companion that is not written yet
  resolves to nothing and is simply not shown.
- **v1 is limited to `api_resource` listings in the same drive.** Naming a
  listing in another drive, or a `pipeline_parquet` listing such as World
  Bank WDI, would need a wider key. That is follow-up work (section 9).
- **`kind` is a closed set** so the UI can phrase each reason through Lingui.
  The pipeline writes no English sentences. `lookup` is the only kind in v1.

**How the GHO pipeline fills it.** The indicator probe (section 2) returns
which dimension each code column holds in the 1,000 newest rows. For each
`(column, dimension)` it sees, the pipeline adds a `lookup` companion for
that dimension's listing, with join pairs on both the type column and the
code column:

| Code column | Join |
|---|---|
| `SpatialDim` | `SpatialDimType = Dimension`, `SpatialDim = Code` |
| `Dim1`, `Dim2`, `Dim3` | `Dim<n>Type = Dimension`, `Dim<n> = Code` |
| `DataSourceDim` | `DataSourceDimType = Dimension`, `DataSourceDim = Code` |

The type pair matters: one indicator's `SpatialDim` can mix `COUNTRY`,
`REGION` and `GLOBAL` rows, and joining on the code alone would match a
region code against the country list. A dimension used only in older rows,
beyond the 1,000 newest, is missed. That costs a recommendation, never a
wrong one. `IndicatorDimension` is not used, because it lists only 1,789
indicators.

**Engine.** `RelationDescription` gains optional `companions` and
`freshnessProbe`. `LISTING_CONTRACT_COLUMNS` gains `companion_listings` and
`api_freshness_probe`, and `isListingRowUnchanged` compares both, so
recommendations that change cause a write. The upsert RPC
(`rpc_data_catalog_listings__upsert_with_relation_columns`) writes both
columns.

**Reading them.** New RPC `rpc_data_catalog_listings__get_companions(p_catalog_listing_id
uuid, p_workspace_id uuid)`, `security invoker`, executable by
`authenticated`. For each companion it resolves, in array order, it returns:

| Field | Meaning |
|---|---|
| `catalog_listing_id`, `display_name` | The companion |
| `is_workspace_loadable`, `is_invalid` | Whether it can be added |
| `kind`, `join_on` | From the member |
| `is_in_workspace` | Whether a `datasets__open_data` row in `p_workspace_id` already names it. Read through RLS, so a caller outside the workspace sees `false` |

**Showing them.** In `DataCatalogListingDetail`:

1. **A "Recommended with this dataset" section, after the columns**, since
   its join hints name columns the user has just read. Each row shows:
   - The companion's name. Clicking it selects that listing in the catalog.
   - Its reason. For `lookup`: "Names the codes in {column}", built from the
     non-type column of the pair, e.g. "Names the codes in SpatialDim".
   - Either an "In your workspace" badge, "Not supported yet" for an
     unloadable companion, or an "Add" button with the aria-label "Add
     {name} to workspace".

   The section is hidden when nothing resolves.
2. **After "Add to workspace" succeeds**, if any loadable companion is not
   in the workspace, the success notification adds "Recommended with it:
   {names}" and an "Add them too" button. The button adds each one in turn
   through the existing single-listing `insertOpenDataDataset` flow, which
   also requests each one's copy. There is no batch RPC, since a GHO
   indicator rarely has more than three companions.

All of this copy goes through Lingui (`t` for props, `<Trans>` for JSX), as
the rest of the detail view does.

The join pairs are not yet passed to the datasets a workspace creates, so
chat cannot use them to write joins. That is follow-up work (section 9).

### 6. Copies are re-checked: max age and throttled checks

#### 6.1 The bug

`DatasetParquetWrapper._downloadApiOpenData` returns
`maxAgeMs: copy.isStale ? STALE_COPY_MAX_AGE_MS : undefined`. A copy that was
current when it loaded has no max age, so both cache tiers keep it until
IndexedDB evicts it, and the workspace never asks the `parquet-cache` route
again. A Socrata or HDX listing that changes after a workspace loads it stays
on the old rows until the browser runs out of quota. Open data datasets have
no Refresh action, so a user cannot fix it either.

#### 6.2 The fix

| Change | Where |
|---|---|
| A current copy gets `maxAgeMs: GlobalAppConfig.timing.openDataCopyMaxAgeMs` (new, 15 minutes). A stale copy keeps `STALE_COPY_MAX_AGE_MS` (5 minutes). A `pipeline_parquet` listing is unchanged | `DatasetParquetWrapper.ts` |
| The `open_data` entry stays `isLive: false`, since it has no Refresh action and no dataset-keyed route. Its comment ("with no max age") is corrected, and a wrapper test pins both ages | `datasetSourceTypeContract.test.ts`, `DatasetParquetWrapper.test.ts` |
| Copy parts are uploaded with `cacheControl: "31536000"`. A part never changes once written, because each build writes to its own folder. So a re-acquire whose copy did not change reads its parts from the browser's HTTP cache, not over the network | the pipeline server's part upload |
| The edge function skips the upstream freshness check when the listing was checked within `OPEN_DATA_FRESHNESS_RECHECK_AFTER_MS` (new, 15 minutes), and reuses that check's result | `requestParquetCache.ts` |

Throttling happens per listing, not per workspace, so upstream calls are
bounded by the number of listings in use. However many workspaces load a
listing, its source gets at most one freshness check every 15 minutes. That
bound is what keeps a paid API affordable.

Two new columns hold the last check:

| Column | Meaning |
|---|---|
| `parquet_cache_checked_at timestamptz` | When the freshness token was last read successfully |
| `parquet_cache_checked_source_version text` | The token that check read |

- Both columns are set together or both are null.
- New RPC `rpc_data_catalog_listings__record_freshness_check(p_catalog_listing_id
  uuid, p_source_version text)`, executable only by `service_role`, sets both.
- Within the window, a copy is stale exactly when
  `parquet_cache_checked_source_version` differs from
  `parquet_cache_source_version`. Claiming a rebuild works as today.
- A check that fails still serves the copy as current, as today, and records
  nothing, so the next request tries again.

**Not done here:** revalidating a cached relation by its source version
instead of re-acquiring it. `SourceWrapper.readFreshness` has no caller, and
the storage tier drops the acquired `sourceVersion`
([`qetl-architecture.md`](../qetl-architecture.md) section 13). With the
HTTP cache above, a re-acquire of an unchanged copy costs one route call and
one in-browser merge of the parts, which is acceptable at 15 minutes.
Revalidation is P0.5's job.

### 7. Catalog preview

`fetchCatalogListingPreview` reads a sample through the column-type-sample
route only when `apiResourceFormat` is `CSV`. Any other listing is previewed
from its copy's first part, and shows the preview's error state until some
workspace has added it. That would leave most of GHO's 3,091 listings with
no preview.

- `acquireOpenDataColumnTypeSample` gains an `odata` arm. It sends
  `GET <apiBaseUrl>/<apiResourceId>?$top=200`, reads the `value` array, and
  writes CSV with the listing's relation columns as the header, through the
  existing `buildCsvFromDatastoreRecords`. A sample that fills the size cap
  is cut at the last whole row, as CKAN's is.
- `fetchCatalogListingPreview` reads that sample for `ODATA` listings as well
  as `CSV` ones.

The sample is for the preview only. It never verifies types, because an
`odata` listing's types are already verified.

### 8. Every place that changes

**Schema** (`supabase/schemas/`, one migration through `pnpm db:new-migration`
after `ava supabase switch`):

| Change | File |
|---|---|
| `api_service` gains `odata` | `00.enum.data_catalog_listings__api_service.sql` |
| `companion_listings`, `api_freshness_probe`, `parquet_cache_checked_at`, `parquet_cache_checked_source_version`, and their checks | `11.data_catalog_listings.sql` |
| Write `companion_listings` and `api_freshness_probe` | `50.rpc_data_catalog_listings__upsert_with_relation_columns.sql` |
| New RPCs | `50.rpc_data_catalog_listings__record_freshness_check.sql`, `50.rpc_data_catalog_listings__get_companions.sql` |

Then:

- `pnpm db:gen-types`
- `pnpm desktop:sqlite:gen-migrations` (listings are mirrored to the desktop
  app)

**Closed lists of `api_service` that need `odata`:**

| Site | Kind |
|---|---|
| `shared/connectors/open-data/readOpenDataFreshnessToken/readOpenDataFreshnessToken.ts` | `.exhaustive()` |
| `shared/connectors/open-data/acquireOpenDataColumnTypeSample/acquireOpenDataColumnTypeSample.ts` | `.exhaustive()` |
| `shared/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types.ts` (`OpenDataApiService`) | union |
| `shared/models/data-catalog-listings/DataCatalogListing/DataCatalogListingParsers.ts` | `z.enum`, tied to the generated types |

**New failure codes** go in `shared/connectors/open-data/openDataErrors.ts`:
`freshness-probe-invalid`, and the `odata-unreachable`,
`odata-response-invalid` and `odata-empty` codes the sample arm raises
(`odata-empty` marks a listing `empty_dataset`, as CKAN's `resource-empty`
does). They also go in the two switches with no default:
`statusFromOpenDataFailure.ts` and `failureToInvalidDatasetReason.ts`.
`copy-too-large` is a build failure, so it is mapped in the pipeline
server's `toParquetCopyFailure`, from DuckDB's out-of-memory error.

**Model.** `DataCatalogListing` gains `companionListings`,
`apiFreshnessProbe`, `parquetCacheCheckedAt` and
`parquetCacheCheckedSourceVersion`, each with a parser.
`DataCatalogListing.Companion` names one member.

## 9. Deferred, and tracked

| Item | Why deferred | Tracked |
|---|---|---|
| **Partitioned live connections**: one listing for all of an API (all of GHO as one table), with `$filter` built from the query's filters on declared partition keys. Each partition is cached separately, and cache hits are a set-containment check, as columns are | Not needed while every relation can be copied whole. It reopens the "whole relation, column slices only" rule in [`qetl-architecture.md`](../qetl-architecture.md) section 6, and needs a real SQL syntax tree (DuckDB's `json_serialize_sql`), per-partition entries in both cache tiers and in Storage, and a fast route for small partitions | P6.13 in `production-plan-world-humanitarian-day.md`; `open-data-catalog-architecture.md` section 7, item 8 |
| Paged JSON downloads (1,000-row keyset pages) | Only needed for a JSON source over the build's memory limit. GHO's largest fits | P6.12 |
| Companions across drives and to `pipeline_parquet` listings (e.g. GHO countries to WDI) | Needs a wider companion key | P6.12 |
| Passing join pairs to workspace datasets, so chat can write joins | Needs a place on `datasets` or `dataset_columns` to keep them | P6.12 |
| A Refresh action for `open_data` datasets | Needs a new `DatasetRefresh` variant and its live connector e2e adapter | P6.12 |
| Moving `ckan` and `socrata` freshness onto listing probes | Works today, and nothing new needs it | P6.12 |
| Revalidating cached relations by source version | Belongs to QETL freshness work | P0.5 |

## 10. Slices

| # | Slice | Depends on |
|---|---|---|
| S1 | **Max age** (section 6.1 and the wrapper rows of 6.2) and copy part cache-control. Independent, and fixes Socrata and HDX on its own | none |
| S2 | **Schema**: the enum value, four columns, checks, the upsert RPC changes, two new RPCs, generated types, desktop mirror, pgTAP | none |
| S3 | **Shared**: `readFreshnessProbeToken`, the `odata` arms, failure codes, model and parsers | S2 |
| S4 | **Edge function**: throttled freshness checks through `record_freshness_check`, and listing probes | S2, S3 |
| S5 | **`@avandar/etl` and the copy builder**: `companions` and `freshnessProbe` on relations, contract columns, the change check, the JSON download variant, `convertJsonFileToParquetParts`, the memory limit, and probe checks before and after the download | S2, S3 |
| S6 | **`gho` pipeline**: config, client, extract, both relation builders, download script, schema check, mappers | S5 |
| S7 | **App**: the ODATA preview, the "Recommended with this dataset" section, the prompt after adding, and i18n extraction | S2, S3 |
| S8 | **E2E**: seed an indicator and a dimension listing with built copies (as `odc-parquet-copy.spec.ts` does). Add the indicator, take the recommendation, then query a join of the two. Also run `ava pipeline run gho --limit 25` locally against the real API | S4, S6, S7 |
| S9 | **Docs**: the deferred items in the production plan and the ODC architecture doc (done with this spec), then the ODC architecture doc's connector and freshness sections, and the PR feature log once built | all |

## 11. Tests

| Behaviour | Pinned by |
|---|---|
| A current API copy expires after `openDataCopyMaxAgeMs`, and a stale one after 5 minutes. A pipeline copy never expires | `DatasetParquetWrapper.test.ts` |
| A check within the window does not call the probe, and reports a stale copy from the recorded token. One outside the window calls it and records the result | `requestParquetCache.test.ts` |
| A probe reads its paths, refuses another host and plain `http`, and fails on a missing path | `readFreshnessProbeToken.test.ts` |
| The builder fails a JSON copy whose probe token moved during the download | `buildOpenDataParquetCache.test.ts` |
| JSON to Parquet: declared types hold, offset timestamps land in UTC, and a mistyped value fails | `convertJsonFileToParquetParts.executed.test.ts`, in real Node DuckDB |
| Companions are written, and changing them writes the row | `loadRelationsPage.test.ts`, `isListingRowUnchanged.test.ts` |
| The GHO probe result becomes the right companions, join pairs and loadability, and archived and empty indicators are handled | `makeGhoIndicatorRelation.test.ts` |
| A drifted entity type is listed as not loadable | `extractGhoDrive.test.ts` |
| `get_companions` resolves by API key in array order, skips missing companions, and reports `is_in_workspace` only for the caller's workspace | pgTAP `rpc_data_catalog_listings__get_companions.test.sql` |
| `record_freshness_check` is service-role only and sets both columns. The new checks hold | pgTAP, extending `rpc_data_catalog_listings__parquet_cache.test.sql` and `data_catalog_listings_access.test.sql` |
| The recommendation flow through the UI | S8's e2e spec |

## 12. Decisions

These were open questions, decided on 2026-11-09.

1. **`source_url` is the indicator's API URL.** GHO's human-readable
   indicator pages cannot be found from the code: building the address from
   the name worked for 5 of 40 sampled indicators, and WHO's indicator index
   names only 82 indicators the way the API does. The API URL is the real
   source, for every indicator, at no cost. It opens as raw JSON.
2. **Indicators with no rows (600) are listed as not loadable**, with the
   row count in `metadata.row_count`. The detail view says "This dataset has
   no data yet" when that count is 0, rather than "Avandar can't add this
   kind of dataset yet". A run that finds rows makes the listing loadable.
   Rejected: a new `invalid_dataset_reason` (an empty indicator is not
   broken), and leaving them out (a pipeline lists everything it finds).
3. **Dimension listings hash the whole value list** (`body-sha256`, section
   3), so a renamed value is noticed. Rejected: the value count alone, which
   misses renames.
4. **The pipeline runs weekly.** Listing probes keep added datasets current
   between runs. A run only finds new indicators, renames and
   recommendations, and WHO publishes in batches.
5. **This builds on `ghoapi.azureedge.net`, for the demo.** WHO's legacy GHO
   page lists it as "deprecated end of 2025", and names a "World Health Data
   Hub OData API" as its replacement, but that link is still a placeholder
   (`#`) and no replacement is documented. The old API stopped answering
   (HTTP 500 on every route) around 2026-10-30 and was back by 2026-11-05.
   Everything GHO-specific stays inside `apps/pipeline-server/pipelines/gho/`,
   and a run fails loudly when the schema check fails. Candidates for the
   move, not yet evaluated:
   - The Data Hub's per-indicator CSV files
     (`srhdpeuwpubsa.blob.core.windows.net/whdh/DATADOT/INDICATOR/<id>_ALL_LATEST.csv`).
     These would use the copy builder's existing CSV path.
   - `xmart-api-public.who.int/DATA_`, an undocumented OData service that
     looks like the Data Hub's backend. Measles was not found in it under
     its GHO code.

   Moving creates new listings, so workspaces would re-add their datasets.
