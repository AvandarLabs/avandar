import { Model } from "@avandar/models";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { OfflineModeStore } from "@/stores/OfflineModeStore/OfflineModeStore";
import { createChatModelAdapter } from "./createChatModelAdapter";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { CreateChatModelAdapterOptions } from "./createChatModelAdapter";
import type { ChatModelAdapter } from "@assistant-ui/react";

const {
  apiPostMock,
  runOfflineDataAgentTurnMock,
  runOfflineChatTurnMock,
  runDataAgentTurnMock,
  isAgentEnabledMock,
} = vi.hoisted(() => {
  return {
    apiPostMock: vi.fn(),
    runOfflineDataAgentTurnMock: vi.fn(),
    runOfflineChatTurnMock: vi.fn(),
    runDataAgentTurnMock: vi.fn(),
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

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/runOfflineDataAgentTurn/runOfflineDataAgentTurn",
  () => {
    return { runOfflineDataAgentTurn: runOfflineDataAgentTurnMock };
  },
);

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatTurn",
  () => {
    return { runOfflineChatTurn: runOfflineChatTurnMock };
  },
);

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn",
  () => {
    return { runDataAgentTurn: runDataAgentTurnMock };
  },
);

vi.mock("@/lib/agent/dataAgent/browser/DataAgentFeature", () => {
  return { DataAgentFeature: { isEnabled: isAgentEnabledMock } };
});

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

const OFFLINE_MODEL_REQUIRED = "Download the offline models first.";

function _createAdapter(app: ChatPageContext.T["app"]): ChatModelAdapter {
  const ref = <T>(current: T) => {
    return { current };
  };
  // The adapter reads only these refs and dispatches on the paths under
  // test, so the rest stay empty stand-ins.
  return createChatModelAdapter({
    chatGenerationRef: ref(0),
    lastTurnRef: ref(undefined),
    pageContextRef: ref(Model.make("ChatPageContext", { app })),
    userRef: ref(undefined),
    workspaceIdRef: ref("workspace-1"),
    workspaceRef: ref({ id: "workspace-1" }),
    pathnameRef: ref("/acme/dashboards"),
    dashboardEditorStateRef: ref({}),
    parseSqlRef: ref(vi.fn()),
    copyRef: ref({ offlineModelRequired: OFFLINE_MODEL_REQUIRED }),
    dataExplorerDispatch: {},
    dashboardEditorDispatch: {},
    chatPanelDispatch: { setPendingClarification: vi.fn() },
  } as unknown as CreateChatModelAdapterOptions);
}

async function _ask(adapter: ChatModelAdapter): Promise<unknown> {
  const run = adapter.run({
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: "How many cases?" }],
        metadata: {},
      },
    ],
  } as unknown as Parameters<ChatModelAdapter["run"]>[0]);
  return run;
}

function _setNavigatorOnLine(isOnLine: boolean): void {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(isOnLine);
}

describe("createChatModelAdapter", () => {
  beforeEach(() => {
    isAgentEnabledMock.mockReturnValue(false);
    apiPostMock
      .mockReset()
      .mockResolvedValue(
        Model.make("ChatResponse", { assistantText: "cloud reply" }),
      );
    runOfflineDataAgentTurnMock.mockReset().mockResolvedValue({
      content: [{ type: "text", text: "offline agent reply" }],
    });
    runOfflineChatTurnMock
      .mockReset()
      .mockResolvedValue({ assistantText: "offline pipeline reply" });
    LocalChatModel.getModelIdsFromBundle(LocalChatModel.OFFLINE_BUNDLE).forEach(
      LocalChatModelStore.markDownloaded,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("never sends a model with a cloud chat request", async () => {
    const result = await _ask(_createAdapter("dashboards"));

    expect(result).toEqual({
      content: [{ type: "text", text: "cloud reply" }],
    });
    expect(apiPostMock.mock.calls[0]![0].body).not.toHaveProperty("model");
  });

  it("runs the offline data agent in the Data Explorer with offline mode on", async () => {
    OfflineModeStore.setOn(true);

    const result = await _ask(_createAdapter("data-explorer"));

    expect(result).toEqual({
      content: [{ type: "text", text: "offline agent reply" }],
    });
    expect(runOfflineDataAgentTurnMock).toHaveBeenCalledTimes(1);
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("runs the offline pipeline outside the Data Explorer with offline mode on", async () => {
    OfflineModeStore.setOn(true);

    const result = await _ask(_createAdapter("dashboards"));

    expect(result).toEqual({
      content: [{ type: "text", text: "offline pipeline reply" }],
    });
    expect(runOfflineDataAgentTurnMock).not.toHaveBeenCalled();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("runs offline when the browser is offline and the bundle is downloaded", async () => {
    _setNavigatorOnLine(false);

    await _ask(_createAdapter("data-explorer"));

    expect(runOfflineDataAgentTurnMock).toHaveBeenCalledTimes(1);
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("sends nothing and says so when offline mode lacks the offline models", async () => {
    OfflineModeStore.setOn(true);
    window.localStorage.removeItem("avandar.offlineChat.downloadedModels");

    const result = await _ask(_createAdapter("data-explorer"));

    expect(result).toEqual({
      content: [{ type: "text", text: OFFLINE_MODEL_REQUIRED }],
    });
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(runOfflineDataAgentTurnMock).not.toHaveBeenCalled();
  });
});

describe("createChatModelAdapter with the agent on", () => {
  beforeEach(() => {
    _setNavigatorOnLine(true);
    isAgentEnabledMock.mockReturnValue(true);
    apiPostMock
      .mockReset()
      .mockResolvedValue(
        Model.make("ChatResponse", { assistantText: "cloud reply" }),
      );
    runDataAgentTurnMock.mockReset().mockResolvedValue({
      content: [{ type: "text", text: "agent reply" }],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it.each(["data-explorer", "dashboards", "data-sources", "other"] as const)(
    "answers on %s with the agent",
    async (app) => {
      await _ask(_createAdapter(app));

      expect(runDataAgentTurnMock).toHaveBeenCalledTimes(1);
      expect(apiPostMock).not.toHaveBeenCalled();
    },
  );

  it("passes the page state to the agent", async () => {
    await _ask(_createAdapter("dashboards"));

    expect(runDataAgentTurnMock).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1" }),
      expect.objectContaining({
        pathname: "/acme/dashboards",
        chatPageContext: expect.objectContaining({ app: "dashboards" }),
      }),
    );
  });

  it("keeps the case designer on today's chat", async () => {
    await _ask(_createAdapter("case-manager"));

    expect(runDataAgentTurnMock).not.toHaveBeenCalled();
    expect(apiPostMock).toHaveBeenCalledTimes(1);
  });

  it("uses today's chat everywhere while the switch is off", async () => {
    isAgentEnabledMock.mockReturnValue(false);

    await _ask(_createAdapter("data-explorer"));

    expect(runDataAgentTurnMock).not.toHaveBeenCalled();
    expect(apiPostMock).toHaveBeenCalledTimes(1);
  });
});
