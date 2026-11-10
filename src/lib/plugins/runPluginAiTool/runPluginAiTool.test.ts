import { PluginError } from "@avandar/plugin-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import { runPluginAiTool } from "@/lib/plugins/runPluginAiTool/runPluginAiTool";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AgentQueryResultData } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import type { QueryHandle } from "@avandar/plugin-sdk";

const DECLARATION: PluginAiToolDeclaration = {
  pluginId: "avandar.test",
  permissions: ["data:read"],
  name: "fit_line",
  description: "Fits a line.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: [],
    properties: {},
  },
};

const COLUMNS = [
  { name: "x", dataType: "double" },
  { name: "y", dataType: "double" },
] as const;

const EXPLORER_ROWS = [{ x: 1, y: 2 }];

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
  data: [{ x: 3, y: 4 }],
  numRows: 1,
};

const BASE = {
  declaration: DECLARATION,
  args: {},
  isDataExplorer: false,
  chatResults: [],
  runQuery: vi.fn(),
  invoke: vi.fn(),
};

const ROWS_READY = { ...BASE, isDataExplorer: true };

describe("runPluginAiTool", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    ExplorerPluginResultStore.clear();
    QueryHandleRegistry.clear();
  });

  it("returns the no-result message and does not invoke", async () => {
    const invoke = vi.fn();
    const result = await runPluginAiTool({
      ...BASE,
      isDataExplorer: true,
      chatResults: [],
      invoke,
    });
    expect(result).toEqual({ text: "No result is on screen.", isError: true });
    expect(invoke).not.toHaveBeenCalled();
  });

  describe("with an explorer result", () => {
    beforeEach(() => {
      ExplorerPluginResultStore.set({ columns: COLUMNS, rows: EXPLORER_ROWS });
    });

    it("forwards an InvalidToolInput message", async () => {
      const invoke = vi
        .fn()
        .mockRejectedValue(
          new PluginError("InvalidToolInput", "X and Y are the same column."),
        );
      const result = await runPluginAiTool({ ...ROWS_READY, invoke });
      expect(result).toEqual({
        text: "X and Y are the same column.",
        isError: true,
      });
    });

    it("replaces any other throw with The tool failed", async () => {
      const invoke = vi
        .fn()
        .mockRejectedValue(new PluginError("InvalidHandle", "row secret"));
      const result = await runPluginAiTool({ ...ROWS_READY, invoke });
      expect(result.text).toBe("The tool failed.");
      expect(result.text).not.toContain("secret");
    });

    it("forwards a JSON object under the cap, including an extra rows key", async () => {
      const payload = { slope: 2, rows: ["secret"] };
      const invoke = vi.fn().mockResolvedValue(payload);
      const result = await runPluginAiTool({ ...ROWS_READY, invoke });
      expect(result).toEqual({ text: JSON.stringify(payload), isError: false });
    });

    it("replaces an array and an oversized object", async () => {
      const arrayResult = await runPluginAiTool({
        ...ROWS_READY,
        invoke: vi.fn().mockResolvedValue([{ secret: 1 }]),
      });
      expect(arrayResult).toEqual({ text: "The tool failed.", isError: true });
      const oversized = await runPluginAiTool({
        ...ROWS_READY,
        invoke: vi.fn().mockResolvedValue({ blob: "x".repeat(2048) }),
      });
      expect(oversized.text).toBe("The tool result was too large.");
      expect(oversized.text).not.toContain("xxx");
    });
  });

  it("releases a chat handle and leaves the explorer handle", async () => {
    ExplorerPluginResultStore.set({ columns: COLUMNS, rows: EXPLORER_ROWS });
    const explorerHandle = QueryHandleRegistry.getOrCreate(EXPLORER_ROWS);
    const getOrCreateSpy = vi.spyOn(QueryHandleRegistry, "getOrCreate");

    const result = await runPluginAiTool({
      ...BASE,
      isDataExplorer: false,
      chatResults: [CHAT_RESULT],
      runQuery: vi.fn().mockResolvedValue(QUERY_RESULT),
      invoke: vi.fn().mockResolvedValue({ slope: 1 }),
    });

    expect(result.isError).toBe(false);
    expect(getOrCreateSpy).toHaveBeenCalledTimes(1);
    const chatHandle = getOrCreateSpy.mock.results[0]?.value as QueryHandle;
    expect(QueryHandleRegistry.getRows(chatHandle)).toBeUndefined();
    expect(QueryHandleRegistry.getRows(explorerHandle)).toBe(EXPLORER_ROWS);
  });
});
