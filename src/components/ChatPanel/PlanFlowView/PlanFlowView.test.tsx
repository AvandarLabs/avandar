import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanAnnotationClient } from "@/clients/chat/PlanAnnotationClient/PlanAnnotationClient";
import { PlanFlowView } from "@/components/ChatPanel/PlanFlowView/PlanFlowView";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { PlanAnnotation } from "@/models/chat/PlanAnnotation/PlanAnnotation";
import type { ReactNode } from "react";

const {
  annotationDispatch,
  annotationState,
  branchDispatch,
  clearAnnotationsForPlanMock,
  dropPlanTempViewsMock,
  listAnnotationsForPlanMock,
  planDispatch,
  planState,
  putAnnotationsMock,
} = vi.hoisted(() => {
  return {
    annotationDispatch: {
      clearPlanAnnotations: vi.fn(),
      loadAnnotations: vi.fn(),
    },
    annotationState: {
      activeTool: "pan",
      annotations: {} as Record<string, PlanAnnotation.T>,
    },
    branchDispatch: {
      clearAllBranches: vi.fn(),
      closeBranch: vi.fn(),
      openBranch: vi.fn(),
      setActiveBranch: vi.fn(),
    },
    clearAnnotationsForPlanMock: vi.fn(),
    dropPlanTempViewsMock: vi.fn(),
    listAnnotationsForPlanMock: vi.fn(),
    planDispatch: {
      addBranch: vi.fn(),
      clear: vi.fn(),
      setCanvasView: vi.fn(),
      setFocusedStep: vi.fn(),
    },
    planState: {
      approvalStatus: "approved",
      canvasView: "overview",
      focusedStepId: undefined,
      isVisible: true,
      nodes: [
        {
          code: "select 1",
          description: "Read data",
          engine: "duckdb",
          id: "step-1",
          status: "pending",
        },
      ],
      planId: "plan-1" as string | null,
      rootMessage: "Plan",
      runMode: "step",
    },
    putAnnotationsMock: vi.fn(),
  };
});

vi.mock("@/clients/chat/PlanAnnotationClient/PlanAnnotationClient", () => {
  return {
    PlanAnnotationClient: {
      clearAnnotationsForPlan: clearAnnotationsForPlanMock,
      listAnnotationsForPlan: listAnnotationsForPlanMock,
      putAnnotations: putAnnotationsMock,
    },
  };
});

vi.mock("@/components/ChatPanel/PlanFlowView/layoutPlan/layoutPlan", () => {
  return {
    layoutPlan: () => {
      return { rfEdges: [], rfNodes: [] };
    },
  };
});

vi.mock(
  "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager/PlanAnnotationStateManager",
  () => {
    return {
      PlanAnnotationStateManager: {
        useDispatch: () => {
          return annotationDispatch;
        },
        useState: () => {
          return annotationState;
        },
      },
    };
  },
);

vi.mock("@/components/ChatPanel/PlanFlowView/planCanvasExport", () => {
  return {
    exportPlanCanvasAsPdf: vi.fn(),
    exportPlanCanvasAsPng: vi.fn(),
  };
});

vi.mock("@/components/ChatPanel/PlanFlowView/PlanFlowBanners", () => {
  return {
    PlanFlowBanners: () => {
      return null;
    },
  };
});

vi.mock("@/components/ChatPanel/PlanFlowView/PlanFlowCanvasArea", () => {
  return {
    PlanFlowCanvasArea: () => {
      return <div>Plan canvas</div>;
    },
  };
});

vi.mock("@/components/ChatPanel/PlanFlowView/PlanFlowHeader", () => {
  return {
    PlanFlowHeader: ({ onClose }: { onClose: () => Promise<void> }) => {
      return <button onClick={onClose}>Close plan</button>;
    },
  };
});

vi.mock("@/components/ChatPanel/PlanFlowView/PlanStepSqlCode", () => {
  return {
    PlanStepSqlCode: () => {
      return null;
    },
  };
});

vi.mock("@/components/ChatPanel/PlanFlowView/usePlanRun", () => {
  return {
    usePlanRun: () => {
      return {
        runAll: vi.fn(),
        runSingle: vi.fn(),
      };
    },
  };
});

vi.mock(
  "@/components/ChatPanel/PlanStateManager/PlanBranchStateManager/PlanBranchStateManager",
  () => {
    return {
      PlanBranchStateManager: {
        useDispatch: () => {
          return branchDispatch;
        },
        useState: () => {
          return { activeBranchId: undefined };
        },
      },
    };
  },
);

vi.mock("@/components/ChatPanel/PlanStateManager/planExecutor", () => {
  return { dropPlanTempViews: dropPlanTempViewsMock };
});

vi.mock("@/components/ChatPanel/PlanStateManager/PlanStateManager", () => {
  return {
    PlanStateManager: {
      useDispatch: () => {
        return planDispatch;
      },
      useState: () => {
        return planState;
      },
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1" };
    },
  };
});

vi.mock(
  "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager",
  () => {
    return {
      DataExplorerStateManager: {
        useDispatch: () => {
          return {
            setNlPrompt: vi.fn(),
            setRawSql: vi.fn(),
          };
        },
      },
    };
  },
);

vi.mock("@xyflow/react", () => {
  return {
    ReactFlowProvider: ({ children }: { children: ReactNode }) => {
      return children;
    },
    useReactFlow: () => {
      return {
        fitView: vi.fn(),
        getNode: vi.fn(),
        setCenter: vi.fn(),
      };
    },
  };
});

function createAnnotation(planId = "plan-1"): PlanAnnotation.Text {
  return {
    id: crypto.randomUUID() as PlanAnnotation.Id,
    planId,
    kind: "text",
    x: 1,
    y: 2,
    fontSize: 14,
    createdAt: 1,
    updatedAt: 1,
  };
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

describe("PlanFlowView annotation persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    planState.planId = "plan-1";
    planState.isVisible = true;
    annotationState.annotations = {};
    listAnnotationsForPlanMock.mockResolvedValue([]);
    putAnnotationsMock.mockResolvedValue(undefined);
    clearAnnotationsForPlanMock.mockResolvedValue(undefined);
    dropPlanTempViewsMock.mockResolvedValue(undefined);
  });

  it("does not merge an old plan load after switching plans", async () => {
    const oldPlanLoad = createDeferred<PlanAnnotation.T[]>();
    listAnnotationsForPlanMock.mockImplementation((planId: string) => {
      return planId === "plan-1" ? oldPlanLoad.promise : Promise.resolve([]);
    });
    const { rerender } = render(<PlanFlowView />);

    await waitFor(() => {
      expect(listAnnotationsForPlanMock).toHaveBeenCalledWith("plan-1");
    });
    planState.planId = "plan-2";
    rerender(<PlanFlowView />);
    await waitFor(() => {
      expect(listAnnotationsForPlanMock).toHaveBeenCalledWith("plan-2");
    });

    await act(async () => {
      oldPlanLoad.resolve([createAnnotation("plan-1")]);
      await oldPlanLoad.promise;
    });

    expect(annotationDispatch.loadAnnotations).not.toHaveBeenCalled();
  });

  it("does not merge an in-flight plan load after unmount", async () => {
    const planLoad = createDeferred<PlanAnnotation.T[]>();
    listAnnotationsForPlanMock.mockReturnValue(planLoad.promise);
    const { unmount } = render(<PlanFlowView />);
    await waitFor(() => {
      expect(listAnnotationsForPlanMock).toHaveBeenCalledWith("plan-1");
    });

    unmount();
    await act(async () => {
      planLoad.resolve([createAnnotation()]);
      await planLoad.promise;
    });

    expect(annotationDispatch.loadAnnotations).not.toHaveBeenCalled();
  });

  it("persists active-plan annotation changes without awaiting the write", async () => {
    const annotation = createAnnotation();
    const persistence = createDeferred<void>();
    annotationState.annotations = { [annotation.id]: annotation };
    putAnnotationsMock.mockReturnValue(persistence.promise);

    const { unmount } = render(<PlanFlowView />);

    await waitFor(() => {
      expect(PlanAnnotationClient.putAnnotations).toHaveBeenCalledWith([
        annotation,
      ]);
    });
    unmount();
    persistence.resolve(undefined);
  });

  it("awaits current-plan annotation cleanup before clearing plan state", async () => {
    const cleanup = createDeferred<void>();
    clearAnnotationsForPlanMock.mockReturnValue(cleanup.promise);
    render(<PlanFlowView />);

    fireEvent.click(screen.getByRole("button", { name: "Close plan" }));

    expect(annotationDispatch.clearPlanAnnotations).toHaveBeenCalledWith(
      "plan-1",
    );
    expect(clearAnnotationsForPlanMock).toHaveBeenCalledWith("plan-1");
    expect(dropPlanTempViewsMock).not.toHaveBeenCalled();

    await act(async () => {
      cleanup.resolve(undefined);
      await cleanup.promise;
    });
    await waitFor(() => {
      expect(dropPlanTempViewsMock).toHaveBeenCalledWith({
        planId: "plan-1",
        nodes: planState.nodes,
      });
    });
    expect(planDispatch.clear).toHaveBeenCalled();
    expect(branchDispatch.clearAllBranches).toHaveBeenCalled();
  });
});
