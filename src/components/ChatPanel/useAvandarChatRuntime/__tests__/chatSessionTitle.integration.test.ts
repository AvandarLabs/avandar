import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { requestStoredSessionTitle } from "@/components/ChatPanel/useAvandarChatRuntime/requestStoredSessionTitle";
import type { ChatSessionActions } from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";
import type { ThreadMessageLike } from "@assistant-ui/react";

const { apiPostMock, completeOfflineMock } = vi.hoisted(() => {
  return {
    apiPostMock: vi.fn(),
    completeOfflineMock: vi.fn(),
  };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { post: apiPostMock } };
});

vi.mock("@/stores/OfflineChatEngineStore/OfflineChatEngineStore", () => {
  return {
    OfflineChatEngineStore: { complete: completeOfflineMock },
  };
});

const DATASET_ID = "11111111-1111-4111-8111-111111111111";

function _sessions(
  setSessionTitle: (id: string, title: string) => void,
): ChatSessionActions {
  return {
    index: {
      selectedId: "s1",
      openIds: ["s1"],
      archivedIds: [],
      sessions: {
        s1: { id: "s1", kind: "data", titleIsPlaceholder: true },
      },
    },
    startDataSession: vi.fn(),
    startCaseDesignSession: vi.fn(),
    selectSession: vi.fn(),
    archiveSession: vi.fn(),
    reopenSession: vi.fn(),
    deleteArchivedSession: vi.fn(),
    setSessionTitle,
  };
}

function _messages(
  userText: string,
  options: Readonly<{ isOffline?: boolean }> = {},
): ThreadMessageLike[] {
  return [
    {
      role: "user",
      content: [{ type: "text", text: userText }],
    },
    {
      role: "assistant",
      content: [{ type: "text", text: "42" }],
      metadata: options.isOffline
        ? { custom: { isOfflineAnswer: true } }
        : undefined,
    },
  ];
}

describe("stored chat session titles", () => {
  beforeEach(() => {
    apiPostMock.mockReset().mockResolvedValue({ title: "Case counts" });
    completeOfflineMock.mockReset().mockResolvedValue({ text: "Case counts" });
  });

  it("posts one hosted title with mentions named by type", async () => {
    const token = ChatMentionToken.buildToken({
      gadgetType: "dataset",
      gadgetId: DATASET_ID,
      subId: null,
    });

    requestStoredSessionTitle({
      messages: _messages(`Cases for ${token}`),
      mask: (text) => {
        return text;
      },
      sessionId: "s1",
      workspaceId: "ws-1",
      sessions: _sessions(vi.fn()),
      locale: "en",
      placeholders: { data: "New chat", "case-design": "New case type" },
    });

    await vi.waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledOnce();
    });
    const excerpt = apiPostMock.mock.calls[0]![0].body.excerpt;
    expect(excerpt).toContain('@"dataset"');
    expect(excerpt).not.toContain(DATASET_ID);
  });

  it("masks an offline data-agent title excerpt with its vault", async () => {
    requestStoredSessionTitle({
      messages: _messages("Cases for Jane Doe", { isOffline: true }),
      mask: (text) => {
        return text.replaceAll("Jane Doe", "<value 1>");
      },
      sessionId: "s1",
      workspaceId: "ws-1",
      sessions: _sessions(vi.fn()),
      locale: "en",
      placeholders: { data: "New chat", "case-design": "New case type" },
    });

    await vi.waitFor(() => {
      expect(completeOfflineMock).toHaveBeenCalledOnce();
    });
    const messages = completeOfflineMock.mock.calls[0]![0].messages;
    expect(JSON.stringify(messages)).toContain("Cases for <value 1>");
    expect(JSON.stringify(messages)).not.toContain("Jane Doe");
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
