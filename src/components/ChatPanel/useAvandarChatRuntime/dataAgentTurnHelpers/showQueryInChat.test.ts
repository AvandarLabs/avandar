import { afterEach, describe, expect, it, vi } from "vitest";
import { showQueryInChat } from "./showQueryInChat";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const WORKSPACE_ID = "workspace-1" as never;

function _mockRun(
  data: Array<Record<string, unknown>>,
  numRows = data.length,
): void {
  runQueryMock.mockResolvedValue({
    columns: [{ name: "state", dataType: "varchar" }],
    data,
    numRows,
  });
}

afterEach(() => {
  runQueryMock.mockReset();
});

describe("showQueryInChat", () => {
  it("adds a result for rows and reports only their shape", async () => {
    _mockRun([{ state: "Ohio" }, { state: "Utah" }]);
    const results: AgentQueryResultData[] = [];

    const outcome = await showQueryInChat({
      workspaceId: WORKSPACE_ID,
      title: "Which states?",
      results,
      request: { sql: "SELECT 1", summary: "s", chart: "bar" },
    });

    expect(outcome).toEqual({
      kind: "rows",
      columns: [{ name: "state", type: "varchar" }],
      rowCount: 2,
    });
    expect(results).toEqual([
      expect.objectContaining({
        sql: "SELECT 1",
        chartType: "bar",
        title: "Which states?",
      }),
    ]);
  });

  it("adds nothing for an empty or all-blank result", async () => {
    _mockRun([{ state: null }]);
    const results: AgentQueryResultData[] = [];

    const outcome = await showQueryInChat({
      workspaceId: WORKSPACE_ID,
      title: "t",
      results,
      request: { sql: "SELECT 1", summary: "s" },
    });

    expect(outcome.kind).toBe("empty");
    expect(results).toEqual([]);
  });

  it("counts rows the result did not return as rows, as the explorer does", async () => {
    _mockRun([], 2);
    const results: AgentQueryResultData[] = [];

    const outcome = await showQueryInChat({
      workspaceId: WORKSPACE_ID,
      title: "t",
      results,
      request: { sql: "SELECT 1", summary: "s" },
    });

    expect(outcome.kind).toBe("rows");
    expect(results).toHaveLength(1);
  });

  it("returns the first rows when a preview is asked for", async () => {
    _mockRun([{ state: "Ohio" }, { state: "Utah" }, { state: "Iowa" }]);

    const outcome = await showQueryInChat({
      workspaceId: WORKSPACE_ID,
      title: "t",
      results: [],
      request: { sql: "SELECT 1", summary: "s", previewRowCount: 2 },
    });

    expect(outcome).toMatchObject({ previewRows: [["Ohio"], ["Utah"]] });
  });

  it("names the result by its summary when the question is blank", async () => {
    _mockRun([{ state: "Ohio" }]);
    const results: AgentQueryResultData[] = [];

    await showQueryInChat({
      workspaceId: WORKSPACE_ID,
      title: "  ",
      results,
      request: { sql: "SELECT 1", summary: " Cases by state " },
    });

    expect(results).toEqual([
      expect.objectContaining({ title: "Cases by state" }),
    ]);
  });

  it("adds no result when the question and summary are both blank", async () => {
    _mockRun([{ state: "Ohio" }]);
    const results: AgentQueryResultData[] = [];

    const outcome = await showQueryInChat({
      workspaceId: WORKSPACE_ID,
      title: "",
      results,
      request: { sql: "SELECT 1", summary: " " },
    });

    expect(outcome.kind).toBe("rows");
    expect(results).toEqual([]);
  });

  it("reports a failed query with its message", async () => {
    runQueryMock.mockRejectedValue(
      new Error('Binder Error: column "x" not found'),
    );

    const outcome = await showQueryInChat({
      workspaceId: WORKSPACE_ID,
      title: "t",
      results: [],
      request: { sql: "SELECT x", summary: "s" },
    });

    expect(outcome).toEqual({
      kind: "failed",
      error: 'Binder Error: column "x" not found',
    });
  });
});
