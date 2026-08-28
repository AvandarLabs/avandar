import { getStoredGoogleSheetTabCsv } from "@/clients/google/GoogleDriveClient/GoogleDriveClient";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { GoogleDriveFetch } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";

/**
 * Reads one tab's CSV into a relation.
 *
 * Injected rather than imported so this module stays free of DuckDB: the
 * browser passes an adapter over `DuckDbClient.loadCsv`, and a test can pass
 * one over a real DuckDB running in Node. `TRelation` is whatever that reader
 * produces, which in the browser is a load result carrying the Parquet Blob.
 */
export type GoogleSheetTabCsvReader<TRelation> = (
  params: Readonly<{ csvText: string }>,
) => Promise<TRelation>;

/** One acquired Sheets relation and the source version it was read at. */
export type AcquiredGoogleSheetRelation<TRelation> = {
  relation: TRelation;
  sourceVersion: SourceVersion;
};

/**
 * Acquires one tab of a Google Sheet: download that tab as CSV, then read it.
 *
 * This is the whole connector in one function, and it deliberately shares
 * `getStoredGoogleSheetTabCsv` with import and refresh. Acquisition used to
 * export the entire workbook and read the tab back out with `read_xlsx`, which
 * meant a dataset's rows were typed one way when imported and another way when
 * re-acquired: the xlsx reader has to be told to read everything as text, while
 * the CSV reader types each column from the data. One download path, one set of
 * types.
 *
 * Everything it needs arrives as an argument. It reads no dataset record, holds
 * no token, and imports no client singleton, so the wrapper that eventually
 * calls it keeps `WrapperContext` as the only source of identity.
 *
 * @param params The file and tab to acquire, the token to acquire it with, and
 * the reader and transport to do it through.
 * @returns The reader's output and the Drive version the rows were read at.
 */
export async function acquireGoogleSheetRelation<TRelation>(
  params: Readonly<{
    fileId: string;
    accessToken: string;

    /**
     * The stored tab name, or `null` for the workbook's first tab. This is
     * `datasets__google_sheets.sheet_name` verbatim, so the `null` case is the
     * legacy rows that predate the column.
     */
    sheetName: string | null;

    readCsv: GoogleSheetTabCsvReader<TRelation>;
    driveFetch?: GoogleDriveFetch;
  }>,
): Promise<AcquiredGoogleSheetRelation<TRelation>> {
  const { csvText, sourceVersion } = await getStoredGoogleSheetTabCsv({
    fileId: params.fileId,
    sheetName: params.sheetName,
    accessToken: params.accessToken,
    driveFetch: params.driveFetch,
  });

  const relation = await params.readCsv({ csvText });

  return { relation, sourceVersion };
}
