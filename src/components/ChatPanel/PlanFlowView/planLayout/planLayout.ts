import type { PlanStepNodeData } from "@/components/ChatPanel/PlanFlowView/PlanStepNode";
import type { PlanNode } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { Edge, Node } from "@xyflow/react";

/**
 * Compute a left-to-right layered layout for the plan DAG.
 *
 * Layer assignment:
 *   - For each node, layer = 1 + max(layer of inputs).
 *   - Nodes with no inputs go in layer 0.
 *
 * Vertical position:
 *   - Within a layer, nodes stack top-to-bottom in the order they
 *     appear in `nodes` (the LLM's emitted order).
 *
 * This is intentionally not Dagre or ELK: the DAGs we see at this scale
 * (≤8 nodes) are tiny, the dependency graphs the LLM emits are almost
 * always near-linear, and a layered layout is plenty readable. Saves
 * us a heavyweight dependency.
 */
const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;
const H_GAP = 80;
const V_GAP = 40;

export function layoutPlan(args: {
  nodes: readonly PlanNode[];
  focusedStepId: string | undefined;
}): {
  rfNodes: Array<Node<PlanStepNodeData>>;
  rfEdges: Edge[];
} {
  const { nodes, focusedStepId } = args;
  const layerByStep = new Map<string, number>();
  for (const node of nodes) {
    const inputLayers = node.inputs
      .map((inputId) => {
        return layerByStep.get(inputId);
      })
      .filter((v): v is number => {
        return v !== undefined;
      });
    const layer = inputLayers.length === 0 ? 0 : Math.max(...inputLayers) + 1;
    layerByStep.set(node.id, layer);
  }

  // Group nodes by layer.
  const layerToNodes = nodes.reduce((acc, node) => {
    const layer = layerByStep.get(node.id) ?? 0;
    const existing = acc.get(layer);
    if (existing) {
      existing.push(node);
    } else {
      acc.set(layer, [node]);
    }
    return acc;
  }, new Map<number, PlanNode[]>());

  // Precompute an id -> emitted-index lookup so the layout pass never scans
  // `nodes` per step.
  const indexById = new Map(
    nodes.map((node, idx) => {
      return [node.id, idx] as const;
    }),
  );
  const sortedLayers = Array.from(layerToNodes.keys()).sort((a, b) => {
    return a - b;
  });
  const rfNodes: Array<Node<PlanStepNodeData>> = sortedLayers.flatMap(
    (layer) => {
      const layerNodes = layerToNodes.get(layer) ?? [];
      return layerNodes.map((step, idxInLayer) => {
        return {
          id: step.id,
          type: "planStep",
          position: {
            x: layer * (NODE_WIDTH + H_GAP),
            y: idxInLayer * (NODE_HEIGHT + V_GAP),
          },
          data: {
            step,
            index: indexById.get(step.id) ?? -1,
            isFocused: focusedStepId === step.id,
          },
          draggable: true,
          selectable: true,
        };
      });
    },
  );

  // Edges: one per existing input dependency. A Set of ids keeps the
  // existence check O(1) instead of scanning `nodes` per input.
  const nodeIds = new Set(
    nodes.map((node) => {
      return node.id;
    }),
  );
  const rfEdges: Edge[] = nodes.flatMap((node) => {
    return node.inputs
      .filter((inputId) => {
        return nodeIds.has(inputId);
      })
      .map((inputId) => {
        return {
          id: `${inputId}->${node.id}`,
          source: inputId,
          target: node.id,
          type: "rough",
          selected: focusedStepId === inputId || focusedStepId === node.id,
        };
      });
  });

  return { rfNodes, rfEdges };
}
