import type { Input } from "./TravelTimeNetworkFrontier.schema";
/** Data for getTravelCostsFromInput. */
type GetTravelCostsFromInputResult = {
  cost: number;
  predecessor: string | undefined;
  id: string;
  label: string;
  x: number;
  y: number;
};

/** Minimum cumulative costs with stable authored node and neighbor ordering. */
export function getTravelCostsFromInput(
  input: Readonly<Input>,
): GetTravelCostsFromInputResult[] {
  const costs = new Map(input.nodes.map((node) => [node.id, Infinity]));
  const predecessors = new Map<string, string>();
  const settled = new Set<string>();
  costs.set(input.originId, 0);
  input.nodes.forEach(() => {
    const current = input.nodes
      .filter((node) => !settled.has(node.id))
      .reduce<(typeof input.nodes)[number] | undefined>(
        (best, node) =>
          !best || costs.get(node.id)! < costs.get(best.id)! ? node : best,
        undefined,
      );
    if (!current) {
      return;
    }
    settled.add(current.id);
    input.roads.forEach((road) => {
      const neighbor =
        road.fromId === current.id
          ? road.toId
          : road.toId === current.id
            ? road.fromId
            : undefined;
      if (neighbor === undefined || settled.has(neighbor)) {
        return;
      }
      const candidate = costs.get(current.id)! + road.minutes;
      if (candidate < costs.get(neighbor)!) {
        costs.set(neighbor, candidate);
        predecessors.set(neighbor, current.id);
      }
    });
  });
  return input.nodes.map((node) => ({
    ...node,
    cost: costs.get(node.id)!,
    predecessor: predecessors.get(node.id),
  }));
}
