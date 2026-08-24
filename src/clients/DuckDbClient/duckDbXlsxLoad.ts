import { uuid } from "$/lib/uuid";
import { buildReadXlsxArgs } from "@/clients/DuckDbClient/buildReadXlsxArgs/buildReadXlsxArgs";
import {
  buildXlsxReadRange,
  buildXlsxWidthProbeRange,
  getXlsxColumnIndex,
} from "@/clients/DuckDbClient/buildXlsxReadRange/buildXlsxReadRange";
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

/**
 * How many rows the width probe reads, including the header row. Enough to
 * catch a column whose header cell is blank but whose data is not, while
 * staying a bounded read.
 */
const XLSX_WIDTH_PROBE_ROWS = 25;

/**
 * Finds the sheet's last populated column so the transcode's range can be
 * bounded to the real table, returning `undefined` when it cannot be
 * determined.
 *
 * `read_xlsx` needs a range to skip a title block, and a range with no known
 * right edge has to name the format's maximum column - which makes the read
 * return all 16,384 columns, padding the table with thousands of all-NULL
 * columns. `stop_at_empty` bounds only the rows, so the width has to be
 * measured here instead.
 *
 * The probe unpivots a window of cells and asks which column labels hold a
 * value, which keeps the result the width of the table rather than the width
 * of the format. A failure is not fatal: the caller falls back to the
 * unbounded range, which reads the data correctly, just wastefully.
 */
async function _detectLastPopulatedColumn(
  options: Readonly<{
    client: DuckDbClientOperations;
    conn: duckdb.AsyncDuckDBConnection;
    datasetDuckDbLease: DatasetDuckDbLease;
    rowsToSkip: number;
    sheetClause: string;
    xlsxStagingFile: string;
  }>,
): Promise<string | undefined> {
  const probeRange = buildXlsxWidthProbeRange(
    options.rowsToSkip,
    XLSX_WIDTH_PROBE_ROWS,
  );
  try {
    const result = await options.client.runRawQuery<{ cellColumn: string }>(
      `SELECT DISTINCT cellColumn FROM (
          UNPIVOT (
            SELECT * FROM read_xlsx(
              '$xlsxFile$', header = false, range = '${probeRange}',
              stop_at_empty = false, all_varchar = true${options.sheetClause}
            )
          ) ON COLUMNS(*) INTO NAME cellColumn VALUE cellValue
        ) WHERE cellValue IS NOT NULL AND trim(cellValue) <> ''`,
      {
        conn: options.conn,
        datasetDuckDbLease: options.datasetDuckDbLease,
        [TRUSTED_INTERNAL_SQL]: true,
        params: { xlsxFile: options.xlsxStagingFile },
      },
    );
    let lastColumn: string | undefined;
    let lastColumnIndex = 0;
    result.data.forEach((row) => {
      const columnIndex = getXlsxColumnIndex(row.cellColumn);
      if (columnIndex > lastColumnIndex) {
        lastColumnIndex = columnIndex;
        lastColumn = row.cellColumn;
      }
    });
    return lastColumn;
  } catch (error) {
    options.client.logger.log(
      "Could not detect the XLSX sheet's width; reading the full width instead.",
      error,
    );
    return undefined;
  }
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
  // A range is only needed to skip a title block, and detecting the sheet's
  // width costs a read of its own, so neither happens without a skip.
  const lastColumn =
    options.rowsToSkip > 0 ?
      await _detectLastPopulatedColumn({
        client: options.client,
        conn: options.conn,
        datasetDuckDbLease: options.datasetDuckDbLease,
        rowsToSkip: options.rowsToSkip,
        sheetClause,
        xlsxStagingFile: options.xlsxStagingFile,
      })
    : undefined;
  const readArgs = buildReadXlsxArgs({
    hasHeader: options.hasHeader,
    sheet: options.sheet,
    range: buildXlsxReadRange(options.rowsToSkip, lastColumn),
  });
  await options.client.runRawQuery(
    `COPY (
        SELECT * FROM read_xlsx('$xlsxFile$', ${readArgs})
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
  // `read_xlsx` comes from the `excel` extension, which loads on demand so a
  // session that never opens a workbook does not pay its fetch. Loading is
  // memoized, so repeat imports cost nothing.
  await options.client.ensureExcel();
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
