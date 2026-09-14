/**
 * Tests that Google Sheets acquires a named tab as Parquet and describes it
 * from stored columns.
 */

import { describe, expect, it, vi } from "vitest";
import { createGoogleSheetsWrapper } from "@/clients/qetl/wrappers/GoogleSheetsWrapper/GoogleSheetsWrapper";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ILogger } from "@avandar/logger";

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

const TAB_LIST_BODY = JSON.stringify({
  sheets: [
    { properties: { sheetId: 0, title: "Colombia", index: 0 } },
    { properties: { sheetId: 77, title: "Kenya", index: 1 } },
  ],
});

/** Answers the version read, the tab list, and the per-tab CSV download. */
function _driveFetch(version: string) {
  return async (url: string): Promise<Response> => {
    if (url.includes("fields=version")) {
      return new Response(JSON.stringify({ version }), { status: 200 });
    }
    if (url.includes("sheets.googleapis.com")) {
      return new Response(TAB_LIST_BODY, { status: 200 });
    }
    const gid = new URL(url).searchParams.get("gid") ?? "0";
    return new Response(`city\r\ntab-${gid}\r\n`, { status: 200 });
  };
}

describe("GoogleSheetsWrapper", () => {
  it("acquires the named tab as parquet and reports the Drive version", async () => {
    const parquetBlob = new Blob(["sheet-parquet"]);
    const readCsv = vi.fn().mockResolvedValue({ parquetBlob });
    const getSheetSource = vi.fn().mockResolvedValue({
      googleDocumentId: "1sheetFileId",
      sheetName: "Kenya",
      googleAccountId: "google-account-1",
    });
    const getAccessToken = vi.fn().mockResolvedValue("ya29.test-token");
    const wrapper = createGoogleSheetsWrapper({
      getSheetSource,
      getAccessToken,
      readCsv,
      driveFetch: _driveFetch("42"),
    });

    const acquired = await wrapper.acquire!(
      { ref: DATASET_REF, columns: "all" },
      CONTEXT,
    );

    // The stored tab's gid, not the first tab's: the CSV names the gid it came
    // from, so a download that ignored the tab cannot satisfy this.
    expect(readCsv).toHaveBeenCalledWith({
      datasetId: DATASET_REF.id,
      csvText: "city\r\ntab-77\r\n",
    });
    expect(acquired).toEqual({
      ref: DATASET_REF,
      parquetBlob,
      sourceVersion: "42",
    });
  });

  it("reads the first tab when the stored tab is null", async () => {
    const readCsv = vi.fn().mockResolvedValue({ parquetBlob: new Blob([]) });
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
      readCsv,
      driveFetch: _driveFetch("1"),
    });

    await wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT);

    expect(readCsv).toHaveBeenCalledWith({
      datasetId: DATASET_REF.id,
      csvText: "city\r\ntab-0\r\n",
    });
  });

  it("describes a sheet from its stored columns", async () => {
    datasetColumnGetAllMock.mockResolvedValue([
      { name: "district", dataType: "varchar" },
    ]);
    const wrapper = createGoogleSheetsWrapper();

    await expect(wrapper.describe(DATASET_REF, CONTEXT)).resolves.toEqual({
      columns: [{ name: "district", dataType: "VARCHAR", isArray: false }],
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
