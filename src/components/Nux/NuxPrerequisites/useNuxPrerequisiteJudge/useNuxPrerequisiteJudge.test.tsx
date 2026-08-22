import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NuxProgressClient } from "@/clients/NuxProgressClient/NuxProgressClient";
import { useNuxPrerequisiteJudge } from "@/components/Nux/NuxPrerequisites/useNuxPrerequisiteJudge/useNuxPrerequisiteJudge";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { render, screen } from "@/test-utils";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxWorkspaceArtifacts } from "@/clients/NuxProgressClient/NuxProgressClient";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { ReactNode } from "react";

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

const EMPTY_ARTIFACTS: NuxWorkspaceArtifacts = {
  hasDataset: false,
  hasDashboard: false,
  hasPublishedDashboard: false,
  latestDashboardId: undefined,
};

let currentArtifacts: NuxWorkspaceArtifacts | undefined = EMPTY_ARTIFACTS;

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

function JudgeHarness(): ReactNode {
  useNuxPrerequisiteJudge();
  const state = NuxStateManager.useState();
  return (
    <div data-testid="completed-milestones">
      {state.completedMilestones.join(",")}
    </div>
  );
}

const HYDRATED_STATE: Partial<NuxAppState> = {
  isHydrated: true,
  progressId: "11111111-1111-4111-8111-111111111111" as NuxProgress.Id,
  status: "in_progress",
  isCatchUpSuppressed: false,
  completedMilestones: [],
};

function renderHarness(
  stateOverrides: Partial<NuxAppState> = {},
): ReturnType<typeof render> {
  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <NuxStateManager.Provider
        initialStateOverrides={
          {
            ...HYDRATED_STATE,
            ...stateOverrides,
          } as NuxAppState
        }
      >
        {children}
      </NuxStateManager.Provider>
    );
  }
  return render(<JudgeHarness />, { wrapper: Wrapper });
}

beforeEach(() => {
  currentArtifacts = EMPTY_ARTIFACTS;
  vi.mocked(useCurrentWorkspace).mockReturnValue({
    id: WORKSPACE_ID,
  } as ReturnType<typeof useCurrentWorkspace>);
  vi.mocked(NuxProgressClient.useGetWorkspaceArtifacts).mockClear();
});

describe("useNuxPrerequisiteJudge", () => {
  it("catch-up adds add_dataset when artifacts prove a dataset exists", () => {
    currentArtifacts = {
      ...EMPTY_ARTIFACTS,
      hasDataset: true,
    };
    renderHarness();

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent(
      /^add_dataset$/,
    );
  });

  it("does not catch up when catch-up is suppressed", () => {
    currentArtifacts = {
      ...EMPTY_ARTIFACTS,
      hasDataset: true,
    };
    renderHarness({ isCatchUpSuppressed: true });

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent("");
  });

  it("does not catch up when status is dismissed", () => {
    currentArtifacts = {
      ...EMPTY_ARTIFACTS,
      hasDataset: true,
    };
    renderHarness({ status: "dismissed" });

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent("");
  });

  it("does not catch up when status is completed", () => {
    currentArtifacts = {
      ...EMPTY_ARTIFACTS,
      hasDataset: true,
    };
    renderHarness({ status: "completed" });

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent("");
  });

  it("does not catch up before hydration", () => {
    currentArtifacts = {
      ...EMPTY_ARTIFACTS,
      hasDataset: true,
    };
    renderHarness({ isHydrated: false });

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent("");
  });

  it("catch-up adds build_dashboard when artifacts change after mount", () => {
    currentArtifacts = EMPTY_ARTIFACTS;
    const view = renderHarness();

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent("");

    currentArtifacts = {
      ...EMPTY_ARTIFACTS,
      hasDashboard: true,
    };

    act(() => {
      view.rerender(<JudgeHarness />);
    });

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent(
      /^build_dashboard$/,
    );
  });

  it("does not catch up a key the user unmarked this session", () => {
    currentArtifacts = {
      ...EMPTY_ARTIFACTS,
      hasDataset: true,
    };
    renderHarness({ userUnmarkedMilestones: ["add_dataset"] });

    expect(screen.getByTestId("completed-milestones")).toHaveTextContent(/^$/);
  });
});
