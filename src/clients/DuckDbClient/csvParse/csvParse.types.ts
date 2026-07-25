import { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";

/** User-provided CSV parse hints (import form / API). */
export type CsvParseUserHints = {
  numRowsToSkip?: number;
  delimiter?: string;
  quoteChar?: string;
  escapeChar?: string;
  newlineDelimiter?: string;
  commentChar?: string;
  hasHeader?: boolean;
  dateFormat?: string;
  timestampFormat?: string;
  columns?: ReadonlyArray<
    readonly [columnName: string, columnType: DuckDbDataType]
  >;
};

/**
 * Resolved options used to build DuckDB `read_csv` / `sniff_csv` calls.
 * An `undefined` quote/escape/comment means the option is omitted (DuckDB's
 * disabled / auto-detect setting).
 */
export type CsvParseResolvedOptions = {
  numRowsToSkip: number;
  delimiter: string;
  quoteChar: string | undefined;
  escapeChar: string | undefined;
  /** DuckDB `new_line` (`\\n`, `\\r\\n`) or `undefined` to auto-detect. */
  newlineDelimiter: string | undefined;
  commentChar: string | undefined;
  hasHeader: boolean;
  dateFormat: string | undefined;
  timestampFormat: string | undefined;
  columns: ReadonlyArray<
    readonly [columnName: string, columnType: DuckDbDataType]
  >;
  /**
   * Strict casting for the background transcode load; relaxed when sniff
   * column types reject all rows.
   */
  strictMode: boolean;
};

/** Row shape returned by DuckDB `sniff_csv`. */
export type DuckDbSniffCsvRow = {
  Delimiter: string;
  Quote: string;
  Escape: string;
  NewLineDelimiter: string;
  Comment: string;
  SkipRows: number;
  HasHeader: boolean;
  Columns: ReadonlyArray<{ name: string; type: string }>;
  DateFormat: string | null;
  TimestampFormat: string | null;
  UserArguments: string;
  Prompt: string;
};

export type CsvReadCsvMode = "preview" | "load";
