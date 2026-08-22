import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/chatClarify.types";
import type { ClarificationAnswerHandler } from "@/components/ChatPanel/ClarificationCard/ClarificationAnswerModule/ClarificationAnswer";

import { useThreadRuntime } from "@assistant-ui/react";
import { Model } from "@avandar/models";
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { render } from "@/test-utils";

import { PendingClarificationBlock } from "./PendingClarificationBlock";

const {
  appendMock,
  decideIfDataCanCrossBoundaryMock,
  recordOutcomeMock,
  setPendingClarificationMock,
  useStateMock,
  clarificationCardHarness,
} = vi.hoisted(() => {
  return {
    appendMock: vi.fn(),
    decideIfDataCanCrossBoundaryMock: vi.fn(),
    recordOutcomeMock: vi.fn().mockResolvedValue(undefined),
    setPendingClarificationMock: vi.fn(),
    useStateMock: vi.fn(),
    clarificationCardHarness: {
      onAnswer: undefined as ClarificationAnswerHandler | undefined,
      onRequestDifferentDiscovery: undefined as (() => void) | undefined,
    },
  };
});

vi.mock("@assistant-ui/react", () => {
  return {
    useThreadRuntime: vi.fn(),
  };
});

vi.mock(
  "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient",
  () => {
    return {
      ClarificationAuditEntryClient: {
        recordOutcome: recordOutcomeMock,
      },
    };
  },
);

vi.mock(
  "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager",
  () => {
    return {
      ChatPanelStateManager: {
        useState: useStateMock,
        useDispatch: () => {
          return {
            setPendingClarification: setPendingClarificationMock,
          };
        },
      },
    };
  },
);

vi.mock("@/components/ChatPanel/ClarificationCard/ClarificationCard", () => {
  return {
    ClarificationCard: ({
      onAnswer,
      onRequestDifferentDiscovery,
    }: {
      onAnswer: ClarificationAnswerHandler;
      onRequestDifferentDiscovery?: () => void;
    }) => {
      clarificationCardHarness.onAnswer = onAnswer;
      clarificationCardHarness.onRequestDifferentDiscovery =
        onRequestDifferentDiscovery;
      return <div>Clarification card</div>;
    },
  };
});

vi.mock(
  "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary",
  () => {
    return {
      decideIfDataCanCrossBoundary: decideIfDataCanCrossBoundaryMock,
    };
  },
);

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: vi.fn(),
  };
});

const pendingClarification = {
  auditId: "clarification-audit-1",
  question: "Which option?",
  responseShape: {
    kind: "fixed_options",
    options: ["First", "Second"],
    multi: false,
  },
  turnNumber: 1,
} satisfies ChatClarifyRequestWithAudit;

describe("PendingClarificationBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clarificationCardHarness.onAnswer = undefined;
    clarificationCardHarness.onRequestDifferentDiscovery = undefined;
    useStateMock.mockReturnValue({
      pendingClarification,
    });
    vi.mocked(useThreadRuntime).mockReturnValue({
      append: appendMock,
    } as unknown as ReturnType<typeof useThreadRuntime>);
    vi.mocked(useCurrentWorkspace).mockReturnValue(
      Model.make("Workspace", {
        id: "workspace-1" as Workspace.Id,
        ownerId: "user-1" as User.Id,
        name: "Test workspace",
        slug: "test-workspace",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        subscription: undefined,
      }),
    );
    vi.mocked(useCurrentUser).mockReturnValue(
      Model.make("User", {
        id: "user-1" as User.Id,
        aud: "authenticated",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00.000Z",
        email: "test@example.com",
      }),
    );
  });

  it("records the answered outcome with the pending audit id", async () => {
    render(<PendingClarificationBlock />);

    await act(async () => {
      await clarificationCardHarness.onAnswer?.({
        answer: { kind: "preset", value: "First" },
      });
    });

    expect(ClarificationAuditEntryClient.recordOutcome).toHaveBeenCalledWith({
      id: pendingClarification.auditId,
      outcome: "answered",
    });
    expect(appendMock).toHaveBeenCalledWith("[Clarification answer: First]");
  });

  it("records cancellation with the pending audit id when boundary consent is rejected", async () => {
    decideIfDataCanCrossBoundaryMock.mockResolvedValue({
      approved: false,
      reason: "cancelled",
    });
    useStateMock.mockReturnValue({
      pendingClarification: {
        ...pendingClarification,
        responseShape: { kind: "free_text" },
      },
    });
    render(<PendingClarificationBlock />);

    let wasSubmitted: boolean | void = undefined;
    await act(async () => {
      wasSubmitted = await clarificationCardHarness.onAnswer?.({
        answer: { kind: "custom", text: "Sensitive answer" },
      });
    });

    expect(wasSubmitted).toBe(false);
    expect(decideIfDataCanCrossBoundary).toHaveBeenCalled();
    expect(ClarificationAuditEntryClient.recordOutcome).toHaveBeenCalledWith({
      id: pendingClarification.auditId,
      outcome: "cancelled",
    });
  });

  it("unblocks the thread and requests a different lookup", async () => {
    useStateMock.mockReturnValue({
      pendingClarification: {
        ...pendingClarification,
        responseShape: {
          kind: "discovery",
          query: 'SELECT DISTINCT "state" FROM "mortality"',
          column: "state",
          multi: false,
          candidateValues: ["California", "CA"],
        },
      },
    });
    render(<PendingClarificationBlock />);

    await act(async () => {
      await clarificationCardHarness.onRequestDifferentDiscovery?.();
    });

    expect(setPendingClarificationMock).toHaveBeenCalledWith(undefined);
    expect(recordOutcomeMock).toHaveBeenCalledWith({
      id: pendingClarification.auditId,
      outcome: "cancelled",
    });
    expect(appendMock).toHaveBeenCalledWith(
      expect.stringContaining("different column or lookup query"),
    );
  });

  it("hides an accepted automatic discovery answer from presentation", async () => {
    useStateMock.mockReturnValue({
      pendingClarification: {
        ...pendingClarification,
        responseShape: {
          kind: "discovery",
          query: 'SELECT DISTINCT "state" FROM "mortality"',
          column: "state",
          multi: false,
          candidateValues: ["California", "CA"],
        },
      },
    });
    decideIfDataCanCrossBoundaryMock.mockResolvedValue({
      approved: true,
      payload: { values: ["California"] },
    });
    render(<PendingClarificationBlock />);

    await act(async () => {
      await clarificationCardHarness.onAnswer?.({
        answer: { kind: "preset", value: "California" },
        isInternalDiscovery: true,
      });
    });

    expect(appendMock).toHaveBeenCalledWith({
      role: "user",
      content: [{ type: "text", text: "[Clarification answer: California]" }],
      metadata: {
        custom: { isDiscoveryContinuation: true },
      },
    });
  });
});
