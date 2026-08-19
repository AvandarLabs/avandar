import { getGoogleSheetXlsxExport } from "@/clients/google/GoogleDriveClient/GoogleDriveClient";
import type { GoogleDriveFetch } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";
import type { SourceVersion } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";

/**
 * Reads one tab out of workbook bytes.
 *
 * Injected rather than imported so this module stays free of DuckDB: the
 * browser passes an adapter over `DuckDbClient.loadXlsx`, and a test can pass
 * one over a real DuckDB running in Node. `TRelation` is whatever that reader
 * produces, which in the browser is a `DuckDbLoadXlsxResult` carrying the
 * Parquet Blob.
 *
 * `sheet` is `undefined` for "the workbook's first sheet", which is
 * `read_xlsx`'s own default and the meaning a `NULL` `sheet_name` carries.
 */
export type GoogleSheetXlsxReader<TRelation> = (
  params: Readonly<{
    xlsxBytes: Uint8Array<ArrayBuffer>;
    sheet: string | undefined;
  }>,
) => Promise<TRelation>;

/** One acquired Sheets relation and the source version it was read at. */
export type AcquiredGoogleSheetRelation<TRelation> = {
  relation: TRelation;
  sourceVersion: SourceVersion;
};

/**
 * Acquires one tab of a Google Sheet: export the workbook from Drive, then read
 * the named tab out of it.
 *
 * This is the whole connector in one function, and it is deliberately the only
 * place that knows a stored `sheet_name` of `NULL` means "the first tab". A
 * caller that dropped that translation would silently read tab one for every
 * dataset, which is the failure this connector is most likely to ship.
 *
 * Everything it needs arrives as an argument. It reads no dataset record, holds
 * no token, and imports no client singleton, so the wrapper that eventually
 * calls it keeps `WrapperContext` as the only source of identity.
 *
 * @param params The file and tab to acquire, the token to acquire it with, and
 * the reader and transport to do it through.
 * @returns The reader's output and the Drive version the bytes were exported
 * at.
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

    readXlsx: GoogleSheetXlsxReader<TRelation>;
    driveFetch?: GoogleDriveFetch;
  }>,
): Promise<AcquiredGoogleSheetRelation<TRelation>> {
  const { xlsxBytes, sourceVersion } = await getGoogleSheetXlsxExport({
    fileId: params.fileId,
    accessToken: params.accessToken,
    driveFetch: params.driveFetch,
  });

  const relation = await params.readXlsx({
    xlsxBytes,
    sheet: params.sheetName ?? undefined,
  });

  return { relation, sourceVersion };
}
