# EtlEngine: engine-owned Supabase load and incremental runs - design

- **Status:** Draft for review
- **Date:** 2026-10-20
- **Author:** pablo@avandarlabs.com
- **Branch:** `feat/demo/measles`
- **Packages touched:** `@avandar/etl` (`packages/node/etl`), `apps/pipeline-server`,
  `apps/ava-cli`, `supabase/schemas`

## 1. Summary

`@avandar/etl` becomes an ETL library for one specific shape of pipeline: one
whose final load lands in Supabase, as rows in a listings table and, optionally,
Parquet objects in a storage bucket. The engine learns Avandar's connector
vocabulary (drive, connection, relation) and takes over the load step that every
pipeline in `apps/pipeline-server/pipelines/` hand-codes today.

On top of that, the engine gains **incremental runs**. Every pipeline crawls each
of its drives oldest-first by the source's modification time, writes one page at
a time, and can resume from the newest timestamp it has already stored for that
drive. That one rule covers all three cases that motivated this work: a run that
was cancelled halfway, a run that was capped with `--limit`, and a finished run
that should only pick up what is new or changed since.

The `hdx` and `socrata` pipelines move onto the new engine. HDX switches from
one `package_show` request per dataset (28k+ requests, rejected by HDX's rate
limiter) to `package_search` sorted by `metadata_modified`, about 29 requests for
a full crawl, which makes the HDX drive viable for the first time.

## 2. Goals and non-goals

### Goals

1. The engine owns the load: it writes listing rows, relation columns, and
   Parquet objects. A pipeline describes what it found; it never calls Supabase
   itself.
2. The engine is configured with Supabase credentials, the listings table, the
   relation columns table, and the storage bucket. It hardcodes none of them.
3. One engine serves both kinds of listing: a drive-index row with no prebuilt
   blob (`api_resource`) and a prebuilt Parquet relation (`pipeline_parquet`).
   A pipeline may emit either or both.
4. Every drive of a pipeline is crawled and resumed independently. A drive that
   was just added to `socrata`'s drive list is crawled from scratch while the
   NYC drive only fetches what changed.
5. Run modes:
   - **Full** (`ava pipeline run socrata`): crawl everything, write only rows
     that changed, leave unchanged rows untouched.
   - **Incremental** (`--incremental`): crawl only connections created or
     modified at or after the drive's stored high-water mark.
   - **Explicit window** (`--since`, `--until`): crawl a given time range.
6. How a pipeline determines its "last timestamp" is configurable per pipeline,
   with a default that reads the listings table.
7. A run that is killed at any point leaves the listings table in a state the
   next incremental run resumes from correctly.

### Non-goals

- **Detecting deleted datasets.** HDX hides deleted datasets from anonymous
  search, and neither run mode removes rows. A deletion sweep is a separate
  design.
- **Socrata drives above 10,000 assets.** The Discovery API caps
  `offset + limit` at 10,000. NYC has 3,021 assets. A larger drive fails
  with a clear error; `scroll_id` support is a follow-up (section 9.2).
- **Incremental runs for Parquet pipelines.** `world-bank__wdi` moves onto
  the new engine but stays full-run only (section 5.4).
- **A cancel API, scheduling, or run history table.** Cancelling is killing
  the process; scheduling stays out of scope.
- **Concurrent runs of the same pipeline.** Not prevented. Two concurrent
  runs are safe for data (writes are idempotent) but waste requests.

## 3. Vocabulary

This design uses the four layers of
[`connector-nomenclature.md`](../../measles-demo/connector-nomenclature.md).
Note the numbering: the doc counts from service, so drive is layer 1, not 0.

| Layer | Term | In this design | HDX | Socrata | `world-bank__wdi` |
| --- | --- | --- | --- | --- | --- |
| 0 | Service | `EtlEngine`'s `service`, written to `api_service` | `ckan` | `socrata` | none |
| 1 | Drive | What a pipeline crawls and resumes independently | `data.humdata.org` | one portal, e.g. `data.cityofnewyork.us` | the one implicit drive (section 5.4) |
| 2 | Connection | One item the source lists, the unit of paging and of `--limit` | one CKAN dataset | one Socrata dataset | one input CSV file |
| 3 | Relation | One listing row the engine writes | one readable CKAN resource | the dataset's own rows (layers 2 and 3 coincide) | one Parquet table |

Two more terms:

- **High-water mark:** the newest source modification time the listings
  table already holds for one drive of one pipeline.
- **Window:** the `[since, until)` range of source modification times one run
  crawls for one drive.

## 4. Current state

| Area | Today |
| --- | --- |
| `EtlEngine` | Runs extract, transform, CSV to Parquet, then a pipeline-supplied `load`. Knows nothing about drives, Supabase rows, or relations. |
| `hdx`, `socrata` | Not `EtlEngine` pipelines. Each enumerates every drive into memory, then upserts once at the end through `upsertDataCatalogListingRows`. A cancelled run saves nothing. |
| HDX crawl | `package_list`, then one `package_show` per dataset. HDX rate-limits this after about 150 requests, so `HDX_DRIVE` is `undefined` and the pipeline is a no-op. |
| Socrata crawl | Discovery API with default (relevance) order and `offset` paging. Results carry no timestamps. |
| Timestamps on rows | Neither drive-index pipeline sets `date_of_last_update` or `date_of_last_sync`. Nothing records how fresh a row is. |
| Pipeline lineage on rows | The `data_catalog_listings__api_access_complete` check forces `pipeline_name` and `pipeline_run_id` to be `NULL` on every `api_resource` row, so an HDX or Socrata row cannot say which pipeline wrote it. `ava pipeline reset` works around this by matching on `api_service` and `api_base_url`. |
| `world-bank__wdi` load | Hand-codes the Parquet upload, the listing upsert, and the relation column rewrite (`catalogOpenDataInsert.ts`). Uploads to `SUPABASE_OPENDATA_BUCKET` or `opendata`, while the bucket migration created `open-data-catalog`. |

### What the source APIs support

Verified with live requests on 2026-10-20.

| | HDX (CKAN 2.11 `package_search`) | Socrata Discovery API |
| --- | --- | --- |
| Datasets | 28,355 | NYC: 3,021 assets (2,405 datasets) |
| Server-side date filter | Yes: `fq=metadata_modified:[A TO B}` | **None** |
| Ascending sort by modification | Yes: `sort=metadata_modified asc,name asc` | Yes: `order=updatedAt ASC` |
| Page size | Up to 1,000 rows, each a full dataset with `resources[]` | Up to 10,000 |
| Paging | Keyset on `(metadata_modified, name)` works; deep `start` also works | `offset`, with `offset + limit <= 10,000` |
| Timestamp format | Naive UTC with microseconds on full records, e.g. `2026-10-20T13:47:48.858245`; the search index has millisecond precision | ISO UTC, second precision, e.g. `2026-10-01T12:00:00.000Z` |
| Rate limit | 60 requests per minute, lower for anonymous clients, no `Retry-After` | Higher with an app token |

## 5. Design

### 5.1 The output contract

The engine writes to two tables whose names are configuration, and to one
bucket whose name is configuration. It requires the columns below and never
writes any other column. Today's `data_catalog_listings` and
`data_catalog_listings__relation_columns` satisfy this contract once the schema
change in section 5.6 lands.

**Listings table** (configured as `output.listingsTable`):

| Column | Written for | Meaning |
| --- | --- | --- |
| `id` | read only | Primary key, used to attach relation columns |
| `access_kind` | both | `api_resource` or `pipeline_parquet` |
| `pipeline_name`, `pipeline_run_id` | both | Which pipeline and run last wrote the row |
| `display_name`, `external_organization_name` | both | Required display fields |
| `external_dataset_id` | both | The connection's id in the source |
| `date_of_last_update` | both | The connection's source modification time. The default high-water mark reads this. |
| `date_of_last_sync` | both | When this pipeline last wrote the row |
| `external_service_name`, `source_url`, `canonical_urls`, `license`, `update_frequency`, `description`, `notes`, `metadata`, `coverage_start_date`, `coverage_end_date` | both, optional | Descriptive fields a relation may carry |
| `api_service`, `api_base_url`, `api_resource_id`, `api_resource_format` | `api_resource` | Service, drive, relation id, format |
| `parquet_file_name` | `pipeline_parquet` | The object name in the bucket |

Upsert conflict targets: `(api_service, api_base_url, external_dataset_id,
api_resource_id)` for `api_resource` rows and `(parquet_file_name,
pipeline_name)` for `pipeline_parquet` rows, the two unique constraints the
table already has.

The engine **never writes** `cached_object_path`, `cached_source_version`, or
`cached_at`. The write-back cache belongs to the app, and a pipeline run must
not clear it.

**Relation columns table** (configured as `output.relationColumnsTable`):
`catalog_listing_id`, `column_name`, `display_order`, `original_data_type`,
`cast_data_type`. Written only for relations that declare columns (today: the
Parquet relations). For each listing it writes, the engine replaces that
listing's whole column set.

**Bucket** (configured as `output.bucket`): Parquet objects are written to
`<bucket>/<pipeline name>/datasets/<table>.parquet`, unchanged from today.

### 5.2 The `EtlEngine` API

```ts
const engine = EtlEngine.create({
  name: "socrata",                       // written to pipeline_name
  service: "socrata",                    // written to api_service on api_resource rows
  supabase: { url, serviceRoleKey },
  output: {
    listingsTable: "data_catalog_listings",
    relationColumnsTable: "data_catalog_listings__relation_columns",
    bucket: "open-data-catalog",         // only required if a relation is pipeline_parquet
  },

  listDrives: () => readonly Drive[],    // crawled in this order, one after another
  getDriveKey: (drive) => string,        // api_base_url for api_resource rows; used in logs and the report

  extract: ({ drive, window, pipelineRunId }) => AsyncIterable<readonly Connection[]>,
  getConnectionId: (connection) => string, // dedupes repeats within one drive's crawl
  transform: ({ drive, connection, pipelineRunId }) => PromisedOrValue<readonly Relation[]>,

  incremental?: {
    getConnectionTimestamp: (connection) => Date,
    readHighWaterMark?: (args: { drive, driveKey, supabase, output }) => Promise<Date | undefined>,
  },
});

const report: EtlRunReport = await engine.run({
  mode: "full" | "incremental",
  since?: Date,
  until?: Date,
  limit?: number,
});
```

`Relation` is a discriminated union. Each variant carries the descriptive
fields from section 5.1, plus:

```ts
type ApiResourceRelation = {
  kind: "api_resource";
  externalDatasetId: string;      // the connection
  apiResourceId: string;          // the relation
  apiResourceFormat: string;
  sourceUpdatedAt: Date | undefined; // becomes date_of_last_update
  columns?: readonly RelationColumn[];
  /* display and descriptive fields */
};

type PipelineParquetRelation = {
  kind: "pipeline_parquet";
  tableBaseName: string;          // object and parquet_file_name stem
  csvPath: string;                // the transformed CSV the engine converts to Parquet
  columns: readonly TransformedColumnDescription[];
  sourceUpdatedAt: Date | undefined;
  /* display and descriptive fields */
};
```

`extract` and `transform` are split along the connection and relation layers:
`extract` pages through a drive's connections and knows nothing about rows;
`transform` turns one connection into zero or more relations (an HDX dataset
with no readable resource yields none). Neither ever sees a Supabase client.

The engine keeps its existing static helpers (`storeExtractedData`,
`getLoadParquetPathForTable`) and the `etl-output/<pipeline>/<run>/` directory
layout for Parquet work. `uploadParquetToStorage` becomes internal, since the
engine now uploads on its own.

### 5.3 What `run()` does

For each drive from `listDrives()`, in order:

1. **Resolve the window.**
   - `since`: an explicit `since` wins; otherwise in `incremental` mode it is
     the drive's high-water mark; otherwise (full mode, or a drive with no rows
     yet) there is no lower bound. The lower bound is **inclusive**.
   - `until`: always the explicit `until` if given, **exclusive**.
   - `--incremental` with a pipeline that has no `incremental` config throws
     before any request is made.
2. **Page through `extract`.** For each page, in order:
   1. **Drop repeats.** A connection whose `getConnectionId` was already seen
      in this drive during this run is dropped. This happens before the order
      check, so a source that overlaps its pages on purpose (Socrata, section
      5.8) never trips it.
   2. **Check order.** In a pipeline with `incremental` config, every
      connection's timestamp must be at or after the previous one in this drive.
      A violation throws `OutOfOrderConnectionError` naming the drive, because a
      gap would make the stored high-water mark lie.
   3. **Apply the limit.** `limit` counts connections across the whole run.
      The engine trims the page at the limit and stops fetching after it.
   4. **Transform** each connection into relations.
   5. **Load the page** (section 5.5).
3. **Record the drive's result** in the report. A drive that throws is recorded
   as `failed` with its error, and the next drive still runs.

`run()` resolves to the report. It rejects only if every drive failed, so a
partial run still reports what succeeded.

```ts
type EtlRunReport = {
  pipelineRunId: string;
  mode: "full" | "incremental";
  drives: Array<{
    driveKey: string;
    window: { since: Date | undefined; until: Date | undefined };
    connectionsFetched: number;
    relationsWritten: number;
    relationsUnchanged: number;
    newestTimestamp: Date | undefined;
    status: "ok" | "failed";
    error?: string;
  }>;
};
```

**Why the stored high-water mark is safe to resume from.** Connections arrive
oldest first and each page is written before the next is fetched, so the
listings table always holds a complete oldest-first prefix of each drive's
connections (up to `until`). Killing the run at any point, or stopping at a
limit, leaves a prefix. The next incremental run starts at the newest timestamp
in that prefix. Because the bound is inclusive, connections that share that
exact timestamp but were not written yet are fetched again. Connections that
were written already are fetched again too, and the change check in section 5.5
skips them without a write.

**The default high-water mark** is:

```sql
select max(date_of_last_update)
from <listingsTable>
where pipeline_name = <name> and api_base_url = <driveKey>
```

A pipeline overrides it with `incremental.readHighWaterMark`, for example to
read `date_of_last_sync`, or a value stored in `metadata`. A connection that
yields no relations writes no row, so it never moves the high-water mark. When
such connections are the newest in a drive, each incremental run re-checks
them. That costs a few connections per run, not a correctness problem.

### 5.4 Pipelines without incremental support

A Parquet pipeline like `world-bank__wdi` has one implicit drive and is
full-run only:

- `listDrives` returns one drive, and `getDriveKey` returns the pipeline name.
- `incremental` is omitted, so `--incremental` is rejected up front.
- Its scope for the change check and for `ava pipeline reset` is
  `pipeline_name` alone, since `pipeline_parquet` rows have no
  `api_base_url`.

Supporting several drives or incremental runs for a Parquet pipeline needs a
drive column that both row kinds share. That is a follow-up if a second Parquet
pipeline ever needs it (section 9.2).

### 5.5 Loading a page

For one page of relations, in this order:

1. **Parquet relations:** convert each CSV to ZSTD Parquet with the existing
   `transformedCsvsToParquetBlobs`, then compute the Parquet bytes' SHA-256.
   If the existing row's `metadata.parquet_sha256` matches, skip the upload.
   Otherwise upload with `upsert: true`. The object is uploaded before its
   row is written, so a row never points at a missing object.
2. **Read the existing rows** for the page's keys from the listings table, in
   chunks of 200 keys so the request URL stays short.
3. **Compare.** A relation is *unchanged* when every column the engine writes,
   except `pipeline_run_id` and `date_of_last_sync`, equals the stored value.
   Comparing all written columns, not just `date_of_last_update`, means a
   change to a pipeline's own mapping code is picked up by the next full run
   even when the source did not change.
4. **Upsert only the changed relations**, setting `pipeline_name`,
   `pipeline_run_id`, and `date_of_last_sync` to this run's values. Chunks are
   written oldest connection first, so a crash between chunks still leaves an
   oldest-first prefix.
5. **Replace relation columns** for each written relation that declares
   columns.

Full and incremental runs load pages the same way. The mode only changes the
window.

### 5.6 Schema change

One migration, generated with the `supabase-declarative-schema` workflow:

1. **Relax `data_catalog_listings__api_access_complete`** so an
   `api_resource` row may carry `pipeline_name` and `pipeline_run_id`. They
   stay nullable on `api_resource` rows, since a hand-curated API listing has
   no pipeline. Parquet columns stay forbidden on `api_resource` rows.
2. **Backfill** `pipeline_name` on existing rows: `socrata` where
   `api_service = 'socrata'`, and `hdx` where `api_service = 'ckan'` and
   `api_base_url = 'https://data.humdata.org'`.
3. **Index** `(pipeline_name, api_base_url, date_of_last_update)` for the
   high-water mark query.
4. **Update column comments.** `pipeline_name` and `pipeline_run_id` no longer
   say "null on an `api_resource` listing", and `date_of_last_update` says it
   holds the source modification time that incremental runs resume from.

`ava pipeline reset` then scopes every pipeline by `pipeline_name` (plus
`api_base_url` per drive, if a drive filter is added later), and drops its
hardcoded `socrata` and `hdx` filters.

### 5.7 HDX pipeline

- **Drive:** set `HDX_DRIVE` to `https://data.humdata.org`. A full crawl is
  about 29 requests.
- **`CkanDiscoveryClient.searchDatasets`** (new, in
  `shared/connectors/open-data/`): calls `package_search` with
  `sort=metadata_modified asc,name asc`, `rows=1000`, and
  `fq=metadata_modified:[<since> TO <until>}`. It returns full dataset records,
  including `resources[]`, so no `package_show` call is needed per dataset.
  `listDatasets` (`package_list`) is removed if nothing else uses it.
- **Paging is keyset, not `start`:** each next page re-queries from the last
  page's `metadata_modified` (inclusive) and skips rows at or before the last
  `(metadata_modified, name)` pair. Offset paging would skip or repeat
  datasets that change during the crawl.
- **Timestamps:** `metadata_modified` is naive UTC with microseconds. It is
  parsed as UTC. Query bounds are rounded down to milliseconds, which matches
  the search index's precision and only widens the inclusive lower bound.
- **Connection timestamp:** `metadata_modified`. It changes when a resource is
  added or edited, which is what the drive index needs to notice.
- **`transform`:** today's `makeCkanListingRowsFromPackage` logic, returning
  `ApiResourceRelation`s with `sourceUpdatedAt = metadata_modified`.
- **Rate limit:** keep the one-request-per-second limiter, and retry an HTTP
  429 up to 3 times with exponential backoff starting at 5 seconds, since
  HDX sends no `Retry-After`.

### 5.8 Socrata pipeline

- **`SocrataDiscoveryClient.search`** gains an `order` parameter and returns
  `{ results, resultSetSize }` instead of a bare array, so `extract` can check
  a drive's size before paging. `SocrataDiscoveryResult` gains `updatedAt` and
  `createdAt`. The Socrata pipeline is the only caller, so nothing else
  changes.
- **`extract`** pages a drive with `order=updatedAt ASC`, `limit=1000`, and
  `offset`. The API has no date filter, so it filters client-side: it skips
  results before `since` and stops at the first result at or after `until`.
  An incremental NYC run therefore still reads about 3 pages, which is cheap.
- **Shifting results during a crawl:** a dataset modified mid-crawl moves to
  the end of the ascending order, which shifts every later result one place
  earlier and would skip one result at a page boundary. Each page after the
  first starts 20 results before the previous page's end, and the engine's
  per-drive dedupe drops repeats by connection id.
- **Drives over 10,000 assets** fail with an error naming the drive and the
  10,000-result limit.
- **Connection timestamp:** `updatedAt`. Socrata documents it as the last
  change of any kind.
- Drives are crawled one after another, not with `Promise.allSettled`. They
  share one rate-limited client, so running them in parallel gained nothing.

### 5.9 CLI and pipeline server

```text
ava pipeline run <name> [--local] [--limit <n>] [--incremental]
                         [--since <ISO 8601>] [--until <ISO 8601>]
```

| Flags | Window per drive |
| --- | --- |
| none | full: no lower bound, no upper bound |
| `--incremental` | from the drive's high-water mark |
| `--since T` | from `T` |
| `--until T` | adds an exclusive upper bound to any of the above |
| `--incremental --since T` | rejected: they name two different lower bounds |

- `--since` and `--until` must parse as ISO 8601 with an explicit timezone
  (`Z` or an offset), and `since` must be before `until`. A bare date with no
  timezone is rejected rather than guessed.
- The same options travel to the server as the JSON body of
  `POST /<name>/run` and to `scripts/runPipelineOnce.ts` as flags. One shared
  parser validates them in all three places, replacing
  `parsePipelineRunLimit`.
- `PipelineRunOptions` becomes `{ mode, since, until, limit }`.
- The CLI prints the report: one line per drive with its window, counts,
  newest timestamp, and status. `run()` still returns the run id as the last
  line of stdout for `--local`.

### 5.10 `@avandar/etl` packaging

- The public `EtlEngine.create` signature changes, so the PR title is
  `feat(etl)!: ...`. Before `1.0.0` the `!` bumps the minor version.
- `@supabase/supabase-js` stays a peer dependency. The engine creates its
  client from the credentials it is given.
- The README is rewritten around the new API and documents the output
  contract in section 5.1, so someone outside Avandar can see exactly which
  tables and columns the engine expects.

## 6. Data flow

```text
ava pipeline run socrata --incremental
  -> PipelineRunOptions { mode: incremental }
  -> socrata/run.ts: EtlEngine.create({...}).run(options)
       for drive in listDrives():                       (one at a time)
         since = readHighWaterMark(drive)               (max date_of_last_update)
         for page in extract({ drive, window }):        (updatedAt ASC)
           check order, apply limit
           relations = transform(each connection)
           load: read existing -> compare -> upsert changed -> columns
       -> EtlRunReport
  -> CLI prints one line per drive
```

## 7. Error handling

| Failure | Behavior |
| --- | --- |
| A drive's request fails or times out | That drive is `failed` in the report. Pages written before the failure stay, so the next incremental run resumes after them. Other drives still run. |
| Every drive fails | `run()` rejects with all drive errors. |
| Source returns a connection out of order | `OutOfOrderConnectionError` for that drive. Nothing from the bad page is written. |
| HDX 429 | Retried up to 3 times with backoff, then the drive fails. |
| Socrata drive over 10,000 assets | The drive fails with an error naming the limit. |
| Upsert or upload error | The drive fails at that page. Earlier pages and earlier chunks stay written. |
| `--incremental` on a pipeline without incremental config | Rejected before any request, naming the pipeline. |
| Invalid `--since`, `--until`, or both lower bounds | Rejected by the shared options parser in the CLI, server, and runner. |
| Process killed | No cleanup is needed. The table holds an oldest-first prefix, and the next run resumes from it. |

## 8. Testing

Red/green TDD throughout: every behavior below gets a failing test before the
code that makes it pass. Each test has an id so the implementation plan can
point at it, and each names the claim it proves. The "Spec" column names the
section whose behavior it covers.

### 8.1 `@avandar/etl` engine core

Unit tests in `packages/node/etl`, driving `EtlEngine.run()` with in-memory
fakes behind the engine's internal listings store and object store
interfaces, so no test needs Supabase.

**Windows and run modes**

| Id | Claim | Spec |
| --- | --- | --- |
| E1 | Incremental mode starts each drive at that drive's own high-water mark | 5.3 |
| E2 | Incremental mode starts a drive with no rows at no lower bound | 5.3 |
| E3 | Full mode ignores the high-water mark and starts at no lower bound | 5.3 |
| E4 | An explicit `since` overrides the high-water mark in incremental mode | 5.3 |
| E5 | An explicit `since` sets the lower bound in full mode | 5.3 |
| E6 | `until` is passed to `extract`, and a connection at exactly `until` is not written | 5.3 |
| E7 | The lower bound is inclusive: a connection at exactly the high-water mark is fetched and, when unchanged, not rewritten | 5.3 |
| E8 | A custom `readHighWaterMark` is called with the drive and drive key, and its value is the window's lower bound | 5.3 |
| E9 | `--incremental` on an engine with no `incremental` config rejects before `listDrives` or `extract` is called | 5.3, 7 |

**Ordering, repeats, and limits**

| Id | Claim | Spec |
| --- | --- | --- |
| E10 | A connection older than the one before it throws `OutOfOrderConnectionError` naming the drive | 5.3 |
| E11 | Nothing from the out-of-order page is written, and earlier pages stay written | 5.3, 7 |
| E12 | A repeated connection id within one drive is dropped before the order check, so it neither writes twice nor throws | 5.3 |
| E13 | The same connection id in two different drives is not treated as a repeat | 5.3 |
| E14 | `limit` counts connections across drives: with limit 5 and drives of 3 and 4, the second drive writes 2 | 5.3 |
| E15 | Once the limit is reached, `extract` is not asked for another page and later drives are not crawled | 5.3 |
| E16 | Drives are crawled in `listDrives` order, and a drive's first page is not requested until the previous drive finished | 5.3 |
| E17 | Without `incremental` config, pages are not order-checked | 5.4 |

**Resuming**

| Id | Claim | Spec |
| --- | --- | --- |
| E18 | A run that throws after page 2 of 4, rerun in incremental mode, writes every connection exactly once in total across both runs | 5.3 |
| E19 | A run stopped by `limit`, rerun in incremental mode, continues at the next connection | 5.3 |
| E20 | A connection that yields zero relations writes no row and does not move the high-water mark | 5.3 |
| E21 | After a resume, connections that share the high-water mark timestamp but were not written before are written | 5.3 |

**Failures and the report**

| Id | Claim | Spec |
| --- | --- | --- |
| E22 | A drive whose `extract` throws is reported `failed` with its error, and the next drive still runs | 5.3, 7 |
| E23 | `run()` resolves with a report when at least one drive succeeds | 5.3 |
| E24 | `run()` rejects, naming every drive's error, when every drive fails | 5.3, 7 |
| E25 | A failed upsert fails that drive at that page, and its earlier pages stay written | 7 |
| E26 | The report gives each drive's key, window, connections fetched, relations written, relations unchanged, and newest timestamp | 5.3 |

**Loading**

| Id | Claim | Spec |
| --- | --- | --- |
| L1 | A full rerun with no source changes writes zero rows | 5.5 |
| L2 | A relation whose mapping changed is rewritten even when its source timestamp did not change | 5.5 |
| L3 | Rows that differ only in `pipeline_run_id` or `date_of_last_sync` count as unchanged | 5.5 |
| L4 | Every written row carries this run's `pipeline_name`, `pipeline_run_id`, and `date_of_last_sync` | 5.1, 5.5 |
| L5 | `date_of_last_update` is the relation's `sourceUpdatedAt` | 5.1 |
| L6 | An `api_resource` row carries `api_service` from the engine's `service` and the relation's API fields, and no Parquet column | 5.1 |
| L7 | A `pipeline_parquet` row carries `parquet_file_name` and no API column | 5.1 |
| L8 | No upsert payload contains `cached_object_path`, `cached_source_version`, `cached_at`, or any column outside the contract | 5.1 |
| L9 | A page of 450 relations is read back in chunks of at most 200 keys and all 450 are compared | 5.5 |
| L10 | Changed relations are upserted oldest connection first, so a failure in a later chunk leaves the earlier chunks written | 5.5 |
| L11 | Writing a relation with columns replaces that listing's whole column set: a column the relation no longer has is deleted | 5.1, 5.5 |
| L12 | An unchanged relation's columns are not rewritten | 5.5 |
| L13 | A Parquet relation is uploaded to `<bucket>/<pipeline name>/datasets/<table>.parquet` before its row is written | 5.1, 5.5 |
| L14 | A Parquet relation whose SHA-256 matches the stored `metadata.parquet_sha256` is not uploaded again | 5.5 |
| L15 | A Parquet relation whose SHA-256 changed is uploaded and its row records the new hash | 5.5 |
| L16 | A Parquet relation with no `output.bucket` configured rejects with an error naming the setting | 5.2 |
| L17 | Missing Supabase credentials reject with an error naming the missing setting, before any extract | 5.2 |

### 8.2 `@avandar/etl` Supabase stores

An integration suite against the local switched Supabase stack, in its own
vitest config (`packages/node/etl/vitest.supabase.config.ts`) so the default
`pnpm test` does not need a running stack. Fixtures use `pgtap-fixture`-style
synthetic names and `.invalid` hosts, and every test deletes what it inserted.

| Id | Claim | Spec |
| --- | --- | --- |
| S1 | Upserting the same `api_resource` relation twice leaves one row, on the `(api_service, api_base_url, external_dataset_id, api_resource_id)` key | 5.1 |
| S2 | Upserting the same `pipeline_parquet` relation twice leaves one row, on the `(parquet_file_name, pipeline_name)` key | 5.1 |
| S3 | The default high-water mark is the newest `date_of_last_update` for this pipeline and drive, ignoring other pipelines and other drives | 5.3 |
| S4 | Reading existing rows by key returns the stored values in the shape the change check compares | 5.5 |
| S5 | Replacing a listing's relation columns removes the old set and writes the new one | 5.1 |
| S6 | An upsert leaves an existing row's cache columns untouched | 5.1 |
| S7 | A Parquet object uploads to the configured bucket path and replaces an existing object | 5.1 |

### 8.3 Database (pgTAP and migration upgrade test)

| Id | Claim | Where | Spec |
| --- | --- | --- | --- |
| D1 | An `api_resource` row with `pipeline_name` and `pipeline_run_id` inserts | `supabase/tests/database/data_catalog_listings_access.test.sql` | 5.6 |
| D2 | An `api_resource` row with no `pipeline_name` still inserts | same | 5.6 |
| D3 | An `api_resource` row with `parquet_file_name` is still rejected | same | 5.6 |
| D4 | The `(pipeline_name, api_base_url, date_of_last_update)` index exists | same | 5.6 |
| D5 | The backfill sets `pipeline_name` to `socrata` on Socrata rows and `hdx` on `ckan` rows at `https://data.humdata.org` | `supabase/migration-upgrade-tests/data_catalog_listings_pipeline_name.{prelude,assertions}.sql` | 5.6 |
| D6 | The backfill leaves a `ckan` row on another host, and `pipeline_parquet` rows, unchanged | same | 5.6 |

### 8.4 `shared/connectors/open-data` clients

| Id | Claim | Spec |
| --- | --- | --- |
| C1 | `CkanDiscoveryClient.searchDatasets` sends `sort=metadata_modified asc,name asc` and `rows=1000` | 5.7 |
| C2 | A window becomes `fq=metadata_modified:[<since> TO <until>}`, with `*` for a missing bound | 5.7 |
| C3 | Window bounds are rounded down to whole milliseconds and sent as UTC with `Z` | 5.7 |
| C4 | The response parses into full datasets including `resources[]` and `metadata_modified` | 5.7 |
| C5 | A naive `metadata_modified` such as `2026-10-20T13:47:48.858245` parses as that instant in UTC | 5.7 |
| C6 | `SocrataDiscoveryClient.search` sends `order` when given, e.g. `updatedAt ASC` | 5.8 |
| C7 | Each Socrata result carries `updatedAt` and `createdAt` | 5.8 |
| C8 | `search` returns the total result count (`resultSetSize`) alongside the results | 5.8 |

### 8.5 `apps/pipeline-server`

**HDX**

| Id | Claim | Spec |
| --- | --- | --- |
| H1 | `extract` pages with keyset paging: the next request starts at the last page's newest `metadata_modified` | 5.7 |
| H2 | The next page skips rows at or before the last `(metadata_modified, name)` pair, so no dataset is returned twice | 5.7 |
| H3 | `extract` stops when a page returns fewer than 1,000 rows | 5.7 |
| H4 | `transform` returns one `ApiResourceRelation` per readable resource, with `sourceUpdatedAt` set to the dataset's `metadata_modified` | 5.7 |
| H5 | A dataset with no readable resource transforms to zero relations | 5.7 |
| H6 | The HDX HTTP client retries a 429 up to 3 times with exponential backoff from 5 seconds, then throws | 5.7, 7 |
| H7 | The HDX HTTP client does not retry a 4xx other than 429 | 5.7 |

**Socrata**

| Id | Claim | Spec |
| --- | --- | --- |
| P1 | `extract` requests `order=updatedAt ASC` with `limit=1000` | 5.8 |
| P2 | Every page after the first starts 20 results before the previous page ended | 5.8 |
| P3 | `extract` skips results before `since` | 5.8 |
| P4 | `extract` stops at the first result at or after `until` and requests no further page | 5.8 |
| P5 | A drive whose total is over 10,000 fails with an error naming the drive and the limit, before paging | 5.8, 7 |
| P6 | `transform` returns one relation per dataset, with `sourceUpdatedAt` set to `updatedAt` | 5.8 |

**`world-bank__wdi`**

| Id | Claim | Spec |
| --- | --- | --- |
| W1 | `transform` returns one `PipelineParquetRelation` per input CSV, with the display fields and year coverage the current hand-written load produces | 5.4 |
| W2 | `run({ mode: "incremental" })` rejects without reading the input directory | 5.4 |

**Run options and wiring**

| Id | Claim | Spec |
| --- | --- | --- |
| O1 | The shared options parser accepts each valid combination in the 5.9 table | 5.9 |
| O2 | It rejects `--incremental` together with `--since` | 5.9 |
| O3 | It rejects a `--since` or `--until` with no timezone | 5.9 |
| O4 | It rejects `since` at or after `until` | 5.9 |
| O5 | It rejects a `limit` that is not a positive integer | 5.9 |
| O6 | `POST /<name>/run` passes the parsed `mode`, `since`, `until`, and `limit` to the pipeline's `run` | 5.9 |
| O7 | `POST /<name>/run` answers 400 and does not run the pipeline when the options are invalid | 5.9 |
| O8 | `scripts/runPipelineOnce.ts` reads `--incremental`, `--since`, `--until`, and `--limit` into the same options | 5.9 |

### 8.6 `apps/ava-cli`

| Id | Claim | Spec |
| --- | --- | --- |
| A1 | `ava pipeline run --incremental --until T` sends `mode` and `until` in the server request body | 5.9 |
| A2 | `ava pipeline run --local --since T` passes `since` to the local runner | 5.9 |
| A3 | `ava pipeline run --incremental --since T` is rejected before any request | 5.9 |
| A4 | `ava pipeline run` prints one line per drive from the report, including a failed drive's error | 5.9 |
| A5 | `ava pipeline reset socrata` selects rows by `pipeline_name = socrata`, with no `api_service` filter | 5.6 |
| A6 | `ava pipeline reset` for a pipeline with no listings still reports nothing to delete | 5.6 |

### 8.7 Build checks

| Id | Claim | Spec |
| --- | --- | --- |
| B1 | `pnpm --filter @avandar/etl build` emits declarations with no `TS2527`, `TS2742`, or `TS7056` errors | 5.10 |
| B2 | `tsc` passes for `packages/node/etl`, `apps/pipeline-server`, `apps/ava-cli`, and `shared` | all |

### 8.8 Manual verification against the switched local Supabase

| Id | Claim | Spec |
| --- | --- | --- |
| M1 | `ava pipeline run socrata --local --limit 50`, then `--incremental`, continues where the limit stopped, and the report shows the window starting at the stored high-water mark | 5.3 |
| M2 | A full `ava pipeline run socrata --local` right after a full run reports zero relations written | 5.5 |
| M3 | Adding a second Socrata drive and running `--incremental` crawls the new drive from no lower bound while NYC's window starts at its high-water mark | 2, 5.3 |
| M4 | Killing `ava pipeline run hdx --local` partway, then rerunning with `--incremental`, finishes without rewriting what the first run wrote | 5.3 |
| M5 | `ava pipeline run hdx --local --limit 2000` finishes without a 429 failure | 5.7 |
| M6 | `ava pipeline run world-bank__wdi --local` writes the same listings, columns, and objects it wrote before the refactor | 5.4 |
| M7 | `ava pipeline reset socrata`, then `ava pipeline run socrata --local --incremental`, crawls from scratch | 5.6 |

## 9. Decisions and follow-ups

### 9.1 Decisions taken by default

These were left open in review and take the conservative default. Either can
be changed later without touching the engine, because both are configuration
the pipeline server passes in.

1. **Bucket.** `pipeline-server` passes `SUPABASE_OPENDATA_BUCKET`, falling
   back to `opendata`, which is exactly what `world-bank__wdi` uploads to
   today. Moving to the `open-data-catalog` bucket is a separate change.
2. **HDX scope.** The HDX drive indexes every dataset, with no organization or
   tag filter. A run can still be capped with `--limit`, and a filter is a
   one-line `fq` addition if one is wanted later.

### 9.2 Follow-ups

1. **Socrata `scroll_id`** for drives over 10,000 assets. It walks results in
   id order, not time order, so such a drive would always need a full scan.
2. **A shared drive column** for `pipeline_parquet` rows, if a Parquet
   pipeline ever needs several drives or incremental runs.
3. **Deletions.** A full run could mark rows it no longer sees, at least for
   Socrata, whose full scan does show deletions. Separate design.
