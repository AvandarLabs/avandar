/**
 * Tests that Google Sheets acquires a named tab as Parquet and describes it
 * from stored columns.
 */

import { describe, expect, it, vi } from "vitest";
import { createGoogleSheetsWrapper } from "@/clients/qetl/wrappers/GoogleSheetsWrapper/GoogleSheetsWrapper";
import type { ILogger } from "@avandar/logger";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { Workspace } from "$/models/Workspace/Workspace";

const DATASET_REF = {
  kind: "dataset",
  id: "44444444-4444-4444-8444-444444444444" as Dataset.Id,
} as const satisfies RelationRef.T;

const CONTEXT = {
  workspaceId: "99999999-9999-4999-8999-999999999999" as Workspace.Id,
  logger: console as unknown as ILogger,
};

const { datasetColumnGetAllMock } = vi.hoisted(() => {
  return { datasetColumnGetAllMock: vi.fn() };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      withCache: () => {
        return {
          withEnsureQueryData: () => {
            return { getAll: datasetColumnGetAllMock };
          },
        };
      },
    },
  };
});

describe("GoogleSheetsWrapper", () => {
  it("acquires the named tab as parquet and reports the Drive version", async () => {
    const parquetBlob = new Blob(["sheet-parquet"]);
    const readXlsx = vi.fn().mockResolvedValue({ parquetBlob });
    const getSheetSource = vi.fn().mockResolvedValue({
      googleDocumentId: "1sheetFileId",
      sheetName: "Kenya",
      googleAccountId: "google-account-1",
    });
    const getAccessToken = vi.fn().mockResolvedValue("ya29.test-token");
    const driveFetch = vi.fn(async (url: string) => {
      if (url.includes("fields=version")) {
        return new Response(JSON.stringify({ version: "42" }), { status: 200 });
      }
      return new Response(Uint8Array.from([0x50, 0x4b]), { status: 200 });
    });
    const wrapper = createGoogleSheetsWrapper({
      getSheetSource,
      getAccessToken,
      readXlsx,
      driveFetch,
    });

    const acquired = await wrapper.acquire!(
      { ref: DATASET_REF, columns: "all" },
      CONTEXT,
    );

    expect(readXlsx).toHaveBeenCalledWith(
      expect.objectContaining({ sheet: "Kenya" }),
    );
    expect(acquired).toEqual({
      ref: DATASET_REF,
      parquetBlob,
      sourceVersion: "42",
    });
  });

  it("passes a null stored tab through so the reader uses the first sheet", async () => {
    const readXlsx = vi.fn().mockResolvedValue({ parquetBlob: new Blob([]) });
    const wrapper = createGoogleSheetsWrapper({
      getSheetSource: async () => {
        return {
          googleDocumentId: "1sheetFileId",
          sheetName: null,
          googleAccountId: "google-account-1",
        };
      },
      getAccessToken: async () => {
        return "ya29.test-token";
      },
      readXlsx,
      driveFetch: async (url) => {
        if (url.includes("fields=version")) {
          return new Response(JSON.stringify({ version: "1" }), {
            status: 200,
          });
        }
        return new Response(Uint8Array.from([0x50, 0x4b]), { status: 200 });
      },
    });

    await wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT);

    expect(readXlsx).toHaveBeenCalledWith(
      expect.objectContaining({ sheet: undefined }),
    );
  });

  it("describes a sheet from its stored columns", async () => {
    datasetColumnGetAllMock.mockResolvedValue([
      { name: "district", dataType: "varchar" },
    ]);
    const wrapper = createGoogleSheetsWrapper();

    await expect(wrapper.describe(DATASET_REF, CONTEXT)).resolves.toEqual({
      columns: [
        { name: "district", dataType: "VARCHAR", isArray: false },
      ],
    });
  });

  it("keeps declaring the combination that makes partial acquisition unsound", () => {
    const { capabilities } = createGoogleSheetsWrapper();

    expect(capabilities.predicatePushdown).toBe("none");
    expect(capabilities.rowIdentity).toBe("none");
    expect(capabilities.multiCallAtomicity).toBe(false);
    expect(capabilities.acquisitionUnit).toEqual({ kind: "whole-relation" });
    expect(capabilities.quotaScope).toEqual({
      kind: "per-host",
      host: "www.googleapis.com",
    });
    expect(capabilities.grantedScope).toEqual([
      "openid",
      "email",
      "https://www.googleapis.com/auth/drive.file",
    ]);
  });
});
