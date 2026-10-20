# @avandar/etl

Avandar's ETL library, for pipelines whose final load lands in Supabase: rows
in a listings table and, optionally, Parquet objects in a storage bucket. It
speaks Avandar's connector vocabulary. A pipeline crawls one or more
**drives** (a portal or deployment), pages through each drive's
**connections** (one dataset each), and turns every connection into zero or
more **relations** (one listing row each).

- **`EtlEngine`**: crawls a pipeline's drives oldest-first, writes one page
  at a time, and resumes each drive from the newest timestamp it has stored.
- **`NodeDuckDb`**: a thin wrapper around the `duckdb` Node bindings, used for
  CSV sniffing and Parquet export.

ESM only. Requires Node 22+.

## Install

```sh
pnpm add @avandar/etl
pnpm add duckdb @supabase/supabase-js
```

Both are peer dependencies, so your app picks their versions. `duckdb` is a
native module with a compiled binary, so it should be a single copy you
install. The engine builds its own Supabase client from `supabase.url` and
`supabase.serviceRoleKey`, but `createSupabaseListingsStore` and
`createSupabaseObjectStore` take a client you create, so its type must come
from your copy of `@supabase/supabase-js`.

## Usage

```ts
import { EtlEngine } from "@avandar/etl";
import type { EtlEngineConfig, EtlRunWindow } from "@avandar/etl";

/** A drive: one portal. */
type Portal = { baseUrl: string };
/** A connection: one dataset the portal lists. */
type Dataset = { id: string; name: string; updatedAt: string };

const portals: Portal[] = [{ baseUrl: "https://data.example.org" }];

/** Parse the timestamp once, and use it for both the crawl and the row. */
function getUpdatedAt(dataset: Dataset): Date {
  return new Date(dataset.updatedAt);
}

/**
 * Yields pages of datasets, oldest first. `window.since` is inclusive and
 * `window.until` is exclusive. Either may be undefined.
 */
async function* fetchDatasetPages(
  portal: Portal,
  window: EtlRunWindow,
): AsyncGenerator<Dataset[]> {
  const query = new URLSearchParams({ order: "updated_at.asc" });
  if (window.since) {
    query.set("updated_since", window.since.toISOString());
  }
  if (window.until) {
    query.set("updated_before", window.until.toISOString());
  }
  // A real source would follow its paging links. This stub yields one page.
  const response = await fetch(`${portal.baseUrl}/datasets?${query}`);
  yield (await response.json()) as Dataset[];
}

const config: EtlEngineConfig<Portal, Dataset> = {
  name: "example-portal",
  service: "example",
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  output: {
    listingsTable: "data_catalog_listings",
    relationColumnsTable: "data_catalog_listings__relation_columns",
  },
  listDrives: () => portals,
  getDriveKey: (portal) => portal.baseUrl,
  extract: ({ drive, window }) => fetchDatasetPages(drive, window),
  getConnectionId: (dataset) => dataset.id,
  transform: ({ connection }) => [
    {
      kind: "api_resource",
      externalDatasetId: connection.id,
      displayName: connection.name,
      externalOrganizationName: "Example City",
      sourceUpdatedAt: getUpdatedAt(connection),
      apiResourceId: connection.id,
      apiResourceFormat: "json",
    },
  ],
  incremental: { getConnectionTimestamp: getUpdatedAt },
};

const report = await EtlEngine.create(config).run({ mode: "incremental" });
```

## Run modes

| Options | Each drive's window |
| --- | --- |
| `{ mode: "full" }` | No lower bound: every connection is fetched |
| `{ mode: "incremental" }` | From the drive's high-water mark |
| `{ since }` | From `since` (inclusive), in either mode |
| `{ until }` | Adds an exclusive upper bound |
| `{ limit }` | Stops after this many connections across all drives |

`limit` must be an integer of 0 or more. A drive reached after the limit is
spent is reported `skipped` and is never fetched, so `{ limit: 0 }` skips
every drive. The engine filters connections by the window only when
`incremental` config is set. Without it, the window only reaches `extract`.

Both modes write only rows that changed. A row is unchanged when every
column the engine writes, except `pipeline_run_id` and `date_of_last_sync`,
equals the stored value.

**Resuming.** With `incremental` config, connections must arrive oldest
first, and each page is written before the next is fetched. The listings
table therefore always holds an oldest-first prefix of each drive, and an
incremental run resumes from it after a cancelled run, a limited run, or a
finished one. The lower bound is inclusive, so connections that share the
last stored timestamp are fetched again and skipped if unchanged.

**The high-water mark** defaults to `max(date_of_last_update)` for the
pipeline's rows with `api_base_url` equal to the drive key. Override it with
`incremental.readHighWaterMark`.
Dates later than now are ignored, so one future-dated source timestamp
cannot make incremental runs skip real changes until the clock catches up.

**Repeats.**

- A connection a drive returns more than once in a run is processed once. A
  repeat has the same connection id and, with
  `incremental.getConnectionTimestamp`, the same timestamp.
- A connection modified during the crawl reappears with a newer timestamp, so
  it is processed again.
- A page that holds the same listing twice (two relations with one conflict
  key, see the output contract) fails the drive.

**Ordering and timestamps.** With `incremental` config, a drive fails when:

- a connection's timestamp is not a valid date,
- the source returns a connection older than the one before it
  (`OutOfOrderConnectionError`), or
- a relation's `sourceUpdatedAt` is later than its connection's timestamp.
  `date_of_last_update` is the default high-water mark, so a later value
  would move it past connections not yet written. Derive both from the same
  parsed value.

**Failures.**

- A failing drive is reported `failed` with its error message. The next
  drive still runs.
- `run()` rejects when:
  - the options are invalid: an `incremental` run on a pipeline without
    `incremental` config, or a bad `limit`,
  - no `stores` are given and the Supabase credentials are missing,
  - `listDrives` throws, or
  - every drive fails, with `EtlRunFailedError`. It carries `report`,
    `errors` (what each drive threw), and a `cause` that aggregates them.
- Otherwise `run()` resolves with the report, which lists every drive in
  crawl order, including failed and skipped ones.
- A drive's counts and `newestTimestamp` cover only pages that finished
  loading. After a mid-page failure, `relationsWritten` leaves out the rows
  that page already wrote.

**Caveats.**

- An explicit `since` later than a drive's high-water mark skips the
  connections in between, and the next incremental run starts after them.
  A later run fills that gap only when its window reaches back over it: a
  full run, or a run with an earlier `since`.
- A failed column write (see "Engine-managed metadata" below) is repaired
  by a later run whose window refetches the connection, such as a full run.
  On a pipeline that runs incrementally the first upsert has already moved
  the high-water mark, so the next incremental run may not reach it.

## Output contract

The engine writes only these listings-table columns
(`LISTING_CONTRACT_COLUMNS`), and needs a table that has them:

| Column | Written for |
| --- | --- |
| `id` (read only), `access_kind`, `pipeline_name`, `pipeline_run_id`, `display_name`, `external_organization_name`, `external_dataset_id`, `date_of_last_update`, `date_of_last_sync` | every row |
| `external_service_name`, `source_url`, `canonical_urls`, `license`, `update_frequency`, `description`, `notes`, `metadata`, `coverage_start_date`, `coverage_end_date` | every row, `null` when unset |
| `api_service`, `api_base_url`, `api_resource_id`, `api_resource_format` | `api_resource` rows |
| `parquet_file_name` | `pipeline_parquet` rows |

Conflict targets: `(api_service, api_base_url, external_dataset_id,
api_resource_id)` and `(parquet_file_name, pipeline_name)`. Any other column,
such as an app-owned cache, is never written.

**Writes.** A page loads in connection order. Parquet objects upload before
any row is written, then changed rows are upserted in chunks. Each
`upsertRows` call holds one listing kind and is all-or-nothing. The Supabase
store reads stored rows a few at a time to keep request URLs short.

**Relation columns.** The relation columns table needs `catalog_listing_id`,
`column_name`, `display_order`, `original_data_type`, and `cast_data_type`.
A relation that declares columns replaces that listing's whole column set
when its row is written. An `api_resource` relation may declare `columns`,
and a `pipeline_parquet` relation's columns always come from its Parquet
file. A relation without `columns` never touches the column table.

**Engine-managed metadata.** The engine merges these keys over a relation's
own `metadata`:

| Key | Written for | Holds |
| --- | --- | --- |
| `open_data_bucket`, `storage_object_path`, `table` (`name`, `row_count`, `column_names`), `parquet_sha256` | `pipeline_parquet` rows | Where the object lives and the SHA-256 of its bytes |
| `relation_columns_sha256` | any relation that declares columns | The SHA-256 of its column set |

A row's `relation_columns_sha256` is written in a second upsert, after its
columns land. A failure in between leaves a row without the current hash,
which the next load that reaches the row sees as changed and rewrites.

**Parquet relations** need `output.bucket`: a `pipeline_parquet` relation
fails its drive when no bucket is set. The bucket must already exist, and
the service-role key must be able to write to it.

- Each relation's CSV is converted to ZSTD Parquet and uploaded to
  `<output.bucket>/<pipeline name>/datasets/<tableBaseName>.parquet`.
- The object's public URL is appended to `canonical_urls`, and the relation
  columns come from the Parquet file.
- The upload is skipped only when the stored row's `parquet_sha256`,
  `open_data_bucket`, and `storage_object_path` all match.
- The skip trusts the stored row, so an object deleted outside the pipeline
  is not uploaded again while its hash matches. `ava pipeline reset` deletes
  the pipeline's rows, so the next run uploads every object.

## Testing a pipeline

Pass `stores` to replace Supabase:

```ts
import {
  createInMemoryListingsStore,
  createInMemoryObjectStore,
} from "@avandar/etl";

// `config` is the config from Usage.
const listings = createInMemoryListingsStore();
const testEngine = EtlEngine.create({
  ...config,
  stores: { listings, objects: createInMemoryObjectStore() },
});
await testEngine.run({ mode: "full" });
listings.getRows();
```

## EtlEngine helpers

| Function | Description |
| --- | --- |
| `EtlEngine.storeExtractedData` | Copies a source file into `etl-output/<pipeline>/<run>/extract/<destinationBasename>` |
| `EtlEngine.getLoadParquetPathForTable` | Returns the absolute path for a load-stage Parquet file |

### Paths and configuration

| Export                          | Description                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `ETL_INPUT_BASE_DIR`            | Constant: `"etl-input"`                                                      |
| `ETL_OUTPUT_BASE_DIR`           | Constant: `"etl-output"`                                                     |
| `ETL_PATHS_ROOT_ENV`            | Env var name read for the absolute paths root (`ETL_PATHS_ROOT`)             |
| `getEtlPipelineInputDir`        | `etl-input/<pipeline-name>/`                                                 |
| `getEtlInputDir`                | Extract output dir for a run (`etl-output/.../extract`)                      |
| `getEtlOutputDir`               | Any-stage output dir for a run (`extract` or `transform`)                    |
| `getEtlLoadDir`                 | Load output dir for a run (`etl-output/.../load`)                            |
| `setEtlPathsRootForTesting`     | Pin the filesystem root used by all path helpers (tests only)                |
| `resetEtlPathsRootForTesting`   | Clear the testing override (call in `afterEach`)                             |

### Transform-step types

| Export                              | Description                                                            |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `transformedCsvsToParquetBlobs`     | Reads `<transformDir>/<name>.csv` for each description, returns ZSTD Parquet `Blob`s |
| `TransformedColumnDescription`      | `{ name, type: DuckDbSniffableDataType }` for a single column          |
| `TransformedDataDescriptionForParquet` | `{ name, columns: TransformedColumnDescription[] }` for one table   |

If `columns` is empty, the engine relies on DuckDB CSV auto-detection;
otherwise each column must specify a sniffable type for explicit casts.

---

## NodeDuckDb

A thin Node.js wrapper around the `duckdb` native bindings. Use directly
when you need raw DuckDB access outside of an `EtlEngine` pipeline.

### `class NodeDuckDb`

Constructor: `new NodeDuckDb({ databasePath? })`. Defaults to `:memory:`.

| Method                                       | Description                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `runRawQuery(sql, { params? })`              | Runs a query and returns normalized row objects. `$name$` placeholders are substituted with `String(value)` |
| `execSQL(sql)`                               | Runs DDL/COPY/etc. without returning rows                                    |
| `sniffCsv({ csvPath })`                      | Returns `[{ name, type }]` per column using DuckDB `sniff_csv`               |
| `readCsvIntoView(options)`                   | `CREATE OR REPLACE VIEW` over a `read_csv(...)` call                         |
| `exportTableOrViewAsZSTDParquetBlob(name)`   | Writes the table/view to a temp Parquet file with ZSTD, returns the bytes    |
| `summarizeParquetFile(parquetPath)`          | Returns `{ rowCount, columnNames, columnTypeDescriptions }` for a Parquet file |
| `close()`                                    | Closes connection and database handle                                        |

### CSV types

| Export                            | Description                                                              |
| --------------------------------- | ------------------------------------------------------------------------ |
| `NodeDuckDbReadCsvColumn`         | `{ name, type: DuckDbSniffableDataType }`: column spec for `read_csv`    |
| `NodeDuckDbSniffCsvColumn`        | `{ name, type: DuckDbSniffableDataType }`: returned by `sniffCsv`        |
| `NodeDuckDbReadCsvIntoViewOptions`| Options accepted by `readCsvIntoView` (path, view name, columns, header, skip, delimiter, autoDetect) |

### DuckDB sniffable types

| Export                                | Description                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `DuckDbSniffableDataType`             | Union of the persisted CSV-sniff types: `BOOLEAN`, `BIGINT`, `DOUBLE`, `TIME`, `DATE`, `TIMESTAMP`, `VARCHAR` |
| `duckDbDescribeColumnTypeToSniffable` | Maps a DuckDB `DESCRIBE` `column_type` string to a `DuckDbSniffableDataType`                  |
| `SNIFF_CSV_MAX_ROWS`                  | Sample size passed to `sniff_csv` (`10_000`)                                                  |

## License

MIT
