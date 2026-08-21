import { describe, expect, it } from "vitest";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/initialNuxState";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useNuxScrollParentToTop } from "@/components/Nux/NuxTour/useNuxScrollParentToTop/useNuxScrollParentToTop";
import { render, waitFor } from "@/test-utils";
import type { ReactNode } from "react";

function Harness(): ReactNode {
  useNuxScrollParentToTop();
  return null;
}

describe("useNuxScrollParentToTop", () => {
  it("resets the Data Sources scroller once the payoff target is in the document", async () => {
    const scroller = document.createElement("div");
    scroller.style.overflow = "auto";
    scroller.style.height = "80px";
    const filler = document.createElement("div");
    filler.style.height = "400px";
    const target = document.createElement("span");
    target.setAttribute("data-nux", "dataset-summary-tab");
    filler.append(target);
    scroller.append(filler);
    document.body.append(scroller);
    scroller.scrollTop = 240;

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
          }}
        >
          {children}
        </NuxStateManager.Provider>
      );
    }
    render(<Harness />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(scroller.scrollTop).toBe(0);
    });
    scroller.remove();
  });
});
