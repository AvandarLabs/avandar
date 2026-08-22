import type { ReactNode } from "react";

import { afterEach, describe, expect, it } from "vitest";

import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/initialNuxState";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxStepFactsStore } from "@/components/Nux/NuxTour/NuxStepFactsStore/NuxStepFactsStore";
import { useVisibleNuxSteps } from "@/components/Nux/NuxTour/useVisibleNuxSteps/useVisibleNuxSteps";
import { act, render, screen } from "@/test-utils";

function Harness(): ReactNode {
  const steps = useVisibleNuxSteps();
  return <span data-testid="first-anchor">{steps[0]?.anchor ?? ""}</span>;
}

function _Wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <NuxStateManager.Provider
      initialStateOverrides={{
        ...INITIAL_NUX_STATE,
        isHydrated: true,
        status: "in_progress",
        completedMilestones: ["add_dataset", "run_query"],
        activeMilestoneKey: "build_dashboard",
        isPanelExpanded: true,
      }}
    >
      {children}
    </NuxStateManager.Provider>
  );
}

describe("useVisibleNuxSteps", () => {
  afterEach(() => {
    act(() => {
      NuxStepFactsStore.setExplorerHasQueryResults(false);
    });
  });

  it("starts build_dashboard on the chat composer when the explorer has no results", () => {
    render(<Harness />, { wrapper: _Wrapper });
    expect(screen.getByTestId("first-anchor")).toHaveTextContent(
      "chat-composer",
    );
  });

  it("drops the query-first tooltip once the explorer has results", () => {
    render(<Harness />, { wrapper: _Wrapper });
    act(() => {
      NuxStepFactsStore.setExplorerHasQueryResults(true);
    });
    expect(screen.getByTestId("first-anchor")).toHaveTextContent(
      "explorer-save-menu",
    );
  });
});
