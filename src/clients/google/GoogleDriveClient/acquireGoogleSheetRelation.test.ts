import { describe, expect, it, vi } from "vitest";
import { GoogleDriveError } from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveError";
import { acquireGoogleSheetRelation } from "@/clients/google/GoogleDriveClient/acquireGoogleSheetRelation";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { EdgeFunctionFetch } from "@/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute";

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const TAB_CSV = "county,residents\r\nNairobi,4400000\r\n";

vi.mock("$/db/supabase/AvaSupabase", async () => {
  return (
    await import("@/test-utils/createAvaSupabaseSessionMock")
  ).createAvaSupabaseSessionMock();
});

/** Answers the dataset's CSV route with one tab at version `version`. */
function _makeDatasetFetch(version = "12"): EdgeFunctionFetch {
  return async () => {
    return new Response(TAB_CSV, {
      status: 200,
      headers: { "Content-Type": "text/csv", "X-Ava-Source-Version": version },
    });
  };
}

describe("acquireGoogleSheetRelation", () => {
  it("reads the CSV the dataset's route returns", async () => {
    const readCsv = vi.fn().mockResolvedValue("rows");

    await acquireGoogleSheetRelation({
      datasetId: DATASET_ID,
      readCsv,
      datasetFetch: _makeDatasetFetch(),
    });

    expect(readCsv).toHaveBeenCalledWith({ csvText: TAB_CSV });
  });

  it("returns the reader's output beside the Drive version", async () => {
    const readCsv = vi.fn().mockResolvedValue({ parquetBlob: "blob" });

    const acquired = await acquireGoogleSheetRelation({
      datasetId: DATASET_ID,
      readCsv,
      datasetFetch: _makeDatasetFetch("31"),
    });

    expect(acquired).toEqual({
      relation: { parquetBlob: "blob" },
      sourceVersion: "31",
    });
  });

  it("does not read anything when Google refuses the sheet", async () => {
    const readCsv = vi.fn();
    const datasetFetch: EdgeFunctionFetch = async () => {
      return Response.json(
        { error: { code: "file-not-accessible", message: "gone" } },
        { status: 404 },
      );
    };

    await expect(
      acquireGoogleSheetRelation({
        datasetId: DATASET_ID,
        readCsv,
        datasetFetch,
      }),
    ).rejects.toBeInstanceOf(GoogleDriveError);
    expect(readCsv).not.toHaveBeenCalled();
  });
});
