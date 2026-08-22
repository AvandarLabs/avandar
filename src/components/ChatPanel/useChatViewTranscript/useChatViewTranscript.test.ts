/** Behavioral tests for the reset payload built from live thread messages. */
import { useThreadRuntime } from "@assistant-ui/react";
import { useRouterState } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import { ChatViewEvent } from "@/components/ChatPanel/ChatViewEvent/ChatViewEvent";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { renderHook } from "@/test-utils";

import {
  makeNewChatThreadMessagesFromPageContext,
  makeThreadMessagesFromSnapshot,
} from "./makeThreadMessagesFromSnapshot";
import { makeLikesFromThreadMessages } from "./threadMessageHelpers";
import { useChatViewTranscript } from "./useChatViewTranscript";

const { getStateMock, resetMock } = vi.hoisted(() => {
  return {
    getStateMock: vi.fn(() => {
      return { messages: [] };
    }),
    resetMock: vi.fn(),
  };
});

vi.mock("@assistant-ui/react", () => {
  return {
    useThreadRuntime: vi.fn(),
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useRouterState: vi.fn(),
  };
});

vi.mock("@/components/ChatPanel/useChatPageContext", () => {
  return {
    useChatPageContext: vi.fn(),
  };
});

const EXPLORER = ChatViewEvent.makeSnapshotFromPageContext({
  pageContext: ChatPageContext.createDataExplorerViewContext({
    openDatasetId: "ds-1",
    lastSql: "select 1",
    lastError: "boom",
  }),
  route: "/acme/data-explorer",
});

const DASHBOARD = ChatViewEvent.makeSnapshotFromPageContext({
  pageContext: ChatPageContext.createDashboardsViewContext({
    dashboardId: "11111111-1111-4111-8111-111111111111",
  }),
  route: "/acme/dashboards/edit/11111111-1111-4111-8111-111111111111",
});

function _fakeThreadMessage(options: {
  id: string;
  text: string;
  custom?: Record<string, unknown>;
}): {
  id: string;
  role: "user";
  content: [{ type: "text"; text: string }];
  metadata: { custom: Record<string, unknown> };
} {
  return {
    id: options.id,
    role: "user",
    content: [{ type: "text", text: options.text }],
    metadata: { custom: options.custom ?? {} },
  };
}

describe("makeNewChatThreadMessagesFromPageContext", () => {
  it("reseeds a pending view event onto an empty thread from the current page", () => {
    const messages = makeNewChatThreadMessagesFromPageContext({
      pageContext: {
        app: "data-explorer",
        openDatasetId: "ds-1",
      },
      pathname: "/acme/data-explorer",
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe(ChatViewEvent.format(EXPLORER));
    expect(messages[0]?.metadata).toEqual(ChatViewEvent.metadata);
  });
});

describe("makeThreadMessagesFromSnapshot", () => {
  it("appends one view message onto an empty thread", () => {
    const next = makeThreadMessagesFromSnapshot({
      messages: [],
      snapshot: EXPLORER,
    });

    expect(next).toHaveLength(1);
    expect(next[0]?.role).toBe("user");
    expect(next[0]?.content).toBe(ChatViewEvent.format(EXPLORER));
    expect(next[0]?.metadata).toEqual(ChatViewEvent.metadata);
  });

  it("replaces a trailing explorer view with a dashboard snapshot", () => {
    const current = makeLikesFromThreadMessages([
      _fakeThreadMessage({
        id: "view-1",
        text: ChatViewEvent.format(EXPLORER),
        custom: { isViewChange: true },
      }),
    ]);
    const next = makeThreadMessagesFromSnapshot({
      messages: current,
      snapshot: DASHBOARD,
    });

    expect(next).toHaveLength(1);
    expect(next[0]?.content).toBe(ChatViewEvent.format(DASHBOARD));
    expect(next[0]?.metadata).toEqual(ChatViewEvent.metadata);
  });

  it("appends a view message after a user text message", () => {
    const current = makeLikesFromThreadMessages([
      _fakeThreadMessage({
        id: "view-1",
        text: ChatViewEvent.format(EXPLORER),
        custom: { isViewChange: true },
      }),
      _fakeThreadMessage({
        id: "user-1",
        text: "count rows",
        custom: { isDiscoveryContinuation: true },
      }),
    ]);
    const next = makeThreadMessagesFromSnapshot({
      messages: current,
      snapshot: DASHBOARD,
    });

    expect(next).toHaveLength(3);
    expect(next[0]?.id).toBe("view-1");
    expect(next[0]?.metadata?.custom).toEqual({ isViewChange: true });
    expect(next[1]?.content).toEqual([{ type: "text", text: "count rows" }]);
    expect(next[1]?.metadata?.custom).toEqual({
      isDiscoveryContinuation: true,
    });
    expect(next[2]?.content).toBe(ChatViewEvent.format(DASHBOARD));
  });
});

describe("useChatViewTranscript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useThreadRuntime).mockReturnValue({
      getState: getStateMock,
      reset: resetMock,
    } as unknown as ReturnType<typeof useThreadRuntime>);
    vi.mocked(useRouterState).mockImplementation(((options?: {
      select?: (state: { location: { pathname: string } }) => unknown;
    }) => {
      const pathname = "/acme/data-explorer";
      const routerState = { location: { pathname } };
      if (options?.select) {
        return options.select(routerState);
      }
      return routerState;
    }) as typeof useRouterState);
  });

  it("does not re-sync when only lastSql changes", () => {
    const explorerContext = ChatPageContext.createDataExplorerViewContext({
      openDatasetId: "ds-1",
      lastSql: "select 1",
    });
    vi.mocked(useChatPageContext).mockReturnValue(explorerContext);

    const { rerender } = renderHook(() => {
      return useChatViewTranscript();
    });

    expect(getStateMock).toHaveBeenCalledTimes(1);
    expect(resetMock).toHaveBeenCalledTimes(1);

    getStateMock.mockClear();
    resetMock.mockClear();

    vi.mocked(useChatPageContext).mockReturnValue({
      ...explorerContext,
      lastSql: "select 2",
    });
    rerender();

    expect(getStateMock).not.toHaveBeenCalled();
    expect(resetMock).not.toHaveBeenCalled();
  });
});
