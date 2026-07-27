import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { PlanAnnotationClient } from "@/clients/chat/PlanAnnotationClient";
import { layoutPlan } from "@/components/ChatPanel/PlanFlowView/layoutPlan/layoutPlan";
import { PlanAnnotationStateManager } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager/PlanAnnotationStateManager";
import {
  exportPlanCanvasAsPdf,
  exportPlanCanvasAsPng,
} from "@/components/ChatPanel/PlanFlowView/planCanvasExport";
import { PlanFlowBanners } from "@/components/ChatPanel/PlanFlowView/PlanFlowBanners";
import { PlanFlowCanvasArea } from "@/components/ChatPanel/PlanFlowView/PlanFlowCanvasArea";
import { PlanFlowHeader } from "@/components/ChatPanel/PlanFlowView/PlanFlowHeader";
import { PlanStepSqlCode } from "@/components/ChatPanel/PlanFlowView/PlanStepSqlCode";
import { usePlanRun } from "@/components/ChatPanel/PlanFlowView/usePlanRun";
import { PlanBranchStateManager } from "@/components/ChatPanel/PlanStateManager/PlanBranchStateManager/PlanBranchStateManager";
import { dropPlanTempViews } from "@/components/ChatPanel/PlanStateManager/planExecutor";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { PlanNode } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";

/**
 * Renders the visual plan workspace for the active chat plan.
 * Returns the provider-wrapped plan canvas when visible, otherwise `null`.
 */
export function PlanFlowView(): React.ReactNode {
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

function PlanFlowCanvas(): React.ReactNode {
  const state = PlanStateManager.useState();
  const dispatch = PlanStateManager.useDispatch();
  const branchState = PlanBranchStateManager.useState();
  const branchDispatch = PlanBranchStateManager.useDispatch();
  const annotationState = PlanAnnotationStateManager.useState();
  const annotationDispatch = PlanAnnotationStateManager.useDispatch();
  const dataExplorerDispatch = DataExplorerStateManager.useDispatch();
  const workspace = useCurrentWorkspace();
  const { t } = useLingui();
  const { fitView, setCenter, getNode } = useReactFlow();
  const runOnceRef = useRef<string | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Keep the latest plan reachable to `executePlan`'s drift-regen
  // callback without re-creating the callable on every state change.
  // `runAll`/`runSingle` read `stateRef.current` only from async handlers
  // (never during render), so we update it in an effect to keep render pure.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const { rfNodes, rfEdges } = useMemo(() => {
    return layoutPlan({
      nodes: state.nodes,
      focusedStepId: state.focusedStepId,
    });
  }, [state.nodes, state.focusedStepId]);

  const planId = state.planId;

  // Plan-run orchestration (runAll / runSingle / auto-run effect) is
  // lifted into a self-contained hook. It is called here before the
  // canvas-zoom effect so hook order, dependency arrays, and effect
  // timing are identical to the previous inline version. `stateRef` and
  // `runOnceRef` stay owned here so `close` can reset the run-once gate.
  const { runAll, runSingle } = usePlanRun({
    planId,
    state,
    dispatch,
    workspaceId: workspace.id,
    stateRef,
    runOnceRef,
  });

  // Animated zoom between overview and focused views: xyflow handles
  // the easing for us via `duration`.
  useEffect(
    function animateCanvasZoom() {
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
    },
    [state.canvasView, state.focusedStepId, fitView, setCenter, getNode],
  );

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

  const onNodeClick = useCallback(
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
        await PlanAnnotationClient.clearAnnotationsForPlan(planId);
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
  // swap the rendered nodes in this checkpoint: that requires
  // chat-thread orchestration we land in a follow-up. For now we
  // record the active id so the sidebar shows the correct selection,
  // which is enough to verify the model end-to-end.
  const selectRoot = useCallback((): void => {
    branchDispatch.setActiveBranch(undefined);
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

  // Annotation persistence: load once on each plan switch, then save every
  // annotation change for the active plan. This remains imperative because a
  // subscribed query could refetch and merge stale persisted rows over newer
  // in-memory edits.
  useEffect(
    function loadPlanAnnotations() {
      if (!planId) {
        return;
      }
      let cancelled = false;
      void (async () => {
        try {
          const loaded =
            await PlanAnnotationClient.listAnnotationsForPlan(planId);
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
    },
    [planId, annotationDispatch],
  );

  useEffect(
    function persistPlanAnnotations() {
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
      void PlanAnnotationClient.putAnnotations(planAnnotations);
    },
    [annotationState.annotations, planId],
  );

  // Export callbacks: capture the canvas element via the ref.
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
      datasetName: t`Analytic plan`,
      t,
    });
  }, [state.nodes, state.rootMessage, t]);

  return (
    <Paper withBorder shadow="sm" radius="md" p="sm">
      <Stack gap="xs">
        <PlanFlowHeader
          rootMessage={state.rootMessage}
          runMode={state.runMode}
          canvasView={state.canvasView}
          approvalStatus={state.approvalStatus}
          dispatch={dispatch}
          onReRun={runAll}
          onClose={close}
        />

        <PlanFlowBanners
          nodes={state.nodes}
          approvalStatus={state.approvalStatus}
          dispatch={dispatch}
        />

        <PlanFlowCanvasArea
          rfNodes={rfNodes}
          rfEdges={rfEdges}
          onNodeClick={onNodeClick}
          activeTool={annotationState.activeTool}
          planId={planId}
          canvasContainerRef={canvasContainerRef}
          onExportPng={exportPng}
          onExportPdf={exportPdf}
          onSelectRoot={selectRoot}
          onSelectBranch={selectBranch}
          onCloseBranch={closeBranch}
        />

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
              const truncated = node.description.slice(0, 40);
              branchDispatch.openBranch({
                parentPlanId: planId,
                parentStep: node,
                title: t`Branch from "${truncated}"`,
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
}): React.ReactNode {
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
      <PlanStepSqlCode code={node.code} />
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
            <Trans>Run step</Trans>
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
            <Trans>Open on canvas</Trans>
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
            <Trans>Branch from here</Trans>
          </Button>
        : null}
      </Group>
    </Stack>
  );
}
