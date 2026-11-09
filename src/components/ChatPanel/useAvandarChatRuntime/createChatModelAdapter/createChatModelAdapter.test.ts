import { Model } from "@avandar/models";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
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
  offerOfflineFallbackMock,
} = vi.hoisted(() => {
  return {
    apiPostMock: vi.fn(),
    runOfflineDataAgentTurnMock: vi.fn(),
    runOfflineChatTurnMock: vi.fn(),
    runDataAgentTurnMock: vi.fn(),
    isAgentEnabledMock: vi.fn(),
    offerOfflineFallbackMock: vi.fn(),
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

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/offerOfflineChatFallback",
  () => {
    return { offerOfflineChatFallback: offerOfflineFallbackMock };
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

function _createAdapter(
  app: ChatPageContext.T["app"],
  overrides: Partial<CreateChatModelAdapterOptions> = {},
): ChatModelAdapter {
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
    ...overrides,
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
    runOfflineDataAgentTurnMock.mockReset().mockResolvedValue({
      content: [{ type: "text", text: "offline agent reply" }],
    });
    offerOfflineFallbackMock.mockReset().mockResolvedValue(true);
    LocalChatModel.getModelIdsFromBundle(LocalChatModel.OFFLINE_BUNDLE).forEach(
      LocalChatModelStore.markDownloaded,
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
    await _ask(
      _createAdapter("dashboards", {
        dashboardEditorStateRef: { current: { selectedItem: "tile-1" } },
      } as unknown as Partial<CreateChatModelAdapterOptions>),
    );

    expect(runDataAgentTurnMock).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "workspace-1" }),
      expect.objectContaining({
        pathname: "/acme/dashboards",
        chatPageContext: expect.objectContaining({ app: "dashboards" }),
        dashboardEditorState: { selectedItem: "tile-1" },
      }),
    );
  });

  it("keeps the page from when the turn started after a navigation", async () => {
    const pathnameRef = { current: "/acme/dashboards" };
    const dashboardEditorStateRef = { current: { selectedItem: "tile-1" } };
    // The user navigates while the adapter waits on consent acks.
    vi.mocked(PendingAcks.consumeAckForText).mockImplementationOnce(
      async () => {
        pathnameRef.current = "/acme/data-explorer";
        dashboardEditorStateRef.current = { selectedItem: "tile-2" };
        return undefined;
      },
    );

    await _ask(
      _createAdapter("dashboards", {
        pathnameRef,
        dashboardEditorStateRef,
      } as unknown as Partial<CreateChatModelAdapterOptions>),
    );

    expect(runDataAgentTurnMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        pathname: "/acme/dashboards",
        dashboardEditorState: { selectedItem: "tile-1" },
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

  it("offers the offline fallback when the agent cannot be reached", async () => {
    runDataAgentTurnMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await _ask(_createAdapter("data-explorer"));

    expect(offerOfflineFallbackMock).toHaveBeenCalledTimes(1);
    expect(runOfflineDataAgentTurnMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      content: [{ type: "text", text: "offline agent reply" }],
    });
  });

  it("rethrows an agent network failure when the fallback is declined", async () => {
    const failure = new TypeError("Failed to fetch");
    runDataAgentTurnMock.mockRejectedValue(failure);
    offerOfflineFallbackMock.mockResolvedValue(false);

    await expect(_ask(_createAdapter("data-explorer"))).rejects.toBe(failure);
    expect(runOfflineDataAgentTurnMock).not.toHaveBeenCalled();
  });

  it("rethrows an agent failure that is not a network failure", async () => {
    const failure = new Error("model refused");
    runDataAgentTurnMock.mockRejectedValue(failure);

    await expect(_ask(_createAdapter("data-explorer"))).rejects.toBe(failure);
    expect(offerOfflineFallbackMock).not.toHaveBeenCalled();
  });

  it("routes to the offline turn, not the agent, with offline mode on", async () => {
    OfflineModeStore.setOn(true);

    await _ask(_createAdapter("data-explorer"));

    expect(runOfflineDataAgentTurnMock).toHaveBeenCalledTimes(1);
    expect(runDataAgentTurnMock).not.toHaveBeenCalled();
  });

  it("returns an empty result when the chat was reset during the agent turn", async () => {
    const chatGenerationRef = { current: 0 };
    runDataAgentTurnMock.mockImplementation(async () => {
      chatGenerationRef.current += 1;
      return { content: [{ type: "text", text: "agent reply" }] };
    });

    const result = await _ask(
      _createAdapter("dashboards", {
        chatGenerationRef,
      } as unknown as Partial<CreateChatModelAdapterOptions>),
    );

    expect(result).toEqual({ content: [] });
  });

  it("returns an empty result when the chat was reset as the agent failed", async () => {
    const chatGenerationRef = { current: 0 };
    runDataAgentTurnMock.mockImplementation(async () => {
      chatGenerationRef.current += 1;
      throw new TypeError("Failed to fetch");
    });

    const result = await _ask(
      _createAdapter("data-explorer", {
        chatGenerationRef,
      } as unknown as Partial<CreateChatModelAdapterOptions>),
    );

    expect(result).toEqual({ content: [] });
    expect(offerOfflineFallbackMock).not.toHaveBeenCalled();
  });
});
