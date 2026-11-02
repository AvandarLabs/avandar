import {
  DEFAULT_CSV_ESCAPE_CHAR,
  DEFAULT_CSV_QUOTE_CHAR,
} from "@/clients/DuckDbClient/csvParse/csvParse.constants";
import { columnsFromSniffRow } from "@/clients/DuckDbClient/csvParse/duckDbCsvColumns";
import {
  normalizeDuckDbCsvOptionToken,
  normalizeNewlineDelimiterForDuckDb,
  optionalTrimmedCsvFormat,
} from "@/clients/DuckDbClient/csvParse/duckDbCsvTokens";
import type {
  CsvParseResolvedOptions,
  CsvParseUserHints,
  DuckDbSniffCsvRow,
} from "@/clients/DuckDbClient/csvParse/csvParse.types";
import type { DuckDbRejectedRow } from "@/clients/DuckDbClient/DuckDbClient.types";

const RECOVERABLE_REJECT_ERROR_TYPES = new Set([
  "CAST",
  "TOO MANY COLUMNS",
  "MISSING COLUMNS",
]);

function _isRecoverableRejectErrorType(errorType: string): boolean {
  return RECOVERABLE_REJECT_ERROR_TYPES.has(errorType.trim().toUpperCase());
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
    newlineDelimiter: normalizeNewlineDelimiterForDuckDb(
      hints.newlineDelimiter,
    ),
    commentChar: normalizeDuckDbCsvOptionToken(hints.commentChar),
    hasHeader: hints.hasHeader ?? true,
    dateFormat: optionalTrimmedCsvFormat(hints.dateFormat),
    timestampFormat: optionalTrimmedCsvFormat(hints.timestampFormat),
    columns: hints.columns ? [...hints.columns] : [],
    strictMode: true,
  };
}

/**
 * Merges `sniff_csv` into resolved options (user hints win when set).
 */
export function mergeSniffCsvRowIntoParseOptions(options: {
  base: CsvParseResolvedOptions;
  sniffRow: DuckDbSniffCsvRow;
  userHints: CsvParseUserHints;
}): CsvParseResolvedOptions {
  const { base, sniffRow, userHints } = options;
  const sniffColumns = columnsFromSniffRow(sniffRow.Columns);

  return {
    numRowsToSkip:
      userHints.numRowsToSkip ?? sniffRow.SkipRows ?? base.numRowsToSkip,
    delimiter: userHints.delimiter ?? sniffRow.Delimiter ?? base.delimiter,
    quoteChar:
      userHints.quoteChar != null
        ? normalizeDuckDbCsvOptionToken(userHints.quoteChar)
        : normalizeDuckDbCsvOptionToken(sniffRow.Quote),
    escapeChar:
      userHints.escapeChar != null
        ? normalizeDuckDbCsvOptionToken(userHints.escapeChar)
        : normalizeDuckDbCsvOptionToken(sniffRow.Escape),
    newlineDelimiter: normalizeNewlineDelimiterForDuckDb(
      userHints.newlineDelimiter ??
        sniffRow.NewLineDelimiter ??
        base.newlineDelimiter,
    ),
    commentChar:
      userHints.commentChar != null
        ? normalizeDuckDbCsvOptionToken(userHints.commentChar)
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
      userHints.columns && userHints.columns.length > 0
        ? [...userHints.columns]
        : sniffColumns.length > 0
          ? sniffColumns
          : base.columns,
    strictMode: base.strictMode,
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
 * Next parse options when the strict background transcode load wrote an empty
 * staging parquet.
 * Order: enable quotes (late-quote files), relax strict casting, drop sniff
 * column types so DuckDB can load rows (common on large typed CSVs in wasm).
 */
export function resolveParseOptionsAfterEmptyStagingLoad(options: {
  parseOptions: CsvParseResolvedOptions;
  stagingRowCount: number;
}): CsvParseResolvedOptions | null {
  const { parseOptions, stagingRowCount } = options;

  if (stagingRowCount > 0) {
    return null;
  }

  if (parseOptions.quoteChar == null) {
    return {
      ...parseOptions,
      quoteChar: DEFAULT_CSV_QUOTE_CHAR,
      escapeChar: parseOptions.escapeChar ?? DEFAULT_CSV_ESCAPE_CHAR,
    };
  }

  if (parseOptions.strictMode) {
    return {
      ...parseOptions,
      strictMode: false,
    };
  }

  if (parseOptions.columns.length > 0) {
    return {
      ...parseOptions,
      columns: [],
    };
  }

  return null;
}

/**
 * Whether another CSV parse attempt is worth making. Retries only when all
 * of the following hold:
 *   - retries remain (`attemptIndex` is below `maxAttempts - 1`);
 *   - the last attempt produced rejected rows;
 *   - at least one rejection is recoverable, i.e. a cast / too-many-columns /
 *     missing-columns error a re-parse could plausibly fix (not, say, a bad
 *     encoding); and
 *   - refining the options actually changed them. If `refinedOptions` equals
 *     `parseOptions`, the next attempt would parse identically and reproduce
 *     the same failure, so we stop instead of looping to `maxAttempts`.
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
