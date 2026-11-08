import { afterEach, describe, expect, it, vi } from "vitest";
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

const { showQueryInChatMock, explorerShowQueryMock } = vi.hoisted(() => {
  return {
    showQueryInChatMock: vi
      .fn()
      .mockResolvedValue({ kind: "empty", columns: [], rowCount: 0 }),
    explorerShowQueryMock: vi
      .fn()
      .mockResolvedValue({ kind: "empty", columns: [], rowCount: 0 }),
  };
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
  return { turnRef: { current: turn }, results: [] };
}

const REQUEST = { sql: "SELECT 1", summary: "s" };

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
    expect(showQueryInChatMock).toHaveBeenCalledWith(
      expect.objectContaining({ results: conversation.results }),
    );
  });
});
