import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

import { act } from "react";
import { describe, expect, it } from "vitest";

import { useNuxCompletionCelebration } from "@/components/Nux/NuxCompletionModal/useNuxCompletionCelebration/useNuxCompletionCelebration";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/initialNuxState";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { render, screen } from "@/test-utils";

function CelebrationProbe(): ReactNode {
  const { isOpen, onClose } = useNuxCompletionCelebration();
  return (
    <>
      <div data-testid="celebration">{isOpen ? "open" : "closed"}</div>
      <button type="button" onClick={onClose}>
        dismiss
      </button>
    </>
  );
}

function renderCelebration(
  completedMilestones: NuxAppState["completedMilestones"],
  status: NuxAppState["status"] = "in_progress",
): ReturnType<typeof render> {
  return render(
    <NuxStateManager.Provider
      initialStateOverrides={{
        ...INITIAL_NUX_STATE,
        isHydrated: true,
        progressId: "p1" as NuxAppState["progressId"],
        status,
        completedMilestones,
        activeMilestoneKey: "share_dashboard",
        activeStepIndex: 3,
        isPanelExpanded: true,
      }}
    >
      <CelebrationProbe />
    </NuxStateManager.Provider>,
  );
}

describe("useNuxCompletionCelebration", () => {
  it("opens when a first publish finishes the tutorial", () => {
    renderCelebration(["add_dataset", "run_query", "build_dashboard"]);
    act(() => {
      NuxEvents.emit("dashboard.published", { dashboardId: "dash-1" });
    });
    expect(screen.getByTestId("celebration")).toHaveTextContent("open");
  });

  it("stays closed when earlier milestones are unfinished", () => {
    renderCelebration(["add_dataset"]);
    act(() => {
      NuxEvents.emit("dashboard.published", { dashboardId: "dash-1" });
    });
    expect(screen.getByTestId("celebration")).toHaveTextContent("closed");
  });

  it("stays closed when the tutorial is dismissed", () => {
    renderCelebration(
      ["add_dataset", "run_query", "build_dashboard"],
      "dismissed",
    );
    act(() => {
      NuxEvents.emit("dashboard.published", { dashboardId: "dash-1" });
    });
    expect(screen.getByTestId("celebration")).toHaveTextContent("closed");
  });

  it("closes from onClose", () => {
    renderCelebration(["add_dataset", "run_query", "build_dashboard"]);
    act(() => {
      NuxEvents.emit("dashboard.published", { dashboardId: "dash-1" });
    });
    act(() => {
      screen.getByRole("button", { name: "dismiss" }).click();
    });
    expect(screen.getByTestId("celebration")).toHaveTextContent("closed");
  });
});
