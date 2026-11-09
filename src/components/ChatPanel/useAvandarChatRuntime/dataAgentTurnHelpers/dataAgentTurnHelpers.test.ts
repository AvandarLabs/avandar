import { afterEach, describe, expect, it, vi } from "vitest";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { DataAgentDatasetCache } from "./DataAgentDatasetCache";
import {
  askConversationDataAgent,
  createExplorerShowQuery,
  loadDataAgentDatasets,
} from "./dataAgentTurnHelpers";
import type {
  DataAgentConversation,
  DataAgentTurnOptions,
} from "./dataAgentConversation.types";

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
  type FakeConversation = DataAgentConversation & { asked: string[] };

  const PAGE_BLOCK = "<current_page>\nPage: Map\n</current_page>";

  function _fakeConversation(
    ask?: (text: string) => Promise<{ text: string }>,
  ): FakeConversation {
    const asked: string[] = [];
    const conversation = {
      asked,
      turnRef: { current: _createTurnOptions() },
      results: [],
      datasets: [],
      dataAgent: {
        agent: { abort: vi.fn() },
        ask: vi.fn(async (text: string) => {
          asked.push(text);
          if (ask) {
            return await ask(text);
          }
          conversation.results.push(
            AgentQueryResult.create({ sql: "SELECT 1", title: "t" }),
          );
          return { text: "Here it is." };
        }),
      },
    } as unknown as FakeConversation;
    return conversation;
  }

  function _turn(
    content: string | readonly string[],
    chatGeneration = 0,
  ): DataAgentTurnOptions {
    const contents = typeof content === "string" ? [content] : content;
    return {
      ..._createTurnOptions(),
      chatGeneration,
      apiMessages: contents.map((text, index) => {
        return { role: index % 2 === 0 ? "user" : "assistant", content: text };
      }),
      chatPanelDispatch: { setPendingClarification: vi.fn() },
    } as unknown as DataAgentTurnOptions;
  }

  function _ask(
    conversations: Map<string, DataAgentConversation>,
    turn: DataAgentTurnOptions,
    pageBlock?: string,
  ) {
    return askConversationDataAgent({
      conversations,
      turn,
      buildPageBlock: () => {
        return pageBlock;
      },
      createConversation: vi.fn(),
    });
  }

  it("sends the page block first, then 'unchanged' on the same page", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map([["workspace-1:0", conversation]]);

    await _ask(conversations, _turn("How many?"), PAGE_BLOCK);
    await _ask(conversations, _turn("And deaths?"), PAGE_BLOCK);

    expect(conversation.asked[0]).toBe(`${PAGE_BLOCK}\n\nHow many?`);
    expect(conversation.asked[1]).toContain(
      "Unchanged since the last message.",
    );
  });

  it("sends the full block again when the page changes", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map([["workspace-1:0", conversation]]);
    const dashboardBlock = "<current_page>\nPage: Dashboard\n</current_page>";

    await _ask(conversations, _turn("How many?"), PAGE_BLOCK);
    await _ask(conversations, _turn("And here?"), dashboardBlock);

    expect(conversation.asked[1]).toBe(`${dashboardBlock}\n\nAnd here?`);
  });

  it("resends a block the agent failed to answer", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map([["workspace-1:0", conversation]]);
    const dashboardBlock = "<current_page>\nPage: Dashboard\n</current_page>";
    await _ask(conversations, _turn("How many?"), PAGE_BLOCK);
    vi.mocked(conversation.dataAgent.ask).mockRejectedValueOnce(
      new Error("model down"),
    );

    await expect(
      _ask(conversations, _turn("And here?"), dashboardBlock),
    ).rejects.toThrow("model down");
    await _ask(conversations, _turn("And here?"), dashboardBlock);

    expect(conversation.lastPageBlock).toBe(dashboardBlock);
    expect(conversation.asked.at(-1)).toBe(`${dashboardBlock}\n\nAnd here?`);
  });

  it("clears the previous turn's question card", async () => {
    const turn = _turn("How many?");

    await _ask(new Map([["workspace-1:0", _fakeConversation()]]), turn);

    expect(turn.chatPanelDispatch.setPendingClarification).toHaveBeenCalledWith(
      undefined,
    );
  });

  it("returns the reply with this turn's results as data parts", async () => {
    const conversation = _fakeConversation();
    conversation.results.push(
      AgentQueryResult.create({ sql: "SELECT 0", title: "old" }),
    );

    const reply = await _ask(
      new Map([["workspace-1:0", conversation]]),
      _turn("How many?"),
    );

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

  it("starts a new agent with the page block, then a recap", async () => {
    const conversation = _fakeConversation();

    await askConversationDataAgent({
      conversations: new Map(),
      turn: _turn(["How many?", "42.", "And deaths?"]),
      buildPageBlock: () => {
        return PAGE_BLOCK;
      },
      createConversation: async () => {
        return conversation;
      },
    });

    expect(conversation.asked[0]).toBe(
      `${PAGE_BLOCK}\n\nEarlier in this conversation:\n` +
        "User: How many?\nAssistant: 42.\n\nAnd deaths?",
    );
  });

  it("leaves a case's id out of the recap", async () => {
    const individualId = "33333333-3333-4333-8333-333333333333";
    const caseView = ChatViewEvent.format({
      app: "other",
      route: `/acme/individual-manager/c1/${individualId}`,
    });
    const conversation = _fakeConversation();

    await askConversationDataAgent({
      conversations: new Map(),
      turn: _turn([caseView, "42.", "And deaths?"]),
      buildPageBlock: () => {
        return PAGE_BLOCK;
      },
      createConversation: async () => {
        return conversation;
      },
    });

    expect(conversation.asked[0]).toContain("individual-manager/c1/<case>");
    expect(conversation.asked[0]).not.toContain(individualId);
  });

  it("builds the page block from the conversation it asks", async () => {
    const conversation = _fakeConversation();
    const buildPageBlock = vi.fn(() => {
      return PAGE_BLOCK;
    });

    await askConversationDataAgent({
      conversations: new Map(),
      turn: _turn("How many?"),
      buildPageBlock,
      createConversation: async () => {
        return conversation;
      },
    });

    expect(buildPageBlock).toHaveBeenCalledWith(conversation);
    expect(conversation.asked[0]).toBe(`${PAGE_BLOCK}\n\nHow many?`);
  });

  it("drops and stops the workspace's older chats when a new chat starts", async () => {
    const olderChat = _fakeConversation();
    const conversations = new Map<string, DataAgentConversation>([
      ["workspace-1:0", olderChat],
      ["workspace-2:0", _fakeConversation()],
    ]);
    const conversation = _fakeConversation();

    await askConversationDataAgent({
      conversations,
      turn: _turn("How many?", 1),
      createConversation: async () => {
        return conversation;
      },
    });

    expect([...conversations.keys()]).toEqual([
      "workspace-2:0",
      "workspace-1:1",
    ]);
    expect(olderChat.dataAgent.agent.abort).toHaveBeenCalledTimes(1);
  });

  it("keeps a stopped turn's late results out of the next turn", async () => {
    let firstTurnResults: DataAgentConversation["results"] = [];
    let finishFirstRun: (() => void) | undefined;
    const conversation = _fakeConversation(async (text) => {
      if (text === "First?") {
        firstTurnResults = conversation.results;
        await new Promise<void>((resolve) => {
          finishFirstRun = resolve;
        });
        return { text: "Stopped." };
      }
      // A query the stopped run started finishes during this turn.
      firstTurnResults.push(
        AgentQueryResult.create({ sql: "SELECT 1", title: "late" }),
      );
      conversation.results.push(
        AgentQueryResult.create({ sql: "SELECT 2", title: "second" }),
      );
      return { text: "Second." };
    });
    vi.mocked(conversation.dataAgent.agent.abort).mockImplementation(() => {
      finishFirstRun?.();
    });
    const conversations = new Map([["workspace-1:0", conversation]]);

    const firstReply = _ask(conversations, _turn("First?"));
    const secondReply = _ask(conversations, _turn("Second?"));
    await firstReply;

    expect((await secondReply).content).toEqual([
      { type: "text", text: "Second." },
      AgentQueryResult.toDataPart(
        AgentQueryResult.create({ sql: "SELECT 2", title: "second" }),
      ),
    ]);
  });

  it("stops a run still in progress before the next turn starts", async () => {
    let finishFirstRun: (() => void) | undefined;
    const conversation = _fakeConversation(async (text) => {
      if (text === "First?") {
        conversation.results.push(
          AgentQueryResult.create({ sql: "SELECT 1", title: "first" }),
        );
        await new Promise<void>((resolve) => {
          finishFirstRun = resolve;
        });
        return { text: "Stopped." };
      }
      conversation.results.push(
        AgentQueryResult.create({ sql: "SELECT 2", title: "second" }),
      );
      return { text: "Second." };
    });
    vi.mocked(conversation.dataAgent.agent.abort).mockImplementation(() => {
      finishFirstRun?.();
    });
    const conversations = new Map([["workspace-1:0", conversation]]);
    const secondTurn = _turn("Second?");

    const firstReply = _ask(conversations, _turn("First?"));
    const secondReply = _ask(conversations, secondTurn);

    expect((await firstReply).content).toEqual([
      { type: "text", text: "Stopped." },
      AgentQueryResult.toDataPart(
        AgentQueryResult.create({ sql: "SELECT 1", title: "first" }),
      ),
    ]);
    expect((await secondReply).content).toEqual([
      { type: "text", text: "Second." },
      AgentQueryResult.toDataPart(
        AgentQueryResult.create({ sql: "SELECT 2", title: "second" }),
      ),
    ]);
    expect(conversation.dataAgent.agent.abort).toHaveBeenCalledTimes(1);
    expect(conversation.turnRef.current).toBe(secondTurn);
    expect(conversation.activeAsk).toBeUndefined();
  });
});
