import { afterEach, describe, expect, it, vi } from "vitest";
import { getOnScreenQueryResult } from "@/lib/agent/dataAgent/getOnScreenQueryResult/getOnScreenQueryResult";
import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";

const COLUMNS = [
  { name: "x", dataType: "double" },
  { name: "y", dataType: "double" },
] as const;

const CHAT_RESULT: AgentQueryResultData = {
  version: 1,
  sql: "select x, y from points",
  chartType: "table",
  title: "Points",
  display: "embed",
};

const QUERY_RESULT: QueryResult.T = {
  id: "00000000-0000-0000-0000-000000000001" as QueryResult.Id,
  columns: [
    { name: "x", dataType: "double" },
    { name: "y", dataType: "double" },
  ],
  data: [{ x: 1, y: 2 }],
  numRows: 1,
};

describe("getOnScreenQueryResult", () => {
  afterEach(() => {
    ExplorerPluginResultStore.clear();
    QueryHandleRegistry.clear();
  });

  it("uses the explorer result and does not call runQuery", async () => {
    ExplorerPluginResultStore.set({ columns: COLUMNS, rows: [{ x: 1, y: 2 }] });
    const runQuery = vi.fn();

    const result = await getOnScreenQueryResult({
      isDataExplorer: true,
      chatResults: [
        {
          version: 1,
          sql: "select 1",
          chartType: "table",
          title: "Earlier",
          display: "embed",
        },
      ],
      runQuery,
    });

    expect(result.kind).toBe("rows");
    expect(runQuery).not.toHaveBeenCalled();
  });

  it("does not use a chat result when the explorer has nothing", async () => {
    ExplorerPluginResultStore.clear();
    const runQuery = vi.fn();

    const result = await getOnScreenQueryResult({
      isDataExplorer: true,
      chatResults: [CHAT_RESULT],
      runQuery,
    });

    expect(result).toEqual({ kind: "none" });
    expect(runQuery).not.toHaveBeenCalled();
  });

  it("re-runs the last chat SQL off the explorer", async () => {
    const runQuery = vi.fn().mockResolvedValue(QUERY_RESULT);

    const result = await getOnScreenQueryResult({
      isDataExplorer: false,
      chatResults: [CHAT_RESULT],
      runQuery,
    });

    expect(runQuery).toHaveBeenCalledWith(CHAT_RESULT.sql);
    expect(result).toMatchObject({ kind: "rows", source: "chat" });
  });

  it("hides a query error that quotes a cell", async () => {
    const runQuery = vi
      .fn()
      .mockResolvedValue({ error: "could not convert 'Los Angeles'" });

    const result = await getOnScreenQueryResult({
      isDataExplorer: false,
      chatResults: [CHAT_RESULT],
      runQuery,
    });

    expect(result).toEqual({ kind: "none" });
    expect(JSON.stringify(result)).not.toContain("Los Angeles");
  });
});
