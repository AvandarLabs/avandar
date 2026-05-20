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
import { PlanStepNode } from "@/components/ChatPanel/PlanFlowView/PlanStepNode";
import { RoughEdge } from "@/components/ChatPanel/PlanFlowView/RoughEdge";
import {
  dropPlanTempViews,
  executePlan,
  executePlanStep,
} from "@/components/ChatPanel/PlanStateManager/planExecutor";
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
  const dataExplorerDispatch = DataExplorerStateManager.useDispatch();
  const workspace = useCurrentWorkspace();
  const { fitView, setCenter, getNode } = useReactFlow();
  const runOnceRef = useRef<string | null>(null);

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
    await executePlan({
      planId,
      nodes: state.nodes,
      dispatch,
      workspaceId: workspace.id,
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
      await executePlanStep({
        planId,
        step: node,
        dispatch,
        workspaceId: workspace.id,
      });
    },
    [planId, dispatch, workspace.id],
  );

  // Auto-run on first load when runMode === 'auto'. Key off the planId
  // so a brand-new plan triggers exactly one run.
  useEffect(() => {
    if (state.nodes.length === 0 || !state.isVisible || !planId) {
      return;
    }
    if (state.runMode !== "auto") {
      return;
    }
    const allPending = state.nodes.every((n) => {
      return n.status === "pending";
    });
    if (allPending && runOnceRef.current !== planId) {
      runOnceRef.current = planId;
      void runAll();
    }
  }, [state.nodes, state.isVisible, state.runMode, planId, runAll]);

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
    await dropPlanTempViews({
      planId: planId ?? undefined,
      nodes: state.nodes,
    });
    dispatch.clear();
    runOnceRef.current = null;
  }, [planId, state.nodes, dispatch]);

  const allSucceeded = state.nodes.every((n) => {
    return n.status === "succeeded";
  });
  const anyFailed = state.nodes.some((n) => {
    return n.status === "failed";
  });

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

        <Box
          style={{
            height: 360,
            background:
              "radial-gradient(circle at center, #fafafa 0%, #f1f3f5 100%)",
            borderRadius: 8,
            border: "1px solid var(--mantine-color-gray-3)",
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
          >
            <Background gap={20} size={1} color="#dee2e6" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </Box>

        {state.canvasView === "focused" && state.focusedStepId ?
          <FocusedStepDetail
            node={state.nodes.find((n) => {
              return n.id === state.focusedStepId;
            })}
            onRun={runSingle}
            onOpen={openOnCanvas}
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
}: {
  node: PlanNode | undefined;
  onRun: (node: PlanNode) => void | Promise<void>;
  onOpen: (node: PlanNode) => void;
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
      </Group>
    </Stack>
  );
}
