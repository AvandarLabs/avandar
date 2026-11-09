import { Model } from "@avandar/models";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { LocalChatModelStore } from "@/stores/LocalChatModelStore/LocalChatModelStore";
import { OfflineModeStore } from "@/stores/OfflineModeStore/OfflineModeStore";
import { createChatModelAdapter } from "./createChatModelAdapter";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { CreateChatModelAdapterOptions } from "./createChatModelAdapter";
import type { ChatModelAdapter } from "@assistant-ui/react";

const {
  apiPostMock,
  runOfflineDataAgentTurnMock,
  runOfflineChatTurnMock,
  runDataAgentTurnMock,
  isAgentEnabledMock,
  offerOfflineFallbackMock,
  loadGadgetsMock,
  detectBiasMock,
  decideConsentMock,
} = vi.hoisted(() => {
  return {
    loadGadgetsMock: vi.fn(),
    detectBiasMock: vi.fn(),
    decideConsentMock: vi.fn(),
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

vi.mock(
  "@/components/ChatPanel/useAvandarChatRuntime/agentMentions/createAgentGadgetContextLoader",
  () => {
    return {
      createAgentGadgetContextLoader: () => {
        return { load: loadGadgetsMock };
      },
    };
  },
);

vi.mock("@/components/privacy/privacy-helpers/detectBias/detectBias", () => {
  return { detectBias: detectBiasMock };
});

vi.mock(
  "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary",
  () => {
    return { decideIfDataCanCrossBoundary: decideConsentMock };
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
const AGENT_ACCESS_DENIED = "Needs Data Explorer access.";
const AGENT_UNAVAILABLE = "Could not answer.";

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
    copyRef: ref({
      offlineModelRequired: OFFLINE_MODEL_REQUIRED,
      agentAccessDenied: AGENT_ACCESS_DENIED,
      agentUnavailable: AGENT_UNAVAILABLE,
    }),
    dataExplorerDispatch: {},
    dashboardEditorDispatch: {},
    chatPanelDispatch: { setPendingClarification: vi.fn() },
    contextTrayRef: ref([]),
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

const CASE_INDIVIDUAL_ID = "33333333-3333-4333-8333-333333333333";

/** A view-change line written before case ids were hidden from it. */
const STORED_CASE_VIEW_LINE =
  "[View changed: app=other; " +
  `route=/acme/individual-manager/c1/${CASE_INDIVIDUAL_ID}; ` +
  "dataset=none; dashboard=none]";

/** Asks with an older case view-change line ahead of the question. */
async function _askAfterStoredCaseView(
  adapter: ChatModelAdapter,
): Promise<unknown> {
  return adapter.run({
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: STORED_CASE_VIEW_LINE }],
        metadata: { custom: { isViewChange: true } },
      },
      {
        role: "user",
        content: [{ type: "text", text: "How many cases?" }],
        metadata: {},
      },
    ],
  } as unknown as Parameters<ChatModelAdapter["run"]>[0]);
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

  it("keeps a stored case id out of today's chat request", async () => {
    await _askAfterStoredCaseView(_createAdapter("dashboards"));

    const sent = JSON.stringify(apiPostMock.mock.calls[0]![0].body.messages);
    expect(sent).toContain("/acme/individual-manager/c1/<case>");
    expect(sent).not.toContain(CASE_INDIVIDUAL_ID);
  });

  it("never rewrites typed text that mentions a case route", async () => {
    const typed =
      "Why does route=/acme/individual-manager/c1/" +
      `${CASE_INDIVIDUAL_ID} look empty?`;

    await _createAdapter("dashboards").run({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: typed }],
          metadata: {},
        },
      ],
    } as unknown as Parameters<ChatModelAdapter["run"]>[0]);

    expect(apiPostMock.mock.calls[0]![0].body.messages[0].content).toBe(typed);
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

  it("keeps a stored case id out of the agent's messages", async () => {
    await _askAfterStoredCaseView(_createAdapter("dashboards"));

    const turn = runDataAgentTurnMock.mock.calls[0]![0];
    expect(JSON.stringify(turn.apiMessages)).not.toContain(CASE_INDIVIDUAL_ID);
  });

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

  it("says it could not answer when the offline offer is declined", async () => {
    runDataAgentTurnMock.mockRejectedValue(new TypeError("Failed to fetch"));
    offerOfflineFallbackMock.mockResolvedValue(false);

    const result = await _ask(_createAdapter("data-explorer"));

    expect(result).toEqual({
      content: [{ type: "text", text: AGENT_UNAVAILABLE }],
    });
    expect(runOfflineDataAgentTurnMock).not.toHaveBeenCalled();
  });

  it("says it could not answer after a network failure with no offline models", async () => {
    window.localStorage.clear();
    runDataAgentTurnMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await _ask(_createAdapter("data-explorer"));

    expect(offerOfflineFallbackMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: AGENT_UNAVAILABLE }],
    });
  });

  it("says it could not answer after a failure that is not a network failure", async () => {
    runDataAgentTurnMock.mockRejectedValue(new Error("model refused"));

    const result = await _ask(_createAdapter("dashboards"));

    expect(offerOfflineFallbackMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: AGENT_UNAVAILABLE }],
    });
  });

  it.each([
    "Proxy error: This action requires at least the 'viewer' role on 'data_explorer' in this workspace",
    "Proxy error: 403 Forbidden",
  ])(
    "says Data Explorer access is needed when the proxy refuses: %s",
    async (message) => {
      runDataAgentTurnMock.mockRejectedValue(new Error(message));

      const result = await _ask(_createAdapter("dashboards"));

      expect(result).toEqual({
        content: [{ type: "text", text: AGENT_ACCESS_DENIED }],
      });
    },
  );

  it("does not turn a stopped turn into a reply", async () => {
    const abort = new DOMException("The run was stopped.", "AbortError");
    runDataAgentTurnMock.mockRejectedValue(abort);

    await expect(_ask(_createAdapter("dashboards"))).rejects.toBe(abort);
  });

  it("still rethrows today's chat failures with the switch off", async () => {
    isAgentEnabledMock.mockReturnValue(false);
    const failure = new Error("Proxy error: 403 Forbidden");
    apiPostMock.mockRejectedValue(failure);

    await expect(_ask(_createAdapter("dashboards"))).rejects.toBe(failure);
    expect(runDataAgentTurnMock).not.toHaveBeenCalled();
  });

  it("still rethrows today's chat failures in the case designer", async () => {
    const failure = new Error("model refused");
    apiPostMock.mockRejectedValue(failure);

    await expect(_ask(_createAdapter("case-manager"))).rejects.toBe(failure);
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

const DATASET_REF: Gadget.Ref = {
  gadgetType: "dataset",
  gadgetId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  subId: null,
};
const DATASET_TOKEN = ChatMentionToken.buildToken(DATASET_REF);
const DATASET_CONTEXT: AgentGadgetContext = {
  kind: "dataset",
  ref: DATASET_REF,
  name: "US deaths",
};
const DASHBOARD_REF: Gadget.Ref = {
  gadgetType: "dashboard",
  gadgetId: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
  subId: null,
};
const DASHBOARD_CONTEXT: AgentGadgetContext = {
  kind: "dashboard",
  ref: DASHBOARD_REF,
  name: "Weekly outbreak",
  tiles: [],
};

/** Every loaded context, keyed as the loader keys them. */
const LOADED_CONTEXTS = new Map(
  [DATASET_CONTEXT, DASHBOARD_CONTEXT].map((context) => {
    return [ChatMentionToken.buildRefKey(context.ref), context] as const;
  }),
);

/** Asks one user message, with the chat's tray holding `tray`. */
async function _askWithMention(
  app: ChatPageContext.T["app"],
  tray: readonly Gadget.Ref[] = [],
  overrides: Partial<CreateChatModelAdapterOptions> = {},
): Promise<unknown> {
  return _createAdapter(app, {
    contextTrayRef: { current: tray },
    ...overrides,
  }).run({
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: `Show ${DATASET_TOKEN}` }],
        metadata: {},
      },
    ],
  } as unknown as Parameters<ChatModelAdapter["run"]>[0]);
}

/** The last message today's chat posted. */
function _postedLastMessage(): { role: string; content: string } {
  return apiPostMock.mock.calls[0]![0].body.messages.at(-1);
}

describe("createChatModelAdapter with mentions", () => {
  beforeEach(() => {
    _setNavigatorOnLine(true);
    isAgentEnabledMock.mockReturnValue(false);
    apiPostMock
      .mockReset()
      .mockResolvedValue(
        Model.make("ChatResponse", { assistantText: "cloud reply" }),
      );
    runDataAgentTurnMock.mockReset().mockResolvedValue({
      content: [{ type: "text", text: "agent reply" }],
    });
    runOfflineDataAgentTurnMock.mockReset().mockResolvedValue({
      content: [{ type: "text", text: "offline agent reply" }],
    });
    runOfflineChatTurnMock
      .mockReset()
      .mockResolvedValue({ assistantText: "offline pipeline reply" });
    loadGadgetsMock.mockReset().mockResolvedValue(LOADED_CONTEXTS);
    detectBiasMock.mockReset().mockReturnValue({ hits: [] });
    decideConsentMock.mockReset().mockResolvedValue({ approved: true });
    LocalChatModel.getModelIdsFromBundle(LocalChatModel.OFFLINE_BUNDLE).forEach(
      LocalChatModelStore.markDownloaded,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(AnalyticsClient.logEvent).mockClear();
    window.localStorage.clear();
  });

  it("sends today's chat names, never tokens", async () => {
    await _askWithMention("dashboards");

    expect(loadGadgetsMock).toHaveBeenCalledWith([DATASET_REF]);
    expect(_postedLastMessage()).toMatchObject({
      role: "user",
      content: 'Show @"US deaths"',
    });
    expect(JSON.stringify(apiPostMock.mock.calls[0]![0].body)).not.toContain(
      "@{",
    );
  });

  it("names mentions as unavailable in today's chat when loading fails", async () => {
    loadGadgetsMock.mockRejectedValue(new Error("network"));

    await _askWithMention("dashboards");

    expect(_postedLastMessage().content).toBe('Show @"an unavailable dataset"');
  });

  it("runs the consent check on the named text", async () => {
    detectBiasMock.mockReturnValue({
      hits: [{ category: "loaded_framing", label: "x", sample: "x" }],
    });

    await _askWithMention("dashboards", [], {
      userRef: { current: { id: "user-1" } },
    } as unknown as Partial<CreateChatModelAdapterOptions>);

    expect(detectBiasMock).toHaveBeenCalledWith('Show @"US deaths"');
    expect(decideConsentMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Show @"US deaths"' }),
    );
    expect(PendingAcks.consumeAckForText).toHaveBeenCalledWith(
      'Show @"US deaths"',
    );
  });

  it("logs counts of mentions and attached items, never names", async () => {
    isAgentEnabledMock.mockReturnValue(true);

    await _askWithMention("dashboards", [DASHBOARD_REF]);

    const event = vi.mocked(AnalyticsClient.logEvent).mock.calls[0]![0];
    expect(event.payload).toMatchObject({
      promptChars: 'Show @"US deaths"'.length,
      mentionCount: 1,
      attachedCount: 1,
    });
    expect(JSON.stringify(event)).not.toContain("@{");
    expect(JSON.stringify(event)).not.toContain("US deaths");
    expect(JSON.stringify(event)).not.toContain(DATASET_REF.gadgetId);
  });

  it("hands the agent raw tokens and the loaded context", async () => {
    isAgentEnabledMock.mockReturnValue(true);

    await _askWithMention("dashboards", [DASHBOARD_REF]);

    const turn = runDataAgentTurnMock.mock.calls[0]![0];
    expect(turn.apiMessages.at(-1).content).toBe(`Show ${DATASET_TOKEN}`);
    expect(turn.gadgetContext).toEqual({
      attachedRefs: [DASHBOARD_REF],
      contexts: LOADED_CONTEXTS,
    });
    expect(loadGadgetsMock).toHaveBeenCalledTimes(1);
    expect(loadGadgetsMock).toHaveBeenCalledWith([DASHBOARD_REF, DATASET_REF]);
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("sends the offline data agent names, never tokens", async () => {
    isAgentEnabledMock.mockReturnValue(true);
    OfflineModeStore.setOn(true);

    await _askWithMention("data-explorer", [DASHBOARD_REF]);

    const turn = runOfflineDataAgentTurnMock.mock.calls[0]![0];
    expect(turn.apiMessages.at(-1).content).toBe('Show @"US deaths"');
    expect(JSON.stringify(turn.apiMessages)).not.toContain("@{");
    expect(turn.gadgetContext).toBeUndefined();
    expect(runDataAgentTurnMock).not.toHaveBeenCalled();
  });

  it("sends the offline pipeline names, never tokens", async () => {
    OfflineModeStore.setOn(true);

    await _askWithMention("dashboards");

    const { messages } = runOfflineChatTurnMock.mock.calls[0]![0];
    expect(messages.at(-1).content).toBe('Show @"US deaths"');
    expect(JSON.stringify(messages)).not.toContain("@{");
  });

  it("ignores the tray with the switch off", async () => {
    await _createAdapter("dashboards", {
      contextTrayRef: { current: [DASHBOARD_REF] },
    }).run({
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "How many cases?" }],
          metadata: {},
        },
      ],
    } as unknown as Parameters<ChatModelAdapter["run"]>[0]);

    expect(loadGadgetsMock).not.toHaveBeenCalled();
    expect(_postedLastMessage().content).toBe("How many cases?");
  });

  it("returns an empty result when the chat was reset while gadgets loaded", async () => {
    const chatGenerationRef = { current: 0 };
    loadGadgetsMock.mockImplementation(async () => {
      chatGenerationRef.current += 1;
      return LOADED_CONTEXTS;
    });

    const result = await _askWithMention("dashboards", [], {
      chatGenerationRef,
    } as unknown as Partial<CreateChatModelAdapterOptions>);

    expect(result).toEqual({ content: [] });
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
