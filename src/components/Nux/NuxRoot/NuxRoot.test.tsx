import { beforeEach, describe, expect, it, vi } from "vitest";
import { NuxRoot } from "@/components/Nux/NuxRoot/NuxRoot";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/initialNuxState";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility/useNuxEligibility";
import { render, screen } from "@/test-utils";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

vi.mock("@/components/Nux/useNuxEligibility/useNuxEligibility", () => {
  return { useNuxEligibility: vi.fn() };
});

vi.mock("@/components/Nux/NuxRoot/NuxRootContents", () => {
  return {
    NuxRootContents: function NuxRootContentsMock(): ReactNode {
      return <div data-testid="nux-root-contents" />;
    },
  };
});

function _renderRoot(options: {
  isEligible: boolean;
  activeMilestoneKey?: NuxAppState["activeMilestoneKey"];
}): ReturnType<typeof render> {
  vi.mocked(useNuxEligibility).mockReturnValue(options.isEligible);
  return render(
    <NuxStateManager.Provider
      initialStateOverrides={{
        ...INITIAL_NUX_STATE,
        isHydrated: true,
        status: "in_progress",
        activeMilestoneKey: options.activeMilestoneKey,
      }}
    >
      <NuxRoot />
    </NuxStateManager.Provider>,
  );
}

beforeEach(() => {
  vi.mocked(useNuxEligibility).mockReset();
});

describe("NuxRoot", () => {
  it("renders nothing when ineligible and no milestone is active", () => {
    _renderRoot({ isEligible: false });
    expect(screen.queryByTestId("nux-root-contents")).not.toBeInTheDocument();
  });

  it("keeps contents mounted when a milestone is active even if eligibility is false", () => {
    _renderRoot({ isEligible: false, activeMilestoneKey: "add_dataset" });
    expect(screen.getByTestId("nux-root-contents")).toBeInTheDocument();
  });

  it("renders contents when eligible", () => {
    _renderRoot({ isEligible: true });
    expect(screen.getByTestId("nux-root-contents")).toBeInTheDocument();
  });
});
