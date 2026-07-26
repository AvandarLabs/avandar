import { Box, Group } from "@mantine/core";
import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PlanAnnotationOverlay } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationOverlay";
import { PlanBranchSidebar } from "@/components/ChatPanel/PlanFlowView/PlanBranchSidebar";
import { PlanCanvasToolbar } from "@/components/ChatPanel/PlanFlowView/PlanCanvasToolbar";
import { layoutPlan } from "@/components/ChatPanel/PlanFlowView/planLayout/planLayout";
import { PlanStepNode } from "@/components/ChatPanel/PlanFlowView/PlanStepNode";
import { RoughEdge } from "@/components/ChatPanel/PlanFlowView/RoughEdge";
import type { AnnotationTool } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager/PlanAnnotationStateManager";

const NODE_TYPES = { planStep: PlanStepNode };
const EDGE_TYPES = { rough: RoughEdge };

type LayoutResult = ReturnType<typeof layoutPlan>;

type Props = {
  rfNodes: LayoutResult["rfNodes"];
  rfEdges: LayoutResult["rfEdges"];
  onNodeClick: (event: React.MouseEvent, node: { id: string }) => void;
  activeTool: AnnotationTool;
  planId: string | null;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  onExportPng: () => void;
  onExportPdf: () => void;
  onSelectRoot: () => void;
  onSelectBranch: (branchId: string) => void;
  onCloseBranch: (branchId: string) => void;
};

/**
 * The plan canvas region: the branch sidebar next to the xyflow DAG,
 * with the annotation overlay and the export toolbar layered over the
 * canvas surface. The `canvasContainerRef` is owned by `PlanFlowCanvas`
 * (for exports + the overlay) and forwarded onto the canvas `Box`.
 */
export function PlanFlowCanvasArea({
  rfNodes,
  rfEdges,
  onNodeClick,
  activeTool,
  planId,
  canvasContainerRef,
  onExportPng,
  onExportPdf,
  onSelectRoot,
  onSelectBranch,
  onCloseBranch,
}: Props): React.ReactNode {
  return (
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
        onSelectRoot={onSelectRoot}
        onSelectBranch={onSelectBranch}
        onCloseBranch={onCloseBranch}
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
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "rough" }}
          // While an annotation drawing tool is active, suppress
          // xyflow's pan-on-drag so the user can draw cleanly.
          panOnDrag={activeTool === "pan"}
          nodesDraggable={activeTool === "pan"}
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
        <PlanCanvasToolbar onExportPng={onExportPng} onExportPdf={onExportPdf} />
      </Box>
    </Group>
  );
}
