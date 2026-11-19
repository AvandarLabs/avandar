/**
 * Guards Try again on the agent path: the real adapter, `runDataAgentTurn`,
 * and `askConversationDataAgent`, with the model, the network, and the page
 * read stood in. The same thread twice is a Try again of the latest answer,
 * asked on the same agent with the Try again line. Try again on an earlier
 * answer starts a new agent from the thread's recap. With the agent
 * switched off, today's chat still posts its retry context.
 */
import { Model } from "@avandar/models";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { TRY_AGAIN_LINE } from "$/agent/pageContext/buildAgentTurnText";
import { createChatModelAdapter } from "@/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { CreateChatModelAdapterOptions } from "@/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter";
import type { ChatModelAdapter, ThreadMessageLike } from "@assistant-ui/react";

const {
  apiPostMock,
  askMock,
  createAgentPageContextMock,
  createDataAgentMock,
  getAllDatasetsMock,
  isAgentEnabledMock,
} = vi.hoisted(() => {
  return {
    apiPostMock: vi.fn(),
    askMock: vi.fn(),
    createAgentPageContextMock: vi.fn(),
    createDataAgentMock: vi.fn(),
    getAllDatasetsMock: vi.fn(),
    isAgentEnabledMock: vi.fn(),
  };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { post: apiPostMock } };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: vi.fn() } };
});

vi.mock("@/components/privacy/privacy-helpers/PendingAcks", () => {
  return { PendingAcks: { consumeAckForText: vi.fn() } };
});

vi.mock("@/stores/OfflineChatEngineStore/OfflineChatEngineStore", () => {
  return { OfflineChatEngineStore: { complete: vi.fn() } };
});

vi.mock("@/lib/agent/dataAgent/browser/DataAgentFeature", () => {
  return { DataAgentFeature: { isEnabled: isAgentEnabledMock } };
});

vi.mock("@/lib/agent/dataAgent/createDataAgent/createDataAgent", () => {
  return { createDataAgent: createDataAgentMock };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getAllDatasetsWithColumns: getAllDatasetsMock } };
});

vi.mock("@/lib/dataDictionaries/loadColumnCodes/loadColumnCodes", () => {
  return { loadColumnCodes: vi.fn().mockResolvedValue(new Map()) };
});

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/agentPageNameLoader",
  () => {
    return { createAgentPageNameLoader: vi.fn() };
  },
);

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext",
  () => {
    return { createAgentPageContext: createAgentPageContextMock };
  },
);

// Today's chat applies its reply here. Only the request it posts is under
// test, so the reply is shown as its text.
vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/applyChatModelTurnResponse",
  () => {
    return {
      applyChatModelTurnResponse: async (options: {
        response: { assistantText: string };
      }) => {
        return {
          content: [{ type: "text", text: options.response.assistantText }],
        };
      },
    };
  },
);

const DASHBOARD_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const DATASET = {
  id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  name: "cases.csv",
  columns: [{ name: "cases", dataType: "bigint" }],
};
const PAGE: AgentPageContext = {
  app: "dashboard",
  dashboard: { id: DASHBOARD_ID, name: "Outbreak", tiles: [] },
};

let workspaceCount = 0;

/** A fresh adapter on its own workspace, so no conversation carries over. */
function _createAdapter(): ChatModelAdapter {
  workspaceCount += 1;
  const workspaceId = `workspace-try-again-${workspaceCount}`;
  const ref = <T>(current: T) => {
    return { current };
  };
  // Stub refs and dispatches only partly match, so this needs as unknown as.
  return createChatModelAdapter({
    chatGenerationRef: ref(0),
    lastTurnRef: ref(undefined),
    pageContextRef: ref(Model.make("ChatPageContext", { app: "dashboards" })),
    userRef: ref(undefined),
    workspaceIdRef: ref(workspaceId),
    workspaceRef: ref({ id: workspaceId, slug: "acme" }),
    pathnameRef: ref(`/acme/dashboards/edit/${DASHBOARD_ID}`),
    dashboardEditorStateRef: ref({}),
    parseSqlRef: ref(vi.fn()),
    copyRef: ref({ agentUnavailable: "Could not answer." }),
    dataExplorerDispatch: {},
    dashboardEditorDispatch: {},
    chatPanelDispatch: { setPendingClarification: vi.fn() },
    contextTrayRef: ref([]),
    sessionKindRef: ref("data"),
    activeSessionIdRef: ref(undefined),
  } as unknown as CreateChatModelAdapterOptions);
}

function _user(text: string): ThreadMessageLike {
  return { role: "user", content: [{ type: "text", text }], metadata: {} };
}

function _assistant(text: string): ThreadMessageLike {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
    metadata: { custom: {} },
  };
}

async function _run(
  adapter: ChatModelAdapter,
  messages: readonly ThreadMessageLike[],
): Promise<void> {
  await adapter.run({
    messages,
  } as Parameters<ChatModelAdapter["run"]>[0]);
}

/** The text the agent was asked on its `index`th ask. */
function _askedText(index: number): string {
  return askMock.mock.calls[index]![0] as string;
}

describe("agent Try again", () => {
  // The adapter loads runDataAgentTurn with a dynamic import on its first run,
  // which can take over 5s on a cold start. Loading it here keeps that cost out
  // of the first test's timeout.
  beforeAll(async () => {
    await import("@/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn");
  }, 20_000);

  beforeEach(() => {
    isAgentEnabledMock.mockReset().mockReturnValue(true);
    askMock.mockReset();
    apiPostMock.mockReset();
    getAllDatasetsMock.mockReset().mockResolvedValue([DATASET]);
    createAgentPageContextMock.mockReset().mockResolvedValue(PAGE);
    createDataAgentMock.mockReset().mockImplementation(() => {
      return {
        agent: { abort: vi.fn(), state: { messages: [] } },
        ask: askMock,
      };
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("sends the Try again line on the same agent when the latest answer is retried", async () => {
    const adapter = _createAdapter();
    askMock.mockResolvedValue({ text: "Forty-two." });
    const thread = [_user("How many cases?")];

    await _run(adapter, thread);
    await _run(adapter, thread);

    expect(createDataAgentMock).toHaveBeenCalledTimes(1);
    expect(_askedText(0)).not.toContain(TRY_AGAIN_LINE);
    expect(_askedText(1).split("\n\n").slice(-2)).toEqual([
      TRY_AGAIN_LINE,
      "How many cases?",
    ]);
  });

  it("starts a new agent from the recap, with no line, when an earlier answer is retried", async () => {
    const adapter = _createAdapter();
    askMock
      .mockResolvedValueOnce({ text: "Forty-two." })
      .mockResolvedValueOnce({ text: "Seven." })
      .mockResolvedValueOnce({ text: "Three." })
      .mockResolvedValueOnce({ text: "Eight." });
    const first = [_user("How many cases?")];
    const second = [...first, _assistant("Forty-two."), _user("And deaths?")];
    const third = [...second, _assistant("Seven."), _user("And in 2022?")];

    await _run(adapter, first);
    await _run(adapter, second);
    await _run(adapter, third);
    await _run(adapter, second);

    expect(createDataAgentMock).toHaveBeenCalledTimes(2);
    expect(_askedText(2)).not.toContain(TRY_AGAIN_LINE);
    expect(_askedText(3)).toContain(
      "Earlier in this conversation:\nUser: How many cases?\nAssistant: Forty-two.\n\nAnd deaths?",
    );
    expect(_askedText(3)).not.toContain(TRY_AGAIN_LINE);
  });

  it("keeps a follow-up on the same agent after a newer message stopped a run", async () => {
    const adapter = _createAdapter();
    let finishFirstRun: (() => void) | undefined;
    createDataAgentMock.mockImplementation(() => {
      return {
        agent: {
          abort: vi.fn(() => {
            finishFirstRun?.();
          }),
          state: { messages: [] },
        },
        ask: askMock,
      };
    });
    askMock.mockImplementation(async (text: string) => {
      if (text.endsWith("First?")) {
        await new Promise<void>((resolve) => {
          finishFirstRun = resolve;
        });
        return { text: "Stopped." };
      }
      return { text: "Answered." };
    });

    const firstRun = _run(adapter, [_user("First?")]);
    await vi.waitFor(() => {
      expect(askMock).toHaveBeenCalledTimes(1);
    });
    // The stopped reply is still empty when the newer message is sent.
    await _run(adapter, [_user("First?"), _assistant(""), _user("Second?")]);
    await firstRun;
    await _run(adapter, [
      _user("First?"),
      _assistant("Stopped."),
      _user("Second?"),
      _assistant("Answered."),
      _user("Third?"),
    ]);

    expect(createDataAgentMock).toHaveBeenCalledTimes(1);
    expect(_askedText(2)).not.toContain("Earlier in this conversation");
    expect(_askedText(2).endsWith("Third?")).toBe(true);
  });

  it("still posts today's retry context with the agent switched off", async () => {
    isAgentEnabledMock.mockReturnValue(false);
    apiPostMock.mockResolvedValue(
      Model.make("ChatResponse", { assistantText: "Forty-two." }),
    );
    const adapter = _createAdapter();
    const thread = [_user("How many cases?")];

    await _run(adapter, thread);
    await _run(adapter, thread);

    expect(apiPostMock.mock.calls[1]![0].body.retryContext).toEqual({
      priorAssistantText: "Forty-two.",
    });
  });
});
