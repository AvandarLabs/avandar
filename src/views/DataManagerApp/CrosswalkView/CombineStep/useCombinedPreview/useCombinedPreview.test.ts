import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import {
  buildCombinedPreviewSql,
  useCombinedPreview,
} from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombinedPreview/useCombinedPreview";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});

const KINGS = "d0000000-0000-4000-8000-000000000001" as Dataset.Id;
const QUEENS = "d0000000-0000-4000-8000-000000000002" as Dataset.Id;
const SQL = `SELECT 'a' AS "source_dataset", 1 AS "case_id"`;

describe("buildCombinedPreviewSql", () => {
  it("reads the first 20 rows as text, and counts every row", () => {
    expect(
      buildCombinedPreviewSql({
        sql: SQL,
        columnNames: ["source_dataset", 'case "id"'],
      }),
    ).toEqual({
      rowsSql: `SELECT CAST("source_dataset" AS VARCHAR) AS "source_dataset", CAST("case ""id""" AS VARCHAR) AS "case ""id""" FROM (${SQL}) LIMIT 20`,
      countSql: `SELECT count(*) AS "rows" FROM (${SQL})`,
    });
  });
});

describe("useCombinedPreview", () => {
  beforeEach(() => {
    runQueryMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the rows, then the row count", async () => {
    runQueryMock
      .mockResolvedValueOnce({
        data: [{ source_dataset: "Kings", case_id: null }],
      })
      .mockResolvedValueOnce({ data: [{ rows: 40n }] });
    const { result } = renderHook(() => {
      return useCombinedPreview({
        sql: SQL,
        columnNames: ["source_dataset", "case_id"],
        datasetIds: [],
      });
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "ready",
        result: {
          rows: [{ source_dataset: "Kings", case_id: undefined }],
          rowCount: 40,
        },
        progress: { readCount: 0, totalCount: 0 },
      });
    });
    expect(runQueryMock).toHaveBeenCalledTimes(2);
  });

  it("reads nothing while there is no SQL", () => {
    const { result } = renderHook(() => {
      return useCombinedPreview({
        sql: undefined,
        columnNames: [],
        datasetIds: [],
      });
    });

    expect(result.current).toEqual({
      status: "reading",
      progress: { readCount: 0, totalCount: 0 },
    });
    expect(runQueryMock).not.toHaveBeenCalled();
  });

  it("counts the stacked datasets each query reports while it reads", async () => {
    runQueryMock.mockImplementation(
      (params: { onRelationFetched?: (datasetId: Dataset.Id) => void }) => {
        params.onRelationFetched?.(KINGS);
        // Still reading Queens: the query never settles in this test.
        return new Promise(() => {});
      },
    );

    const { result } = renderHook(() => {
      return useCombinedPreview({
        sql: "SELECT 1",
        columnNames: ["case_id"],
        datasetIds: [KINGS, QUEENS],
      });
    });

    await waitFor(() => {
      expect(result.current.progress).toEqual({ readCount: 1, totalCount: 2 });
    });
    expect(result.current.status).toBe("reading");
    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ onRelationFetched: expect.any(Function) }),
    );
  });

  it("records a measure of the run once both queries are done", async () => {
    const measureSpy = vi.fn();
    vi.stubGlobal("performance", {
      now: () => {
        return Date.now();
      },
      mark: vi.fn(),
      measure: measureSpy,
      clearMarks: vi.fn(),
    });
    runQueryMock.mockImplementation(
      (params: {
        onRelationFetched?: (datasetId: Dataset.Id) => void;
        rawSql: string;
      }) => {
        params.onRelationFetched?.(KINGS);
        params.onRelationFetched?.(QUEENS);
        return Promise.resolve({
          data: params.rawSql.includes("count(*)") ? [{ rows: 2 }] : [],
        });
      },
    );

    renderHook(() => {
      return useCombinedPreview({
        sql: "SELECT 1",
        columnNames: ["case_id"],
        datasetIds: [KINGS, QUEENS],
      });
    });

    await waitFor(() => {
      expect(measureSpy).toHaveBeenCalledWith(
        "crosswalks:combined-preview",
        expect.objectContaining({
          detail: expect.objectContaining({ datasetCount: 2, readCount: 2 }),
        }),
      );
    });
  });
});
