import { uuid } from "$/lib/uuid";
import { runCsvParseAttempts } from "@/clients/DuckDbClient/csvParse/csvParseAttempts";
import {
  getCsvParseUserHints,
  getCsvSniffResult,
} from "@/clients/DuckDbClient/csvParse/csvSniff";
import {
  getParquetBlobFromStagingFiles,
  registerCsvFile,
} from "@/clients/DuckDbClient/duckDbFileRegistry";
import { Logger } from "@/utils/Logger";
import type { CsvParseUserHints } from "@/clients/DuckDbClient/csvParse/csvParse.types";
import type {
  CsvDialectHints,
  CsvParseAttemptState,
} from "@/clients/DuckDbClient/csvParse/csvSniff";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbLoadCsvResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";

type BaseDuckDbLoadCsvOptions = CsvDialectHints & {
  tableName: string;
  datasetDuckDbLease?: DatasetDuckDbLease;
  columns?: Array<readonly [columnName: string, columnType: DuckDbDataType]>;
};

/** Options for `loadCsv`. Pass either a browser `File` or raw CSV text. */
export type DuckDbLoadCsvOptions =
  | (BaseDuckDbLoadCsvOptions & { file: File })
  | (BaseDuckDbLoadCsvOptions & { fileText: string });

type CsvLoadResultOptions = CsvParseAttemptState & {
  client: DuckDbClientOperations;
  datasetDuckDbLease: DatasetDuckDbLease;
  parquetData: Blob;
  tableName: string;
};

function _getCsvParseUserHintsFromLoadOptions(
  options: BaseDuckDbLoadCsvOptions,
): CsvParseUserHints {
  return { ...getCsvParseUserHints(options), columns: options.columns };
}

async function _getCsvLoadResult(
  options: Readonly<CsvLoadResultOptions>,
): Promise<DuckDbLoadCsvResult> {
  const { client } = options;
  await client.loadParquet({
    tableName: options.tableName,
    blob: options.parquetData,
    datasetDuckDbLease: options.datasetDuckDbLease,
  });
  const [tableColumns, csvRowCount] = await Promise.all([
    client.getTableSchema({
      tableName: options.tableName,
      datasetDuckDbLease: options.datasetDuckDbLease,
    }),
    client.getTableRowCount({
      tableName: options.tableName,
      datasetDuckDbLease: options.datasetDuckDbLease,
    }),
  ]);
  if (csvRowCount === 0) {
    throw new Error(
      "CSV load produced zero rows. The file may use quotes or column types that differ from the sniff sample.",
    );
  }
  Logger.log("tableColumns", { tableColumns });
  client.logger.log("Successfully transcoded CSV into parquet!");
  return {
    id: uuid(),
    type: "csv",
    tableName: options.tableName,
    csvName: options.tableName,
    numRows: csvRowCount,
    columns: tableColumns,
    errors: {
      rejectedScans: options.rejectedScans,
      rejectedRows: options.rejectedRows,
    },
    numRejectedRows: options.rejectedRows.length,
    csvSniff: getCsvSniffResult({ ...options, tableColumns }),
    parquetData: options.parquetData,
  };
}

/**
 * Transcodes a CSV to parquet and loads it as the dataset's bare table.
 *
 * The caller must already hold the dataset's DuckDB lease.
 */
export async function loadCsvIntoDuckDb(
  options: Readonly<
    DuckDbLoadCsvOptions & {
      client: DuckDbClientOperations;
      datasetDuckDbLease: DatasetDuckDbLease;
    }
  >,
): Promise<DuckDbLoadCsvResult> {
  const { client } = options;
  const csvStagingFile = `${options.tableName}__loadCsv_src`;
  const parquetStagingFile = `${options.tableName}__loadCsv_pq`;
  const conn = await client.connect();
  try {
    await client.dropTableViewAndFile({
      tableOrViewName: options.tableName,
      datasetDuckDbLease: options.datasetDuckDbLease,
    });
    const db = await client.getDb();
    await registerCsvFile(
      "file" in options ?
        { db, tableName: csvStagingFile, file: options.file }
      : { db, tableName: csvStagingFile, fileText: options.fileText },
    );
    const parseState = await runCsvParseAttempts({
      client,
      conn,
      csvStagingFile,
      parquetStagingFile,
      userHints: _getCsvParseUserHintsFromLoadOptions(options),
      file: "file" in options ? options.file : undefined,
    });
    const parquetData = await getParquetBlobFromStagingFiles({
      db,
      sourceStagingFile: csvStagingFile,
      parquetStagingFile,
    });
    return await _getCsvLoadResult({
      ...parseState,
      client,
      datasetDuckDbLease: options.datasetDuckDbLease,
      parquetData,
      tableName: options.tableName,
    });
  } finally {
    await client.closeConnection(conn);
  }
}
