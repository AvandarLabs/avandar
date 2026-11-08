import { NodeDuckDb } from "@avandar/etl";
import { Constants } from "$/types/database.types";
import type { Enums } from "$/types/database.types";

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

const DUCKDB_DATA_TYPES: ReadonlySet<string> = new Set(
  Constants.public.Enums.datasets__duckdb_data_type,
);

function _escapeSQLSingleQuotedString(value: string): string {
  return value.replace(/'/g, "''");
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
 * Reads a Parquet file's row count and column types.
 *
 * @param parquetPath A Parquet file on disk.
 */
export async function summarizeParquetFile(
  parquetPath: string,
): Promise<ParquetFileSummary> {
  const db = new NodeDuckDb();
  try {
    const summary = await db.summarizeParquetFile(parquetPath);
    return {
      rowCount: summary.rowCount,
      columns: summary.columnNames.map((name, index) => {
        return {
          name,
          dataType: _toKnownDataType(
            summary.columnTypeDescriptions[index] ?? "VARCHAR",
          ),
        };
      }),
    };
  } finally {
    await db.close();
  }
}

/** How DuckDB's sniffer reports an option it found no character for. */
const SNIFFED_EMPTY = "(empty)";

/**
 * The CSV dialect (delimiter, quote, and escape) detected from the start of
 * the file, as `read_csv` options that pin it.
 */
async function _sniffDialectOptions(
  db: NodeDuckDb,
  csvLiteral: string,
): Promise<string> {
  const [dialect] = await db.runRawQuery<{
    Delimiter: string;
    Quote: string;
    Escape: string;
  }>(`SELECT Delimiter, Quote, Escape FROM sniff_csv('${csvLiteral}')`);
  if (dialect === undefined) {
    throw new Error("DuckDB detected no CSV dialect");
  }
  const toOption = (name: string, character: string): string => {
    const value = character === SNIFFED_EMPTY ? "" : character;
    return `${name}='${_escapeSQLSingleQuotedString(value)}'`;
  };
  return [
    toOption("delim", dialect.Delimiter),
    toOption("quote", dialect.Quote),
    toOption("escape", dialect.Escape),
  ].join(", ");
}

/**
 * Converts a CSV file on disk into a ZSTD Parquet file on disk, and returns
 * what the Parquet holds.
 *
 * DuckDB streams the conversion, so memory stays flat however large the CSV
 * is. Column types are detected from every row (`sample_size=-1`) rather
 * than from the first rows: a source of millions of rows often has its first
 * non-numeric value far down a column that looked numeric, and a type
 * detected from a sample fails the whole conversion when it reaches it.
 *
 * The dialect (delimiter, quote, and escape) is detected from the start of
 * the file, the same rows the column type sample reads, and pinned for the
 * full read. Left to detect it from every row, DuckDB falls back to reading a
 * file with one malformed row as a single text column, with no error.
 *
 * The CSV is read in DuckDB's strict mode. Its lenient mode
 * (`strict_mode=false`) misreads some real files without an error: a quoted
 * value ending in an apostrophe, as in NYC's DOB Violations, merges two rows
 * into one. A malformed row fails the conversion instead, naming its line, so
 * a copy never holds shifted or lost values.
 *
 * @param options.csvPath The CSV to read. Its first row is the header.
 * @param options.parquetPath Where to write the Parquet file.
 */
export async function convertCsvFileToParquetFile(
  options: Readonly<{ csvPath: string; parquetPath: string }>,
): Promise<ParquetFileSummary> {
  const csvLiteral = _escapeSQLSingleQuotedString(options.csvPath);
  const parquetLiteral = _escapeSQLSingleQuotedString(options.parquetPath);
  const db = new NodeDuckDb();
  try {
    const dialectOptions = await _sniffDialectOptions(db, csvLiteral);
    await db.execSQL(
      `COPY (SELECT * FROM read_csv('${csvLiteral}', header=true, ` +
        `auto_detect=true, sample_size=-1, ${dialectOptions})) ` +
        `TO '${parquetLiteral}' (FORMAT PARQUET, COMPRESSION ZSTD);`,
    );
  } finally {
    await db.close();
  }
  return await summarizeParquetFile(options.parquetPath);
}
