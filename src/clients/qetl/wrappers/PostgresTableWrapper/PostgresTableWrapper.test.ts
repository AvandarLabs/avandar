/**
 * Tests that Postgres acquires a named relation as Parquet through the
 * `external-datasets` edge function and describes it from stored columns.
 */

import { describe, expect, it, vi } from "vitest";
import { createPostgresTableWrapper } from "@/clients/qetl/wrappers/PostgresTableWrapper/PostgresTableWrapper";
import type { PostgresRowsFetch } from "@/clients/qetl/wrappers/PostgresTableWrapper/acquirePostgresTableRelation";
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
            getSession: vi.fn(async () => {
              return {
                data: { session: { access_token: "test-access-token" } },
              };
            }),
          },
        };
      },
      getEdgeFunctionsURL: () => {
        return "https://project.supabase.co/functions/v1";
      },
    },
  };
});

/** A fetch stub returning CSV text with the real route's content type. */
function _csvFetch(csvText: string): PostgresRowsFetch {
  return async () => {
    return new Response(csvText, {
      status: 200,
      headers: { "Content-Type": "text/csv" },
    });
  };
}

/** A fetch stub returning the edge function's `{error}` JSON shape. */
function _errorFetch(code: string, message: string): PostgresRowsFetch {
  return async () => {
    return new Response(JSON.stringify({ error: { code, message } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

describe("PostgresTableWrapper", () => {
  it("acquires the named relation as parquet", async () => {
    const parquetBlob = new Blob(["postgres-parquet"]);
    const readCsv = vi.fn().mockResolvedValue({ parquetBlob });
    const getPostgresTableSource = vi.fn().mockResolvedValue({
      connectionId: "connection-1",
      schemaName: "public",
      tableName: "customers",
    });
    const wrapper = createPostgresTableWrapper({
      getPostgresTableSource,
      readCsv,
      rowsFetch: _csvFetch("city\r\nNairobi\r\n"),
    });

    const acquired = await wrapper.acquire!(
      { ref: DATASET_REF, columns: "all" },
      CONTEXT,
    );

    expect(readCsv).toHaveBeenCalledWith({
      datasetId: DATASET_REF.id,
      csvText: "city\r\nNairobi\r\n",
    });
    expect(acquired).toEqual({
      ref: DATASET_REF,
      parquetBlob,
      sourceVersion: undefined,
    });
  });

  it("throws when the edge function returns an error response", async () => {
    const getPostgresTableSource = vi.fn().mockResolvedValue({
      connectionId: "connection-1",
      schemaName: "public",
      tableName: "customers",
    });
    const wrapper = createPostgresTableWrapper({
      getPostgresTableSource,
      readCsv: vi.fn(),
      rowsFetch: _errorFetch("unreachable", "could not connect to server"),
    });

    await expect(
      wrapper.acquire!({ ref: DATASET_REF, columns: "all" }, CONTEXT),
    ).rejects.toThrow("could not connect to server");
  });

  it("describes a relation from its stored columns", async () => {
    datasetColumnGetAllMock.mockResolvedValue([
      { name: "district", dataType: "varchar" },
    ]);
    const wrapper = createPostgresTableWrapper();

    await expect(wrapper.describe(DATASET_REF, CONTEXT)).resolves.toEqual({
      columns: [{ name: "district", dataType: "VARCHAR", isArray: false }],
    });
  });

  it("declares capabilities consistent with the methods it implements", () => {
    const wrapper = createPostgresTableWrapper();

    // `RelationRegistry`'s own registration check throws when a wrapper
    // declares `predicatePushdown`/`wholeRelationAcquirable` that its methods
    // don't back up, so these two are the capability fields with a real
    // behavioral consequence. The rest of the record's shape is already
    // guaranteed by its `satisfies RelationCapabilities` in the source.
    expect(wrapper.capabilities.predicatePushdown).toBe("none");
    expect(wrapper.pushDown).toBeUndefined();
    expect(wrapper.capabilities.wholeRelationAcquirable).toBe("yes");
    expect(wrapper.acquire).toBeDefined();
  });

  it("has no readFreshness, matching the 'none' freshness signal", () => {
    const wrapper = createPostgresTableWrapper();

    expect(wrapper.readFreshness).toBeUndefined();
  });
});
