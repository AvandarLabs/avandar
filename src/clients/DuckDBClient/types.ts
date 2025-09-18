import { UnknownObject, UUID } from "@/lib/types/common";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { DuckDBDataTypeT } from "./DuckDBDataType";

export type QueryResultColumn = {
  name: string;
  dataType: "text" | "number" | "date";
};

export type QueryResultData<T extends UnknownObject = UnknownObject> = {
  fields: QueryResultColumn[];
  data: T[];
  numRows: number;
};

/**
 * The CSV Reject Scans Table returns the following information:
 */
export type DuckDBScan = {
  /** The internal ID used in DuckDB to represent that scanner */
  scan_id: bigint;
  /**
   * A scanner might happen over multiple files, so the file_id
   * represents a unique file in a scanner
   */
  file_id: bigint;
  /** The file path */
  file_path: string;
  /** The delimiter used e.g., ; */
  delimiter: string;
  /** The quote used e.g., " */
  quote: string;
  /** The escape used e.g., " */
  escape: string;
  /** The newline delimiter used e.g., \r\n */
  newline_delimiter: string;
  /** If any rows were skipped from the top of the file */
  skip_rows: number;
  /** If the file has a header */
  has_header: boolean;
  /** The schema of the file (i.e., all column names and types) */
  columns: string;
  /** The format used for date types */
  date_format: string;
  /** The format used for timestamp types */
  timestamp_format: string;
  /** Any extra scanner parameters manually set by the user */
  user_arguments: string;
};

/**
 * The CSV Reject Errors Table returns the following information:
 */
export type DuckDBRejectedRow = {
  /**
   * The internal ID used in DuckDB to represent that scanner, used to join
   * with reject scans tables
   */
  scan_id: bigint;
  /**
   * The file_id represents a unique file in a scanner, used to join with
   * reject scans tables
   */
  file_id: bigint;
  /** Line number, from the CSV File, where the error occurred */
  line: bigint;
  /** Byte Position of the start of the line, where the error occurred */
  line_byte_position: bigint;
  /** Byte Position where the error occurred */
  byte_position: bigint;
  /** If the error happens in a specific column, the index of the column */
  column_idx: bigint;
  /** If the error happens in a specific column, the name of the column */
  column_name: string;
  /** The type of the error that happened */
  error_type: number;
  /** The original CSV line */
  csv_line: string;
  /** The error message produced by DuckDB */
  error_message: string;
};

export type LoadCSVErrors = {
  rejectedScans: DuckDBScan[];
  rejectedRows: DuckDBRejectedRow[];
};

/**
 * Schema for a column as returned by DuckDB's DESCRIBE statement.
 */
export type DuckDBColumnSchema = {
  /** The name of the column */
  column_name: string;
  /** The data type of the column (e.g. VARCHAR, INTEGER, etc.) */
  column_type: DuckDBDataTypeT;
  /** The default value for the column, if any */
  default: unknown;
  /** Any extra information about the column (usually null) */
  extra: null;
  /**
   * Key information for the column (e.g. 'PRI' if primary key, otherwise null).
   * DuckDB does not always populate this field.
   */
  key: string | null;
  /** Indicates if the column can contain NULL values ("YES" or "NO") */
  null: "YES" | "NO";
};

export type DuckDBLoadParquetResult = {
  /** Unique identifier for this load operation */
  id: UUID;
  /** The name of the parquet file */
  name: string;
  /** The number of rows that successfully parsed */
  numRows: number;
  /** The inferred schema of the CSV file */
  columns: DuckDBColumnSchema[];
};

export type DuckDBLoadCSVResult = {
  /** Unique identifier for this load operation */
  id: UUID;
  /** The name of the CSV file */
  csvName: string;
  /** The number of rows that successfully parsed */
  numRows: number;
  /** The inferred schema of the CSV file */
  columns: DuckDBColumnSchema[];
  /** The number of rows that were rejected */
  numRejectedRows: number;
  /** The errors that occurred while loading the CSV file */
  errors: LoadCSVErrors;
  /**
   * The sniffed CSV file information. This is the result of DuckDB's
   * auto-detection. It may not be completely accurate.
   */
  csvSniff: DuckDBCSVSniffResult;

  /** The name of the DUckDB table holding the loaded CSV data */
  tableName: string;
};

export type DuckDBCSVSniffResult = {
  /** Example: `,` */
  Delimiter: string;
  /** Quote character. E.g. `"` */
  Quote: string;
  /** Escape character. E.g. `\` */
  Escape: string;
  /** Newline delimiter. E.g. `\r\n` */
  NewLineDelimiter: string;
  /** Comment character. E.g. `#` */
  Comment: string;
  /** Number of rows to skip at the start of the file */
  SkipRows: number;
  /** Whether the CSV has a header */
  HasHeader: boolean;
  /** The columns of the CSV file */
  Columns: Array<{ name: string; type: DuckDBDataTypeT }>;
  /** The date format of the CSV file. E.g. `%d/%m/%Y` */
  DateFormat: string | null;
  /** The timestamp format of the CSV file. E.g. `%Y-%m-%dT%H:%M:%S.%f` */
  TimestampFormat: string | null;
  /**
   * Any extra arguments manually set by the user, returned as a string.
   * E.g. `"ignore_errors=true"`
   */
  UserArguments: string;
  /**
   * Prompt ready to be used to read the CSV.
   * E.g. `"FROM read_csv('my_file.csv', auto_detect=false, delim=',', ...)"`
   */
  Prompt: string;

  /**
   * The table name holding the loaded CSV data.
   * NOTE: given that a CSV sniff operation can be run separately from
   * actually loading the data, the `table_name` may not actually exist yet.
   * In that case, this `table_name` represents the table name that would be
   * used if the data were loaded.
   */
  table_name: string;
};

export type QueryAggregationType =
  | "sum"
  | "avg"
  | "count"
  | "max"
  | "min"
  | "none";

export type StructuredDuckDBQueryConfig = {
  tableName: string;
  selectFields: readonly DatasetColumn[];
  groupByFields: readonly DatasetColumn[];
  orderByColumn?: DatasetColumn | undefined;
  orderByDirection?: "asc" | "desc";

  /**
   * Aggregations to apply to the selected fields.
   * Key is the field name. Value is the type of aggregation.
   */
  aggregations: Record<string, QueryAggregationType>;
};
