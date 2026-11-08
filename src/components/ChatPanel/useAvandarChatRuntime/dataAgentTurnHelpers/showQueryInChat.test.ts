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

function _mockRun(data: Array<Record<string, unknown>>): void {
  runQueryMock.mockResolvedValue({
    columns: [{ name: "state", dataType: "varchar" }],
    data,
    numRows: data.length,
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
