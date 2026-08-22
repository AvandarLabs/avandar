import type {
  CsvParseResolvedOptions,
  DuckDbSniffCsvRow,
} from "@/clients/DuckDbClient/csvParse/csvParse.types";
import type {
  DuckDbCsvSniffResult,
  DuckDbScan,
} from "@/clients/DuckDbClient/DuckDbClient.types";

import { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import { buildReadCsvPromptFromResolved } from "@/clients/DuckDbClient/csvParse/csvReadCsvArgs";
import {
  columnsFromSniffRow,
  duckDbDataTypeFromString,
} from "@/clients/DuckDbClient/csvParse/duckDbCsvColumns";
import {
  normalizeDuckDbCsvOptionToken,
  optionalTrimmedCsvFormat,
} from "@/clients/DuckDbClient/csvParse/duckDbCsvTokens";

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
      { name: columnName, type: duckDbDataTypeFromString(columnTypeString) },
    ];
  });
}

export function buildDuckDbCsvSniffResultFromSniffRow(options: {
  tableName: string;
  sniffRow: DuckDbSniffCsvRow;
  parseOptions: CsvParseResolvedOptions;
}): DuckDbCsvSniffResult {
  const { tableName, sniffRow, parseOptions } = options;
  const columns = columnsFromSniffRow(sniffRow.Columns).map((col) => {
    return { name: col[0], type: col[1] };
  });

  return {
    Delimiter: parseOptions.delimiter,
    Quote: parseOptions.quoteChar ?? "",
    Escape: parseOptions.escapeChar ?? "",
    NewLineDelimiter: parseOptions.newlineDelimiter ?? "",
    Comment: parseOptions.commentChar ?? "",
    SkipRows: parseOptions.numRowsToSkip,
    HasHeader: parseOptions.hasHeader,
    Columns: columns,
    DateFormat: parseOptions.dateFormat ?? null,
    TimestampFormat: parseOptions.timestampFormat ?? null,
    UserArguments: sniffRow.UserArguments,
    Prompt: buildReadCsvPromptFromResolved({
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
  commentChar: string | undefined;
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
    strictMode: true,
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
    NewLineDelimiter: parseOptions.newlineDelimiter ?? "",
    Comment: parseOptions.commentChar ?? "",
    SkipRows: parseOptions.numRowsToSkip,
    HasHeader: parseOptions.hasHeader,
    Columns: [...columns],
    DateFormat: parseOptions.dateFormat ?? null,
    TimestampFormat: parseOptions.timestampFormat ?? null,
    UserArguments: userArguments,
    Prompt: buildReadCsvPromptFromResolved({
      tableName,
      parseOptions,
      mode: "load",
    }),
    table_name: tableName,
  };
}
