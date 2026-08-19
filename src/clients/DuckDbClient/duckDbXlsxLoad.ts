import { uuid } from "$/lib/uuid";
import { buildXlsxReadRange } from "@/clients/DuckDbClient/buildXlsxReadRange/buildXlsxReadRange";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import {
  assertXlsxFileReadable,
  getParquetBlobFromStagingFiles,
  registerXlsxFile,
} from "@/clients/DuckDbClient/duckDbFileRegistry";
import { escapeSqlSingleQuotedLiteral } from "@/clients/DuckDbClient/duckDbSqlText";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { DuckDbLoadXlsxResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { DuckDbClientOperations } from "@/clients/DuckDbClient/duckDbClientOperations";
import type * as duckdb from "@duckdb/duckdb-wasm";

type BaseDuckDbLoadXlsxOptions = {
  tableName: string;
  datasetDuckDbLease?: DatasetDuckDbLease;
  /**
   * Worksheet name for `read_xlsx`. Omit to load the first sheet (DuckDb
   * default).
   */
  sheet?: string;
  /**
   * When true, `read_xlsx` uses the first row as column names. Defaults to
   * true so behavior matches the import UI and avoids flaky auto-detection.
   */
  hasHeader?: boolean;
  /**
   * Leading rows to skip before the header row. Defaults to 0. A workbook
   * published for reading often puts a title block above its header row, and
   * those rows have to be excluded from the read or they become the column
   * names.
   */
  rowsToSkip?: number;
};

/**
 * Options for `loadXlsx`. Pass either a browser `File` or raw workbook bytes
 * (`.xlsx` only; DuckDb does not read `.xls`).
 */
export type DuckDbLoadXlsxOptions =
  | (BaseDuckDbLoadXlsxOptions & { file: File })
  | (BaseDuckDbLoadXlsxOptions & { fileBytes: Uint8Array<ArrayBuffer> });

type XlsxLoadResultOptions = {
  client: DuckDbClientOperations;
  datasetDuckDbLease: DatasetDuckDbLease;
  parquetData: Blob;
  sheet: string | undefined;
  tableName: string;
};

async function _registerXlsxStagingFile(
  options: Readonly<
    DuckDbLoadXlsxOptions & { db: duckdb.AsyncDuckDB; xlsxStagingFile: string }
  >,
): Promise<void> {
  if ("file" in options) {
    assertXlsxFileReadable(options.file);
    await registerXlsxFile({
      db: options.db,
      tableName: options.xlsxStagingFile,
      file: options.file,
    });
    return;
  }
  await registerXlsxFile({
    db: options.db,
    tableName: options.xlsxStagingFile,
    fileBytes: options.fileBytes,
  });
}

async function _transcodeXlsxToParquet(
  options: Readonly<{
    client: DuckDbClientOperations;
    conn: duckdb.AsyncDuckDBConnection;
    datasetDuckDbLease: DatasetDuckDbLease;
    hasHeader: boolean;
    parquetStagingFile: string;
    rowsToSkip: number;
    sheet: string | undefined;
    xlsxStagingFile: string;
  }>,
): Promise<void> {
  const sheetClause =
    options.sheet ?
      `, sheet = '${escapeSqlSingleQuotedLiteral(options.sheet)}'`
    : "";
  const range = buildXlsxReadRange(options.rowsToSkip);
  // Naming a range turns `stop_at_empty` off, which would pad the read out to
  // the format's maximum row, so it is switched back on alongside the range.
  const rangeClause = range ? `, range = '${range}', stop_at_empty = true` : "";
  await options.client.runRawQuery(
    `COPY (
        SELECT * FROM read_xlsx(
          '$xlsxFile$', header = ${options.hasHeader} ${sheetClause}${rangeClause}
        )
      ) TO '$pqFile$' (FORMAT PARQUET, COMPRESSION ZSTD)`,
    {
      conn: options.conn,
      datasetDuckDbLease: options.datasetDuckDbLease,
      [TRUSTED_INTERNAL_SQL]: true,
      params: {
        xlsxFile: options.xlsxStagingFile,
        pqFile: options.parquetStagingFile,
      },
    },
  );
}

async function _getXlsxLoadResult(
  options: Readonly<XlsxLoadResultOptions>,
): Promise<DuckDbLoadXlsxResult> {
  const { client } = options;
  await client.loadParquet({
    tableName: options.tableName,
    blob: options.parquetData,
    datasetDuckDbLease: options.datasetDuckDbLease,
  });
  client.logger.log("Successfully transcoded XLSX into parquet!");
  const [tableColumns, rowCount] = await Promise.all([
    client.getTableSchema(options),
    client.getTableRowCount(options),
  ]);
  return {
    id: uuid(),
    type: "xlsx",
    tableName: options.tableName,
    xlsxName: options.tableName,
    numRows: rowCount,
    columns: tableColumns,
    sheet: options.sheet,
    parquetData: options.parquetData,
  };
}

/**
 * Loads an `.xlsx` workbook into DuckDB using `read_xlsx`.
 *
 * Legacy `.xls` (BIFF) files are rejected; DuckDB only supports `.xlsx`.
 * The caller must already hold the dataset's DuckDB lease.
 */
export async function loadXlsxIntoDuckDb(
  options: Readonly<
    DuckDbLoadXlsxOptions & {
      client: DuckDbClientOperations;
      datasetDuckDbLease: DatasetDuckDbLease;
    }
  >,
): Promise<DuckDbLoadXlsxResult> {
  const { client, tableName, sheet } = options;
  const hasHeader = options.hasHeader ?? true;
  const rowsToSkip = options.rowsToSkip ?? 0;
  const xlsxStagingFile = `${tableName}__loadXlsx_src`;
  const parquetStagingFile = `${tableName}__loadXlsx_pq`;
  const conn = await client.connect();
  try {
    await client.dropTableViewAndFile({
      tableOrViewName: tableName,
      datasetDuckDbLease: options.datasetDuckDbLease,
    });
    const db = await client.getDb();
    await _registerXlsxStagingFile({ ...options, db, xlsxStagingFile });
    await _transcodeXlsxToParquet({
      client,
      conn,
      datasetDuckDbLease: options.datasetDuckDbLease,
      hasHeader,
      parquetStagingFile,
      rowsToSkip,
      sheet,
      xlsxStagingFile,
    });
    const parquetData = await getParquetBlobFromStagingFiles({
      db,
      parquetStagingFile,
      sourceStagingFile: xlsxStagingFile,
    });
    return await _getXlsxLoadResult({
      client,
      tableName,
      datasetDuckDbLease: options.datasetDuckDbLease,
      parquetData,
      sheet,
    });
  } finally {
    await client.closeConnection(conn);
  }
}
