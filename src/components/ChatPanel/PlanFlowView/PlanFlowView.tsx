import {
  Alert,
  Box,
  Button,
  Code,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { layoutPlan } from "@/components/ChatPanel/PlanFlowView/planLayout";
import { PlanAnnotationOverlay } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationOverlay";
import { PlanAnnotationStateManager } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager";
import { PlanCanvasToolbar } from "@/components/ChatPanel/PlanFlowView/PlanCanvasToolbar";
import {
  clearAnnotationsForPlan,
  listAnnotationsForPlan,
  putAnnotations,
} from "@/components/ChatPanel/PlanFlowView/planAnnotationStorage";
import {
  exportPlanCanvasAsPdf,
  exportPlanCanvasAsPng,
} from "@/components/ChatPanel/PlanFlowView/planCanvasExport";
import { PlanStepNode } from "@/components/ChatPanel/PlanFlowView/PlanStepNode";
import { RoughEdge } from "@/components/ChatPanel/PlanFlowView/RoughEdge";
import { PlanBranchSidebar } from "@/components/ChatPanel/PlanFlowView/PlanBranchSidebar";
import {
  dropPlanTempViews,
  executePlan,
  executePlanStep,
} from "@/components/ChatPanel/PlanStateManager/planExecutor";
import { PlanBranchStateManager } from "@/components/ChatPanel/PlanStateManager/PlanBranchStateManager";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { PlanNode } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { ChatPlan } from "$/types/chat.types";

const NODE_TYPES = { planStep: PlanStepNode };
const EDGE_TYPES = { rough: RoughEdge };

/**
 * Phase 3 — visual plan canvas.
 *
 * The plan renders as an xyflow DAG with RoughJS-styled hand-drawn
 * edges. Two view modes share the canvas:
 *
 *   - `overview`: the full DAG, pannable and zoomable. The user sees
 *     every step + its mini-status at a glance.
 *   - `focused`: zoomed in on a single step. The Data Explorer's
 *     existing visualization container shows that step's result; the
 *     user reads / tweaks viz settings as if it were a single-query
 *     analysis.
 *
 * Transitions between the two are animated by xyflow's `fitView({
 * duration })` so it feels like a real canvas zoom.
 *
 * Run-mode toggle: "auto" runs all steps sequentially as soon as the
 * plan arrives; "step" pauses between steps so the user can inspect.
 */
export function PlanFlowView(): JSX.Element | null {
  const state = PlanStateManager.useState();
  if (!state.isVisible || state.nodes.length === 0) {
    return null;
  }
  return (
    <ReactFlowProvider>
      <PlanFlowCanvas />
    </ReactFlowProvider>
  );
}

function PlanFlowCanvas(): JSX.Element {
  const state = PlanStateManager.useState();
  const dispatch = PlanStateManager.useDispatch();
  const branchState = PlanBranchStateManager.useState();
  const branchDispatch = PlanBranchStateManager.useDispatch();
  const annotationState = PlanAnnotationStateManager.useState();
  const annotationDispatch = PlanAnnotationStateManager.useDispatch();
  const dataExplorerDispatch = DataExplorerStateManager.useDispatch();
  const workspace = useCurrentWorkspace();
  const { fitView, setCenter, getNode } = useReactFlow();
  const runOnceRef = useRef<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Keep the latest plan reachable to `executePlan`'s drift-regen
  // callback without re-creating the callable on every state change.
  const stateRef = useRef(state);
  stateRef.current = state;

  const { rfNodes, rfEdges } = useMemo(() => {
    return layoutPlan({
      nodes: state.nodes,
      focusedStepId: state.focusedStepId,
    });
  }, [state.nodes, state.focusedStepId]);

  const planId = state.planId;

  const runAll = useCallback(async (): Promise<void> => {
    if (!planId) {
      return;
    }
    // Approval gate. The button caller is already gated by the
    // banner UI, but `runAll` is also fired by the auto-run effect
    // — that effect has its own gate. This is the belt for the
    // braces.
    if (stateRef.current.approvalStatus !== "approved") {
      return;
    }
    await executePlan({
      planId,
      nodes: state.nodes,
      dispatch,
      driftRegen: {
        workspaceId: workspace.id,
        getLatestPlan: (): ChatPlan => {
          const cur = stateRef.current;
          return {
            rootMessage: cur.rootMessage,
            steps: cur.nodes,
          };
        },
      },
    });
  }, [planId, state.nodes, dispatch, workspace.id]);

  const runSingle = useCallback(
    async (node: PlanNode): Promise<void> => {
      if (!planId) {
        return;
      }
      if (stateRef.current.approvalStatus !== "approved") {
        return;
      }
      // Build the lookup once so a sandbox step can read its inputs.
      const nodeById = new Map(
        stateRef.current.nodes.map((n) => {
          return [n.id, n] as const;
        }),
      );
      await executePlanStep({ planId, step: node, dispatch, nodeById });
    },
    [planId, dispatch],
  );

  // Auto-run on first load when runMode === 'auto' AND the user has
  // approved the plan. Approval is the gate that distinguishes
  // "LLM just proposed this" from "user wants this to run." Key off
  // the planId so a brand-new plan triggers exactly one run.
  useEffect(() => {
    if (state.nodes.length === 0 || !state.isVisible || !planId) {
      return;
    }
    if (state.runMode !== "auto") {
      return;
    }
    if (state.approvalStatus !== "approved") {
      return;
    }
    const allPending = state.nodes.every((n) => {
      return n.status === "pending";
    });
    if (allPending && runOnceRef.current !== planId) {
      runOnceRef.current = planId;
      void runAll();
    }
  }, [
    state.nodes,
    state.isVisible,
    state.runMode,
    state.approvalStatus,
    planId,
    runAll,
  ]);

  // Animated zoom between overview and focused views — xyflow handles
  // the easing for us via `duration`.
  useEffect(() => {
    if (state.canvasView === "overview") {
      void fitView({ duration: 350, padding: 0.18 });
      return;
    }
    if (state.canvasView === "focused" && state.focusedStepId) {
      const node = getNode(state.focusedStepId);
      if (node) {
        void setCenter(node.position.x + 140, node.position.y + 70, {
          zoom: 1.4,
          duration: 350,
        });
      }
    }
  }, [state.canvasView, state.focusedStepId, fitView, setCenter, getNode]);

  const openOnCanvas = useCallback(
    (node: PlanNode): void => {
      if (node.status !== "succeeded" || !node.viewName) {
        return;
      }
      dataExplorerDispatch.setRawSql(`SELECT * FROM "${node.viewName}"`);
      dataExplorerDispatch.setNlPrompt(node.description);
      dispatch.setFocusedStep(node.id);
      dispatch.setCanvasView("focused");
    },
    [dataExplorerDispatch, dispatch],
  );

  const handleNodeClick = useCallback(
    (_e: React.MouseEvent, node: { id: string }): void => {
      const planNode = state.nodes.find((n) => {
        return n.id === node.id;
      });
      if (!planNode) {
        return;
      }
      dispatch.setFocusedStep(planNode.id);
      if (planNode.status === "succeeded") {
        openOnCanvas(planNode);
      } else if (
        planNode.status === "failed" ||
        planNode.status === "pending"
      ) {
        void runSingle(planNode);
      }
    },
    [state.nodes, dispatch, openOnCanvas, runSingle],
  );

  const close = useCallback(async (): Promise<void> => {
    if (planId) {
      // Wipe annotations + branches in IndexedDB + memory.
      annotationDispatch.clearPlanAnnotations(planId);
      try {
        await clearAnnotationsForPlan(planId);
      } catch {
        // best-effort
      }
    }
    await dropPlanTempViews({
      planId: planId ?? undefined,
      nodes: state.nodes,
    });
    dispatch.clear();
    branchDispatch.clearAllBranches();
    runOnceRef.current = null;
  }, [planId, state.nodes, dispatch, annotationDispatch, branchDispatch]);

  // Branch sidebar callbacks. Switching branches doesn't actually
  // swap the rendered nodes in this checkpoint — that requires
  // chat-thread orchestration we land in a follow-up. For now we
  // record the active id so the sidebar shows the correct selection,
  // which is enough to verify the model end-to-end.
  const selectRoot = useCallback((): void => {
    branchDispatch.setActiveBranch(null);
  }, [branchDispatch]);
  const selectBranch = useCallback(
    (branchId: string): void => {
      branchDispatch.setActiveBranch(branchId);
    },
    [branchDispatch],
  );
  const closeBranch = useCallback(
    (branchId: string): void => {
      branchDispatch.closeBranch(branchId);
    },
    [branchDispatch],
  );

  // Annotation persistence — load on plan mount, save on every
  // annotation change for the active plan.
  useEffect(() => {
    if (!planId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await listAnnotationsForPlan(planId);
        if (!cancelled && loaded.length > 0) {
          annotationDispatch.loadAnnotations({
            planId,
            annotations: loaded,
          });
        }
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId, annotationDispatch]);

  useEffect(() => {
    if (!planId) {
      return;
    }
    const planAnnotations = Object.values(annotationState.annotations).filter(
      (a) => {
        return a.planId === planId;
      },
    );
    if (planAnnotations.length === 0) {
      return;
    }
    void putAnnotations(planAnnotations);
  }, [annotationState.annotations, planId]);

  // Export callbacks — capture the canvas element via the ref.
  const exportPng = useCallback((): void => {
    if (!canvasContainerRef.current) {
      return;
    }
    void exportPlanCanvasAsPng({
      element: canvasContainerRef.current,
    });
  }, []);
  const exportPdf = useCallback((): void => {
    if (!canvasContainerRef.current) {
      return;
    }
    void exportPlanCanvasAsPdf({
      element: canvasContainerRef.current,
      nodes: state.nodes,
      rootMessage: state.rootMessage,
    });
  }, [state.nodes, state.rootMessage]);

  const allSucceeded = state.nodes.every((n) => {
    return n.status === "succeeded";
  });
  const anyFailed = state.nodes.some((n) => {
    return n.status === "failed";
  });
  const sqlStepCount = state.nodes.filter((n) => {
    return n.type === "sql";
  }).length;
  // Heuristic the spec calls out: >7 SQL steps suggests Python or R
  // might be a better fit. Show the hint, but allow the user to run
  // the plan anyway.
  const showSqlStepHint = sqlStepCount > 7;
  const isAwaitingApproval = state.approvalStatus === "awaiting_approval";
  const wasRejected = state.approvalStatus === "rejected";

  return (
    <Paper withBorder shadow="sm" radius="md" p="sm">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} size="sm">
              Analytic plan
            </Text>
            <Text size="xs" c="dimmed" lineClamp={2}>
              {state.rootMessage}
            </Text>
          </Stack>
          <Group gap="xs" wrap="nowrap">
            <SegmentedControl
              size="xs"
              value={state.runMode}
              data={[
                { label: "Auto", value: "auto" },
                { label: "Step", value: "step" },
              ]}
              onChange={(v) => {
                dispatch.setRunMode(v === "step" ? "step" : "auto");
              }}
            />
            <Button
              size="xs"
              variant="light"
              leftSection={<IconRefresh size={14} />}
              disabled={state.approvalStatus !== "approved"}
              onClick={() => {
                return runAll();
              }}
            >
              Re-run
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="neutral"
              leftSection={
                state.canvasView === "focused" ?
                  <IconArrowsMaximize size={14} />
                : <IconArrowsMinimize size={14} />
              }
              onClick={() => {
                dispatch.setCanvasView(
                  state.canvasView === "focused" ? "overview" : "focused",
                );
              }}
            >
              {state.canvasView === "focused" ? "Zoom out" : "Zoom in"}
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconX size={14} />}
              onClick={() => {
                return close();
              }}
            >
              Close
            </Button>
          </Group>
        </Group>

        {isAwaitingApproval ?
          <Alert
            color="blue"
            variant="light"
            radius="sm"
            p="xs"
            title="Review and approve the plan"
          >
            <Stack gap="xs">
              <Text size="xs">
                The AI has proposed a {state.nodes.length}-step plan
                {showSqlStepHint ?
                  " — that's a lot of SQL. Consider whether a Python or R step would express this more cleanly. You can still approve as-is."
                : "."}{" "}
                Nothing has run yet. Click each node to read it; approve to
                execute.
              </Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  color="green"
                  onClick={() => {
                    dispatch.approvePlan();
                  }}
                >
                  Approve and run
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  color="red"
                  onClick={() => {
                    dispatch.rejectPlan();
                  }}
                >
                  Reject
                </Button>
              </Group>
            </Stack>
          </Alert>
        : null}

        {wasRejected ?
          <Alert color="gray" variant="light" radius="sm" p="xs">
            <Text size="xs">
              Plan rejected. Ask the chat to propose a different plan, or
              close this canvas.
            </Text>
          </Alert>
        : null}

        {anyFailed ?
          <Alert color="red" variant="light" radius="sm" p="xs">
            <Text size="xs">
              A step failed. Click the red node to retry, or use Re-run to
              restart from the top.
            </Text>
          </Alert>
        : null}

        {allSucceeded ?
          <Alert color="green" variant="light" radius="sm" p="xs">
            <Text size="xs">
              All steps succeeded. Click any node to open it on the canvas.
            </Text>
          </Alert>
        : null}

        <Group
          align="stretch"
          gap={0}
          wrap="nowrap"
          style={{
            height: 420,
            borderRadius: 8,
            border: "1px solid var(--mantine-color-gray-3)",
            overflow: "hidden",
          }}
        >
          <PlanBranchSidebar
            onSelectRoot={selectRoot}
            onSelectBranch={selectBranch}
            onCloseBranch={closeBranch}
          />
          <Box
            ref={canvasContainerRef}
            style={{
              flex: 1,
              position: "relative",
              background:
                "radial-gradient(circle at center, #fafafa 0%, #f1f3f5 100%)",
              overflow: "hidden",
            }}
          >
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: "rough" }}
              // While an annotation drawing tool is active, suppress
              // xyflow's pan-on-drag so the user can draw cleanly.
              panOnDrag={annotationState.activeTool === "pan"}
              nodesDraggable={annotationState.activeTool === "pan"}
            >
              <Background gap={20} size={1} color="#dee2e6" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable />
            </ReactFlow>
            {planId ?
              <PlanAnnotationOverlay
                planId={planId}
                containerRef={canvasContainerRef}
              />
            : null}
            <PlanCanvasToolbar
              onExportPng={exportPng}
              onExportPdf={exportPdf}
            />
          </Box>
        </Group>

        {state.canvasView === "focused" && state.focusedStepId ?
          <FocusedStepDetail
            node={state.nodes.find((n) => {
              return n.id === state.focusedStepId;
            })}
            onRun={runSingle}
            onOpen={openOnCanvas}
            onBranch={(node) => {
              if (!planId) {
                return;
              }
              branchDispatch.openBranch({
                parentPlanId: planId,
                parentStep: node,
                title: `Branch from "${node.description.slice(0, 40)}"`,
              });
              dispatch.addBranch({
                planId: branchState.activeBranchId ?? "",
                parentStepId: node.id,
                title: node.description.slice(0, 40),
                createdAt: Date.now(),
              });
            }}
          />
        : null}
      </Stack>
    </Paper>
  );
}

function FocusedStepDetail({
  node,
  onRun,
  onOpen,
  onBranch,
}: {
  node: PlanNode | undefined;
  onRun: (node: PlanNode) => void | Promise<void>;
  onOpen: (node: PlanNode) => void;
  onBranch: (node: PlanNode) => void;
}): JSX.Element | null {
  if (!node) {
    return null;
  }
  return (
    <Stack gap={6}>
      <Group gap="xs" wrap="nowrap">
        <Text size="sm" fw={600}>
          {node.description}
        </Text>
      </Group>
      <Code block fz="xs">
        {node.code}
      </Code>
      {node.error ?
        <Alert color="red" variant="light" radius="sm" p="xs">
          <Text size="xs" ff="monospace">
            {node.error}
          </Text>
        </Alert>
      : null}
      <Group gap="xs">
        {node.status === "failed" || node.status === "pending" ?
          <Button
            size="xs"
            variant="light"
            onClick={() => {
              return onRun(node);
            }}
          >
            Run step
          </Button>
        : null}
        {node.status === "succeeded" ?
          <Button
            size="xs"
            variant="light"
            onClick={() => {
              return onOpen(node);
            }}
          >
            Open on canvas
          </Button>
        : null}
        {node.status === "succeeded" ?
          <Button
            size="xs"
            variant="outline"
            color="grape"
            onClick={() => {
              return onBranch(node);
            }}
          >
            Branch from here
          </Button>
        : null}
      </Group>
    </Stack>
  );
}
