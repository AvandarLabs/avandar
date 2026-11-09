import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";
import { runOfflineDataAgentTurn } from "./runOfflineDataAgentTurn";
import type { DataAgentTurnOptions } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { CreateOfflineDataAgentOptions } from "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent";

const {
  createOfflineDataAgentMock,
  decideMock,
  explorerShowQueryMock,
  showQueryInChatMock,
} = vi.hoisted(() => {
  return {
    createOfflineDataAgentMock: vi.fn(),
    decideMock: vi.fn(),
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

function _lastAgentOptions(): CreateOfflineDataAgentOptions {
  return createOfflineDataAgentMock.mock.calls.at(-1)![0];
}

describe("runOfflineDataAgentTurn", () => {
  beforeEach(() => {
    createOfflineDataAgentMock.mockReset().mockImplementation(() => {
      return {
        agent: { abort: vi.fn() },
        ask: vi.fn().mockResolvedValue({ text: "42" }),
      };
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

  it("shows results in the Data Explorer", async () => {
    await runOfflineDataAgentTurn(_createTurnOptions({ chatGeneration: 5 }));

    await _lastAgentOptions().host.showQuery({ sql: "SELECT 1", summary: "s" });

    expect(explorerShowQueryMock).toHaveBeenCalled();
    expect(showQueryInChatMock).not.toHaveBeenCalled();
  });
});
