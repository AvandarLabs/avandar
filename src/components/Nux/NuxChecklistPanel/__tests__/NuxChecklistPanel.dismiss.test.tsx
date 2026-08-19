import { Modal } from "@mantine/core";
import { modals, ModalsProvider } from "@mantine/modals";
import { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NuxProgressClient } from "@/clients/NuxProgressClient/NuxProgressClient";
import { NuxChecklistPanel } from "@/components/Nux/NuxChecklistPanel/NuxChecklistPanel";
import { NuxCompletionModal } from "@/components/Nux/NuxCompletionModal/NuxCompletionModal";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxWelcomeModal } from "@/components/Nux/NuxWelcomeModal/NuxWelcomeModal";
import {
  DEFAULT_MODAL_PROPS,
  MODAL_ABOVE_NUX_TOUR_Z_INDEX,
} from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import type { NuxWorkspaceArtifacts } from "@/clients/NuxProgressClient/NuxProgressClient";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

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
          {extras.withOpenProductModal === true ?
            <Modal opened onClose={vi.fn()} title="Share">
              Publish
            </Modal>
          : null}
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

  describe("dismiss confirm", () => {
    let confirmModalOptions:
      | Parameters<typeof modals.openConfirmModal>[0]
      | undefined;

    beforeEach(() => {
      confirmModalOptions = undefined;
      vi.spyOn(modals, "openConfirmModal").mockImplementation((options) => {
        confirmModalOptions = options;
        return "nux-dismiss";
      });
    });

    it("opens a confirm modal on X and does not dismiss until confirm", async () => {
      _renderPanel({});
      fireEvent.click(
        screen.getByRole("button", { name: "Hide the tutorial" }),
      );
      expect(modals.openConfirmModal).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Add your first dataset")).toBeInTheDocument();
      expect(confirmModalOptions?.title).toBe("Hide the tutorial?");
      expect(confirmModalOptions?.zIndex).toBe(MODAL_ABOVE_NUX_TOUR_Z_INDEX);
      await act(async () => {
        confirmModalOptions?.onConfirm?.();
      });
      await waitFor(() => {
        expect(
          screen.queryByText("Add your first dataset"),
        ).not.toBeInTheDocument();
      });
    });

    it("keeps the panel when the confirm is cancelled", () => {
      _renderPanel({});
      fireEvent.click(
        screen.getByRole("button", { name: "Hide the tutorial" }),
      );
      confirmModalOptions?.onCancel?.();
      expect(screen.getByText("Add your first dataset")).toBeInTheDocument();
    });
  });

  describe("mark-done check", () => {
    it("has a check control on every milestone", () => {
      _renderPanel({});
      expect(
        screen.getByTestId("nux-milestone-check-add_dataset"),
      ).toBeEnabled();
      expect(screen.getByTestId("nux-milestone-check-run_query")).toBeEnabled();
      expect(
        screen.getByTestId("nux-milestone-check-build_dashboard"),
      ).toBeEnabled();
      expect(
        screen.getByTestId("nux-milestone-check-share_dashboard"),
      ).toBeEnabled();
    });

    it("marks a milestone done without starting it", () => {
      const onOpenMilestone = vi.fn();
      _renderPanel({}, onOpenMilestone);
      fireEvent.click(screen.getByTestId("nux-milestone-check-run_query"));
      expect(onOpenMilestone).not.toHaveBeenCalled();
      expect(screen.getByTestId("nux-completed")).toHaveTextContent(
        "run_query",
      );
    });

    it("shows Mark done on an incomplete check and Mark not done after", async () => {
      _renderPanel({});
      const check = screen.getByTestId("nux-milestone-check-run_query");
      expect(check).toHaveAccessibleName("Mark done");
      fireEvent.focus(check);
      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toHaveTextContent("Mark done");
      });
      fireEvent.click(check);
      expect(check).toHaveAccessibleName("Mark not done");
      fireEvent.focus(check);
      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toHaveTextContent("Mark not done");
      });
    });

    it("does not start a done milestone; unmark re-enables start", () => {
      const onOpenMilestone = vi.fn();
      _renderPanel(
        { completedMilestones: ["add_dataset", "run_query"] },
        onOpenMilestone,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /Ask your first question/ }),
      );
      expect(onOpenMilestone).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId("nux-milestone-check-run_query"));
      fireEvent.click(
        screen.getByRole("button", { name: /Ask your first question/ }),
      );
      expect(onOpenMilestone).toHaveBeenCalledWith("run_query");
    });

    it("marks a locked milestone done", () => {
      const onOpenMilestone = vi.fn();
      _renderPanel({}, onOpenMilestone);
      fireEvent.click(
        screen.getByTestId("nux-milestone-check-build_dashboard"),
      );
      expect(onOpenMilestone).not.toHaveBeenCalled();
      expect(screen.getByTestId("nux-completed")).toHaveTextContent(
        "build_dashboard",
      );
    });
  });

  describe("mark-done follow-up delay", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("closes the active tour after 400ms and keeps the panel expanded", () => {
      _renderPanel({
        completedMilestones: ["add_dataset"],
        activeMilestoneKey: "run_query",
      });
      fireEvent.click(screen.getByTestId("nux-milestone-check-run_query"));
      expect(screen.getByTestId("nux-active-key")).toHaveTextContent(
        "run_query",
      );
      expect(screen.getByTestId("nux-panel-expanded")).toHaveTextContent(
        "true",
      );
      act(() => {
        vi.advanceTimersByTime(399);
      });
      expect(screen.getByTestId("nux-active-key")).toHaveTextContent(
        "run_query",
      );
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByTestId("nux-active-key")).toHaveTextContent(/^$/);
      expect(screen.getByTestId("nux-panel-expanded")).toHaveTextContent(
        "true",
      );
      expect(screen.getByText("Ask your first question")).toBeInTheDocument();
    });

    it("keeps the panel for 400ms after the last milestone is marked", () => {
      _renderPanel({
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
      });
      fireEvent.click(
        screen.getByTestId("nux-milestone-check-share_dashboard"),
      );
      expect(screen.getByTestId("nux-checklist")).toBeInTheDocument();
      expect(screen.getByText("4 / 4")).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.queryByTestId("nux-checklist")).not.toBeInTheDocument();
    });

    it("cancels the pending close when unmarked before 400ms", () => {
      _renderPanel({
        completedMilestones: ["add_dataset", "run_query", "build_dashboard"],
        activeMilestoneKey: "share_dashboard",
      });
      fireEvent.click(
        screen.getByTestId("nux-milestone-check-share_dashboard"),
      );
      fireEvent.click(
        screen.getByTestId("nux-milestone-check-share_dashboard"),
      );
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.getByTestId("nux-checklist")).toBeInTheDocument();
      expect(screen.getByTestId("nux-active-key")).toHaveTextContent(
        "share_dashboard",
      );
      expect(screen.getByTestId("nux-completed")).toHaveTextContent(
        "add_dataset,run_query,build_dashboard",
      );
    });

    it("does not close a different open tour when another row is marked", () => {
      _renderPanel({
        completedMilestones: ["add_dataset"],
        activeMilestoneKey: "add_dataset",
      });
      fireEvent.click(screen.getByTestId("nux-milestone-check-run_query"));
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.getByTestId("nux-active-key")).toHaveTextContent(
        "add_dataset",
      );
    });
  });
});
