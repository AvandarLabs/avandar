import { readdir, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeDuckDb } from "@avandar/etl";
import { buildParquetCachePartName } from "$/connectors/open-data/buildParquetCachePartPath/buildParquetCachePartPath";
import { Constants } from "$/types/database.types";
import type { Enums } from "$/types/database.types";
import type { ListingDownloadColumn } from "@avandar/etl";

/** One column of a Parquet copy: its name and DuckDB type. */
export type ParquetCacheColumn = Readonly<{
  name: string;
  dataType: Enums<"datasets__duckdb_data_type">;
}>;

/** What a Parquet copy holds. */
export type ParquetFileSummary = Readonly<{
  rowCount: number;
  columns: readonly ParquetCacheColumn[];
}>;

/** One CSV page converted to Parquet. */
export type ParquetPage = Readonly<{
  rowCount: number;
  /** The cursor column's value on the page's last row. */
  lastCursor: string | undefined;
}>;

/**
 * How much memory one DuckDB conversion may use before it spills to disk.
 * Set `AVA_DUCKDB_MEMORY_LIMIT` to size it to the machine.
 */
const DEFAULT_DUCKDB_MEMORY_LIMIT = "1GB";

const DUCKDB_DATA_TYPES: ReadonlySet<string> = new Set(
  Constants.public.Enums.datasets__duckdb_data_type,
);

/** How DuckDB's sniffer reports an option it found no character for. */
const SNIFFED_EMPTY = "(empty)";

/**
 * Quotes a value as a SQL string literal, such as a file path, for the
 * conversions here and in `convertJsonFileToParquetParts`.
 */
export function quoteSqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function _quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function _toParquetList(paths: readonly string[]): string {
  return `read_parquet([${paths.map(quoteSqlText).join(", ")}])`;
}

/**
 * Opens a DuckDB that spills to the temp directory, which the server's
 * config points at its data volume, once it reaches its memory limit.
 */
async function _openDuckDb(
  memoryLimit: string | undefined,
): Promise<NodeDuckDb> {
  const db = new NodeDuckDb();
  const limit =
    memoryLimit ??
    (process.env.AVA_DUCKDB_MEMORY_LIMIT?.trim() ||
      DEFAULT_DUCKDB_MEMORY_LIMIT);
  await db.execSQL(
    `SET memory_limit=${quoteSqlText(limit)}; ` +
      `SET temp_directory=${quoteSqlText(tmpdir())};`,
  );
  return db;
}

/**
 * Runs one conversion on its own DuckDB connection, closed when it ends,
 * that spills to the temp directory once it reaches its memory limit. Use it
 * for every Parquet copy conversion, such as reading a downloaded CSV or
 * JSON file.
 *
 * @param run The conversion.
 * @param options.memoryLimit DuckDB's `memory_limit`, such as `1.5GB`.
 *   Defaults to `AVA_DUCKDB_MEMORY_LIMIT`, or 1GB.
 */
export async function withConversionDuckDb<T>(
  run: (db: NodeDuckDb) => Promise<T>,
  options: Readonly<{ memoryLimit?: string }> = {},
): Promise<T> {
  const db = await _openDuckDb(options.memoryLimit);
  try {
    return await run(db);
  } finally {
    await db.close();
  }
}

/**
 * A `DESCRIBE` type as a stored column type. A parameterized type such as
 * `DECIMAL(18,3)` is stored by its base name, and a type with no stored
 * equivalent is stored as `VARCHAR`.
 */
function _toKnownDataType(
  columnType: string,
): Enums<"datasets__duckdb_data_type"> {
  const baseType = columnType.replace(/\(.*\)$/, "");
  return DUCKDB_DATA_TYPES.has(baseType)
    ? (baseType as Enums<"datasets__duckdb_data_type">)
    : "VARCHAR";
}

/**
 * Reads the row count and column types of a copy's parts, read as one table.
 *
 * @param partPaths The parts, on disk.
 */
export async function summarizeParquetParts(
  partPaths: readonly string[],
): Promise<ParquetFileSummary> {
  return await withConversionDuckDb(async (db) => {
    const source = _toParquetList(partPaths);
    const [count] = await db.runRawQuery<{ rowCount: string }>(
      `SELECT count(*)::VARCHAR AS rowCount FROM ${source}`,
    );
    const columns = await db.runRawQuery<{
      column_name: string;
      column_type: string;
    }>(`DESCRIBE SELECT * FROM ${source}`);
    return {
      rowCount: Number(count?.rowCount ?? 0),
      columns: columns.map((column) => {
        return {
          name: column.column_name,
          dataType: _toKnownDataType(column.column_type),
        };
      }),
    };
  });
}

/**
 * The CSV dialect (delimiter, quote, and escape) detected from the start of
 * the file, as `read_csv` options that pin it.
 */
async function _sniffDialectOptions(
  db: NodeDuckDb,
  csvPath: string,
): Promise<string> {
  const [dialect] = await db.runRawQuery<{
    Delimiter: string;
    Quote: string;
    Escape: string;
  }>(
    `SELECT Delimiter, Quote, Escape FROM sniff_csv(${quoteSqlText(csvPath)})`,
  );
  if (dialect === undefined) {
    throw new Error("DuckDB detected no CSV dialect");
  }
  const toOption = (name: string, character: string): string => {
    return `${name}=${quoteSqlText(character === SNIFFED_EMPTY ? "" : character)}`;
  };
  return [
    toOption("delim", dialect.Delimiter),
    toOption("quote", dialect.Quote),
    toOption("escape", dialect.Escape),
  ].join(", ");
}

/**
 * Writes a query's rows into ZSTD Parquet parts of about `maxPartBytes`
 * each, named `part-00000.parquet` onward in row order, and returns their
 * paths in that order. Every whole-file conversion ends here, such as a
 * CSV's or a JSON file's.
 */
export async function copyQueryRowsToParquetParts(args: {
  db: NodeDuckDb;
  selectSql: string;
  partsDir: string;
  maxPartBytes: number;
}): Promise<string[]> {
  await args.db.execSQL(
    `COPY (${args.selectSql}) TO ${quoteSqlText(args.partsDir)} ` +
      `(FORMAT PARQUET, COMPRESSION ZSTD, ` +
      `FILE_SIZE_BYTES ${args.maxPartBytes}, FILENAME_PATTERN 'raw-{i}');`,
  );
  const rawNames = (await readdir(args.partsDir))
    .filter((name) => {
      return /^raw-\d+\.parquet$/.test(name);
    })
    .sort((left, right) => {
      return Number(left.match(/\d+/)![0]) - Number(right.match(/\d+/)![0]);
    });
  return await Promise.all(
    rawNames.map(async (rawName, index) => {
      const partPath = join(args.partsDir, buildParquetCachePartName(index));
      await rename(join(args.partsDir, rawName), partPath);
      return partPath;
    }),
  );
}

/**
 * Converts a whole CSV file, plain or gzipped, into ZSTD Parquet parts in
 * `partsDir`, and returns their paths in row order.
 *
 * DuckDB streams the conversion, so memory stays flat however large the CSV
 * is. Column types are detected from every row (`sample_size=-1`) rather
 * than from the first rows: a source of millions of rows often has its first
 * non-numeric value far down a column that looked numeric, and a type
 * detected from a sample fails the whole conversion when it reaches it.
 *
 * The dialect (delimiter, quote, and escape) is detected from the start of
 * the file and pinned for the full read. Left to detect it from every row,
 * DuckDB falls back to reading a file with one malformed row as a single
 * text column, with no error.
 *
 * The CSV is read in DuckDB's strict mode. Its lenient mode
 * (`strict_mode=false`) misreads some real files without an error: a quoted
 * value ending in an apostrophe, as in NYC's DOB Violations, merges two rows
 * into one. A malformed row fails the conversion instead, naming its line, so
 * a copy never holds shifted or lost values.
 *
 * @param options.csvPath The CSV to read. Its first row is the header. A
 *   `.gz` name is read as gzipped.
 * @param options.partsDir An empty directory to write the parts into.
 * @param options.maxPartBytes About how large each part may grow.
 */
export async function convertCsvFileToParquetParts(
  options: Readonly<{
    csvPath: string;
    partsDir: string;
    maxPartBytes: number;
  }>,
): Promise<string[]> {
  return await withConversionDuckDb(async (db) => {
    const dialectOptions = await _sniffDialectOptions(db, options.csvPath);
    return await copyQueryRowsToParquetParts({
      db,
      selectSql:
        `SELECT * FROM read_csv(${quoteSqlText(options.csvPath)}, ` +
        `header=true, auto_detect=true, sample_size=-1, ${dialectOptions})`,
      partsDir: options.partsDir,
      maxPartBytes: options.maxPartBytes,
    });
  });
}

/**
 * Rewrites a Parquet file into ZSTD Parquet parts in `partsDir`, and returns
 * their paths in row order.
 *
 * @param options.parquetPath The Parquet file to read.
 * @param options.partsDir An empty directory to write the parts into.
 * @param options.maxPartBytes About how large each part may grow.
 */
export async function splitParquetFileIntoParts(
  options: Readonly<{
    parquetPath: string;
    partsDir: string;
    maxPartBytes: number;
  }>,
): Promise<string[]> {
  return await withConversionDuckDb(async (db) => {
    return await copyQueryRowsToParquetParts({
      db,
      selectSql: `SELECT * FROM ${_toParquetList([options.parquetPath])}`,
      partsDir: options.partsDir,
      maxPartBytes: options.maxPartBytes,
    });
  });
}

function _toColumnTypesStruct(
  columns: readonly ListingDownloadColumn[],
): string {
  const entries = columns.map((column) => {
    return `${quoteSqlText(column.name)}: ${quoteSqlText(column.dataType)}`;
  });
  return `{${entries.join(", ")}}`;
}

/**
 * Converts one CSV page into a ZSTD Parquet file that keeps the cursor
 * column, and returns its row count and the cursor on its last row.
 *
 * A page is an RFC 4180 CSV (comma separated, double quoted), read in strict
 * mode with each column's declared type, so a value that does not fit its
 * type fails the conversion. Rows keep the source's order.
 *
 * @param options.csvPath The page. Its first row is the header.
 * @param options.parquetPath Where to write the Parquet file.
 * @param options.columns The declared columns.
 * @param options.cursorColumn The column holding each row's cursor, read as
 *   text.
 */
export async function convertCsvPageToParquetFile(
  options: Readonly<{
    csvPath: string;
    parquetPath: string;
    columns: readonly ListingDownloadColumn[];
    cursorColumn: string;
  }>,
): Promise<ParquetPage> {
  const types = _toColumnTypesStruct([
    { name: options.cursorColumn, dataType: "VARCHAR" },
    ...options.columns,
  ]);
  return await withConversionDuckDb(async (db) => {
    await db.execSQL(
      `COPY (SELECT * FROM read_csv(${quoteSqlText(options.csvPath)}, ` +
        `header=true, delim=',', quote='"', escape='"', types=${types})) ` +
        `TO ${quoteSqlText(options.parquetPath)} ` +
        `(FORMAT PARQUET, COMPRESSION ZSTD);`,
    );
    const page = _toParquetList([options.parquetPath]);
    const [count] = await db.runRawQuery<{ rowCount: string }>(
      `SELECT count(*)::VARCHAR AS rowCount FROM ${page}`,
    );
    const rowCount = Number(count?.rowCount ?? 0);
    if (rowCount === 0) {
      return { rowCount, lastCursor: undefined };
    }
    const [lastRow] = await db.runRawQuery<{ cursor: string }>(
      `SELECT ${_quoteIdentifier(options.cursorColumn)} AS cursor ` +
        `FROM ${page} LIMIT 1 OFFSET ${rowCount - 1}`,
    );
    return { rowCount, lastCursor: lastRow?.cursor };
  });
}

/**
 * Merges Parquet files, in order, into one ZSTD Parquet part.
 *
 * @param options.parquetPaths The files to merge, in row order.
 * @param options.partPath Where to write the part.
 * @param options.excludedColumn A column the part leaves out, such as the
 *   cursor a paged download was ordered by.
 */
export async function mergeParquetFilesIntoPart(
  options: Readonly<{
    parquetPaths: readonly string[];
    partPath: string;
    excludedColumn: string;
  }>,
): Promise<void> {
  await withConversionDuckDb(async (db) => {
    await db.execSQL(
      `COPY (SELECT * EXCLUDE (${_quoteIdentifier(options.excludedColumn)}) ` +
        `FROM ${_toParquetList(options.parquetPaths)}) ` +
        `TO ${quoteSqlText(options.partPath)} (FORMAT PARQUET, COMPRESSION ZSTD);`,
    );
  });
}
