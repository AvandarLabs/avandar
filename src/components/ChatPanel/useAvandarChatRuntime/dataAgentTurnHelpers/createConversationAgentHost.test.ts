import { Model } from "@avandar/models";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import {
  createAgentConversation,
  createConversationAgentHost,
} from "./createConversationAgentHost";
import type {
  AgentConversationState,
  DataAgentTurnOptions,
} from "./dataAgentConversation.types";
import type { DataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

const { showQueryInChatMock, explorerShowQueryMock, runQueryMock } = vi.hoisted(
  () => {
    return {
      runQueryMock: vi.fn(),
      showQueryInChatMock: vi
        .fn()
        .mockResolvedValue({ kind: "empty", columns: [], rowCount: 0 }),
      explorerShowQueryMock: vi
        .fn()
        .mockResolvedValue({ kind: "empty", columns: [], rowCount: 0 }),
    };
  },
);

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat",
  () => {
    return { showQueryInChat: showQueryInChatMock };
  },
);

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers",
  async (importOriginal) => {
    const original = await importOriginal<object>();
    return {
      ...original,
      createExplorerShowQuery: () => {
        return explorerShowQueryMock;
      },
    };
  },
);

afterEach(() => {
  vi.clearAllMocks();
});

function _turn(
  app: "data-explorer" | "dashboard" | undefined,
  overrides: Partial<DataAgentTurnOptions> = {},
): DataAgentTurnOptions {
  return {
    apiMessages: [{ role: "user", content: "How many?" }],
    workspaceId: "workspace-1",
    currentUser: undefined,
    chatGeneration: 0,
    parseSqlRef: { current: vi.fn() },
    dataExplorerDispatch: {},
    chatPanelDispatch: { setPendingClarification: vi.fn() },
    pageContext: app ? { app } : undefined,
    ...overrides,
  } as unknown as DataAgentTurnOptions;
}

function _state(turn: DataAgentTurnOptions): AgentConversationState {
  return {
    turnRef: { current: turn },
    results: [],
    resultsByTurn: [],
    sqlVault: createSqlPlaceholderVault(),
  };
}

const REQUEST = { sql: "SELECT 1", summary: "s" };

/** A conversation state whose vault holds `'Kings'` as `<value 1>`. */
function _stateWithKings(turn: DataAgentTurnOptions): AgentConversationState {
  const state = _state(turn);
  state.sqlVault.redact(`SELECT 1 FROM t WHERE "patient_name" = 'Kings'`, {
    isSensitiveColumn: (columnName) => {
      return columnName === "patient_name";
    },
    isSensitiveValue: () => {
      return false;
    },
  });
  return state;
}

describe("createConversationAgentHost", () => {
  it("shows results in the explorer on the Data Explorer", async () => {
    const state = _state(_turn("data-explorer"));
    await createConversationAgentHost(state).showQuery(REQUEST);

    expect(explorerShowQueryMock).toHaveBeenCalledWith(REQUEST);
    expect(showQueryInChatMock).not.toHaveBeenCalled();
  });

  it("follows the page of the current turn, not the first", async () => {
    const state = _state(_turn("data-explorer"));
    const host = createConversationAgentHost(state);
    state.turnRef.current = _turn("dashboard");

    await host.showQuery(REQUEST);

    expect(showQueryInChatMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "How many?", request: REQUEST }),
    );
  });

  it("titles a chat result with the mention's name, never its token", async () => {
    const ref = {
      gadgetType: "dataset",
      gadgetId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      subId: null,
    } as const;
    const turn = _turn("dashboard", {
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
    });

    await createConversationAgentHost(_state(turn)).showQuery(REQUEST);

    expect(showQueryInChatMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Totals for @US deaths" }),
    );
  });

  it("shows question cards in the current turn's panel", async () => {
    const state = _state(_turn("dashboard"));
    const host = createConversationAgentHost(state);
    const laterTurn = _turn("dashboard");
    state.turnRef.current = laterTurn;

    await host.askUser({
      question: "Which?",
      options: ["A", "B"],
      isMulti: false,
      kind: "choice",
    });

    expect(
      laterTurn.chatPanelDispatch.setPendingClarification,
    ).toHaveBeenCalled();
  });

  it("shows results in the chat when the page is unknown", async () => {
    await createConversationAgentHost(_state(_turn(undefined))).showQuery(
      REQUEST,
    );

    expect(showQueryInChatMock).toHaveBeenCalled();
    expect(explorerShowQueryMock).not.toHaveBeenCalled();
  });

  it("shows an offline turn's results in the explorer", async () => {
    const turn = _turn(undefined, { isOffline: true });
    await createConversationAgentHost(_state(turn)).showQuery(REQUEST);

    expect(explorerShowQueryMock).toHaveBeenCalledWith(REQUEST);
    expect(showQueryInChatMock).not.toHaveBeenCalled();
  });
});

describe("createConversationAgentHost placeholders", () => {
  it("restores page placeholders before the explorer runs a query", async () => {
    const host = createConversationAgentHost(
      _stateWithKings(_turn("data-explorer")),
    );

    await host.showQuery({
      sql: `SELECT 1 FROM t WHERE "patient_name" = '<value 1>'`,
      summary: "s",
    });

    expect(explorerShowQueryMock).toHaveBeenCalledWith({
      sql: `SELECT 1 FROM t WHERE "patient_name" = 'Kings'`,
      summary: "s",
    });
  });

  it("stores the restored SQL on the chat result card", async () => {
    const state = _stateWithKings(_turn("dashboard"));

    await createConversationAgentHost(state).showQuery({
      sql: `SELECT 1 FROM t WHERE "patient_name" = '<value 1>'`,
      summary: "s",
    });

    expect(showQueryInChatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          sql: `SELECT 1 FROM t WHERE "patient_name" = 'Kings'`,
        }),
      }),
    );
  });

  it("restores page placeholders before a lookup runs", async () => {
    runQueryMock.mockResolvedValue({
      data: [{ x: "Kings" }, { x: "Kingston" }],
    });
    const host = createConversationAgentHost(
      _stateWithKings(_turn("dashboard")),
    );

    const values = await host.readColumnValues(
      `SELECT DISTINCT x FROM t WHERE x IN ('<value 1>', 'Kingston')`,
    );

    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rawSql: `SELECT DISTINCT x FROM t WHERE x IN ('Kings', 'Kingston')`,
      }),
    );
    expect(values).toEqual(["<value 1>", "Kingston"]);
  });
});

describe("createAgentConversation", () => {
  it("gives the agent a host that reads the conversation it returns", async () => {
    let agentHost: DataAgentHost | undefined;
    const dataAgent = { ask: vi.fn() } as unknown as DataAgent;
    const datasets = [{ id: "dataset-1", name: "cases.csv", columns: [] }];

    const conversation = createAgentConversation({
      turnRef: { current: _turn("data-explorer") },
      datasets,
      createDataAgent: (host) => {
        agentHost = host;
        return dataAgent;
      },
    });
    conversation.turnRef.current = _turn("dashboard");
    await agentHost!.showQuery(REQUEST);

    expect(conversation.dataAgent).toBe(dataAgent);
    expect(conversation.datasets).toBe(datasets);
    expect(conversation.sqlVault.restore("SELECT '<value 1>'")).toBe(
      "SELECT '<value 1>'",
    );
    expect(showQueryInChatMock).toHaveBeenCalledWith(
      expect.objectContaining({ results: conversation.results }),
    );
  });
});
