import { afterEach, describe, expect, it, vi } from "vitest";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { DataAgentDatasetCache } from "./DataAgentDatasetCache";
import {
  askConversationDataAgent,
  createExplorerShowQuery,
  loadDataAgentDatasets,
} from "./dataAgentTurnHelpers";
import type {
  DataAgentConversation,
  DataAgentTurnOptions,
} from "./dataAgentTurnHelpers";

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

describe("loadDataAgentDatasets", () => {
  const WORKSPACE_ID = "workspace-1" as DataAgentTurnOptions["workspaceId"];
  const DATASET = {
    id: "dataset-1",
    name: "cases.csv",
    columns: [{ name: "cases", dataType: "bigint" }],
  };

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("keeps what it loads online for later", async () => {
    vi.spyOn(DatasetClient, "getAllDatasetsWithColumns").mockResolvedValue([
      DATASET,
    ] as never);

    await loadDataAgentDatasets(WORKSPACE_ID);

    expect(DataAgentDatasetCache.read(WORKSPACE_ID)).toEqual([DATASET]);
  });

  it("answers from the kept copy when the server cannot be reached", async () => {
    DataAgentDatasetCache.write(WORKSPACE_ID, [DATASET]);
    vi.spyOn(DatasetClient, "getAllDatasetsWithColumns").mockRejectedValue(
      new Error("Failed to fetch"),
    );

    await expect(loadDataAgentDatasets(WORKSPACE_ID)).resolves.toEqual([
      DATASET,
    ]);
  });

  it("does not call the server while the browser is offline", async () => {
    DataAgentDatasetCache.write(WORKSPACE_ID, [DATASET]);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchDatasets = vi.spyOn(DatasetClient, "getAllDatasetsWithColumns");

    await expect(loadDataAgentDatasets(WORKSPACE_ID)).resolves.toEqual([
      DATASET,
    ]);
    expect(fetchDatasets).not.toHaveBeenCalled();
  });
});

describe("askConversationDataAgent", () => {
  function _fakeConversation(): DataAgentConversation & {
    asked: string[];
  } {
    const asked: string[] = [];
    const conversation = {
      asked,
      turnRef: { current: _createTurnOptions() },
      results: [],
      dataAgent: {
        ask: vi.fn(async (text: string) => {
          asked.push(text);
          conversation.results.push(
            AgentQueryResult.create({ sql: "SELECT 1", title: "t" }),
          );
          return { text: "Here it is." };
        }),
      },
    } as unknown as DataAgentConversation & { asked: string[] };
    return conversation;
  }

  function _turn(content: string): DataAgentTurnOptions {
    return {
      ..._createTurnOptions(),
      apiMessages: [{ role: "user", content }],
      chatPanelDispatch: { setPendingClarification: vi.fn() },
    } as unknown as DataAgentTurnOptions;
  }

  it("sends the page block first, then 'unchanged' on the same page", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map([["workspace-1:0", conversation]]);
    const pageBlock = "<current_page>\nPage: Map\n</current_page>";

    await askConversationDataAgent({
      conversations,
      turn: _turn("How many?"),
      pageBlock,
      createConversation: vi.fn(),
    });
    await askConversationDataAgent({
      conversations,
      turn: _turn("And deaths?"),
      pageBlock,
      createConversation: vi.fn(),
    });

    expect(conversation.asked[0]).toBe(`${pageBlock}\n\nHow many?`);
    expect(conversation.asked[1]).toContain(
      "Unchanged since the last message.",
    );
  });

  it("returns the reply with this turn's results as data parts", async () => {
    const conversation = _fakeConversation();
    conversation.results.push(
      AgentQueryResult.create({ sql: "SELECT 0", title: "old" }),
    );

    const reply = await askConversationDataAgent({
      conversations: new Map([["workspace-1:0", conversation]]),
      turn: _turn("How many?"),
      createConversation: vi.fn(),
    });

    expect(reply.content).toEqual([
      { type: "text", text: "Here it is." },
      AgentQueryResult.toDataPart(
        AgentQueryResult.create({ sql: "SELECT 1", title: "t" }),
      ),
    ]);
  });

  it("asks the conversation it creates on the first turn", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map<string, DataAgentConversation>();
    const createConversation = vi.fn(async () => {
      return conversation;
    });
    const turn = _turn("How many?");

    await askConversationDataAgent({ conversations, turn, createConversation });

    expect(createConversation).toHaveBeenCalledWith({ current: turn });
    expect(conversations.get("workspace-1:0")).toBe(conversation);
    expect(conversation.asked).toEqual(["How many?"]);
  });
});
