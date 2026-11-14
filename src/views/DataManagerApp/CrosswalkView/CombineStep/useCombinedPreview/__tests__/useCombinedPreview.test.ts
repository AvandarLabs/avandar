import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import {
  buildCombinedPreviewSql,
  useCombinedPreview,
} from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombinedPreview/useCombinedPreview";

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
      });
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "ready",
        result: {
          rows: [{ source_dataset: "Kings", case_id: undefined }],
          rowCount: 40,
        },
      });
    });
    expect(runQueryMock).toHaveBeenCalledTimes(2);
  });

  it("reads nothing while there is no SQL", () => {
    const { result } = renderHook(() => {
      return useCombinedPreview({ sql: undefined, columnNames: [] });
    });

    expect(result.current).toEqual({ status: "reading" });
    expect(runQueryMock).not.toHaveBeenCalled();
  });
});
