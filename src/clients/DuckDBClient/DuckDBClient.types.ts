import { UUID } from "$/lib/types/common";
import { DuckDBDataType } from "./DuckDBDataType";

/**
 * Schema for a column as returned by DuckDB's DESCRIBE statement.
 */
export type DuckDBColumnSchema = {
  /** The name of the column */
  column_name: string;
  /** The data type of the column (e.g. VARCHAR, INTEGER, etc.) */
  column_type: DuckDBDataType;
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
  Columns: Array<{ name: string; type: DuckDBDataType }>;
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

export type DuckDBQueryAggregationType =
  | "sum"
  | "avg"
  | "count"
  | "max"
  | "min";

export type DuckDBStructuredQuery = {
  tableName: string;
  selectColumnNames?: readonly string[] | "*";
  groupByColumnNames?: readonly string[];
  orderByColumnName?: string | undefined;
  orderByDirection?: "asc" | "desc";

  /**
   * Aggregations to apply to the selected fields.
   *
   * **NOTE**: Key is the column name.
   */
  aggregations?: Record<string, DuckDBQueryAggregationType>;
  offset?: number;
  limit?: number;

  /**
   * If true, timestamps will be cast to ISO strings before returning.
   * Otherwise, they will be returned as numbers.
   */
  castTimestampsToISO?: boolean;
};
