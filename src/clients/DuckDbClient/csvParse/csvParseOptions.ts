import {
  DuckDbDataType,
  DuckDbDataTypes,
} from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import {
  DEFAULT_CSV_ESCAPE_CHAR,
  DEFAULT_CSV_QUOTE_CHAR,
  REJECTED_ROW_STORAGE_LIMIT,
} from "@/clients/DuckDbClient/csvParse/csvParse.constants";
import type {
  DuckDbCsvSniffResult,
  DuckDbRejectedRow,
  DuckDbScan,
} from "@/clients/DuckDbClient/DuckDbClient.types";

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
 * `null` quote/escape/comment means DuckDB's “disabled” / omitted setting.
 */
export type CsvParseResolvedOptions = {
  numRowsToSkip: number;
  delimiter: string;
  quoteChar: string | null;
  escapeChar: string | null;
  newlineDelimiter: string;
  commentChar: string | null;
  hasHeader: boolean;
  dateFormat: string | null;
  timestampFormat: string | null;
  columns: ReadonlyArray<
    readonly [columnName: string, columnType: DuckDbDataType]
  >;
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

const DUCKDB_EMPTY_TOKEN = "(empty)";

const RECOVERABLE_REJECT_ERROR_TYPES = new Set([
  "CAST",
  "TOO MANY COLUMNS",
  "MISSING COLUMNS",
]);

function _isRecoverableRejectErrorType(errorType: string): boolean {
  return RECOVERABLE_REJECT_ERROR_TYPES.has(errorType.trim().toUpperCase());
}

/**
 * DuckDB uses `(empty)` in sniff/reject metadata for disabled options.
 */
export function isDuckDbEmptyToken(value: string | null | undefined): boolean {
  if (value == null) {
    return true;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed === DUCKDB_EMPTY_TOKEN;
}

/**
 * Normalizes UI / sniff tokens to `null` when the option is disabled.
 */
export function normalizeDuckDbCsvOptionToken(
  value: string | null | undefined,
): string | null {
  if (value == null || isDuckDbEmptyToken(value)) {
    return null;
  }

  return value;
}

/**
 * Returns a trimmed format string or `null` when absent (SQL NULL-safe).
 */
export function optionalTrimmedCsvFormat(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed === DUCKDB_EMPTY_TOKEN) {
    return null;
  }

  return trimmed;
}

function _duckDbDataTypeFromString(typeString: string): DuckDbDataType {
  const normalizedType = typeString.toUpperCase() as DuckDbDataType;
  const isKnownType = DuckDbDataTypes.includes(normalizedType);
  if (isKnownType) {
    return normalizedType;
  }

  return "VARCHAR";
}

function _escapeSqlSingleQuotedLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

function _parseRejectScanColumns(
  columnsString: string,
): Array<{ name: string; type: DuckDbDataType }> {
  const matches = Array.from(
    columnsString.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g),
  );

  return matches.flatMap((matchResult) => {
    const columnName = matchResult[1];
    const columnTypeString = matchResult[2];
    if (!columnName || !columnTypeString) {
      return [];
    }

    return [
      { name: columnName, type: _duckDbDataTypeFromString(columnTypeString) },
    ];
  });
}

function _columnsFromSniffRow(
  columns: DuckDbSniffCsvRow["Columns"],
): Array<readonly [string, DuckDbDataType]> {
  return columns.map((column) => {
    return [column.name, _duckDbDataTypeFromString(column.type)] as const;
  });
}

/**
 * Builds baseline resolved options from user hints before sniffing.
 */
export function createCsvParseOptionsFromUserHints(
  hints: CsvParseUserHints,
): CsvParseResolvedOptions {
  return {
    numRowsToSkip: hints.numRowsToSkip ?? 0,
    delimiter: hints.delimiter ?? ",",
    quoteChar: normalizeDuckDbCsvOptionToken(hints.quoteChar),
    escapeChar: normalizeDuckDbCsvOptionToken(hints.escapeChar),
    newlineDelimiter: hints.newlineDelimiter ?? "\n",
    commentChar: normalizeDuckDbCsvOptionToken(hints.commentChar),
    hasHeader: hints.hasHeader ?? true,
    dateFormat: optionalTrimmedCsvFormat(hints.dateFormat),
    timestampFormat: optionalTrimmedCsvFormat(hints.timestampFormat),
    columns: hints.columns ? [...hints.columns] : [],
  };
}

/**
 * Merges a DuckDB `sniff_csv` row into resolved options (user hints win when set).
 */
export function mergeSniffCsvRowIntoParseOptions(options: {
  base: CsvParseResolvedOptions;
  sniffRow: DuckDbSniffCsvRow;
  userHints: CsvParseUserHints;
}): CsvParseResolvedOptions {
  const { base, sniffRow, userHints } = options;
  const sniffColumns = _columnsFromSniffRow(sniffRow.Columns);

  return {
    numRowsToSkip:
      userHints.numRowsToSkip ?? sniffRow.SkipRows ?? base.numRowsToSkip,
    delimiter: userHints.delimiter ?? sniffRow.Delimiter ?? base.delimiter,
    quoteChar:
      userHints.quoteChar != null ?
        normalizeDuckDbCsvOptionToken(userHints.quoteChar)
      : normalizeDuckDbCsvOptionToken(sniffRow.Quote),
    escapeChar:
      userHints.escapeChar != null ?
        normalizeDuckDbCsvOptionToken(userHints.escapeChar)
      : normalizeDuckDbCsvOptionToken(sniffRow.Escape),
    newlineDelimiter:
      userHints.newlineDelimiter ??
      sniffRow.NewLineDelimiter ??
      base.newlineDelimiter,
    commentChar:
      userHints.commentChar != null ?
        normalizeDuckDbCsvOptionToken(userHints.commentChar)
      : normalizeDuckDbCsvOptionToken(sniffRow.Comment),
    hasHeader: userHints.hasHeader ?? sniffRow.HasHeader ?? base.hasHeader,
    dateFormat:
      optionalTrimmedCsvFormat(userHints.dateFormat) ??
      optionalTrimmedCsvFormat(sniffRow.DateFormat) ??
      base.dateFormat,
    timestampFormat:
      optionalTrimmedCsvFormat(userHints.timestampFormat) ??
      optionalTrimmedCsvFormat(sniffRow.TimestampFormat) ??
      base.timestampFormat,
    columns:
      userHints.columns && userHints.columns.length > 0 ? [...userHints.columns]
      : sniffColumns.length > 0 ? sniffColumns
      : base.columns,
  };
}

/**
 * Applies best-guess fixes after a failed or partial parse.
 */
export function refineCsvParseOptionsAfterFailure(options: {
  parseOptions: CsvParseResolvedOptions;
  rejectedRows: readonly DuckDbRejectedRow[];
}): CsvParseResolvedOptions {
  const { parseOptions, rejectedRows } = options;
  const hasRecoverableReject = rejectedRows.some((row) => {
    return _isRecoverableRejectErrorType(row.error_type);
  });

  if (!hasRecoverableReject) {
    return parseOptions;
  }

  const next = { ...parseOptions };

  if (next.quoteChar == null) {
    next.quoteChar = DEFAULT_CSV_QUOTE_CHAR;
    if (next.escapeChar == null) {
      next.escapeChar = DEFAULT_CSV_ESCAPE_CHAR;
    }
  }

  return next;
}

/**
 * Whether another parse attempt may fix the outcome (e.g. enabling `"` quote).
 */
export function shouldRetryCsvParse(options: {
  attemptIndex: number;
  maxAttempts: number;
  rejectedRows: readonly DuckDbRejectedRow[];
  parseOptions: CsvParseResolvedOptions;
  refinedOptions: CsvParseResolvedOptions;
}): boolean {
  const {
    attemptIndex,
    maxAttempts,
    rejectedRows,
    parseOptions,
    refinedOptions,
  } = options;

  if (attemptIndex >= maxAttempts - 1) {
    return false;
  }

  if (rejectedRows.length === 0) {
    return false;
  }

  const hasRecoverableReject = rejectedRows.some((row) => {
    return _isRecoverableRejectErrorType(row.error_type);
  });

  if (!hasRecoverableReject) {
    return false;
  }

  return JSON.stringify(parseOptions) !== JSON.stringify(refinedOptions);
}

export type CsvReadCsvMode = "preview" | "load";

/**
 * Builds comma-separated `read_csv` argument list for DuckDB SQL.
 */
export function buildReadCsvArgList(options: {
  parseOptions: CsvParseResolvedOptions;
  mode: CsvReadCsvMode;
}): string[] {
  const { parseOptions, mode } = options;
  const {
    numRowsToSkip,
    delimiter,
    quoteChar,
    escapeChar,
    newlineDelimiter,
    commentChar,
    hasHeader,
    dateFormat,
    timestampFormat,
    columns,
  } = parseOptions;

  const useAutoDetect = mode === "preview" && columns.length === 0;

  const args = [
    useAutoDetect ? "auto_detect=true" : "auto_detect=false",
    "encoding='utf-8'",
    `delim='${_escapeSqlSingleQuotedLiteral(delimiter)}'`,
    quoteChar != null ?
      `quote='${_escapeSqlSingleQuotedLiteral(quoteChar)}'`
    : "",
    escapeChar != null ?
      `escape='${_escapeSqlSingleQuotedLiteral(escapeChar)}'`
    : "",
    `new_line='${_escapeSqlSingleQuotedLiteral(newlineDelimiter)}'`,
    commentChar != null ?
      `comment='${_escapeSqlSingleQuotedLiteral(commentChar)}'`
    : "",
    `skip=${numRowsToSkip}`,
    `header=${hasHeader}`,
    dateFormat ?
      `dateformat='${_escapeSqlSingleQuotedLiteral(dateFormat)}'`
    : "",
    timestampFormat ?
      `timestampformat='${_escapeSqlSingleQuotedLiteral(timestampFormat)}'`
    : "",
    columns.length > 0 ?
      `columns={${columns
        .map(([name, type]) => {
          return `'${_escapeSqlSingleQuotedLiteral(name)}': '${type}'`;
        })
        .join(",")}}`
    : "",
    "store_rejects=true",
    "rejects_scan='reject_scans'",
    "rejects_table='reject_errors'",
    `rejects_limit=${REJECTED_ROW_STORAGE_LIMIT}`,
    mode === "load" ? "strict_mode=true" : "strict_mode=false",
  ];

  return args.filter((arg) => {
    return arg.length > 0;
  });
}

/**
 * Optional `sniff_csv` constraints from resolved options (for re-sniff on retry).
 */
export function buildSniffCsvConstraintArgs(
  parseOptions: CsvParseResolvedOptions,
): string[] {
  const args: string[] = ["header=true"];

  if (parseOptions.numRowsToSkip > 0) {
    args.push(`skip=${parseOptions.numRowsToSkip}`);
  }

  args.push(`delim='${_escapeSqlSingleQuotedLiteral(parseOptions.delimiter)}'`);

  if (parseOptions.quoteChar != null) {
    args.push(
      `quote='${_escapeSqlSingleQuotedLiteral(parseOptions.quoteChar)}'`,
    );
  }

  if (parseOptions.escapeChar != null) {
    args.push(
      `escape='${_escapeSqlSingleQuotedLiteral(parseOptions.escapeChar)}'`,
    );
  }

  if (parseOptions.newlineDelimiter) {
    args.push(
      `new_line='${_escapeSqlSingleQuotedLiteral(parseOptions.newlineDelimiter)}'`,
    );
  }

  if (parseOptions.commentChar != null) {
    args.push(
      `comment='${_escapeSqlSingleQuotedLiteral(parseOptions.commentChar)}'`,
    );
  }

  return args;
}

function _buildReadCSVPromptFromResolved(options: {
  tableName: string;
  parseOptions: CsvParseResolvedOptions;
  mode: CsvReadCsvMode;
}): string {
  const args = buildReadCsvArgList({
    parseOptions: options.parseOptions,
    mode: options.mode,
  });

  return `FROM read_csv('${options.tableName}', ${args.join(", ")});`;
}

export function buildDuckDbCsvSniffResultFromSniffRow(options: {
  tableName: string;
  sniffRow: DuckDbSniffCsvRow;
  parseOptions: CsvParseResolvedOptions;
}): DuckDbCsvSniffResult {
  const { tableName, sniffRow, parseOptions } = options;
  const columns = _columnsFromSniffRow(sniffRow.Columns).map((col) => {
    return { name: col[0], type: col[1] };
  });

  return {
    Delimiter: parseOptions.delimiter,
    Quote: parseOptions.quoteChar ?? "",
    Escape: parseOptions.escapeChar ?? "",
    NewLineDelimiter: parseOptions.newlineDelimiter,
    Comment: parseOptions.commentChar ?? "",
    SkipRows: parseOptions.numRowsToSkip,
    HasHeader: parseOptions.hasHeader,
    Columns: columns,
    DateFormat: parseOptions.dateFormat,
    TimestampFormat: parseOptions.timestampFormat,
    UserArguments: sniffRow.UserArguments,
    Prompt: _buildReadCSVPromptFromResolved({
      tableName,
      parseOptions,
      mode: "load",
    }),
    table_name: tableName,
  };
}

export function buildDuckDbCsvSniffResultFromRejectScan(options: {
  tableName: string;
  scan: DuckDbScan;
  commentChar: string | null;
}): DuckDbCsvSniffResult {
  const { scan, tableName, commentChar } = options;
  const parsedColumns = _parseRejectScanColumns(scan.columns);
  const parseOptions: CsvParseResolvedOptions = {
    numRowsToSkip: scan.skip_rows,
    delimiter: scan.delimiter,
    quoteChar: normalizeDuckDbCsvOptionToken(scan.quote),
    escapeChar: normalizeDuckDbCsvOptionToken(scan.escape),
    newlineDelimiter: scan.newline_delimiter,
    commentChar,
    hasHeader: scan.has_header,
    dateFormat: optionalTrimmedCsvFormat(scan.date_format),
    timestampFormat: optionalTrimmedCsvFormat(scan.timestamp_format),
    columns: parsedColumns.map((col) => {
      return [col.name, col.type] as const;
    }),
  };

  return buildDuckDbCsvSniffResultFromResolved({
    tableName,
    parseOptions,
    columns: parsedColumns,
    userArguments: scan.user_arguments,
  });
}

export function buildDuckDbCsvSniffResultFromResolved(options: {
  tableName: string;
  parseOptions: CsvParseResolvedOptions;
  columns: ReadonlyArray<{ name: string; type: DuckDbDataType }>;
  userArguments: string;
}): DuckDbCsvSniffResult {
  const { tableName, parseOptions, columns, userArguments } = options;

  return {
    Delimiter: parseOptions.delimiter,
    Quote: parseOptions.quoteChar ?? "",
    Escape: parseOptions.escapeChar ?? "",
    NewLineDelimiter: parseOptions.newlineDelimiter,
    Comment: parseOptions.commentChar ?? "",
    SkipRows: parseOptions.numRowsToSkip,
    HasHeader: parseOptions.hasHeader,
    Columns: [...columns],
    DateFormat: parseOptions.dateFormat,
    TimestampFormat: parseOptions.timestampFormat,
    UserArguments: userArguments,
    Prompt: _buildReadCSVPromptFromResolved({
      tableName,
      parseOptions,
      mode: "load",
    }),
    table_name: tableName,
  };
}

export function isRecoverableCsvParseError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("CSV Error") ||
    message.includes("Could not convert string") ||
    message.includes("convert column")
  );
}
