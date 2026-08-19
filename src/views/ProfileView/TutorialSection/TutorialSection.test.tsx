import { beforeEach, describe, expect, it, vi } from "vitest";
import { restartFirstDashboardTutorial } from "@/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial";
import { useNuxNavigation } from "@/components/Nux/NuxRoot/useNuxNavigation";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility/useNuxEligibility";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { fireEvent, render, screen } from "@/test-utils";
import { TutorialSection } from "@/views/ProfileView/TutorialSection/TutorialSection";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

vi.mock("@/components/Nux/useNuxEligibility/useNuxEligibility", () => {
  return { useNuxEligibility: vi.fn() };
});

vi.mock("@/components/Nux/NuxRoot/useNuxNavigation", () => {
  return { useNuxNavigation: vi.fn() };
});

vi.mock(
  "@/components/Nux/NuxRoot/restartFirstDashboardTutorial/restartFirstDashboardTutorial",
  () => {
    return { restartFirstDashboardTutorial: vi.fn() };
  },
);

const { logEventMock } = vi.hoisted(() => {
  return { logEventMock: vi.fn() };
});

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return {
    AnalyticsClient: { logEvent: logEventMock },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
});

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";
const openMilestoneMock = vi.fn();

function renderWithNuxState(
  stateOverrides: Partial<NuxAppState> = {},
): ReturnType<typeof render> {
  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <NuxStateManager.Provider
        initialStateOverrides={
          {
            isHydrated: true,
            progressId: "p1",
            status: "in_progress",
            completedMilestones: ["add_dataset", "run_query"],
            activeMilestoneKey: "run_query",
            activeStepIndex: 0,
            isPanelExpanded: false,
            blockedReason: undefined,
            recentDatasetId: "ds-1",
            recentDashboardId: undefined,
            isCatchUpSuppressed: false,
            ...stateOverrides,
          } as NuxAppState
        }
      >
        {children}
      </NuxStateManager.Provider>
    );
  }
  return render(<TutorialSection />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.mocked(useNuxEligibility).mockReturnValue(false);
  vi.mocked(useNuxNavigation).mockReturnValue(openMilestoneMock);
  vi.mocked(useCurrentWorkspace).mockReturnValue({
    id: WORKSPACE_ID,
  } as ReturnType<typeof useCurrentWorkspace>);
  vi.mocked(restartFirstDashboardTutorial).mockClear();
  logEventMock.mockClear();
  openMilestoneMock.mockClear();
});

describe("TutorialSection", () => {
  it("renders nothing when not eligible", () => {
    vi.mocked(useNuxEligibility).mockReturnValue(false);
    renderWithNuxState();
    expect(
      screen.queryByRole("button", { name: "Restart tutorial" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Tutorial")).not.toBeInTheDocument();
  });

  it("offers to restart the tutorial when eligible", () => {
    vi.mocked(useNuxEligibility).mockReturnValue(true);
    renderWithNuxState();
    expect(
      screen.getByRole("button", { name: "Restart tutorial" }),
    ).toBeInTheDocument();
  });

  it("never says Nux", () => {
    vi.mocked(useNuxEligibility).mockReturnValue(true);
    const { container } = renderWithNuxState();
    expect(container.textContent?.toLowerCase()).not.toContain("nux");
  });

  it("restarts the tutorial and logs analytics when clicked", () => {
    vi.mocked(useNuxEligibility).mockReturnValue(true);
    renderWithNuxState();
    fireEvent.click(screen.getByRole("button", { name: "Restart tutorial" }));

    expect(restartFirstDashboardTutorial).toHaveBeenCalledWith({
      restart: expect.any(Function),
      openMilestone: openMilestoneMock,
    });
    expect(logEventMock).toHaveBeenCalledWith({
      event: "nux.restarted",
      workspaceId: WORKSPACE_ID,
    });
  });
});
