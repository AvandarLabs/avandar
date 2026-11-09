# @avandar/etl

Avandar's ETL library, for pipelines whose final load lands in Supabase: rows
in a listings table and, optionally, Parquet objects in a storage bucket. It
speaks Avandar's connector vocabulary. A pipeline crawls one or more
**drives** (a portal or deployment), pages through each drive's
**connections** (one dataset each), and turns every connection into zero or
more **relations** (one listing row each).

- **`EtlEngine`**: crawls each scope of each of a pipeline's drives
  oldest-first, writes one page at a time, and resumes each scope from its
  stored checkpoint.
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
type Dataset = {
  id: string;
  name: string;
  updatedAt: string;
  columns: { name: string; type: string }[];
};

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
    upsertListingsFunction: "rpc_data_catalog_listings__upsert_with_relation_columns",
    checkpointsTable: "pipeline_scope_checkpoints",
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
      organization1Name: "Example City",
      sourceUpdatedAt: getUpdatedAt(connection),
      apiResourceId: connection.id,
      apiResourceFormat: "json",
      columns: connection.columns.map((column) => ({
        name: column.name,
        originalDataType: column.type,
        castDataType: column.type === "number" ? "DOUBLE" : "VARCHAR",
      })),
    },
  ],
  incremental: { getConnectionTimestamp: getUpdatedAt },
};

const report = await EtlEngine.create(config).run({ mode: "incremental" });
```

## Run modes

| Options | Each crawl's window |
| --- | --- |
| `{ mode: "full" }` | No lower bound: every connection is fetched |
| `{ mode: "incremental" }` | From the scope's checkpoint, or no lower bound when it has none |
| `{ since }` | From `since` (inclusive), in either mode |
| `{ until }` | Adds an exclusive upper bound |
| `{ limit }` | Stops after this many connections across all crawls |
| `{ scopes }` | Crawls only these scope keys |

`limit` must be an integer of 0 or more. A crawl reached after the limit is
spent is reported `skipped` and is never fetched, so `{ limit: 0 }` skips
every crawl. The engine filters connections by the window only when
`incremental` config is set. Without it, the window only reaches `extract`.

Both modes write only rows that changed. A row is unchanged when every
column the engine writes, except `pipeline_run_id` and `date_of_last_sync`,
equals the stored value.

**Scopes.** A crawl is one scope of one drive. `listScopes(drive)` returns
the drive's scopes, each an object with a `key` plus whatever its
`extract` and `transform` need, and omitting it gives every drive one
scope, `all`. `extract` should narrow to the scope at the source where it
can, and `transform` must return only the scope's relations. Keys match
`ETL_SCOPE_KEY_PATTERN` and are unique within a drive. A key is the
scope's identity: change it when the scope's meaning changes, and the new
key crawls from the beginning. Every row records the scopes that produce
it in `pipeline_scope_keys`. `listScopes()` on the engine returns each
drive's live keys without crawling.

**Resuming.** With `incremental` config, connections must arrive oldest
first, and each page is written before the next is fetched. After each
page, the scope's checkpoint moves to the page's newest connection
timestamp, so an incremental run resumes after a cancelled run, a
limited run, or a finished one. The lower bound is inclusive, so
connections that share the checkpoint's timestamp are fetched again and
skipped if unchanged.

**Checkpoints** live in the checkpoints table (`output.checkpointsTable`,
or `stores.checkpoints` in tests), one per pipeline, drive, and scope. A
checkpoint records what was crawled, not what was written, so a scope
whose connections all produce no relations still advances. It never moves
backward, ignores timestamps later than the run's start, and does not
move during a crawl whose explicit `since` is later than it, which would
leave a gap. A crawl with an explicit `since` and no stored checkpoint does
not create one. A pipeline with `incremental` config reads each crawl's
checkpoint on every run, full runs included, so a failed checkpoint read
fails that crawl in a full run too.

**Repeats.**

- A connection a crawl returns more than once in a run is processed once. A
  repeat has the same connection id and, with
  `incremental.getConnectionTimestamp`, the same timestamp.
- A connection modified during the crawl reappears with a newer timestamp, so
  it is processed again.
- A page that holds the same listing twice (two relations with one conflict
  key, see the output contract) fails the crawl.

**Ordering and timestamps.** With `incremental` config, a crawl fails when:

- a connection's timestamp is not a valid date,
- the source returns a connection older than the one before it
  (`OutOfOrderConnectionError`), or
- a relation's `sourceUpdatedAt` is later than its connection's timestamp.
  The two should come from one parsed value.

**Failures.**

- A failing crawl is reported `failed` with its error message. The next
  crawl still runs.
- A drive whose key or scopes cannot be read, or whose scope keys are
  invalid, is reported `failed` once, with scope key `listScopes`.
- `run()` rejects when:
  - the options are invalid: an `incremental` run on a pipeline without
    `incremental` config, a bad `limit`, or `scopes` is empty, invalid, or
    names a scope no drive declares,
  - no `stores` are given and the Supabase credentials are missing,
  - `listDrives` throws, or
  - every crawl fails, with `EtlRunFailedError`. It carries `report`,
    `errors` (what each crawl threw), and a `cause` that aggregates them.
- Otherwise `run()` resolves with the report, which lists every crawl in
  crawl order, including failed and skipped ones.
- A crawl's counts and `newestTimestamp` cover only pages that finished
  loading. After a mid-page failure, `relationsWritten` leaves out the rows
  that page already wrote.

## Output contract

The engine writes only these listings-table columns
(`LISTING_CONTRACT_COLUMNS`), and needs a table that has them:

| Column | Written for |
| --- | --- |
| `id` (read only), `access_kind`, `pipeline_name`, `pipeline_run_id`, `display_name`, `organization1_name`, `external_dataset_id`, `date_of_last_update`, `date_of_last_sync`, `pipeline_scope_keys` | every row |
| `date_column_type_last_verified` | every row, `null` when the column types are not verified |
| `is_workspace_loadable` | every row (see "Workspace loadability") |
| `external_service_name`, `source_url`, `source_download_url`, `source_asset_type`, `canonical_urls`, `license`, `update_frequency`, `description`, `notes`, `metadata`, `coverage_start_date`, `coverage_end_date` | every row, `null` when unset |
| `organization2_name` ... `organization4_name`, `domains`, `tags`, `source_metadata` | every row, `null` when unset |
| `drive_id` | every row, `null` with no drives store |
| `api_service`, `api_base_url`, `api_resource_id`, `api_resource_format` | `api_resource` rows |
| `parquet_file_name` | `pipeline_parquet` rows |

`source_metadata` holds a relation's `sourceMetadata`: the source's own
record (a JSON value). It never counts as a change: it carries counters
that change daily, so it is written only alongside a change to another
column. `drive_id` links a row to its drive in the drives table (see
"Stores").

Conflict targets: `(api_service, api_base_url, external_dataset_id,
api_resource_id)` and `(parquet_file_name, pipeline_name)`. Any other column,
such as an app-owned cache, is never written.

The checkpoints table needs `pipeline_name`, `drive_key`, `scope_key`,
`high_water_mark` (`timestamptz`), and `pipeline_run_id`, unique on the
first three. It is required when the config has `incremental`.

**Writes.** A page loads in connection order. Parquet objects upload before
any row is written, then changed rows are written in batches of at most 200
listings, `COLUMNS_PER_WRITE` (5,000) relation columns, and `BYTES_PER_WRITE`
(4 MiB of JSON), since a hosted database's statement timeout and memory bound
how large one write can be. Each batch is one
`upsertListingsWithColumns` call, which writes every row together with its
whole column set in one transaction. A listing is never split from its
columns across batches, so the two are always written together: a listing
with more columns or bytes than a cap is written alone. The Supabase store
reads stored rows a few at a time to keep request URLs short.

**Relation columns.** An `api_resource` relation declares its `columns`,
which may be empty when the pipeline cannot learn them: they are filled in
when the listing's column types are verified. A `pipeline_parquet`
relation's columns always come from its Parquet file. Writing a row
replaces that listing's whole column set.

**Column type verification.** `date_column_type_last_verified` records when
a listing's column types were checked against real data. A
`pipeline_parquet` row is verified at sync time, since its columns come
from the Parquet file the engine wrote. An `api_resource` row is verified
only when its relation sets `columnTypesVerifiedAt`. A pipeline that knows
only column names writes each one as `VARCHAR`, with the source's own type
label or `UNKNOWN_ORIGINAL_DATA_TYPE` as its `original_data_type`, and the
app later verifies the types from a sample and rewrites the columns. So
that work survives, an unverified rewrite whose
`relation_columns_sha256` matches the stored row's keeps the stored
columns and verification date. The change check never compares
`date_column_type_last_verified`.

**Workspace loadability.** A pipeline lists every asset its drive has,
including ones a workspace cannot load yet, such as a map or a PDF, so a
catalog search still finds them. `is_workspace_loadable` says which ones a
workspace can add. A `pipeline_parquet` row is always loadable. An
`api_resource` row is loadable unless:

- its relation sets `isWorkspaceLoadable: false`, which a pipeline does for
  an asset it cannot read whatever its format, such as a Socrata map or an
  HDX file whose columns could not be read,
- its relation has no `apiResourceFormat`, or
- its format is in the engine's `workspaceLoadability.unloadableFormats`.

A pipeline loads those rules from a shared YAML file with
`readEtlConfigFile` and `getWorkspaceLoadabilityRules`. The file lists the
global unloadable formats. A pipeline's own config can make a global
format loadable (`loadableFormats`) or add its own (`unloadableFormats`)
under its `workspaceLoadability`, and passes that as `pipelineOverrides` to
`getWorkspaceLoadabilityRules`. A `pipelines` key in the shared file fails
the parse.

```yaml
workspaceLoadability:
  unloadableFormats: [PDF, XLSX]
```

Formats match case-insensitively and may be written as extensions
(`.pdf`). An unknown key fails the parse. Since a format rule can only
make a row unloadable, a relation that sets `isWorkspaceLoadable: true`
does not override it.

`output.upsertListingsFunction` names the database function that does the
write. It takes `p_listings`, a JSON array of `{ listing, relation_columns }`
where `listing` holds the contract columns and `relation_columns` holds
`{ column_name, display_order, original_data_type, cast_data_type }` rows,
upserts each listing on its conflict target, replaces its columns, and
returns the stored listings. Avandar's is
`rpc_data_catalog_listings__upsert_with_relation_columns`. Deleting a
listing deletes its columns too (`on delete cascade`), which is how reset
and prune clear them.

**Engine-managed metadata.** The engine merges these keys over a relation's
own `metadata`:

| Key | Written for | Holds |
| --- | --- | --- |
| `open_data_bucket`, `storage_object_path`, `table` (`name`, `row_count`, `column_names`), `parquet_sha256` | `pipeline_parquet` rows | Where the object lives and the SHA-256 of its bytes |
| `relation_columns_sha256` | every row | The SHA-256 of its column set |

Because the hash is part of the row, a change to a relation's columns alone
makes its row count as changed, and the row and its columns are rewritten.

**Parquet relations** need `output.bucket`: a `pipeline_parquet` relation
fails its crawl when no bucket is set. The bucket must already exist, and
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

## Pipeline config and field mapping

Each pipeline keeps its drives, and how a source record becomes catalog
metadata, in one YAML file beside it, such as `socrata.pipeline.yaml`. The
file replaces hard-coded drive lists and per-pipeline metadata code. Read it
with `readPipelineConfigFile` (or `parsePipelineConfig` for text you already
have). The parse is strict: an unknown key, a field with zero or two
mapping kinds, or an unknown field name fails with the file and the key.

```yaml
# apps/pipeline-server/pipelines/socrata/socrata.pipeline.yaml
organizationLabels:
  1: City
  2: Agency

fields:
  description: { script: ./mappers/socrataDescription/socrataDescription.ts }
  organization2_name: { from: resource.attribution }
  domains: { script: ./mappers/socrataDomains/socrataDomains.ts }
  tags: { from: classification.domain_tags }
  update_frequency: { script: ./mappers/socrataUpdateFrequency/socrataUpdateFrequency.ts }

drives:
  - baseUrl: https://data.cityofnewyork.us
    fields:
      organization1_name: { value: City of New York }

  - baseUrl: https://data.ny.gov
    organizationLabels: { 1: State, 2: Agency }
    fields:
      organization1_name: { value: State of New York }

  - baseUrl: https://health.data.ny.gov
    organizationLabels: { 1: State, 2: Department, 3: Office }
    fields:
      organization1_name: { value: State of New York }
      organization2_name: { value: Department of Health }
      organization3_name: { script: ./mappers/socrataOfficeDivision/socrataOfficeDivision.ts }
```

| Top-level key | Required | Meaning |
| --- | --- | --- |
| `organizationLabels` | No | Default labels by level number (1-4) |
| `fields` | No | Field mappings every drive uses |
| `drives` | Yes | The drives to crawl, in order. An empty list switches the pipeline off |
| `workspaceLoadability` | No | This pipeline's `loadableFormats` and `unloadableFormats` (see "Workspace loadability") |

| Drive key | Required | Meaning |
| --- | --- | --- |
| `baseUrl` | Yes | `https://`, no trailing slash. Also the drive's key |
| `organizationLabels` | No | Replaces the default labels for this drive. A level it omits has no label, it is not inherited |
| `fields` | No | Merged over the pipeline's `fields`, key by key |
| `scopes` | No | Left unparsed: each pipeline validates its own scopes |

**Mapping kinds.** Each entry under `fields` has exactly one of:

| Kind | Example | Result |
| --- | --- | --- |
| `from` | `{ from: classification.domain_tags }` | The value at that dotted path in the source record. A missing path is `undefined`. Numeric segments index arrays (`groups.0.title`). There is no wildcard |
| `value` | `{ value: City of New York }` | That constant (a string, or a list of strings) |
| `script` | `{ script: ./mappers/socrataDomains/socrataDomains.ts }` | What the script's default export returns for the record. The path is relative to the YAML file |

A script default-exports one synchronous function:

```ts
export default function socrataDomains(
  record: unknown,
  context: CatalogFieldScriptContext,
): unknown;
```

`context` carries the drive's `driveKey` and the target `field`. A script
that throws fails that field for that record only: the field is left out and
the result lists a problem.

**Mappable fields.** `fields` accepts only the names in
`CATALOG_MAPPABLE_FIELDS`: `description`, `notes`, `license`,
`update_frequency`, `canonical_urls`, `coverage_start_date`,
`coverage_end_date`, `organization1_name` through `organization4_name`,
`domains`, and `tags`. Anything else fails the parse. `display_name` is not
mappable. `organization1_name` is required: every drive must map it, through
its own `fields` or the pipeline's, or the config fails to load.

**Coercion.** A mapped value is coerced to the field's kind:

| Field kind | Accepts | Otherwise |
| --- | --- | --- |
| Text | A string. Blank becomes null | Left out, with a problem |
| Text array (`domains`, `tags`, `canonical_urls`) | A string (wrapped) or an array of strings. Blanks and duplicates are dropped. An empty result is null | Left out, with a problem |
| Date (`coverage_*`) | An ISO 8601 string | Left out, with a problem |

Coercion does not clean markup: a source whose text carries HTML maps it
through a script.

**Loading once per run.** `loadCatalogFieldMapper` compiles a config,
`async`, once at the start of a run. It splits each `from` path, merges each
drive's fields over the pipeline's, and imports each distinct script once by
`file://` URL (so Bun and `vite-node` resolve it the same way), however
many fields use it. A script that is missing, fails to load, or has no
function default export rejects here, before any network call. The returned
`CatalogFieldMapper.mapFields(record, driveKey)` is synchronous, touches no
file, and throws when `driveKey` is not a drive in the config. It returns
`{ fields, problems }`, where `fields` is named as `RelationDescription`
names them (`organization1Name`, `updateFrequency`, `canonicalUrls`, ...), so
a pipeline spreads it into a relation.

```ts
import {
  getOrganizationLabelsFromDrive,
  loadCatalogFieldMapper,
  readPipelineConfigFile,
} from "@avandar/etl";

const config = readPipelineConfigFile(configPath);
const mapper = await loadCatalogFieldMapper({ config, configDir });
const { fields, problems } = mapper.mapFields(record, drive.baseUrl);
const organizationLabels = getOrganizationLabelsFromDrive({ config, drive });
```

| Export | Description |
| --- | --- |
| `parsePipelineConfig` | `({ yamlText, sourceName })`: validates YAML text and returns a `PipelineConfig`. Throws naming `sourceName` and the key |
| `readPipelineConfigFile` | `(filePath)`: reads and parses one pipeline config file |
| `loadCatalogFieldMapper` | `({ config, configDir, importScript? })`: compiles a config into a `CatalogFieldMapper`. `importScript` replaces the module import in tests |
| `getOrganizationLabelsFromDrive` | `({ config, drive })`: a drive's own organization labels, else the pipeline's, else `{}`. Pass the result as `EtlDriveDescription.organizationLabels` |
| `CATALOG_MAPPABLE_FIELDS` | The listing fields a config can map, as the listings table names them |
| `PipelineConfig`, `PipelineDriveConfig` | A parsed config file, and one of its drives |
| `CatalogFieldMappings`, `CatalogFieldSource`, `CatalogMappableField` | A set of mappings, one `from` / `value` / `script` entry, and one mappable field name |
| `CatalogFieldMapper`, `CatalogFieldMapResult`, `CatalogFieldMapProblem`, `CatalogMappedFields` | The compiled mapper, one record's `{ fields, problems }`, a field left out and why, and the mapped fields in `RelationDescription` names |
| `CatalogFieldScript`, `CatalogFieldScriptContext` | A script's default export, and its `{ driveKey, field }` context |
| `EtlOrganizationLevel`, `EtlOrganizationLabels` | A level (`1` to `4`, broadest first), and the label each level has on a drive, such as `City` for level 1 |

## Stores

The engine reads and writes through stores. It builds Supabase ones from
`supabase` and `output`, and `stores` replaces them (see "Testing a
pipeline").

| Export | Description |
| --- | --- |
| `createSupabaseListingsStore`, `createInMemoryListingsStore` | The listings table |
| `createSupabaseCheckpointStore`, `createInMemoryCheckpointStore` | The checkpoints table |
| `createSupabaseObjectStore`, `createInMemoryObjectStore` | Parquet objects in a bucket |
| `createSupabaseDrivesStore` | `({ client, drivesTable })`: writes the drives table, with `pipeline_name`, `drive_key`, and `organization1_label` through `organization4_label`, unique on the first two. Needs a service-role client. Throws with the table name and Supabase's message when a write fails |
| `createInMemoryDrivesStore` | Keeps drives in memory. Adds `getDrives()` and `getUpsertCount()` for assertions |
| `DrivesStore` | `{ upsert(drive): Promise<string> }`: inserts a drive or replaces its labels, and resolves to its id |
| `DriveRow` | One drive: `pipelineName`, `driveKey`, `organizationLabels` |
| `InMemoryDrivesStore`, `StoredDriveRow`, `SupabaseDrivesStoreOptions` | The in-memory store's type, a `DriveRow` with its `id`, and the Supabase store's options |

**Drives.** Set `output.drivesTable` (such as `data_catalog_drives`) to
record each crawled drive and link its listing rows to it through
`drive_id`. A drive is written only for a crawl that runs. Omit the table
and no drive and no `drive_id` is written. `EtlEngineConfig.describeDrive`
returns an `EtlDriveDescription` (`{ organizationLabels }`) for a drive,
usually from `getOrganizationLabelsFromDrive`. Omit it to record each drive
with no labels. `EtlOutput.drivesTable` is the `output.drivesTable` option. Pass
`stores.drives` to replace the Supabase drives store.

## Execution recording

A run is recorded when its options carry an `invocation` (how it was started)
and the engine has an execution store: `output.executionFunctions` names the
three Supabase functions, or `stores.executions` replaces them in tests.

- `start` inserts the execution as `running` with its id (the run's
  `pipelineRunId`), mode, flags (`isScoped`, `isLimited`, `isWindowed`),
  parsed options, and invocation.
- `recordScope` records each crawl as it ends: its window, checkpoints,
  outcome, and `metrics`.
- `finish` records the outcome: `succeeded`, `partially_failed`, or
  `failed`, with the first error.

Recording never fails a run: a failed call is logged with `console.warn`,
and after a failed start the rest is skipped.

Every crawl report carries `startedAt`, `finishedAt`, `checkpointBefore`,
`checkpointAfter`, and `metrics`:

| Field | Holds |
| --- | --- |
| `metrics.timings` | Milliseconds in each stage, summed over pages: `setupMs`, `extractMs`, `transformMs`, `loadReadMs`, `loadParquetBuildMs`, `loadParquetUploadMs`, `loadWriteMs`, `checkpointWriteMs` |
| `metrics.denominators` | Pages, datasets, listings considered and written, write batches, columns considered and written, the widest listing, CSV and Parquet bytes and rows, and the source's reported bytes |
| `metrics.pipelineMetrics` | What `extract` and `transform` recorded through their `metrics` argument |

Stages interleave page by page, so their sum is not the crawl's wall-clock
time. `EtlEngineConfig.clock` replaces the system clock in tests.

## Testing a pipeline

Pass `stores` to replace Supabase:

```ts
import {
  createInMemoryCheckpointStore,
  createInMemoryDrivesStore,
  createInMemoryListingsStore,
  createInMemoryObjectStore,
} from "@avandar/etl";

// `config` is the config from Usage.
const listings = createInMemoryListingsStore();
const testEngine = EtlEngine.create({
  ...config,
  stores: {
    listings,
    objects: createInMemoryObjectStore(),
    checkpoints: createInMemoryCheckpointStore(),
    drives: createInMemoryDrivesStore(),
  },
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
