import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { acquireGoogleSheetRelation } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import type { GoogleSheetTabCsvReader } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";
import type { GoogleDriveFetch } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";

/**
 * Acquisition read against a real reader rather than against a spy.
 *
 * DuckDB really reads the CSV each tab returns, so the assertions are about
 * rows that came out of a reader rather than about arguments that went into a
 * mock. That is what catches the bug worth catching here: shipping a tab
 * selector and still acquiring tab one.
 *
 * The tabs carry the same column names and different values, so a result can
 * only be attributed to the tab it actually came from. The CSV uses CRLF, as
 * Google's export does.
 */

const FILE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
const ACCESS_TOKEN = "ya29.test-access-token";

const TABS = [
  { sheetId: 0, title: "Colombia", index: 0 },
  { sheetId: 77, title: "Kenya", index: 1 },
];

const CSV_BY_GID: Readonly<Record<number, string>> = {
  0: "city,population\r\nBogota,7900000\r\n",
  77: "city,population\r\nNairobi,4400000\r\n",
};

/** Answers the version read, the tab list, and the per-tab CSV download. */
function _makeDriveFetch(version: string): GoogleDriveFetch {
  return async (url) => {
    if (url.includes("fields=version")) {
      return new Response(JSON.stringify({ version }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("sheets.googleapis.com")) {
      return new Response(
        JSON.stringify({
          sheets: TABS.map((properties) => {
            return { properties };
          }),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    const gid = Number(new URL(url).searchParams.get("gid") ?? "0");
    return new Response(CSV_BY_GID[gid] ?? "", { status: 200 });
  };
}

type Row = { city: string; population: bigint };

/**
 * A reader backed by a real in-process DuckDB. `read_csv` takes a path, so the
 * text is staged to a temp file, which is the same round trip the browser makes
 * through duckdb-wasm's virtual filesystem.
 */
const _readCsvWithDuckDb: GoogleSheetTabCsvReader<Row[]> = async ({
  csvText,
}) => {
  const stagedFile = path.join(
    tmpdir(),
    `ava-google-sheet-${process.pid}-${csvText.length}.csv`,
  );
  writeFileSync(stagedFile, csvText);

  return withDuckDb(async (connection) => {
    const reader = await connection.runAndReadAll(
      `SELECT * FROM read_csv('${stagedFile}', header = true)`,
    );
    return reader.getRowObjects() as unknown as Row[];
  });
};

describe("acquireGoogleSheetRelation", () => {
  it("reads the stored tab and not the first one", async () => {
    const acquired = await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: "Kenya",
      readCsv: _readCsvWithDuckDb,
      driveFetch: _makeDriveFetch("5"),
    });

    expect(acquired.relation).toEqual([
      { city: "Nairobi", population: 4_400_000n },
    ]);
    expect(acquired.sourceVersion).toBe("5");
  });

  it("reads the first tab when the stored tab name is null", async () => {
    const acquired = await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: null,
      readCsv: _readCsvWithDuckDb,
      driveFetch: _makeDriveFetch("5"),
    });

    expect(acquired.relation).toEqual([
      { city: "Bogota", population: 7_900_000n },
    ]);
  });

  it("types a numeric column as a number, the way the import did", async () => {
    // DuckDB hands a BIGINT back as a JS `bigint`; what matters is that it is
    // not a string.
    // The reason acquisition downloads CSV rather than exporting the workbook:
    // `read_xlsx` has to be told to read everything as text to avoid aborting
    // on a column whose type changes late, so re-acquiring through it retyped
    // every column of every dataset imported this way.
    const acquired = await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: "Kenya",
      readCsv: _readCsvWithDuckDb,
      driveFetch: _makeDriveFetch("5"),
    });

    expect(typeof acquired.relation[0]?.population).toBe("bigint");
  });

  it("fails when the stored tab is no longer in the workbook", async () => {
    await expect(
      acquireGoogleSheetRelation({
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        sheetName: "Deleted tab",
        readCsv: _readCsvWithDuckDb,
        driveFetch: _makeDriveFetch("5"),
      }),
    ).rejects.toMatchObject({ code: "sheet-not-found" });
  });
});
