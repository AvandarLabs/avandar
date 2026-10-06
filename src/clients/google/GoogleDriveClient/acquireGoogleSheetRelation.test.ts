import { describe, expect, it, vi } from "vitest";
import { acquireGoogleSheetRelation } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";
import { GoogleDriveError } from "@/clients/google/GoogleDriveClient/GoogleDriveError";
import type { GoogleDriveFetch } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";

const FILE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
const ACCESS_TOKEN = "ya29.test-access-token";

const FIRST_TAB_CSV = "city,population\nBogota,7900000\n";
const SECOND_TAB_CSV = "county,residents\nNairobi,4400000\n";

/**
 * Answers the three calls an acquisition makes: the file version from Drive,
 * the tab list from the Sheets API, and the tab itself from the export host.
 *
 * The two tabs return different CSV, so an assertion about one cannot pass
 * while the other was downloaded.
 */
function _makeDriveFetch(version = "12"): GoogleDriveFetch {
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
          sheets: [
            { properties: { sheetId: 0, title: "Cities", index: 0 } },
            { properties: { sheetId: 77, title: "Q3 data", index: 1 } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      url.includes("gid=77") ? SECOND_TAB_CSV : FIRST_TAB_CSV,
      { status: 200 },
    );
  };
}

describe("acquireGoogleSheetRelation", () => {
  it("downloads the stored tab and reads its CSV", async () => {
    const readCsv = vi.fn().mockResolvedValue("rows");

    await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: "Q3 data",
      readCsv,
      driveFetch: _makeDriveFetch(),
    });

    expect(readCsv).toHaveBeenCalledWith({ csvText: SECOND_TAB_CSV });
  });

  it("reads the first tab when the stored tab name is null", async () => {
    // `null` is what rows written before the tab column carry, and it means
    // the workbook's first tab. Resolving it to anything else would silently
    // re-point a dataset at another tab's rows.
    const readCsv = vi.fn().mockResolvedValue("rows");

    await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: null,
      readCsv,
      driveFetch: _makeDriveFetch(),
    });

    expect(readCsv).toHaveBeenCalledWith({ csvText: FIRST_TAB_CSV });
  });

  it("returns the reader's output beside the Drive version", async () => {
    const readCsv = vi.fn().mockResolvedValue({ parquetBlob: "blob" });

    const acquired = await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: "Cities",
      readCsv,
      driveFetch: _makeDriveFetch("31"),
    });

    expect(acquired).toEqual({
      relation: { parquetBlob: "blob" },
      sourceVersion: "31",
    });
  });

  it("names the tab when a rename means it is no longer there", async () => {
    // A tab is stored by title, and a title is renameable. Failing by name
    // beats returning some other tab's rows, and beats the binder error a
    // workbook-wide read raises from inside DuckDB.
    const readCsv = vi.fn();

    await expect(
      acquireGoogleSheetRelation({
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        sheetName: "Renamed away",
        readCsv,
        driveFetch: _makeDriveFetch(),
      }),
    ).rejects.toMatchObject({ code: "sheet-not-found" });
    expect(readCsv).not.toHaveBeenCalled();
  });

  it("does not read anything when Drive refuses the file", async () => {
    const readCsv = vi.fn();
    const driveFetch: GoogleDriveFetch = async () => {
      return new Response(JSON.stringify({ error: { errors: [{}] } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    };

    await expect(
      acquireGoogleSheetRelation({
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        sheetName: "Cities",
        readCsv,
        driveFetch,
      }),
    ).rejects.toBeInstanceOf(GoogleDriveError);
    expect(readCsv).not.toHaveBeenCalled();
  });
});
