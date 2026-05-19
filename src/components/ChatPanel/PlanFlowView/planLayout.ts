import type { Edge, Node } from "@xyflow/react";
import type { PlanNode } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type { PlanStepNodeData } from "@/components/ChatPanel/PlanFlowView/PlanStepNode";

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
  focusedStepId: string | null;
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
  const layerToNodes = new Map<number, PlanNode[]>();
  for (const node of nodes) {
    const layer = layerByStep.get(node.id) ?? 0;
    const arr = layerToNodes.get(layer);
    if (arr) {
      arr.push(node);
    } else {
      layerToNodes.set(layer, [node]);
    }
  }

  const rfNodes: Array<Node<PlanStepNodeData>> = [];
  const sortedLayers = Array.from(layerToNodes.keys()).sort((a, b) => {
    return a - b;
  });
  for (const layer of sortedLayers) {
    const layerNodes = layerToNodes.get(layer) ?? [];
    layerNodes.forEach((step, idxInLayer) => {
      const globalIdx = nodes.findIndex((n) => {
        return n.id === step.id;
      });
      rfNodes.push({
        id: step.id,
        type: "planStep",
        position: {
          x: layer * (NODE_WIDTH + H_GAP),
          y: idxInLayer * (NODE_HEIGHT + V_GAP),
        },
        data: {
          step,
          index: globalIdx,
          isFocused: focusedStepId === step.id,
        },
        draggable: true,
        selectable: true,
      });
    });
  }

  const rfEdges: Edge[] = [];
  for (const node of nodes) {
    for (const inputId of node.inputs) {
      const exists = nodes.some((n) => {
        return n.id === inputId;
      });
      if (!exists) {
        continue;
      }
      rfEdges.push({
        id: `${inputId}->${node.id}`,
        source: inputId,
        target: node.id,
        type: "rough",
        selected:
          focusedStepId === inputId || focusedStepId === node.id,
      });
    }
  }

  return { rfNodes, rfEdges };
}
