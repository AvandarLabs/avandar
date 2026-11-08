import { Model } from "@avandar/models";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runDataAgentTurn } from "./runDataAgentTurn";
import type { AgentPageInputs } from "./runDataAgentTurn";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { CreateDataAgentOptions } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";

const {
  askMock,
  createDataAgentMock,
  createAgentPageContextMock,
  getAllDatasetsMock,
  showQueryInChatMock,
} = vi.hoisted(() => {
  return {
    askMock: vi.fn(),
    createDataAgentMock: vi.fn(),
    createAgentPageContextMock: vi.fn(),
    getAllDatasetsMock: vi.fn(),
    showQueryInChatMock: vi.fn(),
  };
});

vi.mock("@/lib/agent/dataAgent/createDataAgent/createDataAgent", () => {
  return { createDataAgent: createDataAgentMock };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getAllDatasetsWithColumns: getAllDatasetsMock } };
});

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/agentPageNameLoader",
  () => {
    return {
      createAgentPageNameLoader: () => {
        return {
          getDashboard: vi.fn().mockResolvedValue(undefined),
          getMapName: vi.fn().mockResolvedValue(undefined),
          getCaseTypeName: vi.fn().mockResolvedValue(undefined),
        };
      },
    };
  },
);

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext",
  async (importOriginal) => {
    const original = await importOriginal<{
      createAgentPageContext: (...args: never[]) => unknown;
    }>();
    createAgentPageContextMock.mockImplementation(
      original.createAgentPageContext,
    );
    return { createAgentPageContext: createAgentPageContextMock };
  },
);

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/showQueryInChat",
  () => {
    return { showQueryInChat: showQueryInChatMock };
  },
);

const DATASET_A = {
  id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  name: "cases.csv",
  columns: [],
};
/** Sorts before A, so a list with it would make A's alias `t1`. */
const DATASET_B = {
  id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  name: "deaths.csv",
  columns: [],
};
const DASHBOARD_ID = "cccccccc-3333-4333-8333-cccccccccccc";

function _turn(
  workspaceId: string,
  content: string,
  chatGeneration = 0,
): DataAgentTurnOptions {
  return {
    apiMessages: [{ role: "user", content }],
    workspaceId,
    currentUser: undefined,
    chatGeneration,
    parseSqlRef: { current: vi.fn() },
    dataExplorerDispatch: {},
    chatPanelDispatch: { setPendingClarification: vi.fn() },
  } as unknown as DataAgentTurnOptions;
}

function _page(pathname: string): AgentPageInputs {
  return {
    pathname,
    chatPageContext: Model.make("ChatPageContext", { app: "other" }),
    dashboardEditorState: {
      activeDashboardId: undefined,
      editorData: undefined,
    } as never,
  };
}

function _askedTexts(): string[] {
  return askMock.mock.calls.map(([text]) => {
    return text as string;
  });
}

function _lastAgentOptions(): CreateDataAgentOptions {
  return createDataAgentMock.mock.calls.at(-1)![0];
}

beforeEach(() => {
  askMock.mockResolvedValue({ text: "Done." });
  createDataAgentMock.mockImplementation(() => {
    return { agent: { abort: vi.fn() }, ask: askMock };
  });
  showQueryInChatMock.mockResolvedValue({
    kind: "empty",
    columns: [],
    rowCount: 0,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("runDataAgentTurn", () => {
  it("names tables in the page block as the agent knows them", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    await runDataAgentTurn(
      _turn("workspace-aliases", "How many?"),
      _page("/acme/data-explorer"),
    );
    getAllDatasetsMock.mockResolvedValue([DATASET_A, DATASET_B]);

    await runDataAgentTurn(
      _turn("workspace-aliases", "And this one?"),
      _page(`/acme/data-manager/${DATASET_A.id}`),
    );

    expect(getAllDatasetsMock).toHaveBeenCalledTimes(1);
    expect(_askedTexts()[1]).toContain('Open dataset: t0 = "cases.csv"');
  });

  it("keeps the page and shows results in the chat when reading it fails", async () => {
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    createAgentPageContextMock.mockRejectedValueOnce(new Error("bad editor"));

    await runDataAgentTurn(
      _turn("workspace-fallback", "How many?"),
      _page(`/acme/dashboards/edit/${DASHBOARD_ID}`),
    );
    await _lastAgentOptions().host.showQuery({ sql: "SELECT 1", summary: "s" });

    expect(_askedTexts()[0]).toContain("Page: Dashboard");
    expect(showQueryInChatMock).toHaveBeenCalled();
  });
});
