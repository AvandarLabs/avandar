# @avandar/ava-etl

Avandar ETL library. Tools for building Node.js Extract → Transform → Load
pipelines whose intermediate output is CSV on disk and whose final output
is ZSTD Parquet (locally and, optionally, in Supabase Storage).

The library is built around two units:

- **`ETLEngine`** — a module factory that runs a 3-step pipeline against a
  conventional directory layout under `etl-input/` and `etl-output/`.
- **`NodeDuckDB`** — a thin wrapper around the `duckdb` Node bindings used
  internally by the engine for CSV sniffing, view creation, and Parquet
  export.

## Usage

```ts
import { ETLEngine } from "@avandar/ava-etl";

const pipeline = ETLEngine.create({
  name: "world-bank__wdi",
  extract: async ({ pipelineRunId }) => {
    await ETLEngine.storeExtractedData({
      pipelineName: "world-bank__wdi",
      pipelineRunId,
      sourcePath: "./WDIData.csv",
      destinationBasename: "WDIData.csv",
    });
    return { files: [{ name: "WDIData.csv", mimeType: "text/csv" }] };
  },
  transform: () => [{
    name: "wdi",
    columns: [/* ... DuckDBSniffableDataType per column ... */],
  }],
  load: async ({ pipelineName, pipelineRunId, parquetTableBaseNames }) => {
    await ETLEngine.uploadParquetToStorage({
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

## ETLEngine

`ETLEngine` is a module factory; call `ETLEngine.create({...})` to get a
runnable pipeline. The factory also carries a few static helpers as
properties.

### `ETLEngine.create(state)` (factory)

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
| `ETLEngine.storeExtractedData`    | Copies a source file into `etl-output/<pipeline>/<run>/extract/<destinationBasename>`    |
| `ETLEngine.getLoadParquetPathForTable` | Returns the absolute path for a load-stage Parquet file                              |
| `ETLEngine.uploadParquetToStorage`| Uploads every load-stage Parquet to Supabase Storage at `{bucket}/{pipeline}/datasets/<table>.parquet` (uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; bucket from `SUPABASE_OPENDATA_BUCKET`, default `opendata`) |

### Paths and configuration

| Export                          | Description                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `ETL_INPUT_BASE_DIR`            | Constant: `"etl-input"`                                                      |
| `ETL_OUTPUT_BASE_DIR`           | Constant: `"etl-output"`                                                     |
| `ETL_PATHS_ROOT_ENV`            | Env var name read for the absolute paths root (`ETL_PATHS_ROOT`)             |
| `getETLPipelineInputDir`        | `etl-input/<pipeline-name>/`                                                 |
| `getETLInputDir`                | Extract output dir for a run (`etl-output/.../extract`)                      |
| `getETLOutputDir`               | Any-stage output dir for a run (`extract` or `transform`)                    |
| `getETLLoadDir`                 | Load output dir for a run (`etl-output/.../load`)                            |
| `setETLPathsRootForTesting`     | Pin the filesystem root used by all path helpers (tests only)                |
| `resetETLPathsRootForTesting`   | Clear the testing override (call in `afterEach`)                             |

### Transform-step types

| Export                              | Description                                                            |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `transformedCSVsToParquetBlobs`     | Reads `<transformDir>/<name>.csv` for each description, returns ZSTD Parquet `Blob`s |
| `TransformedColumnDescription`      | `{ name, type: DuckDBSniffableDataType }` for a single column          |
| `TransformedDataDescriptionForParquet` | `{ name, columns: TransformedColumnDescription[] }` for one table   |

If `columns` is empty, the engine relies on DuckDB CSV auto-detection;
otherwise each column must specify a sniffable type for explicit casts.

---

## NodeDuckDB

A thin Node.js wrapper around the `duckdb` native bindings. Use directly
when you need raw DuckDB access outside of an `ETLEngine` pipeline.

### `class NodeDuckDB`

Constructor: `new NodeDuckDB({ databasePath? })`. Defaults to `:memory:`.

| Method                                       | Description                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------- |
| `runRawQuery(sql, { params? })`              | Runs a query and returns normalized row objects. `$name$` placeholders are substituted with `String(value)` |
| `execSQL(sql)`                               | Runs DDL/COPY/etc. without returning rows                                    |
| `sniffCSV({ csvPath })`                      | Returns `[{ name, type }]` per column using DuckDB `sniff_csv`               |
| `readCSVIntoView(options)`                   | `CREATE OR REPLACE VIEW` over a `read_csv(...)` call                         |
| `exportTableOrViewAsZSTDParquetBlob(name)`   | Writes the table/view to a temp Parquet file with ZSTD, returns the bytes    |
| `summarizeParquetFile(parquetPath)`          | Returns `{ rowCount, columnNames, columnTypeDescriptions }` for a Parquet file |
| `close()`                                    | Closes connection and database handle                                        |

### CSV types

| Export                            | Description                                                              |
| --------------------------------- | ------------------------------------------------------------------------ |
| `NodeDuckDBReadCSVColumn`         | `{ name, type: DuckDBSniffableDataType }` — column spec for `read_csv`   |
| `NodeDuckDBSniffCSVColumn`        | `{ name, type: DuckDBSniffableDataType }` — returned by `sniffCSV`       |
| `NodeDuckDBReadCSVIntoViewOptions`| Options accepted by `readCSVIntoView` (path, view name, columns, header, skip, delimiter, autoDetect) |

### DuckDB sniffable types

| Export                                | Description                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `DuckDBSniffableDataType`             | Union of the persisted CSV-sniff types: `BOOLEAN`, `BIGINT`, `DOUBLE`, `TIME`, `DATE`, `TIMESTAMP`, `VARCHAR` |
| `duckDBDescribeColumnTypeToSniffable` | Maps a DuckDB `DESCRIBE` `column_type` string to a `DuckDBSniffableDataType`                  |
| `SNIFF_CSV_MAX_ROWS`                  | Sample size passed to `sniff_csv` (`10_000`)                                                  |

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `pnpm test`       | Run all tests once           |
| `pnpm test:watch` | Run tests in watch mode      |
| `pnpm type-check` | Run TypeScript type checking |
