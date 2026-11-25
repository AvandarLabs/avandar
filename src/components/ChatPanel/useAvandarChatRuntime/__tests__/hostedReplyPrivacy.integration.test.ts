/**
 * Guards the path a hosted agent reply takes: the user reads it with real
 * values, the stored thread keeps what the model wrote, and every later
 * request to a hosted model (the next turn, the recap after a reload, the
 * chat title) carries placeholders and never the real value. A new
 * conversation starts a new vault whose numbers mean other values, so it
 * also guards that an earlier chat's placeholder is never read as a value of
 * the new one. Runs the real adapter, `runDataAgentTurn`, the turn's vault,
 * and the title request, with the model, the network, and the page read
 * stood in.
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
import { createChatModelAdapter } from "@/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter";
import { requestStoredSessionTitle } from "@/components/ChatPanel/useAvandarChatRuntime/requestStoredSessionTitle";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { ChatSessionActions } from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";
import type { CreateChatModelAdapterOptions } from "@/components/ChatPanel/useAvandarChatRuntime/createChatModelAdapter/createChatModelAdapter";
import type {
  ChatModelAdapter,
  ChatModelRunResult,
  ThreadMessageLike,
} from "@assistant-ui/react";

const {
  apiPostMock,
  askMock,
  createAgentPageContextMock,
  createDataAgentMock,
  getAllDatasetsMock,
} = vi.hoisted(() => {
  return {
    apiPostMock: vi.fn(),
    askMock: vi.fn(),
    createAgentPageContextMock: vi.fn(),
    createDataAgentMock: vi.fn(),
    getAllDatasetsMock: vi.fn(),
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
  return {
    DataAgentFeature: {
      isEnabled: () => {
        return true;
      },
    },
  };
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

const DASHBOARD_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const DATASET = {
  id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  name: "cases.csv",
  columns: [{ name: "last_name", dataType: "varchar" }],
};

/** What the model writes: it only ever reads `<value 1>`. */
const MODEL_REPLY = "<value 1> had 2 visits.";
const SHOWN_REPLY = "Doe had 2 visits.";

/**
 * A page whose chart filters on the personal value `Doe` in SQL that cannot
 * be read. The vault then holds `Doe` only as a quoted literal, so its own
 * mask would not hide a bare `Doe` in text. Only keeping the model's text
 * does.
 */
const PAGE_WITH_DOE: AgentPageContext = {
  app: "dashboard",
  dashboard: {
    id: DASHBOARD_ID,
    name: "Outbreak",
    tiles: [
      {
        title: "Visits",
        chartType: "table",
        sql: `SELECT * FROM t WHERE "last_name" = 'Doe' AND (`,
      },
    ],
  },
};

/**
 * A page whose chart filters on a different personal value. In a new vault
 * `Smith` is `<value 1>`, the number `Doe` had in the vault of the first
 * conversation.
 */
const PAGE_WITH_SMITH: AgentPageContext = {
  app: "dashboard",
  dashboard: {
    id: DASHBOARD_ID,
    name: "Outbreak",
    tiles: [
      {
        title: "Visits",
        chartType: "table",
        sql: `SELECT * FROM t WHERE "last_name" = 'Smith' AND (`,
      },
    ],
  },
};

/** A page that holds no personal value at all. */
const PAGE_WITHOUT_VALUES: AgentPageContext = {
  app: "dashboard",
  dashboard: { id: DASHBOARD_ID, name: "Outbreak", tiles: [] },
};

type Fixture = {
  adapter: ChatModelAdapter;
  chatGenerationRef: { current: number };
  titleMaskRef: { current: ((text: string) => string) | undefined };
};

let workspaceCount = 0;

/** A fresh adapter on its own workspace, so no conversation carries over. */
function _createFixture(): Fixture {
  workspaceCount += 1;
  const workspaceId = `workspace-hosted-reply-${workspaceCount}`;
  const ref = <T>(current: T) => {
    return { current };
  };
  const chatGenerationRef = ref(0);
  const titleMaskRef = ref<((text: string) => string) | undefined>(undefined);
  const adapter = createChatModelAdapter({
    chatGenerationRef,
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
    titleMaskRef,
  } as unknown as CreateChatModelAdapterOptions);
  return { adapter, chatGenerationRef, titleMaskRef };
}

function _userMessage(text: string): ThreadMessageLike {
  return { role: "user", content: [{ type: "text", text }], metadata: {} };
}

/**
 * The thread as the chat stores it after a reply: the result's content and
 * metadata, round-tripped through JSON as `ChatThreadStore` keeps them.
 */
function _storedReply(result: ChatModelRunResult): ThreadMessageLike {
  return JSON.parse(
    JSON.stringify({
      role: "assistant",
      content: result.content,
      metadata: { custom: result.metadata?.custom ?? {} },
    }),
  );
}

async function _run(
  adapter: ChatModelAdapter,
  messages: readonly ThreadMessageLike[],
): Promise<ChatModelRunResult> {
  return (await adapter.run({
    messages,
  } as unknown as Parameters<
    ChatModelAdapter["run"]
  >[0])) as ChatModelRunResult;
}

/** The text the agent was asked on its `index`th ask. */
function _askedText(index: number): string {
  return askMock.mock.calls[index]![0] as string;
}

/** Asks one question that the model answers with `MODEL_REPLY`. */
async function _firstTurn(fixture: Fixture): Promise<{
  result: ChatModelRunResult;
  thread: ThreadMessageLike[];
}> {
  createAgentPageContextMock.mockResolvedValueOnce(PAGE_WITH_DOE);
  askMock.mockResolvedValueOnce({ text: MODEL_REPLY });
  const question = _userMessage("Who visited?");
  const result = await _run(fixture.adapter, [question]);
  return { result, thread: [question, _storedReply(result)] };
}

function _sessions(): ChatSessionActions {
  return {
    index: {
      selectedId: "s1",
      openIds: ["s1"],
      archivedIds: [],
      sessions: { s1: { id: "s1", kind: "data", titleIsPlaceholder: true } },
    },
    startDataSession: vi.fn(),
    startCaseDesignSession: vi.fn(),
    selectSession: vi.fn(),
    archiveSession: vi.fn(),
    reopenSession: vi.fn(),
    deleteArchivedSession: vi.fn(),
    setSessionTitle: vi.fn(),
  };
}

describe("hosted reply privacy", () => {
  // The adapter loads runDataAgentTurn with a dynamic import on its first run,
  // which can take over 5s on a cold start. Loading it here keeps that cost out
  // of the first test's timeout.
  beforeAll(async () => {
    await import("@/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn");
  }, 20_000);

  beforeEach(() => {
    askMock.mockReset();
    apiPostMock.mockReset().mockResolvedValue({ title: "Visits" });
    getAllDatasetsMock.mockReset().mockResolvedValue([DATASET]);
    createAgentPageContextMock.mockReset();
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

  it("shows the user the real value the model wrote as a placeholder", async () => {
    const { result } = await _firstTurn(_createFixture());

    expect(result.content?.[0]).toEqual({ type: "text", text: SHOWN_REPLY });
  });

  it("sends the next turn of the same conversation no real value", async () => {
    const fixture = _createFixture();
    const { thread } = await _firstTurn(fixture);
    createAgentPageContextMock.mockResolvedValueOnce(PAGE_WITH_DOE);
    askMock.mockResolvedValueOnce({ text: "Ok." });

    await _run(fixture.adapter, [...thread, _userMessage("And last week?")]);

    expect(_askedText(1)).toContain("And last week?");
    expect(_askedText(1)).not.toContain("Doe");
  });

  it("sends a recap after a reload no real value and no placeholder of the closed vault", async () => {
    const fixture = _createFixture();
    const { thread } = await _firstTurn(fixture);
    // A reload starts a new conversation with an empty vault, and the page
    // no longer shows the value, so the new vault never learns it.
    fixture.chatGenerationRef.current += 1;
    createAgentPageContextMock.mockResolvedValueOnce(PAGE_WITHOUT_VALUES);
    askMock.mockResolvedValueOnce({ text: "Ok." });

    await _run(fixture.adapter, [...thread, _userMessage("And last week?")]);

    expect(_askedText(1)).toContain("Earlier in this conversation:");
    expect(_askedText(1)).toContain("Assistant: [earlier value] had 2 visits.");
    expect(_askedText(1)).not.toContain("<value");
    expect(_askedText(1)).not.toContain("Doe");
  });

  it("sends the chat title request the placeholder, not the real value", async () => {
    const fixture = _createFixture();
    const { thread } = await _firstTurn(fixture);

    requestStoredSessionTitle({
      messages: thread,
      mask: fixture.titleMaskRef.current,
      sessionId: "s1",
      workspaceId: "ws-1",
      sessions: _sessions(),
      locale: "en",
      placeholders: { data: "New chat", "case-design": "New case type" },
    });

    await vi.waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledOnce();
    });
    const { excerpt } = apiPostMock.mock.calls[0]![0].body;
    expect(excerpt).toContain(`assistant: ${MODEL_REPLY}`);
    expect(excerpt).not.toContain("Doe");
  });

  it("gives the same number to a different value in a new conversation", async () => {
    const fixture = _createFixture();
    await _firstTurn(fixture);
    fixture.chatGenerationRef.current += 1;
    createAgentPageContextMock.mockResolvedValueOnce(PAGE_WITH_SMITH);
    askMock.mockResolvedValueOnce({ text: "<value 1> had 0 visits." });
    const question = _userMessage("Who visited?");

    const result = await _run(fixture.adapter, [question]);

    expect(result.content?.[0]).toEqual({
      type: "text",
      text: "Smith had 0 visits.",
    });
  });

  it("never shows another person's value for a placeholder an earlier chat wrote", async () => {
    const fixture = _createFixture();
    const { thread } = await _firstTurn(fixture);
    // The user comes back to the thread after a session switch. The page now
    // filters on Smith, so the new vault numbers Smith `<value 1>`.
    fixture.chatGenerationRef.current += 1;
    createAgentPageContextMock.mockResolvedValueOnce(PAGE_WITH_SMITH);
    // A model that repeats what the recap says about the earlier answer.
    askMock.mockImplementationOnce(async (text: string) => {
      return { text: /^Assistant: (.*)$/m.exec(text)![1] };
    });

    const result = await _run(fixture.adapter, [
      ...thread,
      _userMessage("What did you say before?"),
    ]);

    expect(result.content?.[0]).toEqual({
      type: "text",
      text: "[earlier value] had 2 visits.",
    });
    expect(JSON.stringify(result)).not.toContain("Smith");
    expect(JSON.stringify(result)).not.toContain("Doe");
  });

  it("sends a new conversation the new vault's number only where the page shows it", async () => {
    const fixture = _createFixture();
    const { thread } = await _firstTurn(fixture);
    fixture.chatGenerationRef.current += 1;
    createAgentPageContextMock.mockResolvedValueOnce(PAGE_WITH_SMITH);
    askMock.mockResolvedValueOnce({ text: "Ok." });

    await _run(fixture.adapter, [...thread, _userMessage("And last week?")]);

    const asked = _askedText(1);
    const recap = asked.slice(asked.indexOf("Earlier in this conversation:"));
    expect(asked).toContain(`"last_name" = '<value 1>'`);
    expect(recap).not.toContain("<value");
    expect(asked).not.toContain("Smith");
    expect(asked).not.toContain("Doe");
  });

  it("shows and resends a placeholder no value stands for as written", async () => {
    const fixture = _createFixture();
    createAgentPageContextMock.mockResolvedValueOnce(PAGE_WITH_DOE);
    askMock.mockResolvedValueOnce({ text: "<value 9> had 2 visits." });
    const question = _userMessage("Who visited?");

    const result = await _run(fixture.adapter, [question]);

    expect(result.content?.[0]).toEqual({
      type: "text",
      text: "<value 9> had 2 visits.",
    });
    expect(result.metadata?.custom).toBeUndefined();
  });
});
