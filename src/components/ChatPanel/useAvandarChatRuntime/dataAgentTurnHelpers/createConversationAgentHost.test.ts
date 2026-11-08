import { describe, expect, it, vi } from "vitest";
import { createConversationAgentHost } from "./createConversationAgentHost";
import type { AgentConversationState } from "./createConversationAgentHost";
import type { DataAgentTurnOptions } from "./dataAgentTurnHelpers";

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

function _turn(app: "data-explorer" | "dashboard"): DataAgentTurnOptions {
  return {
    apiMessages: [{ role: "user", content: "How many?" }],
    workspaceId: "workspace-1",
    currentUser: undefined,
    chatGeneration: 0,
    parseSqlRef: { current: vi.fn() },
    dataExplorerDispatch: {},
    chatPanelDispatch: { setPendingClarification: vi.fn() },
    pageContext: { app },
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
});
