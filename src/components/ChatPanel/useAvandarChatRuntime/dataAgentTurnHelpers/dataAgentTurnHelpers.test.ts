import { Model } from "@avandar/models";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostedAnswerText } from "$/agent/HostedAnswerText/HostedAnswerText";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { TRY_AGAIN_LINE } from "$/agent/pageContext/buildAgentTurnText";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AgentDashboardBlock } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import { AgentQueryResult } from "@/components/ChatPanel/ChatThread/AgentQueryResultPart/AgentQueryResult";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { chatMessagesKey } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
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

const { loadColumnCodesMock } = vi.hoisted(() => {
  return { loadColumnCodesMock: vi.fn() };
});

vi.mock("@/lib/dataDictionaries/loadColumnCodes/loadColumnCodes", () => {
  return { loadColumnCodes: loadColumnCodesMock };
});

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
    copy: { chartNotBuilt: "Chart not built." },
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

  it("labels the explorer's prompt with mention names, never tokens", async () => {
    const ref = {
      gadgetType: "dataset",
      gadgetId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      subId: null,
    } as const;
    const turn: DataAgentTurnOptions = {
      ..._createTurnOptions(),
      apiMessages: [
        Model.make("ChatClientMessage", {
          role: "user",
          content: `Totals for ${ChatMentionToken.buildToken(ref)}`,
        }),
      ],
      gadgetContext: {
        attachedRefs: [],
        contexts: new Map([
          [
            ChatMentionToken.buildRefKey(ref),
            { kind: "dataset", ref, name: "US deaths" },
          ],
        ]),
      },
    };

    await createExplorerShowQuery(turn)({ sql: "select 1", summary: "s" });

    expect(turn.dataExplorerDispatch.setNlPrompt).toHaveBeenCalledWith(
      "Totals for @US deaths",
    );
  });

  it("labels the explorer's prompt with the turn's question label", async () => {
    const turn: DataAgentTurnOptions = {
      ..._createTurnOptions(),
      apiMessages: [
        Model.make("ChatClientMessage", {
          role: "user",
          content: 'Totals for @"US deaths"',
        }),
      ],
      questionLabel: "Totals for @US deaths",
    };

    await createExplorerShowQuery(turn)({ sql: "select 1", summary: "s" });

    expect(turn.dataExplorerDispatch.setNlPrompt).toHaveBeenCalledWith(
      "Totals for @US deaths",
    );
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

  beforeEach(() => {
    loadColumnCodesMock.mockResolvedValue(new Map());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("gives a column the code list a dictionary attaches to it", async () => {
    vi.spyOn(DatasetClient, "getAllDatasetsWithColumns").mockResolvedValue([
      {
        id: "dataset-1",
        name: "line list",
        columns: [{ id: "col-gender", name: "GENDER", dataType: "bigint" }],
      },
    ] as never);
    loadColumnCodesMock.mockResolvedValue(
      new Map([
        [
          "col-gender",
          {
            direction: "decode",
            pairs: [
              {
                code: "2",
                label: "Female",
                acceptedSpellings: [],
                isMissing: false,
              },
            ],
            description: "Sex on the report.",
          },
        ],
      ]),
    );

    const datasets = await loadDataAgentDatasets(WORKSPACE_ID);

    expect(datasets[0]?.columns[0]?.codes).toEqual({
      direction: "decode",
      pairs: [
        { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
      ],
      description: "Sex on the report.",
    });
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

  function _noName(): string {
    return "";
  }

  function _keepText(text: string): string {
    return text;
  }

  function _fakeConversation(
    ask?: (text: string) => Promise<{ text: string }>,
  ): FakeConversation {
    const asked: string[] = [];
    // Like the real agent, the fake takes a turn's text into its transcript
    // before the model answers, so a failed answer still leaves it there.
    const messages: string[] = [];
    const conversation = {
      asked,
      turnRef: { current: _createTurnOptions() },
      results: [],
      resultsByTurn: [],
      dashboardCards: [],
      datasets: [],
      dataAgent: {
        agent: { abort: vi.fn(), state: { messages } },
        ask: vi.fn(async (text: string) => {
          asked.push(text);
          messages.push(text);
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
      buildTurnInputs: () => {
        return {
          blocks: { pageBlock },
          nameOf: _noName,
          maskAssistantText: _keepText,
        };
      },
      createConversation: vi.fn(),
    });
  }

  it("sends the page block first, then 'unchanged' on the same page", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map([["workspace-1:0", conversation]]);

    await _ask(conversations, _turn("How many?"), PAGE_BLOCK);
    await _ask(
      conversations,
      _turn(["How many?", "Here it is.", "And deaths?"]),
      PAGE_BLOCK,
    );

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
    await _ask(
      conversations,
      _turn(["How many?", "Here it is.", "And here?"]),
      dashboardBlock,
    );

    expect(conversation.asked[1]).toBe(`${dashboardBlock}\n\nAnd here?`);
  });

  it("resends a block the agent never took", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map([["workspace-1:0", conversation]]);
    const dashboardBlock = "<current_page>\nPage: Dashboard\n</current_page>";
    await _ask(conversations, _turn("How many?"), PAGE_BLOCK);
    vi.mocked(conversation.dataAgent.ask).mockRejectedValueOnce(
      new Error("model down"),
    );

    await expect(
      _ask(
        conversations,
        _turn(["How many?", "Here it is.", "And here?"]),
        dashboardBlock,
      ),
    ).rejects.toThrow("model down");

    expect(conversation.lastPageBlock).toBe(PAGE_BLOCK);
    await _ask(
      conversations,
      _turn(["How many?", "Here it is.", "And here?"]),
      dashboardBlock,
    );
    expect(conversation.lastPageBlock).toBe(dashboardBlock);
    expect(conversation.asked.at(-1)).toBe(`${dashboardBlock}\n\nAnd here?`);
  });

  it("remembers a block the agent took and then failed to answer", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map([["workspace-1:0", conversation]]);
    const dashboardBlock = "<current_page>\nPage: Dashboard\n</current_page>";
    await _ask(conversations, _turn("How many?"), dashboardBlock);
    conversation.dataAgent.ask = vi.fn(async (text: string) => {
      (conversation.dataAgent.agent.state.messages as unknown[]).push(text);
      throw new Error("model down");
    });

    await expect(
      _ask(
        conversations,
        _turn(["How many?", "Here it is.", "And here?"]),
        PAGE_BLOCK,
      ),
    ).rejects.toThrow("model down");

    expect(conversation.lastPageBlock).toBe(PAGE_BLOCK);
  });

  it("sends the page in full on the turn after a failed turn on another page", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map([["workspace-1:0", conversation]]);
    const dashboardBlock = "<current_page>\nPage: Dashboard\n</current_page>";
    const fakeAsk = conversation.dataAgent.ask;
    await _ask(conversations, _turn("How many?"), dashboardBlock);
    conversation.dataAgent.ask = vi.fn(async (text: string) => {
      (conversation.dataAgent.agent.state.messages as unknown[]).push(text);
      throw new Error("model down");
    });
    await expect(
      _ask(
        conversations,
        _turn(["How many?", "Here it is.", "And here?"]),
        PAGE_BLOCK,
      ),
    ).rejects.toThrow("model down");
    conversation.dataAgent.ask = fakeAsk;

    await _ask(
      conversations,
      _turn([
        "How many?",
        "Here it is.",
        "And here?",
        "Could not answer.",
        "And back?",
      ]),
      dashboardBlock,
    );

    expect(conversation.asked.at(-1)).toBe(`${dashboardBlock}\n\nAnd back?`);
  });

  it("remembers the tray a failed turn took", async () => {
    const conversation = _fakeConversation();
    const conversations = new Map([["workspace-1:0", conversation]]);
    conversation.dataAgent.ask = vi.fn(async (text: string) => {
      (conversation.dataAgent.agent.state.messages as unknown[]).push(text);
      throw new Error("model down");
    });

    await expect(
      askConversationDataAgent({
        conversations,
        turn: _turn("How many?"),
        buildTurnInputs: () => {
          return {
            blocks: { attachedBlock: "<attached>\nA\n</attached>" },
            nameOf: _noName,
            maskAssistantText: _keepText,
          };
        },
        createConversation: vi.fn(),
      }),
    ).rejects.toThrow("model down");

    expect(conversation.lastAttachedBlock).toBe("<attached>\nA\n</attached>");
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

  describe("a reply that holds a placeholder", () => {
    const MODEL_TEXT = "<value 1> has 2 visits.";

    function _askWithUnmask(
      unmaskReplyText: ((text: string) => string) | undefined,
    ) {
      return askConversationDataAgent({
        conversations: new Map([
          [
            "workspace-1:0",
            _fakeConversation(async () => {
              return { text: MODEL_TEXT };
            }),
          ],
        ]),
        turn: _turn("How many visits?"),
        buildTurnInputs: () => {
          return {
            blocks: {},
            nameOf: _noName,
            maskAssistantText: _keepText,
            unmaskReplyText,
          };
        },
        createConversation: vi.fn(),
      });
    }

    function _unmaskJane(text: string): string {
      return text.replaceAll("<value 1>", "Jane Doe");
    }

    it("shows the real value on a hosted turn", async () => {
      const reply = await _askWithUnmask(_unmaskJane);

      expect(reply.content?.[0]).toEqual({
        type: "text",
        text: "Jane Doe has 2 visits.",
      });
    });

    it("keeps the text the model wrote beside the real text, for the next request", async () => {
      const reply = await _askWithUnmask(_unmaskJane);

      expect(
        HostedAnswerText.getModelText({
          text: "Jane Doe has 2 visits.",
          metadata: reply.metadata,
        }),
      ).toBe(MODEL_TEXT);
    });

    it("leaves a device turn's reply as written, with no kept text", async () => {
      const reply = await _askWithUnmask(undefined);

      expect(reply).toEqual({
        content: [{ type: "text", text: MODEL_TEXT }],
      });
    });

    it("keeps no model text when the vault holds no value for the placeholder", async () => {
      const reply = await _askWithUnmask(_keepText);

      expect(reply).toEqual({
        content: [{ type: "text", text: MODEL_TEXT }],
      });
    });
  });

  it("starts with card lines, then marks them heard after the reply", async () => {
    const cardLine =
      "<dashboard_card>Cancelled: nothing was added.</dashboard_card>";
    const card = AgentDashboardBlock.create({
      block: { kind: "heading", text: "Visits" },
      summary: "Added a heading.",
      candidates: [{ id: "d-1", name: "Clinic visits" }],
    } as never);
    const onReplied = vi.fn();
    const conversation = _fakeConversation(async () => {
      expect(onReplied).not.toHaveBeenCalled();
      conversation.dashboardCards.push(card);
      return { text: "Done." };
    });

    const reply = await askConversationDataAgent({
      conversations: new Map([["workspace-1:0", conversation]]),
      turn: _turn("Add a heading"),
      buildTurnInputs: () => {
        return {
          blocks: {},
          nameOf: _noName,
          maskAssistantText: _keepText,
          dashboardCardLines: [cardLine],
          onReplied,
        };
      },
      createConversation: vi.fn(),
    });

    expect(conversation.asked[0]).toBe(`${cardLine}\n\nAdd a heading`);
    expect(onReplied).toHaveBeenCalledTimes(1);
    expect(reply.content).toEqual([
      { type: "text", text: "Done." },
      AgentDashboardBlock.toDataPart(card),
    ]);
  });

  describe("when the chat has moved on during the ask", () => {
    function _askWithStaleness(
      isStale: () => boolean,
      onReplied: () => void,
    ): Promise<unknown> {
      return askConversationDataAgent({
        conversations: new Map([["workspace-1:0", _fakeConversation()]]),
        turn: { ..._turn("Add a heading"), isStale },
        buildTurnInputs: () => {
          return {
            blocks: {},
            nameOf: _noName,
            maskAssistantText: _keepText,
            dashboardCardLines: ["<dashboard_card>x</dashboard_card>"],
            onReplied,
          };
        },
        createConversation: vi.fn(),
      });
    }

    it("keeps card lines unheard when the reply is discarded", async () => {
      const onReplied = vi.fn();

      await _askWithStaleness(() => {
        return true;
      }, onReplied);

      expect(onReplied).not.toHaveBeenCalled();
    });

    it("marks card lines heard when the chat is still current", async () => {
      const onReplied = vi.fn();

      await _askWithStaleness(() => {
        return false;
      }, onReplied);

      expect(onReplied).toHaveBeenCalledTimes(1);
    });
  });

  describe("when the agent could not build the chart", () => {
    function _askWithChartFailure(failure: "chart_not_built" | undefined) {
      const conversation = _fakeConversation(async () => {
        return { text: failure ? "" : "Here it is.", failure };
      });
      return askConversationDataAgent({
        conversations: new Map([["workspace-1:0", conversation]]),
        turn: {
          ..._turn("Add a chart"),
          copy: { chartNotBuilt: "Translated: chart not built." },
        },
        createConversation: vi.fn(),
      });
    }

    it("shows the translated copy as the reply", async () => {
      const reply = await _askWithChartFailure("chart_not_built");

      expect(reply.content).toEqual([
        { type: "text", text: "Translated: chart not built." },
      ]);
    });

    it("leaves an ordinary reply as the agent wrote it", async () => {
      const reply = await _askWithChartFailure(undefined);

      expect(reply.content).toEqual([{ type: "text", text: "Here it is." }]);
    });
  });

  it("keeps card lines unheard when the agent fails to reply", async () => {
    const onReplied = vi.fn();
    const conversation = _fakeConversation(async () => {
      throw new Error("model down");
    });

    await expect(
      askConversationDataAgent({
        conversations: new Map([["workspace-1:0", conversation]]),
        turn: _turn("Add a heading"),
        buildTurnInputs: () => {
          return {
            blocks: {},
            nameOf: _noName,
            maskAssistantText: _keepText,
            dashboardCardLines: ["<dashboard_card>x</dashboard_card>"],
            onReplied,
          };
        },
        createConversation: vi.fn(),
      }),
    ).rejects.toThrow("model down");

    expect(onReplied).not.toHaveBeenCalled();
  });

  it("gives each turn its own list of dashboard cards", async () => {
    const conversation = _fakeConversation();
    const staleCards = conversation.dashboardCards;

    await _ask(new Map([["workspace-1:0", conversation]]), _turn("How many?"));

    expect(conversation.dashboardCards).not.toBe(staleCards);
    expect(conversation.dashboardCards).toEqual([]);
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
      buildTurnInputs: () => {
        return {
          blocks: { pageBlock: PAGE_BLOCK },
          nameOf: _noName,
          maskAssistantText: _keepText,
        };
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
      buildTurnInputs: () => {
        return {
          blocks: { pageBlock: PAGE_BLOCK },
          nameOf: _noName,
          maskAssistantText: _keepText,
        };
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
    const buildTurnInputs = vi.fn(() => {
      return {
        blocks: { pageBlock: PAGE_BLOCK },
        nameOf: _noName,
        maskAssistantText: _keepText,
      };
    });

    await askConversationDataAgent({
      conversations: new Map(),
      turn: _turn("How many?"),
      buildTurnInputs,
      createConversation: async () => {
        return conversation;
      },
    });

    expect(buildTurnInputs).toHaveBeenCalledWith(conversation);
    expect(conversation.asked[0]).toBe(`${PAGE_BLOCK}\n\nHow many?`);
  });

  it("masks each assistant reply in the recap", async () => {
    const conversation = _fakeConversation();

    await askConversationDataAgent({
      conversations: new Map(),
      turn: _turn(["Who?", "Jane Doe visits has two rows.", "Total?"]),
      buildTurnInputs: () => {
        return {
          blocks: {},
          nameOf: _noName,
          maskAssistantText: (text) => {
            return text.replace("Jane Doe", "<value 1>");
          },
        };
      },
      createConversation: async () => {
        return conversation;
      },
    });

    expect(conversation.asked[0]).toBe(
      "Earlier in this conversation:\nUser: Who?\n" +
        "Assistant: <value 1> visits has two rows.\n\nTotal?",
    );
  });

  it("sends the attached and mentioned blocks and names each mention", async () => {
    const conversation = _fakeConversation();
    const ref = {
      gadgetType: "dataset",
      gadgetId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      subId: null,
    } as const;
    const token = ChatMentionToken.buildToken(ref);
    const nameOf = vi.fn(() => {
      return "US deaths";
    });

    await askConversationDataAgent({
      conversations: new Map(),
      turn: _turn([`About ${token}?`, "42.", `And ${token}?`]),
      buildTurnInputs: () => {
        return {
          blocks: {
            attachedBlock: "<attached>\nA\n</attached>",
            mentionedBlock: "<mentioned>\nM\n</mentioned>",
          },
          nameOf,
          maskAssistantText: _keepText,
        };
      },
      createConversation: async () => {
        return conversation;
      },
    });

    expect(nameOf).toHaveBeenCalledWith(ref);
    expect(conversation.asked[0]).toBe(
      "<attached>\nA\n</attached>\n\n<mentioned>\nM\n</mentioned>\n\n" +
        'Earlier in this conversation:\nUser: About @"US deaths"?\n' +
        'Assistant: 42.\n\nAnd @"US deaths"?',
    );
    expect(conversation.lastAttachedBlock).toBe("<attached>\nA\n</attached>");
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
    const secondReply = _ask(
      conversations,
      _turn(["First?", "Stopped.", "Second?"]),
    );
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
    const secondTurn = _turn(["First?", "Stopped.", "Second?"]);

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

  describe("on Try again", () => {
    const KEY = "workspace-1:0";

    it("asks the same conversation the line after a kept hosted reply", async () => {
      const conversation = _fakeConversation();
      const conversations = new Map([[KEY, conversation]]);

      await _ask(conversations, _turn("How many?"));
      await _ask(conversations, _turn("How many?"));

      expect(conversations.get(KEY)).toBe(conversation);
      expect(conversation.asked).toEqual([
        "How many?",
        `${TRY_AGAIN_LINE}\n\nHow many?`,
      ]);
      expect(conversation.dataAgent.agent.state.messages).toEqual(
        conversation.asked,
      );
    });

    it("asks again with no line after the ask was rejected", async () => {
      const conversation = _fakeConversation();
      const conversations = new Map([[KEY, conversation]]);
      vi.mocked(conversation.dataAgent.ask).mockRejectedValueOnce(
        new Error("model down"),
      );
      await expect(_ask(conversations, _turn("How many?"))).rejects.toThrow(
        "model down",
      );

      await _ask(conversations, _turn("How many?"));

      expect(conversations.get(KEY)).toBe(conversation);
      expect(conversation.asked).toEqual(["How many?"]);
    });

    it("asks again with no line after a reply the chat discarded", async () => {
      const conversation = _fakeConversation();
      const conversations = new Map([[KEY, conversation]]);
      await _ask(conversations, {
        ..._turn("How many?"),
        isStale: () => {
          return true;
        },
      });

      await _ask(conversations, _turn("How many?"));

      expect(conversation.asked).toEqual(["How many?", "How many?"]);
    });

    it("sends an offline Try again no line", async () => {
      const conversation = _fakeConversation();
      const conversations = new Map([[KEY, conversation]]);
      const offlineTurn = { ..._turn("How many?"), isOffline: true };

      await _ask(conversations, offlineTurn);
      await _ask(conversations, { ...offlineTurn });

      expect(conversations.get(KEY)).toBe(conversation);
      expect(conversation.asked).toEqual(["How many?", "How many?"]);
    });

    it.each([
      ["a follow-up", ["How many?", "Here it is.", "And deaths?"]],
      [
        "a card answer",
        ["How many?", "Which state?", "[Clarification answer: Ohio]"],
      ],
      [
        "a view change",
        [
          "How many?",
          "Here it is.",
          ChatViewEvent.format({
            app: "dashboards",
            route: "/acme/dashboards",
          }),
        ],
      ],
    ])(
      "asks %s on the same conversation with no line",
      async (_label, thread) => {
        const conversation = _fakeConversation();
        const conversations = new Map([[KEY, conversation]]);

        await _ask(conversations, _turn("How many?"));
        await _ask(conversations, _turn(thread));

        expect(conversations.get(KEY)).toBe(conversation);
        expect(conversation.asked[1]).not.toContain(TRY_AGAIN_LINE);
      },
    );

    it("starts a new conversation from the recap when the thread rewinds", async () => {
      const oldConversation = _fakeConversation();
      const newConversation = _fakeConversation();
      const conversations = new Map<string, DataAgentConversation>([
        [KEY, oldConversation],
      ]);
      const askThread = (thread: readonly string[]) => {
        return askConversationDataAgent({
          conversations,
          turn: _turn(thread),
          buildTurnInputs: () => {
            return {
              blocks: {},
              nameOf: _noName,
              maskAssistantText: _keepText,
            };
          },
          createConversation: async () => {
            return newConversation;
          },
        });
      };
      const second = ["How many?", "Here it is.", "And deaths?"];

      await askThread(["How many?"]);
      await askThread(second);
      await askThread([...second, "Here it is.", "And cases?"]);
      await askThread(second);

      expect(oldConversation.dataAgent.agent.abort).toHaveBeenCalledTimes(1);
      expect(conversations.get(KEY)).toBe(newConversation);
      expect(newConversation.asked).toEqual([
        "Earlier in this conversation:\nUser: How many?\nAssistant: Here it is.\n\nAnd deaths?",
      ]);
    });

    it("asks a new chat's same question with no line", async () => {
      const newChat = _fakeConversation();
      const conversations = new Map<string, DataAgentConversation>([
        [KEY, _fakeConversation()],
      ]);
      await _ask(conversations, _turn("How many?"));

      await askConversationDataAgent({
        conversations,
        turn: _turn("How many?", 1),
        createConversation: async () => {
          return newChat;
        },
      });

      expect(newChat.asked).toEqual(["How many?"]);
    });

    it("keeps the newer turn's record when a run it stopped settles", async () => {
      let finishFirstRun: (() => void) | undefined;
      const conversation = _fakeConversation(async (text) => {
        if (text === "First?") {
          await new Promise<void>((resolve) => {
            finishFirstRun = resolve;
          });
          return { text: "Stopped." };
        }
        return { text: "Second." };
      });
      vi.mocked(conversation.dataAgent.agent.abort).mockImplementation(() => {
        finishFirstRun?.();
      });
      const conversations = new Map([[KEY, conversation]]);
      const secondTurn = _turn(["First?", "Stopped.", "Second?"]);

      const firstReply = _ask(conversations, _turn("First?"));
      const secondReply = _ask(conversations, secondTurn);
      await Promise.all([firstReply, secondReply]);

      expect(conversation.lastAsk).toEqual({
        threadKey: chatMessagesKey(secondTurn.apiMessages),
        messageCount: 3,
        isKept: true,
      });
      expect(conversation.asked).toEqual(["First?", "Second?"]);
    });
  });
});
