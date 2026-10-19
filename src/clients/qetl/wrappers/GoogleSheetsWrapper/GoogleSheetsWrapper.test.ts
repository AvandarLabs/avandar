/**
 * Tests that Google Sheets acquires a named tab as Parquet and describes it
 * from stored columns.
 */

import { describe, expect, it, vi } from "vitest";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
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

const { apiGetMock } = vi.hoisted(() => {
  return { apiGetMock: vi.fn() };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { get: apiGetMock } };
});

/** Answers the dataset's CSV route with one tab at version `version`. */
function _makeDatasetFetch(version: string) {
  return vi.fn(async (_url: string, _init: RequestInit) => {
    return new Response("city\r\ntab-77\r\n", {
      status: 200,
      headers: { "Content-Type": "text/csv", "X-Ava-Source-Version": version },
    });
  });
}

describe("GoogleSheetsWrapper", () => {
  it("acquires the dataset's tab through its edge route and reports the Drive version", async () => {
    const parquetBlob = new Blob(["sheet-parquet"]);
    const readCsv = vi.fn().mockResolvedValue({ parquetBlob });
    const datasetFetch = _makeDatasetFetch("42");
    const wrapper = createGoogleSheetsWrapper({ readCsv, datasetFetch });

    const acquired = await wrapper.acquire!(
      { ref: DATASET_REF, columns: "all" },
      CONTEXT,
    );

    expect(datasetFetch).toHaveBeenCalledWith(
      `https://edge.test/functions/v1/google-sheets/datasets/${DATASET_REF.id}/csv`,
      expect.anything(),
    );
    expect(readCsv).toHaveBeenCalledWith({
      datasetId: DATASET_REF.id,
      csvText: "city\r\ntab-77\r\n",
    });
    expect(acquired).toMatchObject({
      ref: DATASET_REF,
      parquetBlob,
      sourceVersion: "42",
    });
  });

  it("never asks for a Google token of its own, so a viewer who never connected Google can read the sheet", async () => {
    const wrapper = createGoogleSheetsWrapper({
      readCsv: vi.fn().mockResolvedValue({ parquetBlob: new Blob([]) }),
      datasetFetch: _makeDatasetFetch("42"),
    });

    await wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT);

    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it("marks acquired rows stale after the live-source max age", async () => {
    const wrapper = createGoogleSheetsWrapper({
      readCsv: async () => {
        return { parquetBlob: new Blob([]) };
      },
      datasetFetch: _makeDatasetFetch("42"),
    });

    const acquired = await wrapper.acquire!(
      { ref: DATASET_REF, columns: "all" },
      CONTEXT,
    );

    expect(acquired?.maxAgeMs).toBe(
      GlobalAppConfig.timing.liveRelationMaxAgeMs,
    );
  });

  it("reads freshness from the dataset's version route", async () => {
    const datasetFetch = vi.fn(async (_url: string, _init: RequestInit) => {
      return Response.json({ sourceVersion: "9" });
    });
    const wrapper = createGoogleSheetsWrapper({ datasetFetch });

    await expect(wrapper.readFreshness!(DATASET_REF, CONTEXT)).resolves.toBe(
      "9",
    );
    expect(datasetFetch).toHaveBeenCalledWith(
      `https://edge.test/functions/v1/google-sheets/datasets/${DATASET_REF.id}/version`,
      expect.anything(),
    );
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
