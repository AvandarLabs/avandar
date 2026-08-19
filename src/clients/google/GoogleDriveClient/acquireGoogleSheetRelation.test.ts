import { describe, expect, it, vi } from "vitest";
import { acquireGoogleSheetRelation } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";
import { GoogleDriveError } from "@/clients/google/GoogleDriveClient/GoogleDriveError";
import type { GoogleDriveFetch } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";

const FILE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
const ACCESS_TOKEN = "ya29.test-access-token";
const WORKBOOK_BYTES = Uint8Array.from([
  0x50, 0x4b, 0x03, 0x04,
]) as Uint8Array<ArrayBuffer>;

function _makeDriveFetch(version = "12"): GoogleDriveFetch {
  return async (url) => {
    if (url.includes("fields=version")) {
      return new Response(JSON.stringify({ version }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(WORKBOOK_BYTES, { status: 200 });
  };
}

describe("acquireGoogleSheetRelation", () => {
  it("passes the stored tab name through to the reader", async () => {
    const readXlsx = vi.fn().mockResolvedValue("rows");

    await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: "Q3 data",
      readXlsx,
      driveFetch: _makeDriveFetch(),
    });

    expect(readXlsx).toHaveBeenCalledWith(
      expect.objectContaining({ sheet: "Q3 data" }),
    );
  });

  it("turns a null tab name into read_xlsx's own default", async () => {
    // `undefined`, not `null` and not the empty string: `read_xlsx` reads the
    // first sheet only when the argument is absent, and `sheet = ''` would
    // instead look for a tab literally named "".
    const readXlsx = vi.fn().mockResolvedValue("rows");

    await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: null,
      readXlsx,
      driveFetch: _makeDriveFetch(),
    });

    expect(readXlsx).toHaveBeenCalledWith(
      expect.objectContaining({ sheet: undefined }),
    );
  });

  it("hands the reader the exported bytes unchanged", async () => {
    const readXlsx = vi.fn().mockResolvedValue("rows");

    await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: null,
      readXlsx,
      driveFetch: _makeDriveFetch(),
    });

    const passedBytes = readXlsx.mock.calls[0]![0].xlsxBytes as Uint8Array;
    expect(Array.from(passedBytes)).toEqual(Array.from(WORKBOOK_BYTES));
  });

  it("returns the reader's output beside the Drive version", async () => {
    const readXlsx = vi.fn().mockResolvedValue({ parquetBlob: "blob" });

    const result = await acquireGoogleSheetRelation({
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      sheetName: null,
      readXlsx,
      driveFetch: _makeDriveFetch("99"),
    });

    expect(result).toEqual({
      relation: { parquetBlob: "blob" },
      sourceVersion: "99",
    });
  });

  it("does not read the workbook when Drive refuses the export", async () => {
    const readXlsx = vi.fn().mockResolvedValue("rows");
    const driveFetch: GoogleDriveFetch = async (url) => {
      if (url.includes("fields=version")) {
        return new Response(JSON.stringify({ version: "12" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          error: { errors: [{ reason: "exportSizeLimitExceeded" }] },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    };

    await expect(
      acquireGoogleSheetRelation({
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        sheetName: null,
        readXlsx,
        driveFetch,
      }),
    ).rejects.toBeInstanceOf(GoogleDriveError);

    // The positive controls above prove the reader is reachable, so this is not
    // passing because `readXlsx` is never called at all.
    expect(readXlsx).not.toHaveBeenCalled();
  });
});
