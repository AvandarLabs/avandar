import type { NodeTraversalInput } from "../../presets/NodeTraversal/NodeTraversal.schema";
import type { KeyedTraversalStep } from "./NodeTraversal.types";

/**
 * Supplies NodeTraversal with frame-specific rendering geometry or progress.
 */
export function getKeyedEdgesFromNodes({
  edges,
  nodes,
}: Readonly<{
  edges: NodeTraversalInput["edges"];
  nodes: NodeTraversalInput["nodes"];
}>): KeyedTraversalStep[] {
  const edgePairCounts = new Map<string, number>();
  return edges.map(([from, to], stepOffset) => {
    const pairKey = `${nodes[from].label}->${nodes[to].label}`;
    const occurrence = edgePairCounts.get(pairKey) ?? 0;
    edgePairCounts.set(pairKey, occurrence + 1);
    return {
      key: `${pairKey}#${occurrence}`,
      from: nodes[from],
      to: nodes[to],
      stepOffset,
    };
  });
}
