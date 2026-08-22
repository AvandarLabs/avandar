import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { useNuxCompletionEvents } from "@/components/Nux/NuxRoot/useNuxCompletionEvents/useNuxCompletionEvents";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/initialNuxState";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { render, screen } from "@/test-utils";

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

const SHARE_BLOCKED_COPY =
  "Your plan does not allow sharing another dashboard. You can upgrade, or unshare another dashboard, and come back to this.";

function CompletionHarness(): ReactNode {
  useNuxCompletionEvents();
  const [state] = NuxStateManager.useContext();
  return (
    <>
      <div data-testid="completed-milestones">
        {state.completedMilestones.join(",")}
      </div>
      <div data-testid="blocked-reason">{state.blockedReason ?? ""}</div>
      <div data-testid="recent-dashboard-id">
        {state.recentDashboardId ?? ""}
      </div>
      <div data-testid="active-milestone">{state.activeMilestoneKey ?? ""}</div>
    </>
  );
}

function renderHarness(
  stateOverrides: Partial<NuxAppState> = {},
): ReturnType<typeof render> {
  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <NuxStateManager.Provider
        initialStateOverrides={{
          ...INITIAL_NUX_STATE,
          isHydrated: true,
          status: "in_progress",
          activeMilestoneKey: "run_query",
          isPanelExpanded: true,
          ...stateOverrides,
        }}
      >
        {children}
      </NuxStateManager.Provider>
    );
  }
  return render(<CompletionHarness />, { wrapper: Wrapper });
}

beforeEach(() => {
  logEventMock.mockClear();
  vi.mocked(useCurrentWorkspace).mockReturnValue({
    id: WORKSPACE_ID,
  } as ReturnType<typeof useCurrentWorkspace>);
});

describe("useNuxCompletionEvents", () => {
  it("does not complete run_query when query.succeeded comes from url_hydration", () => {
    renderHarness();

    act(() => {
      NuxEvents.emit("query.succeeded", {
        trigger: "url_hydration",
        rowCount: 10,
      });
    });

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent("");
  });

  it("completes run_query when query.succeeded comes from sql_submit", () => {
    renderHarness();

    act(() => {
      NuxEvents.emit("query.succeeded", {
        trigger: "sql_submit",
        rowCount: 1,
      });
    });

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent(
      "run_query",
    );
  });

  it("completes share_dashboard when dashboard.published lands", () => {
    renderHarness({
      activeMilestoneKey: "share_dashboard",
      completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
    });

    act(() => {
      NuxEvents.emit("dashboard.published", { dashboardId: "dash-1" });
    });

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent(
      "share_dashboard",
    );
    expect(screen.getByTestId("recent-dashboard-id")).toHaveTextContent(
      "dash-1",
    );
  });

  it("does not complete share_dashboard from dashboard.created", () => {
    renderHarness({
      activeMilestoneKey: "share_dashboard",
      completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
    });

    act(() => {
      NuxEvents.emit("dashboard.created", { dashboardId: "dash-2" });
    });

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent(
      "add_dataset,run_query,build_dashboard",
    );
    expect(screen.getByTestId("recent-dashboard-id")).toHaveTextContent(
      "dash-2",
    );
  });

  it("maps share-blocked events to the tutorial copy", () => {
    renderHarness({ activeMilestoneKey: "share_dashboard" });

    act(() => {
      NuxEvents.emit("dashboard.shareBlocked", {
        reason: "shareable_dashboard_limit",
      });
    });

    expect(screen.getByTestId("blocked-reason")).toHaveTextContent(
      SHARE_BLOCKED_COPY,
    );
  });

  it("forgets the captured dashboard when it is deleted", () => {
    renderHarness({
      activeMilestoneKey: "share_dashboard",
      recentDashboardId: "dash-1",
    });

    act(() => {
      NuxEvents.emit("dashboard.deleted", { dashboardId: "dash-1" });
    });

    expect(screen.getByTestId("recent-dashboard-id")).toHaveTextContent("");
    expect(screen.getByTestId("active-milestone")).toHaveTextContent("");
  });

  it("closes the add_dataset payoff when dataset.summaryOpened lands", () => {
    function MilestoneProbe(): ReactNode {
      useNuxCompletionEvents();
      const state = NuxStateManager.useState();
      return (
        <>
          <div data-testid="milestone">
            {state.activeMilestoneKey ?? "none"}
          </div>
          <div data-testid="panel-expanded">
            {state.isPanelExpanded ? "yes" : "no"}
          </div>
        </>
      );
    }
    function Wrapper({ children }: { children: ReactNode }): ReactNode {
      return (
        <NuxStateManager.Provider
          initialStateOverrides={{
            ...INITIAL_NUX_STATE,
            isHydrated: true,
            status: "in_progress",
            completedMilestones: ["add_dataset"],
            activeMilestoneKey: "add_dataset",
            activeStepIndex: 2,
            isPanelExpanded: true,
            recentDatasetId: "ds1",
          }}
        >
          {children}
        </NuxStateManager.Provider>
      );
    }
    render(<MilestoneProbe />, { wrapper: Wrapper });

    act(() => {
      NuxEvents.emit("dataset.summaryOpened", { datasetId: "ds1" });
    });

    expect(screen.getByTestId("milestone")).toHaveTextContent("none");
    expect(screen.getByTestId("panel-expanded")).toHaveTextContent("yes");
  });
});
