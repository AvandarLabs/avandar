import { describe, expect, it } from "vitest";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useNuxAutoAdvance } from "@/components/Nux/NuxTour/useNuxAutoAdvance/useNuxAutoAdvance";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

function StepIndex(): ReactNode {
  useNuxAutoAdvance();
  const [state, dispatch] = NuxStateManager.useContext();
  return (
    <>
      <div data-testid="step-index">{String(state.activeStepIndex)}</div>
      <button
        type="button"
        onClick={() => {
          return dispatch.goToStep(0);
        }}
      >
        go-back
      </button>
    </>
  );
}

function _renderAutoAdvance(
  ui: ReactNode = null,
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
            completedMilestones: [],
            activeMilestoneKey: "add_dataset",
            activeStepIndex: 0,
            isPanelExpanded: true,
            blockedReason: undefined,
            recentDatasetId: undefined,
            recentDashboardId: undefined,
            ...stateOverrides,
          } as NuxAppState
        }
      >
        {children}
      </NuxStateManager.Provider>
    );
  }
  return render(
    <>
      <StepIndex />
      {ui}
    </>,
    { wrapper: Wrapper },
  );
}

describe("useNuxAutoAdvance", () => {
  it("moves onto the import-form tooltip once that form is in the document", async () => {
    const { rerender } = _renderAutoAdvance();
    expect(screen.getByTestId("step-index")).toHaveTextContent("0");

    rerender(
      <>
        <StepIndex />
        <form data-nux="dataset-import-form" />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("step-index")).toHaveTextContent("1");
    });
  });

  it("does not bounce forward again after the user goes back", () => {
    _renderAutoAdvance(<form data-nux="dataset-import-form" />, {
      activeStepIndex: 1,
    });
    expect(screen.getByTestId("step-index")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "go-back" }));
    expect(screen.getByTestId("step-index")).toHaveTextContent("0");
  });
});
