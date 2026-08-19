import { afterEach, describe, expect, it } from "vitest";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxStepFactsStore } from "@/components/Nux/NuxTour/NuxStepFactsStore/NuxStepFactsStore";
import { useNuxOpenChatPanel } from "@/components/Nux/NuxTour/useNuxOpenChatPanel/useNuxOpenChatPanel";
import { act, render, screen } from "@/test-utils";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

function Harness(): ReactNode {
  useNuxOpenChatPanel();
  const { isOpen } = ChatPanelStateManager.useState();
  return <span data-testid="chat-open">{String(isOpen)}</span>;
}

function _Wrapper({
  children,
  nuxOverrides,
}: {
  children: ReactNode;
  nuxOverrides: Partial<NuxAppState>;
}): ReactNode {
  return (
    <ChatPanelStateManager.Provider
      initialStateOverrides={{
        isOpen: false,
        isAvailable: true,
        layout: "docked",
        caseDesignSessionNonce: 0,
        pendingClarification: undefined,
        pendingCaseTypeDraft: undefined,
      }}
    >
      <NuxStateManager.Provider
        initialStateOverrides={
          {
            isHydrated: true,
            progressId: "p1",
            status: "in_progress",
            completedMilestones: ["add_dataset"],
            isPanelExpanded: true,
            blockedReason: undefined,
            recentDatasetId: "ds-1",
            recentDashboardId: undefined,
            ...nuxOverrides,
          } as NuxAppState
        }
      >
        {children}
      </NuxStateManager.Provider>
    </ChatPanelStateManager.Provider>
  );
}

describe("useNuxOpenChatPanel", () => {
  afterEach(() => {
    act(() => {
      NuxStepFactsStore.setExplorerHasQueryResults(false);
    });
  });
  it("opens the chat panel when the active step requires it", () => {
    render(<Harness />, {
      wrapper: ({ children }) => {
        return (
          <_Wrapper
            nuxOverrides={{
              activeMilestoneKey: "run_query",
              activeStepIndex: 0,
            }}
          >
            {children}
          </_Wrapper>
        );
      },
    });

    expect(screen.getByTestId("chat-open")).toHaveTextContent("true");
  });

  it("opens the chat panel on build_dashboard when the explorer has no results", () => {
    render(<Harness />, {
      wrapper: ({ children }) => {
        return (
          <_Wrapper
            nuxOverrides={{
              activeMilestoneKey: "build_dashboard",
              activeStepIndex: 0,
            }}
          >
            {children}
          </_Wrapper>
        );
      },
    });

    expect(screen.getByTestId("chat-open")).toHaveTextContent("true");
  });

  it("leaves the chat panel closed when the active step does not require it", () => {
    act(() => {
      NuxStepFactsStore.setExplorerHasQueryResults(true);
    });
    render(<Harness />, {
      wrapper: ({ children }) => {
        return (
          <_Wrapper
            nuxOverrides={{
              activeMilestoneKey: "build_dashboard",
              activeStepIndex: 0,
            }}
          >
            {children}
          </_Wrapper>
        );
      },
    });

    expect(screen.getByTestId("chat-open")).toHaveTextContent("false");
  });
});
