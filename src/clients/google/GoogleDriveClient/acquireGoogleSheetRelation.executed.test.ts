import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { acquireGoogleSheetRelation } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import type { GoogleSheetXlsxReader } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";
import type { GoogleDriveFetch } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";

/**
 * Acquisition read against a real reader rather than against a spy.
 *
 * The fixture workbook is written by SheetJS and read by DuckDB's `read_xlsx`,
 * so one real library produces the bytes and a different real one consumes
 * them. A string assertion against a hand-built workbook would pass whether or
 * not `sheet` ever reached the query, which is exactly the bug worth catching
 * here: shipping a tab column and still reading tab one.
 */

const FILE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
const ACCESS_TOKEN = "ya29.test-access-token";

/** Two tabs with the same column name and different values. */
function _twoTabWorkbookBytes(): Uint8Array<ArrayBuffer> {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["city", "population"],
      ["Bogota", 7_900_000],
    ]),
    "Colombia",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["city", "population"],
      ["Nairobi", 4_400_000],
    ]),
    "Kenya",
  );

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  }) as Buffer;
  return Uint8Array.from(buffer) as Uint8Array<ArrayBuffer>;
}

/** A Drive transport that answers the version read then the export. */
function _makeDriveFetch(
  xlsxBytes: Uint8Array<ArrayBuffer>,
  version: string,
): GoogleDriveFetch {
  return async (url) => {
    if (url.includes("fields=version")) {
      return new Response(JSON.stringify({ version }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(xlsxBytes, { status: 200 });
  };
}

type Row = { city: string; population: number };

/**
 * A reader backed by a real in-process DuckDB. `read_xlsx` takes a path, so the
 * bytes are staged to a temp file, which is the same round trip the browser
 * makes through duckdb-wasm's virtual filesystem.
 */
const _readXlsxWithDuckDb: GoogleSheetXlsxReader<Row[]> = async ({
  xlsxBytes,
  sheet,
}) => {
  const stagedFile = path.join(
    tmpdir(),
    `ava-google-sheet-${process.pid}-${xlsxBytes.byteLength}.xlsx`,
  );
  writeFileSync(stagedFile, xlsxBytes);

  return withDuckDb(async (connection) => {
    await connection.run("INSTALL excel; LOAD excel;");
    const sheetClause = sheet === undefined ? "" : `, sheet = '${sheet}'`;
    const reader = await connection.runAndReadAll(
      `SELECT * FROM read_xlsx('${stagedFile}', header = true${sheetClause})`,
    );
    return reader.getRowObjects() as unknown as Row[];
  });
};

describe("acquireGoogleSheetRelation", () => {
  it("reads the stored tab and not the first one", async () => {
    const xlsxBytes = _twoTabWorkbookBytes();

    const { relation, sourceVersion } = await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: "Kenya",
      readXlsx: _readXlsxWithDuckDb,
      driveFetch: _makeDriveFetch(xlsxBytes, "77"),
    });

    expect(relation).toEqual([{ city: "Nairobi", population: 4_400_000 }]);
    expect(sourceVersion).toBe("77");
  });

  it("reads the first tab when the stored tab name is null", async () => {
    // `sheet_name = NULL` is what every row imported before the tab column
    // carries, and it has to keep meaning "the first tab".
    const xlsxBytes = _twoTabWorkbookBytes();

    const { relation } = await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: null,
      readXlsx: _readXlsxWithDuckDb,
      driveFetch: _makeDriveFetch(xlsxBytes, "77"),
    });

    expect(relation).toEqual([{ city: "Bogota", population: 7_900_000 }]);
  });

  it("reaches either tab by name, so neither result is the only one available", async () => {
    // Positive control for the two tests above. Without it, a fixture whose
    // second tab was its only tab would satisfy the first test, and a reader
    // that ignored `sheet` entirely would satisfy the second.
    const xlsxBytes = _twoTabWorkbookBytes();

    const colombia = await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: "Colombia",
      readXlsx: _readXlsxWithDuckDb,
      driveFetch: _makeDriveFetch(xlsxBytes, "77"),
    });

    expect(colombia.relation).toEqual([
      { city: "Bogota", population: 7_900_000 },
    ]);
  });

  it("fails when the stored tab is no longer in the workbook", async () => {
    // A renamed or deleted tab has to surface, not silently fall back to the
    // first one, because falling back would return a different relation's rows
    // under the dataset's own name.
    const xlsxBytes = _twoTabWorkbookBytes();

    await expect(
      acquireGoogleSheetRelation({
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        sheetName: "Q3 data",
        readXlsx: _readXlsxWithDuckDb,
        driveFetch: _makeDriveFetch(xlsxBytes, "77"),
      }),
    ).rejects.toThrow();
  });
});
