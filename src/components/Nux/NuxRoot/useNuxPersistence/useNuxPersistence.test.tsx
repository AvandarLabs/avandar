import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNuxPersistence } from "@/components/Nux/NuxRoot/useNuxPersistence/useNuxPersistence";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { render, screen } from "@/test-utils";
import type { NuxAppState } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { ReactNode } from "react";

const { updateProgressMock } = vi.hoisted(() => {
  return {
    updateProgressMock: vi.fn(() => {
      return Promise.resolve();
    }),
  };
});

vi.mock("@/clients/NuxProgressClient/NuxProgressClient", () => {
  return {
    NuxProgressClient: {
      updateProgress: updateProgressMock,
    },
  };
});

function RestartButton(): ReactNode {
  const dispatch = NuxStateManager.useDispatch();
  return (
    <button
      type="button"
      onClick={() => {
        return dispatch.restart();
      }}
    >
      restart
    </button>
  );
}

function PersistenceHarness(): ReactNode {
  useNuxPersistence();
  return <RestartButton />;
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
  return render(<PersistenceHarness />, { wrapper: Wrapper });
}

describe("useNuxPersistence", () => {
  beforeEach(() => {
    updateProgressMock.mockClear();
  });

  it("persists catch-up suppression when restart is dispatched", () => {
    renderHarness();

    expect(updateProgressMock).not.toHaveBeenCalled();

    act(() => {
      screen.getByRole("button", { name: "restart" }).click();
    });

    expect(updateProgressMock).toHaveBeenCalledWith({
      progressId: "11111111-1111-4111-8111-111111111111",
      data: {
        status: "in_progress",
        completedMilestones: [],
        isCatchUpSuppressed: true,
      },
    });
  });
});
