# @avandar/etl

Avandar ETL library. Tools for building Node.js Extract → Transform → Load
pipelines whose intermediate output is CSV on disk and whose final output
is ZSTD Parquet (locally and, optionally, in Supabase Storage).

The library is built around two units:

- **`EtlEngine`** — a module factory that runs a 3-step pipeline against a
  conventional directory layout under `etl-input/` and `etl-output/`.
- **`NodeDuckDb`** — a thin wrapper around the `duckdb` Node bindings used
  internally by the engine for CSV sniffing, view creation, and Parquet
  export.

ESM only. Requires Node 22+.

## Install

```sh
pnpm add @avandar/etl
pnpm add duckdb @supabase/supabase-js
```

Both are peer dependencies. `duckdb` is a native module with a real compile
step, and you hold its connections, so it must be a single copy you control.
`@supabase/supabase-js` is a peer for the same reason: you pass a live client
across the API boundary.

## Usage

```ts
import { EtlEngine } from "@avandar/etl";

const pipeline = EtlEngine.create({
  name: "world-bank__wdi",
  extract: async ({ pipelineRunId }) => {
    await EtlEngine.storeExtractedData({
      pipelineName: "world-bank__wdi",
      pipelineRunId,
      sourcePath: "./WDIData.csv",
      destinationBasename: "WDIData.csv",
    });
    return { files: [{ name: "WDIData.csv", mimeType: "text/csv" }] };
  },
  transform: () => [{
    name: "wdi",
    columns: [/* ... DuckDbSniffableDataType per column ... */],
  }],
  load: async ({ pipelineName, pipelineRunId, parquetTableBaseNames }) => {
    await EtlEngine.uploadParquetToStorage({
      pipelineName,
      pipelineRunId,
      parquetTableBaseNames,
    });
  },
});

await pipeline.run();
```

The engine runs `extract` → `transform` → CSV-to-Parquet conversion →
`load`, materialising intermediate files under
`etl-output/<pipeline-name>/<pipelineRunId>/{extract,transform,load}/`.

---

## EtlEngine

`EtlEngine` is a module factory; call `EtlEngine.create({...})` to get a
runnable pipeline. The factory also carries a few static helpers as
properties.

### `EtlEngine.create(state)` (factory)

State fields:

| Field       | Description                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------- |
| `name`      | Pipeline name (used as the folder segment under `etl-output/`)                               |
| `extract`   | `({ pipelineRunId }) => Promise<ExtractedDataContext>` — writes CSVs to the extract directory |
| `transform` | `(extracted, { pipelineRunId }) => TransformedDataDescriptionForParquet[]` — describes the transformed CSVs the engine should turn into Parquet |
| `load`      | `({ pipelineName, pipelineRunId, parquetTableBaseNames }) => Promise<void>` — sinks Parquet files |

The returned pipeline module exposes `.run()`, which executes the full
sequence and returns `{ pipelineRunId }`.

### Static helpers

| Function                          | Description                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `EtlEngine.storeExtractedData`    | Copies a source file into `etl-output/<pipeline>/<run>/extract/<destinationBasename>`    |
| `EtlEngine.getLoadParquetPathForTable` | Returns the absolute path for a load-stage Parquet file                              |
| `EtlEngine.uploadParquetToStorage`| Uploads every load-stage Parquet to Supabase Storage at `{bucket}/{pipeline}/datasets/<table>.parquet` (uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; bucket from `SUPABASE_OPENDATA_BUCKET`, default `opendata`) |

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
| `NodeDuckDbReadCsvColumn`         | `{ name, type: DuckDbSniffableDataType }` — column spec for `read_csv`   |
| `NodeDuckDbSniffCsvColumn`        | `{ name, type: DuckDbSniffableDataType }` — returned by `sniffCsv`       |
| `NodeDuckDbReadCsvIntoViewOptions`| Options accepted by `readCsvIntoView` (path, view name, columns, header, skip, delimiter, autoDetect) |

### DuckDB sniffable types

| Export                                | Description                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `DuckDbSniffableDataType`             | Union of the persisted CSV-sniff types: `BOOLEAN`, `BIGINT`, `DOUBLE`, `TIME`, `DATE`, `TIMESTAMP`, `VARCHAR` |
| `duckDbDescribeColumnTypeToSniffable` | Maps a DuckDB `DESCRIBE` `column_type` string to a `DuckDbSniffableDataType`                  |
| `SNIFF_CSV_MAX_ROWS`                  | Sample size passed to `sniff_csv` (`10_000`)                                                  |

## License

MIT
