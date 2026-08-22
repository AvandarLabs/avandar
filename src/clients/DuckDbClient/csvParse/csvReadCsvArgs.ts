import type {
  CsvParseResolvedOptions,
  CsvReadCsvMode,
} from "@/clients/DuckDbClient/csvParse/csvParse.types";

import { REJECTED_ROW_STORAGE_LIMIT } from "@/clients/DuckDbClient/csvParse/csvParse.constants";

function _escapeSqlSingleQuotedLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

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
    quoteChar != null
      ? `quote='${_escapeSqlSingleQuotedLiteral(quoteChar)}'`
      : "",
    escapeChar != null
      ? `escape='${_escapeSqlSingleQuotedLiteral(escapeChar)}'`
      : "",
    newlineDelimiter != null
      ? `new_line='${_escapeSqlSingleQuotedLiteral(newlineDelimiter)}'`
      : "",
    commentChar != null
      ? `comment='${_escapeSqlSingleQuotedLiteral(commentChar)}'`
      : "",
    `skip=${numRowsToSkip}`,
    `header=${hasHeader}`,
    dateFormat
      ? `dateformat='${_escapeSqlSingleQuotedLiteral(dateFormat)}'`
      : "",
    timestampFormat
      ? `timestampformat='${_escapeSqlSingleQuotedLiteral(timestampFormat)}'`
      : "",
    columns.length > 0
      ? `columns={${columns
          .map(([name, type]) => {
            return `'${_escapeSqlSingleQuotedLiteral(name)}': '${type}'`;
          })
          .join(",")}}`
      : "",
    "store_rejects=true",
    "rejects_scan='reject_scans'",
    "rejects_table='reject_errors'",
    `rejects_limit=${REJECTED_ROW_STORAGE_LIMIT}`,
    mode === "load"
      ? `strict_mode=${parseOptions.strictMode ? "true" : "false"}`
      : "strict_mode=false",
  ];

  return args.filter((arg) => {
    return arg.length > 0;
  });
}

/**
 * `sniff_csv` constraint args from resolved options (re-sniff on retry).
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

  if (parseOptions.newlineDelimiter != null) {
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

export function buildReadCsvPromptFromResolved(options: {
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
