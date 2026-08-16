import { CSV_SNIFF_SAMPLE_SIZE } from "@/clients/DuckDbClient/csvParse/csvParse.constants";
import { mergeSniffCsvRowIntoParseOptions } from "@/clients/DuckDbClient/csvParse/csvParseOptions";
import { applyQuoteProbeToParseOptions } from "@/clients/DuckDbClient/csvParse/csvQuoteProbe";
import {
  buildReadCsvArgList,
  buildSniffCsvConstraintArgs,
} from "@/clients/DuckDbClient/csvParse/csvReadCsvArgs";
import {
  buildDuckDbCsvSniffResultFromRejectScan,
  buildDuckDbCsvSniffResultFromResolved,
  buildDuckDbCsvSniffResultFromSniffRow,
} from "@/clients/DuckDbClient/csvParse/duckDbCsvSniffResult";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import type {
  CsvParseResolvedOptions,
  CsvParseUserHints,
  DuckDbSniffCsvRow,
} from "@/clients/DuckDbClient/csvParse/csvParse.types";
import type {
  DuckDbColumnSchema,
  DuckDbCsvSniffResult,
  DuckDbRejectedRow,
  DuckDbScan,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbRunRawQuery } from "@/clients/DuckDbClient/duckDbClientOperations";
import type * as duckdb from "@duckdb/duckdb-wasm";

/** The state carried between attempts of the CSV parse retry loop. */
export type CsvParseAttemptState = {
  lastSniffRow: DuckDbSniffCsvRow | undefined;
  parseOptions: CsvParseResolvedOptions;
  rejectedRows: DuckDbRejectedRow[];
  rejectedScans: DuckDbScan[];
};

/** The user-facing CSV dialect hints shared by `sniffCsv` and `loadCsv`. */
export type CsvDialectHints = {
  numRowsToSkip?: number;
  delimiter?: string;
  quoteChar?: string;
  escapeChar?: string;
  newlineDelimiter?: string;
  commentChar?: string;
  hasHeader?: boolean;
  dateFormat?: string;
  timestampFormat?: string;
};

type SniffCsvWithDuckDbOptions = {
  runRawQuery: DuckDbRunRawQuery;
  conn: duckdb.AsyncDuckDBConnection;
  stagingFile: string;
  userHints: CsvParseUserHints;
  parseOptions: CsvParseResolvedOptions;
  /** When set, probes the file for `"` if sniff reports no quote char. */
  file?: File;
};

/** The outcome of one DuckDB `sniff_csv` call. */
export type SniffCsvWithDuckDbResult = {
  parseOptions: CsvParseResolvedOptions;
  sniffRow: DuckDbSniffCsvRow | undefined;
};

/** Reads the dialect hints a caller supplied for a CSV. */
export function getCsvParseUserHints(
  options: Readonly<CsvDialectHints>,
): CsvParseUserHints {
  return {
    numRowsToSkip: options.numRowsToSkip,
    delimiter: options.delimiter,
    quoteChar: options.quoteChar,
    escapeChar: options.escapeChar,
    newlineDelimiter: options.newlineDelimiter,
    commentChar: options.commentChar,
    hasHeader: options.hasHeader,
    dateFormat: options.dateFormat,
    timestampFormat: options.timestampFormat,
  };
}

/** Runs DuckDB's `sniff_csv` and folds its answer into the parse options. */
export async function sniffCsvWithDuckDb(
  options: Readonly<SniffCsvWithDuckDbOptions>,
): Promise<SniffCsvWithDuckDbResult> {
  const { runRawQuery, conn, stagingFile, userHints, parseOptions, file } =
    options;
  const sniffArgs = [
    ...buildSniffCsvConstraintArgs(parseOptions),
    `sample_size=${CSV_SNIFF_SAMPLE_SIZE}`,
  ].join(", ");

  const sniffResult = await runRawQuery<DuckDbSniffCsvRow>(
    `SELECT * FROM sniff_csv('$file$', ${sniffArgs})`,
    {
      conn,
      params: { file: stagingFile },
      [TRUSTED_INTERNAL_SQL]: true,
    },
  );
  const sniffRow = sniffResult.data[0];
  if (!sniffRow) {
    return { parseOptions, sniffRow: undefined };
  }

  const mergedParseOptions = mergeSniffCsvRowIntoParseOptions({
    base: parseOptions,
    sniffRow,
    userHints,
  });
  return {
    parseOptions:
      file ?
        await applyQuoteProbeToParseOptions({
          file,
          sniffQuoteToken: sniffRow.Quote,
          parseOptions: mergedParseOptions,
        })
      : mergedParseOptions,
    sniffRow,
  };
}

/** Picks the sniff result to report for a completed CSV load. */
export function getCsvSniffResult(
  options: Readonly<
    CsvParseAttemptState & {
      tableColumns: DuckDbColumnSchema[];
      tableName: string;
    }
  >,
): DuckDbCsvSniffResult {
  const { lastSniffRow, parseOptions, rejectedScans, tableColumns, tableName } =
    options;
  const scan = rejectedScans[0];
  if (scan) {
    return buildDuckDbCsvSniffResultFromRejectScan({
      tableName,
      scan,
      commentChar: parseOptions.commentChar,
    });
  }
  if (lastSniffRow) {
    return buildDuckDbCsvSniffResultFromSniffRow({
      tableName,
      sniffRow: lastSniffRow,
      parseOptions,
    });
  }
  return buildDuckDbCsvSniffResultFromResolved({
    tableName,
    parseOptions,
    columns: tableColumns.map((column) => {
      return { name: column.column_name, type: column.column_type };
    }),
    userArguments: buildReadCsvArgList({ parseOptions, mode: "load" }).join(
      ", ",
    ),
  });
}
