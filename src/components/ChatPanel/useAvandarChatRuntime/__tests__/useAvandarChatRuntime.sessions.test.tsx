/**
 * The live Assistant UI runtime follows the session selected by
 * `ChatSessionProvider`, preserving each session's thread, pending cards, and
 * context tray while switching.
 */
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CaseDesignKickoff } from "@/components/ChatPanel/CaseDesignKickoff/CaseDesignKickoff";
import { ChatContextTrayStore } from "@/components/ChatPanel/ChatContextTrayStore/ChatContextTrayStore";
import {
  addChatSession,
  createChatSessionIndex,
} from "@/components/ChatPanel/ChatSessionIndex/ChatSessionIndex";
import { commitChatSessionIndex } from "@/components/ChatPanel/ChatSessionStore/ChatSessionStore";
import { ChatThreadStore } from "@/components/ChatPanel/ChatThreadStore/ChatThreadStore";
import {
  USER_ID,
  WORKSPACE_A,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.fixtures";
import {
  getThreadTexts,
  renderAppAt,
  resetHarness,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.harness";
import { harness } from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.mocks";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { ThreadMessageLike } from "@assistant-ui/react";

const IDENTITY = { workspaceId: WORKSPACE_A.id, userId: USER_ID };
const DATASET_REF: Gadget.Ref = {
  gadgetType: "dataset",
  gadgetId: "00000000-0000-4000-8000-000000000001",
  subId: null,
};
const CLARIFICATION = {
  question: "Which year?",
  responseShape: { kind: "free_text" as const },
  turnNumber: 1,
};

function _message(content: string): ThreadMessageLike {
  return {
    id: `${content}-message`,
    role: "user",
    content: [{ type: "text", text: content }],
    metadata: { custom: {} },
  };
}

beforeEach(() => {
  resetHarness();
});

describe("useAvandarChatRuntime sessions", () => {
  it("loads and preserves the selected session's runtime state", async () => {
    const index = addChatSession(
      createChatSessionIndex({ id: "s2", kind: "data" }),
      { id: "s1", kind: "data" },
    );
    commitChatSessionIndex(IDENTITY, index);
    ChatThreadStore.writeRecord({
      ...IDENTITY,
      sessionId: "s1",
      messages: [_message("first")],
      pendingClarification: CLARIFICATION,
    });
    ChatContextTrayStore.write({
      ...IDENTITY,
      sessionId: "s1",
      refs: [DATASET_REF],
    });
    ChatThreadStore.writeRecord({
      ...IDENTITY,
      sessionId: "s2",
      messages: [_message("second")],
    });

    await renderAppAt("/alpha/data-explorer");
    await waitFor(() => {
      expect(getThreadTexts()).toContain("first");
      expect(harness.chatPanelState?.contextTray).toEqual([DATASET_REF]);
    });

    act(() => {
      harness.sessions!.selectSession("s2");
    });
    await waitFor(() => {
      expect(getThreadTexts()).toContain("second");
      expect(harness.chatPanelState?.contextTray).toEqual([]);
    });
    expect(
      ChatThreadStore.readRecord({ ...IDENTITY, sessionId: "s1" }),
    ).toEqual({
      messages: [_message("first")],
      pendingClarification: CLARIFICATION,
    });

    act(() => {
      harness.sessions!.startDataSession();
    });
    await waitFor(() => {
      expect(harness.sessions?.index.selectedId).not.toBe("s2");
      expect(getThreadTexts()).not.toContain(CaseDesignKickoff.CONTENT);
    });
    expect(harness.sessions?.index.openIds).toContain("s2");
    expect(
      ChatThreadStore.readRecord({ ...IDENTITY, sessionId: "s2" }).messages,
    ).toEqual([_message("second")]);

    act(() => {
      harness.sessions!.startCaseDesignSession();
    });
    await waitFor(() => {
      const selectedId = harness.sessions!.index.selectedId;
      expect(harness.sessions?.index.sessions[selectedId]?.kind).toBe(
        "case-design",
      );
      expect(getThreadTexts()).toContain(CaseDesignKickoff.CONTENT);
    });
  });
});
