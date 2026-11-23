import type { NodeTraversalInput } from "../../presets/NodeTraversal/NodeTraversal.schema";
import type { KeyedTraversalStep } from "./NodeTraversal.types";

/**
 * Supplies NodeTraversal with frame-specific rendering geometry or progress.
 */
export function getKeyedRouteStepsFromNodes({
  route,
  nodes,
}: Readonly<{
  route: NodeTraversalInput["route"];
  nodes: NodeTraversalInput["nodes"];
}>): KeyedTraversalStep[] {
  const routePairCounts = new Map<string, number>();
  return route.slice(0, -1).map((fromIndex, stepOffset) => {
    const toIndex = route[stepOffset + 1];
    const pairKey = `${nodes[fromIndex].label}->${nodes[toIndex].label}`;
    const occurrence = routePairCounts.get(pairKey) ?? 0;
    routePairCounts.set(pairKey, occurrence + 1);
    return {
      key: `${pairKey}#${occurrence}`,
      from: nodes[fromIndex],
      to: nodes[toIndex],
      stepOffset,
    };
  });
}
