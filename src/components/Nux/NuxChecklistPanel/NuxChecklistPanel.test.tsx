import { describe, expect, it, vi } from "vitest";
import { NuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/NuxChecklistPanel";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { render, screen } from "@/test-utils";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

function _renderPanel(overrides: Partial<NuxAppState>): void {
  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <NuxStateManager.Provider
        initialStateOverrides={
          {
            isHydrated: true,
            progressId: "p1",
            status: "in_progress",
            completedMilestones: [],
            activeMilestoneKey: undefined,
            activeStepIndex: 0,
            isPanelExpanded: true,
            blockedReason: undefined,
            recentDatasetId: undefined,
            recentDashboardId: undefined,
            ...overrides,
          } as NuxAppState
        }
      >
        {children}
      </NuxStateManager.Provider>
    );
  }
  render(<NuxChecklistPanel onOpenMilestone={vi.fn()} />, { wrapper: Wrapper });
}

describe("NuxChecklistPanel", () => {
  it("lists all four milestones when expanded", () => {
    _renderPanel({});
    expect(screen.getByText("Add your first dataset")).toBeInTheDocument();
    expect(
      screen.getByText("Share it with your workspace"),
    ).toBeInTheDocument();
    expect(screen.getByText("0 / 4")).toBeInTheDocument();
  });

  it("shows progress as milestones complete", () => {
    _renderPanel({ completedMilestones: ["add_dataset", "run_query"] });
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("collapses to a pill", () => {
    _renderPanel({ isPanelExpanded: false });
    expect(
      screen.queryByText("Add your first dataset"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Get started/ }),
    ).toBeInTheDocument();
  });

  it("renders nothing once every milestone is done", () => {
    _renderPanel({
      status: "completed",
      completedMilestones: [
        "add_dataset",
        "run_query",
        "build_dashboard",
        "share_dashboard",
      ],
    });
    expect(screen.queryByText(/Get started/)).not.toBeInTheDocument();
  });

  it("renders nothing once dismissed", () => {
    _renderPanel({ status: "dismissed" });
    expect(screen.queryByText(/Get started/)).not.toBeInTheDocument();
  });
});
