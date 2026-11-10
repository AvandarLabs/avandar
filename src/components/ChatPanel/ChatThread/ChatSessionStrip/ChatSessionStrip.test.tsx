/** Behavioral tests for the visible, overflow, and archived chat sessions. */

import { describe, expect, it, vi } from "vitest";
import {
  selectChatSession,
  type ChatSessionIndex,
} from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import {
  ChatSessionContext,
  type ChatSessionActions,
} from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";
import { fireEvent, render, screen } from "@/test-utils";
import { ChatSessionStrip } from "./ChatSessionStrip";

function _createIndex(): ChatSessionIndex {
  return selectChatSession(
    {
      selectedId: "data-new",
      openIds: ["data-new", "case-new", "named", "selected"],
      archivedIds: ["closed-one", "closed-two"],
      sessions: {
        "data-new": {
          id: "data-new",
          kind: "data",
          titleIsPlaceholder: true,
        },
        "case-new": {
          id: "case-new",
          kind: "case-design",
          titleIsPlaceholder: true,
        },
        named: {
          id: "named",
          kind: "data",
          title: "Case counts",
          titleIsPlaceholder: false,
        },
        selected: {
          id: "selected",
          kind: "data",
          title: "Selected chat",
          titleIsPlaceholder: false,
        },
        "closed-one": {
          id: "closed-one",
          kind: "data",
          title: "Closed one",
          titleIsPlaceholder: false,
        },
        "closed-two": {
          id: "closed-two",
          kind: "data",
          title: "Closed two",
          titleIsPlaceholder: false,
        },
      },
    },
    "selected",
  );
}

function _createActions(): ChatSessionActions {
  return {
    index: _createIndex(),
    startDataSession: vi.fn(),
    startCaseDesignSession: vi.fn(),
    selectSession: vi.fn(),
    archiveSession: vi.fn(),
    reopenSession: vi.fn(),
    deleteArchivedSession: vi.fn(),
    setSessionTitle: vi.fn(),
  };
}

function _renderStrip(): ChatSessionActions {
  const actions = _createActions();
  render(
    <ChatSessionContext.Provider value={actions}>
      <ChatSessionStrip />
    </ChatSessionContext.Provider>,
  );
  return actions;
}

describe("ChatSessionStrip", () => {
  it("shows three tabs with session labels and close actions", () => {
    const actions = _renderStrip();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "New chat" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "New case type" }),
    ).toBeInTheDocument();

    const closeActions = screen.getAllByRole("button", {
      name: "Close chat",
    });
    expect(closeActions).toHaveLength(3);
    fireEvent.click(closeActions[0]);
    expect(actions.archiveSession).toHaveBeenCalledWith("selected");
  });

  it("selects an open chat from overflow", async () => {
    const actions = _renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "More chats" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Case counts" }),
    );
    expect(actions.selectSession).toHaveBeenCalledWith("named");
  });

  it("reopens or deletes each closed chat without selecting it", async () => {
    const actions = _renderStrip();
    fireEvent.click(screen.getByRole("button", { name: "Closed chats" }));
    const [reopenActions, deleteActions] = await Promise.all([
      screen.findAllByRole("button", { name: "Reopen chat" }),
      screen.findAllByRole("button", { name: "Delete chat" }),
    ]);
    expect(reopenActions).toHaveLength(2);
    expect(deleteActions).toHaveLength(2);
    [...reopenActions, ...deleteActions].forEach((action) => {
      expect(action.closest('[role="menuitem"]')).toBeNull();
    });

    fireEvent.click(reopenActions[1]);
    expect(actions.reopenSession).toHaveBeenCalledWith("closed-two");
    fireEvent.click(deleteActions[0]);
    expect(actions.deleteArchivedSession).toHaveBeenCalledWith("closed-one");
    expect(actions.selectSession).not.toHaveBeenCalled();
  });

  it("renders nothing while chat sessions are unavailable", () => {
    render(
      <ChatSessionContext.Provider value={undefined}>
        <ChatSessionStrip />
      </ChatSessionContext.Provider>,
    );

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
