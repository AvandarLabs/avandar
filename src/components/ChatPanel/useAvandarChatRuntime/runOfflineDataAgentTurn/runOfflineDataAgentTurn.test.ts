import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";
import { runOfflineDataAgentTurn } from "./runOfflineDataAgentTurn";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { AgentPageInputs } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/buildAgentTurnInputs";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { CreateOfflineDataAgentOptions } from "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent";

const {
  askMock,
  createOfflineDataAgentMock,
  decideMock,
  explorerShowQueryMock,
  readAgentPageContextMock,
  showQueryInChatMock,
} = vi.hoisted(() => {
  return {
    askMock: vi.fn(),
    createOfflineDataAgentMock: vi.fn(),
    decideMock: vi.fn(),
    readAgentPageContextMock: vi.fn(),
    explorerShowQueryMock: vi
      .fn()
      .mockResolvedValue({ kind: "empty", columns: [], rowCount: 0 }),
    showQueryInChatMock: vi.fn(),
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

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/buildAgentTurnInputs",
  async (importOriginal) => {
    const original = await importOriginal<object>();
    return { ...original, readAgentPageContext: readAgentPageContextMock };
  },
);

vi.mock(
  "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent",
  () => {
    return { createOfflineDataAgent: createOfflineDataAgentMock };
  },
);

vi.mock(
  "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary",
  () => {
    return { decideIfDataCanCrossBoundary: decideMock };
  },
);

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      getAllDatasetsWithColumns: vi.fn().mockResolvedValue([
        {
          id: "dataset-1",
          name: "cases.csv",
          columns: [{ name: "cases", dataType: "bigint" }],
        },
      ]),
    },
  };
});

function _createTurnOptions(
  overrides: Partial<DataAgentTurnOptions> = {},
): DataAgentTurnOptions {
  return {
    apiMessages: [{ role: "user", content: "How many cases?" }],
    workspaceId: "workspace-1",
    currentUser: { id: "user-1" },
    chatGeneration: 0,
    parseSqlRef: { current: vi.fn() },
    dataExplorerDispatch: {},
    chatPanelDispatch: { setPendingClarification: vi.fn() },
    ...overrides,
  } as unknown as DataAgentTurnOptions;
}

function _page(): AgentPageInputs {
  return {
    pathname: "/acme/page",
    chatPageContext: Model.make("ChatPageContext", { app: "other" }),
    dashboardEditorState: {} as never,
  };
}

/** Makes the page read return `pageContext` for the next turn. */
function _onPage(pageContext: AgentPageContext): AgentPageInputs {
  readAgentPageContextMock.mockResolvedValue(pageContext);
  return _page();
}

function _lastAgentOptions(): CreateOfflineDataAgentOptions {
  return createOfflineDataAgentMock.mock.calls.at(-1)![0];
}

describe("runOfflineDataAgentTurn", () => {
  beforeEach(() => {
    askMock.mockReset().mockResolvedValue({ text: "42" });
    readAgentPageContextMock.mockReset();
    explorerShowQueryMock.mockClear();
    showQueryInChatMock
      .mockReset()
      .mockResolvedValue({ kind: "empty", columns: [], rowCount: 0 });
    createOfflineDataAgentMock.mockReset().mockImplementation(() => {
      return { agent: { abort: vi.fn() }, ask: askMock };
    });
    decideMock.mockReset();
  });

  it("answers with the offline agent's reply", async () => {
    const result = await runOfflineDataAgentTurn(
      _createTurnOptions({ chatGeneration: 1 }),
    );

    expect(result.content).toEqual([{ type: "text", text: "42" }]);
  });

  it("runs the agent on the offline bundle through the engine store", async () => {
    await runOfflineDataAgentTurn(_createTurnOptions({ chatGeneration: 2 }));

    const options = _lastAgentOptions();
    expect(options.models).toEqual(LocalChatModel.OFFLINE_BUNDLE);
    expect(options.llm).toBe(OfflineChatEngineStore);
    expect(
      options.datasets.map((dataset) => {
        return dataset.name;
      }),
    ).toEqual(["cases.csv"]);
  });

  it("retains the offline conversation vault mask for its title", async () => {
    const titleMaskRef = {
      current: undefined as ((text: string) => string) | undefined,
    };

    await runOfflineDataAgentTurn(
      _createTurnOptions({ chatGeneration: 6, titleMaskRef }),
    );

    expect(titleMaskRef.current).toBeTypeOf("function");
  });

  it("lets values reach the model without a consent prompt", async () => {
    await runOfflineDataAgentTurn(_createTurnOptions({ chatGeneration: 3 }));

    const isApproved = await _lastAgentOptions().host.approveValuesForModel({
      values: ["Jane Doe"],
      reason: "matched_lookup",
    });

    expect(isApproved).toBe(true);
    expect(decideMock).not.toHaveBeenCalled();
  });

  it("keeps one agent for every turn of a conversation", async () => {
    await runOfflineDataAgentTurn(_createTurnOptions({ chatGeneration: 4 }));
    await runOfflineDataAgentTurn(_createTurnOptions({ chatGeneration: 4 }));

    expect(createOfflineDataAgentMock).toHaveBeenCalledTimes(1);
  });

  it("shows results in the Data Explorer on that page", async () => {
    await runOfflineDataAgentTurn(
      _createTurnOptions({ chatGeneration: 5 }),
      _onPage({ app: "data-explorer" }),
    );

    await _lastAgentOptions().host.showQuery({ sql: "SELECT 1", summary: "s" });

    expect(explorerShowQueryMock).toHaveBeenCalled();
    expect(showQueryInChatMock).not.toHaveBeenCalled();
  });

  it("shows results in the chat on a dashboard page", async () => {
    await runOfflineDataAgentTurn(
      _createTurnOptions({ chatGeneration: 7 }),
      _onPage({
        app: "dashboard",
        dashboard: { id: "d-1", name: "COVID 2022", tiles: [] },
      }),
    );

    await _lastAgentOptions().host.showQuery({ sql: "SELECT 1", summary: "s" });

    expect(showQueryInChatMock).toHaveBeenCalled();
    expect(explorerShowQueryMock).not.toHaveBeenCalled();
  });

  it("shows an offline reply as written, even when it reads like a placeholder", async () => {
    askMock.mockResolvedValue({ text: "<value 1> had 3 visits." });

    const result = await runOfflineDataAgentTurn(
      _createTurnOptions({ chatGeneration: 9 }),
      _onPage({
        app: "dashboard",
        dashboard: {
          id: "d-1",
          name: "COVID 2022",
          tiles: [
            {
              title: "Visits",
              chartType: "table",
              sql: `SELECT * FROM t WHERE "last_name" = 'Doe'`,
            },
          ],
        },
      }),
    );

    expect(result).toEqual({
      content: [{ type: "text", text: "<value 1> had 3 visits." }],
    });
  });

  it("builds device blocks for the offline agent", async () => {
    await runOfflineDataAgentTurn(
      _createTurnOptions({ chatGeneration: 8 }),
      _onPage({
        app: "dashboard",
        dashboard: { id: "d-1", name: "COVID 2022", tiles: [] },
      }),
    );

    const askedText: string = askMock.mock.calls[0]![0];
    expect(askedText.startsWith("<current_page>")).toBe(true);
    expect(askedText).toContain("COVID 2022");
  });

  it("sends a plain question on an empty Data Explorer with no page block", async () => {
    await runOfflineDataAgentTurn(
      _createTurnOptions({ chatGeneration: 9 }),
      _onPage({ app: "data-explorer", explorer: { resultColumns: [] } }),
    );

    expect(askMock.mock.calls[0]![0]).toBe("How many cases?");
  });

  it("sends a follow-up the query on screen, then an unchanged line", async () => {
    const turn = _createTurnOptions({ chatGeneration: 10 });
    const withQuery: AgentPageContext = {
      app: "data-explorer",
      explorer: {
        sql: 'SELECT SUM("cases") FROM "t0"',
        resultColumns: [{ name: "sum", dataType: "bigint" }],
      },
    };

    await runOfflineDataAgentTurn(
      turn,
      _onPage({ app: "data-explorer", explorer: { resultColumns: [] } }),
    );
    await runOfflineDataAgentTurn(turn, _onPage(withQuery));
    await runOfflineDataAgentTurn(turn, _onPage(withQuery));

    expect(askMock.mock.calls[0]![0]).not.toContain("<current_page>");
    expect(askMock.mock.calls[1]![0]).toContain("Query on screen:");
    expect(askMock.mock.calls[2]![0]).toContain(
      "<current_page>Unchanged since the last message.</current_page>",
    );
  });
});
