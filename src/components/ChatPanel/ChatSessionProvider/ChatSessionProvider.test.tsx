/** Behavioral tests for the shared chat session index. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ChatThreadStore } from "@/components/ChatPanel/ChatThreadStore/ChatThreadStore";
import { ChatSessionProvider } from "./ChatSessionProvider";
import { useChatSessions } from "./useChatSessions";
import type { ReactNode } from "react";

const IDENTITY = { workspaceId: "ws-1", userId: "user-1" };

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: IDENTITY.workspaceId };
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import("@tanstack/react-router")>()),
    useParams: () => {
      return { workspaceSlug: "ws-1" };
    },
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: IDENTITY.userId };
    },
  };
});

function SessionConsumer(): ReactNode {
  const sessions = useChatSessions();
  const { layout } = ChatPanelStateManager.useState();
  if (!sessions) {
    return <div data-testid="session-state">pending</div>;
  }
  const selected = sessions.index.sessions[sessions.index.selectedId];
  return (
    <>
      <div data-testid="session-state">
        {sessions.index.selectedId}:{selected?.kind}
      </div>
      <div data-testid="open-ids">{sessions.index.openIds.join(",")}</div>
      <div data-testid="layout">{layout}</div>
      <button type="button" onClick={sessions.startDataSession}>
        Start data
      </button>
      <button
        type="button"
        onClick={() => {
          sessions.archiveSession(sessions.index.selectedId);
        }}
      >
        Archive selected
      </button>
    </>
  );
}

function Harness(): ReactNode {
  return (
    <ChatPanelStateManager.Provider
      initialStateOverrides={{
        isOpen: false,
        isAvailable: true,
        layout: "composer",
        pendingClarification: undefined,
        pendingCaseTypeDraft: undefined,
        contextTray: [],
      }}
    >
      <ChatSessionProvider>
        <SessionConsumer />
      </ChatSessionProvider>
    </ChatPanelStateManager.Provider>
  );
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("ChatSessionProvider", () => {
  it("migrates the legacy thread and replaces the last archived session", async () => {
    ChatThreadStore.write({
      ...IDENTITY,
      messages: [{ role: "user", content: "kept" }],
    });
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000003")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000004");

    render(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId("session-state")).toHaveTextContent(
        "00000000-0000-4000-8000-000000000001:data",
      );
    });
    expect(
      ChatThreadStore.readRecord({
        ...IDENTITY,
        sessionId: "00000000-0000-4000-8000-000000000001",
      }).messages,
    ).toEqual([{ role: "user", content: "kept" }]);

    fireEvent.click(screen.getByRole("button", { name: "Start data" }));

    expect(screen.getByTestId("open-ids")).toHaveTextContent(
      "00000000-0000-4000-8000-000000000002," +
        "00000000-0000-4000-8000-000000000001",
    );
    expect(screen.getByTestId("layout")).toHaveTextContent("composer");

    fireEvent.click(screen.getByRole("button", { name: "Archive selected" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive selected" }));

    expect(screen.getByTestId("session-state")).toHaveTextContent(
      "00000000-0000-4000-8000-000000000004:data",
    );
    expect(screen.getByTestId("open-ids")).toHaveTextContent(
      "00000000-0000-4000-8000-000000000004",
    );
    expect(screen.getByTestId("layout")).toHaveTextContent("composer");
  });
});
