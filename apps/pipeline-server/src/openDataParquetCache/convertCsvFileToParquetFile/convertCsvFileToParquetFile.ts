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
    await db.execSQL(
      `COPY (SELECT * FROM read_csv('${csvLiteral}', header=true, ` +
        `auto_detect=true, sample_size=-1, strict_mode=false, ` +
        `null_padding=true)) TO '${parquetLiteral}' ` +
        `(FORMAT PARQUET, COMPRESSION ZSTD);`,
    );
  } finally {
    await db.close();
  }
  return await summarizeParquetFile(options.parquetPath);
}
