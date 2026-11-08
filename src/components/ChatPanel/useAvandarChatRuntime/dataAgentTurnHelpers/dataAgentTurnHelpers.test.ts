import { describe, expect, it, vi } from "vitest";
import { createExplorerShowQuery } from "./dataAgentTurnHelpers";
import type { DataAgentTurnOptions } from "./dataAgentTurnHelpers";

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/waitForAppliedSqlOutcome/waitForAppliedSqlOutcome",
  () => {
    return {
      waitForAppliedSqlOutcome: vi.fn().mockResolvedValue("rows"),
      readAppliedSqlResult: () => {
        return {
          result: {
            columns: [
              { name: "state", dataType: "varchar" },
              { name: "cases", dataType: "bigint" },
            ],
            data: [
              { state: "Ohio", cases: 3 },
              { state: "Utah", cases: 2 },
              { state: "Iowa", cases: 1 },
            ],
            numRows: 3,
          },
        };
      },
    };
  },
);

function _createTurnOptions(): DataAgentTurnOptions {
  return {
    apiMessages: [],
    workspaceId: "workspace-1" as DataAgentTurnOptions["workspaceId"],
    currentUser: undefined,
    chatGeneration: 0,
    parseSqlRef: {
      current: () => {
        throw new Error("no structured mapping");
      },
    },
    dataExplorerDispatch: {
      setRawSql: vi.fn(),
      setNlPrompt: vi.fn(),
      applySqlMapping: vi.fn(),
      setActiveVizType: vi.fn(),
    } as unknown as DataAgentTurnOptions["dataExplorerDispatch"],
    chatPanelDispatch: {} as DataAgentTurnOptions["chatPanelDispatch"],
  };
}

describe("createExplorerShowQuery", () => {
  it("returns the first rows, in column order, when a preview is asked for", async () => {
    const showQuery = createExplorerShowQuery(_createTurnOptions());

    const outcome = await showQuery({
      sql: "select 1",
      summary: "cases",
      previewRowCount: 2,
    });

    expect(outcome).toMatchObject({
      kind: "rows",
      rowCount: 3,
      previewRows: [
        ["Ohio", 3],
        ["Utah", 2],
      ],
    });
  });

  it("returns no rows when no preview is asked for", async () => {
    const showQuery = createExplorerShowQuery(_createTurnOptions());

    const outcome = await showQuery({ sql: "select 1", summary: "cases" });

    expect(outcome).not.toHaveProperty("previewRows");
  });
});
