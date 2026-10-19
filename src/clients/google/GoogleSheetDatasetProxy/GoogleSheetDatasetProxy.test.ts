import { describe, expect, it, vi } from "vitest";
import { GoogleDriveError } from "$/connectors/googleSheets/GoogleDriveClient/GoogleDriveError";
import { GoogleSheetDatasetProxy } from "@/clients/google/GoogleSheetDatasetProxy/GoogleSheetDatasetProxy";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return {
          auth: {
            getSession: async () => {
              return { data: { session: { access_token: "session-token" } } };
            },
          },
        };
      },
      getEdgeFunctionsURL: () => {
        return "https://edge.test/functions/v1";
      },
    },
  };
});

describe("GoogleSheetDatasetProxy.fetchCsv", () => {
  it("reads the dataset's route with the caller's session, never a Google token", async () => {
    const datasetFetch = vi.fn(async () => {
      return new Response("city\r\nNairobi\r\n", {
        status: 200,
        headers: { "Content-Type": "text/csv", "X-Ava-Source-Version": "42" },
      });
    });

    const acquired = await GoogleSheetDatasetProxy.fetchCsv({
      datasetId: DATASET_ID,
      datasetFetch,
    });

    expect(datasetFetch).toHaveBeenCalledWith(
      `https://edge.test/functions/v1/google-sheets/datasets/${DATASET_ID}/csv`,
      { headers: { Authorization: "Bearer session-token" } },
    );
    expect(acquired).toEqual({
      csvText: "city\r\nNairobi\r\n",
      sourceVersion: "42",
    });
  });

  it("rebuilds a classified failure as the Drive error the copy already handles", async () => {
    const datasetFetch = vi.fn(async () => {
      return Response.json(
        {
          error: {
            code: "sheet-not-found",
            message: "Google Drive request failed",
            reason: "Kenya",
          },
        },
        { status: 404 },
      );
    });

    const result = GoogleSheetDatasetProxy.fetchCsv({
      datasetId: DATASET_ID,
      datasetFetch,
    });

    await expect(result).rejects.toBeInstanceOf(GoogleDriveError);
    await expect(result).rejects.toMatchObject({
      code: "sheet-not-found",
      reason: "Kenya",
    });
  });

  it("fails without a Drive code when the caller may not see the dataset", async () => {
    const datasetFetch = vi.fn(async () => {
      return Response.json({ error: "No dataset found" }, { status: 403 });
    });

    const result = GoogleSheetDatasetProxy.fetchCsv({
      datasetId: DATASET_ID,
      datasetFetch,
    });

    await expect(result).rejects.not.toBeInstanceOf(GoogleDriveError);
    await expect(result).rejects.toThrow("No dataset found");
  });
});

describe("GoogleSheetDatasetProxy.fetchVersion", () => {
  it("reads the version from the dataset's version route", async () => {
    const datasetFetch = vi.fn(async () => {
      return Response.json({ sourceVersion: "77" });
    });

    const version = await GoogleSheetDatasetProxy.fetchVersion({
      datasetId: DATASET_ID,
      datasetFetch,
    });

    expect(datasetFetch).toHaveBeenCalledWith(
      `https://edge.test/functions/v1/google-sheets/datasets/${DATASET_ID}/version`,
      { headers: { Authorization: "Bearer session-token" } },
    );
    expect(version).toBe("77");
  });
});
