import { isNonEmptyArray } from "@avandar/utils";
import {
  DEFAULT_CSV_ESCAPE_CHAR,
  DEFAULT_CSV_QUOTE_CHAR,
  MAX_CSV_PARSE_ATTEMPTS,
} from "@/clients/DuckDbClient/csvParse/csvParse.constants";
import { isRecoverableCsvParseError } from "@/clients/DuckDbClient/csvParse/csvParseError";
import {
  createCsvParseOptionsFromUserHints,
  refineCsvParseOptionsAfterFailure,
  resolveParseOptionsAfterEmptyStagingLoad,
  shouldRetryCsvParse,
} from "@/clients/DuckDbClient/csvParse/csvParseOptions";
import { buildReadCsvArgList } from "@/clients/DuckDbClient/csvParse/csvReadCsvArgs";
import { sniffCsvWithDuckDb } from "@/clients/DuckDbClient/csvParse/csvSniff";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { Logger } from "@/utils/Logger";
import type {
  CsvParseResolvedOptions,
  CsvParseUserHints,
  DuckDbSniffCsvRow,
} from "@/clients/DuckDbClient/csvParse/csvParse.types";
import type {
  CsvParseAttemptState,
  SniffCsvWithDuckDbResult,
} from "@/clients/DuckDbClient/csvParse/csvSniff";
import type {
  DuckDbRejectedRow,
  DuckDbScan,
} from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";
import type * as duckdb from "@duckdb/duckdb-wasm";

type RunCsvParseAttemptsOptions = {
  client: DuckDbClientOperations;
  conn: duckdb.AsyncDuckDBConnection;
  csvStagingFile: string;
  file: File | undefined;
  parquetStagingFile: string;
  userHints: CsvParseUserHints;
};

type WriteCsvAttemptOptions = RunCsvParseAttemptsOptions & {
  attemptIndex: number;
  parseOptions: CsvParseResolvedOptions;
};

type EvaluateCsvParseAttemptOptions = Omit<
  RunCsvParseAttemptsOptions,
  "file" | "userHints"
> & {
  attemptIndex: number;
  state: CsvParseAttemptState;
};

async function _copyCsvAttemptToParquet(
  options: Readonly<{
    client: DuckDbClientOperations;
    conn: duckdb.AsyncDuckDBConnection;
    csvStagingFile: string;
    parquetStagingFile: string;
    parseOptions: CsvParseResolvedOptions;
  }>,
): Promise<void> {
  const readCsvArgs = buildReadCsvArgList({
    parseOptions: options.parseOptions,
    mode: "load",
  }).join(", ");
  await options.client.runRawQuery(
    `COPY (SELECT * FROM read_csv('$csvFile$', ${readCsvArgs}))
       TO '$pqFile$' (FORMAT PARQUET, COMPRESSION ZSTD)`,
    {
      conn: options.conn,
      params: {
        csvFile: options.csvStagingFile,
        pqFile: options.parquetStagingFile,
      },
      [TRUSTED_INTERNAL_SQL]: true,
    },
  );
}

function _getCsvRetryResultFromError(
  options: Readonly<{
    attemptIndex: number;
    error: unknown;
    sniffed: SniffCsvWithDuckDbResult;
  }>,
): {
  lastSniffRow: DuckDbSniffCsvRow | undefined;
  parseOptions: CsvParseResolvedOptions;
  shouldRetry: true;
} {
  if (
    options.attemptIndex >= MAX_CSV_PARSE_ATTEMPTS - 1 ||
    !isRecoverableCsvParseError(options.error)
  ) {
    throw options.error;
  }
  const { parseOptions, sniffRow } = options.sniffed;
  return {
    parseOptions:
      parseOptions.quoteChar == null ?
        {
          ...parseOptions,
          quoteChar: DEFAULT_CSV_QUOTE_CHAR,
          escapeChar: parseOptions.escapeChar ?? DEFAULT_CSV_ESCAPE_CHAR,
        }
      : parseOptions,
    lastSniffRow: sniffRow,
    shouldRetry: true,
  };
}

async function _writeCsvAttemptToParquet(
  options: Readonly<WriteCsvAttemptOptions>,
): Promise<{
  lastSniffRow: DuckDbSniffCsvRow | undefined;
  parseOptions: CsvParseResolvedOptions;
  shouldRetry: boolean;
}> {
  const { client, conn, csvStagingFile, file, userHints } = options;
  await client.runRawQuery("DROP TABLE IF EXISTS reject_scans", { conn });
  await client.runRawQuery("DROP TABLE IF EXISTS reject_errors", { conn });
  const sniffed = await sniffCsvWithDuckDb({
    runRawQuery: client.runRawQuery,
    conn,
    stagingFile: csvStagingFile,
    userHints,
    parseOptions: options.parseOptions,
    file,
  });
  try {
    await _copyCsvAttemptToParquet({
      client,
      conn,
      csvStagingFile,
      parquetStagingFile: options.parquetStagingFile,
      parseOptions: sniffed.parseOptions,
    });
    return { ...sniffed, lastSniffRow: sniffed.sniffRow, shouldRetry: false };
  } catch (error) {
    return _getCsvRetryResultFromError({
      attemptIndex: options.attemptIndex,
      error,
      sniffed,
    });
  }
}

async function _getParquetStagingRowCount(
  options: Readonly<{
    client: DuckDbClientOperations;
    conn: duckdb.AsyncDuckDBConnection;
    parquetStagingFile: string;
  }>,
): Promise<number> {
  const result = await options.client.runRawQuery<{ c: bigint }>(
    `SELECT count(*)::BIGINT as c FROM read_parquet('$pqFile$')`,
    {
      conn: options.conn,
      params: { pqFile: options.parquetStagingFile },
      [TRUSTED_INTERNAL_SQL]: true,
    },
  );
  return Number(result.data[0]?.c ?? 0);
}

async function _getCsvRejectedData(
  options: Readonly<{
    client: DuckDbClientOperations;
    conn: duckdb.AsyncDuckDBConnection;
    csvStagingFile: string;
  }>,
): Promise<{
  rejectedRows: DuckDbRejectedRow[];
  rejectedScans: DuckDbScan[];
}> {
  const rejectedScansResult = await options.client.runRawQuery<DuckDbScan>(
    `SELECT * FROM reject_scans WHERE file_path='$csvFile$'`,
    { conn: options.conn, params: { csvFile: options.csvStagingFile } },
  );
  const rejectedScans = rejectedScansResult.data;
  if (!isNonEmptyArray(rejectedScans)) {
    return { rejectedRows: [], rejectedScans };
  }
  const rejectedRowsResult =
    await options.client.runRawQuery<DuckDbRejectedRow>(
      `SELECT * FROM reject_errors WHERE file_id='$fileId$'`,
      { conn: options.conn, params: { fileId: rejectedScans[0].file_id } },
    );
  return { rejectedRows: rejectedRowsResult.data, rejectedScans };
}

async function _evaluateCsvParseAttempt(
  options: Readonly<EvaluateCsvParseAttemptOptions>,
): Promise<{ shouldRetry: boolean; state: CsvParseAttemptState }> {
  const stagingRowCount = await _getParquetStagingRowCount(options);
  const emptyOptions = resolveParseOptionsAfterEmptyStagingLoad({
    parseOptions: options.state.parseOptions,
    stagingRowCount,
  });
  if (emptyOptions && options.attemptIndex < MAX_CSV_PARSE_ATTEMPTS - 1) {
    await (await options.client.getDb()).dropFile(options.parquetStagingFile);
    return {
      shouldRetry: true,
      state: { ...options.state, parseOptions: emptyOptions },
    };
  }
  const rejectedData = await _getCsvRejectedData(options);
  const refinedOptions = refineCsvParseOptionsAfterFailure({
    parseOptions: options.state.parseOptions,
    rejectedRows: rejectedData.rejectedRows,
  });
  const shouldRetry = shouldRetryCsvParse({
    attemptIndex: options.attemptIndex,
    maxAttempts: MAX_CSV_PARSE_ATTEMPTS,
    rejectedRows: rejectedData.rejectedRows,
    parseOptions: options.state.parseOptions,
    refinedOptions,
  });
  return {
    shouldRetry,
    state: {
      ...options.state,
      ...rejectedData,
      ...(shouldRetry ? { parseOptions: refinedOptions } : {}),
    },
  };
}

/**
 * Transcodes a registered CSV to a staging parquet file, refining the parse
 * options and retrying until DuckDB accepts the file or the attempts run out.
 */
export async function runCsvParseAttempts(
  options: Readonly<RunCsvParseAttemptsOptions>,
): Promise<CsvParseAttemptState> {
  let state: CsvParseAttemptState = {
    lastSniffRow: undefined,
    parseOptions: createCsvParseOptionsFromUserHints(options.userHints),
    rejectedRows: [],
    rejectedScans: [],
  };
  Logger.log("columns specified", { columns: state.parseOptions.columns });
  for (
    let attemptIndex = 0;
    attemptIndex < MAX_CSV_PARSE_ATTEMPTS;
    attemptIndex++
  ) {
    // Each attempt refines the parse options the next one uses, so the awaits
    // in this loop are strictly ordered and cannot run in parallel.
    const writeResult = await _writeCsvAttemptToParquet({
      ...options,
      attemptIndex,
      parseOptions: state.parseOptions,
    });
    state = { ...state, ...writeResult };
    if (writeResult.shouldRetry) {
      continue;
    }
    const evaluated = await _evaluateCsvParseAttempt({
      ...options,
      attemptIndex,
      state,
    });
    state = evaluated.state;
    if (!evaluated.shouldRetry) {
      break;
    }
  }
  return state;
}
