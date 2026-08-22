import type { NuxWorkspaceArtifacts } from "@/clients/NuxProgressClient/NuxProgressClient";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

import { Modal } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import { NuxProgressClient } from "@/clients/NuxProgressClient/NuxProgressClient";
import classes from "@/components/Nux/NuxChecklistPanel/NuxChecklistMilestoneRow/NuxChecklistMilestoneRow.module.css";
import { NuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/NuxChecklistPanel";
import { NuxCompletionModal } from "@/components/Nux/NuxCompletionModal/NuxCompletionModal";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxWelcomeModal } from "@/components/Nux/NuxWelcomeModal/NuxWelcomeModal";
import { DEFAULT_MODAL_PROPS, NUX_CHECKLIST_Z_INDEX } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { fireEvent, render, screen, waitFor } from "@/test-utils";

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";
const TUTORIAL_DASHBOARD_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

let currentArtifacts: NuxWorkspaceArtifacts = {
  hasDataset: false,
  hasDashboard: false,
  hasPublishedDashboard: false,
  latestDashboardId: undefined,
};

vi.mock("@/clients/NuxProgressClient/NuxProgressClient", () => {
  return {
    NuxProgressClient: {
      useGetWorkspaceArtifacts: vi.fn(() => {
        return [currentArtifacts];
      }),
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
});

function NuxChecklistStateProbe(): ReactNode {
  const state = NuxStateManager.useState();
  return (
    <>
      <div data-testid="nux-active-key">{state.activeMilestoneKey ?? ""}</div>
      <div data-testid="nux-completed">
        {state.completedMilestones.join(",")}
      </div>
      <div data-testid="nux-panel-expanded">
        {String(state.isPanelExpanded)}
      </div>
    </>
  );
}

function _mountChatAside(): HTMLElement {
  const aside = document.createElement("aside");
  aside.className = "mantine-AppShell-aside";
  vi.spyOn(aside, "getBoundingClientRect").mockReturnValue({
    x: 820,
    y: 0,
    width: 380,
    height: 800,
    top: 0,
    right: 1200,
    bottom: 800,
    left: 820,
    toJSON: () => {
      return {};
    },
  });
  document.body.append(aside);
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1200,
  });
  return aside;
}

function _renderPanel(
  overrides: Partial<NuxAppState>,
  onOpenMilestone: (key: NuxProgress.MilestoneKey) => void = vi.fn(),
  extras: { withOpenProductModal?: boolean } = {},
): ReturnType<typeof render> {
  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
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
          <NuxWelcomeModal
            isOpen={false}
            onStart={vi.fn()}
            onDecline={vi.fn()}
          />
          <NuxCompletionModal isOpen={false} onClose={vi.fn()} />
          {extras.withOpenProductModal === true ? (
            <Modal opened onClose={vi.fn()} title="Share">
              Publish
            </Modal>
          ) : null}
          {children}
          <NuxChecklistStateProbe />
        </NuxStateManager.Provider>
      </ModalsProvider>
    );
  }
  return render(<NuxChecklistPanel onOpenMilestone={onOpenMilestone} />, {
    wrapper: Wrapper,
  });
}

describe("NuxChecklistPanel", () => {
  beforeEach(() => {
    currentArtifacts = {
      hasDataset: false,
      hasDashboard: false,
      hasPublishedDashboard: false,
      latestDashboardId: undefined,
    };
    vi.mocked(useCurrentWorkspace).mockReturnValue({
      id: WORKSPACE_ID,
      slug: "test-workspace",
    } as ReturnType<typeof useCurrentWorkspace>);
    vi.mocked(NuxProgressClient.useGetWorkspaceArtifacts).mockClear();
  });

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

  it("sits above the tour overlay so the checklist is never dimmed", () => {
    const { container } = _renderPanel({});
    const panel = screen.getByTestId("nux-checklist");
    expect(getComputedStyle(panel).zIndex).toBe(String(NUX_CHECKLIST_Z_INDEX));
    // Portaled to document.body so a parent stacking context cannot trap it
    // under Joyride's overlay (which also portals to body).
    expect(container.contains(panel)).toBe(false);
    expect(document.body.contains(panel)).toBe(true);
  });

  it("slides left when the chat aside is visible", async () => {
    const aside = _mountChatAside();
    try {
      _renderPanel({});
      await waitFor(() => {
        expect(screen.getByTestId("nux-checklist").style.right).toBe("396px");
      });
    } finally {
      aside.remove();
    }
  });

  it("docks to the corner when a product modal is open, even if chat is visible", async () => {
    const aside = _mountChatAside();
    try {
      _renderPanel({}, vi.fn(), { withOpenProductModal: true });
      await waitFor(() => {
        expect(screen.getByTestId("nux-checklist").style.right).toBe("16px");
      });
    } finally {
      aside.remove();
    }
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

  describe("milestone prerequisites", () => {
    it("opens the first milestone, which has no prerequisites", () => {
      const onOpenMilestone = vi.fn();
      _renderPanel({}, onOpenMilestone);
      fireEvent.click(
        screen.getByRole("button", { name: /Add your first dataset/ }),
      );
      expect(onOpenMilestone).toHaveBeenCalledWith("add_dataset");
    });

    it("does not open Ask your first question before a dataset is saved", () => {
      const onOpenMilestone = vi.fn();
      _renderPanel({}, onOpenMilestone);
      const row = screen.getByRole("button", {
        name: /Ask your first question/,
      });
      fireEvent.click(row);
      expect(onOpenMilestone).not.toHaveBeenCalled();
      expect(row).toHaveAttribute("aria-disabled", "true");
      expect(row).toHaveClass(classes.nuxChecklistMilestoneRowLocked!);
    });

    it("opens Ask your first question once add_dataset is complete", () => {
      const onOpenMilestone = vi.fn();
      _renderPanel({ completedMilestones: ["add_dataset"] }, onOpenMilestone);
      const row = screen.getByRole("button", {
        name: /Ask your first question/,
      });
      fireEvent.click(row);
      expect(onOpenMilestone).toHaveBeenCalledWith("run_query");
      expect(row).not.toHaveAttribute("aria-disabled", "true");
      expect(row).not.toHaveClass(classes.nuxChecklistMilestoneRowLocked!);
    });

    it("does not open Build dashboard before a query has succeeded", () => {
      const onOpenMilestone = vi.fn();
      _renderPanel({}, onOpenMilestone);
      const row = screen.getByRole("button", {
        name: /Build your first dashboard/,
      });
      fireEvent.click(row);
      expect(onOpenMilestone).not.toHaveBeenCalled();
      expect(row).toHaveAttribute("aria-disabled", "true");
      expect(row).toHaveClass(classes.nuxChecklistMilestoneRowLocked!);
    });

    it("opens Build dashboard once a query has succeeded", () => {
      const onOpenMilestone = vi.fn();
      _renderPanel(
        { completedMilestones: ["add_dataset", "run_query"] },
        onOpenMilestone,
      );
      const row = screen.getByRole("button", {
        name: /Build your first dashboard/,
      });
      fireEvent.click(row);
      expect(onOpenMilestone).toHaveBeenCalledWith("build_dashboard");
      expect(row).not.toHaveAttribute("aria-disabled", "true");
      expect(row).not.toHaveClass(classes.nuxChecklistMilestoneRowLocked!);
    });

    it("does not open Share until a dashboard has been saved", () => {
      const onOpenMilestone = vi.fn();
      _renderPanel(
        { completedMilestones: ["add_dataset", "run_query"] },
        onOpenMilestone,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /Share it with your workspace/ }),
      );
      expect(onOpenMilestone).not.toHaveBeenCalled();
    });

    it("does not open Share when no dashboard exists", async () => {
      const onOpenMilestone = vi.fn();
      _renderPanel(
        {
          completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
        },
        onOpenMilestone,
      );
      const row = screen.getByRole("button", {
        name: /Share it with your workspace/,
      });
      fireEvent.click(row);
      expect(onOpenMilestone).not.toHaveBeenCalled();
      expect(row).toHaveAttribute("aria-disabled", "true");
      expect(row).toHaveClass(classes.nuxChecklistMilestoneRowLocked!);
      fireEvent.focus(row);
      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toHaveTextContent(
          "You can't go to this step until you create a new dashboard.",
        );
      });
    });

    it("opens Share once a dashboard exists again", () => {
      currentArtifacts = {
        ...currentArtifacts,
        hasDashboard: true,
        latestDashboardId: TUTORIAL_DASHBOARD_ID,
      };
      const onOpenMilestone = vi.fn();
      _renderPanel(
        {
          completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
        },
        onOpenMilestone,
      );
      const row = screen.getByRole("button", {
        name: /Share it with your workspace/,
      });
      fireEvent.click(row);
      expect(onOpenMilestone).toHaveBeenCalledWith("share_dashboard");
      expect(row).not.toHaveAttribute("aria-disabled", "true");
      expect(row).not.toHaveClass(classes.nuxChecklistMilestoneRowLocked!);
    });
  });
});
