import { makeMap } from "@avandar/utils";
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
  const costs = makeMap(input.nodes, {
    key: "id",
    valueFn: () => {
      return Infinity;
    },
  });
  const predecessors = new Map<string, string>();
  const settled = new Set<string>();
  costs.set(input.originId, 0);
  _settleTravelCostsFromInput({ input, costs, predecessors, settled });
  return input.nodes.map((node) => {
    return {
      ...node,
      cost: costs.get(node.id)!,
      predecessor: predecessors.get(node.id),
    };
  });
}

/** Relaxes authored roads in stable node and neighbor order. */
function _settleTravelCostsFromInput({
  input,
  costs,
  predecessors,
  settled,
}: Readonly<{
  input: Input;
  costs: Map<string, number>;
  predecessors: Map<string, string>;
  settled: Set<string>;
}>): void {
  input.nodes.forEach(() => {
    const current = input.nodes
      .filter((node) => {
        return !settled.has(node.id);
      })
      .reduce<(typeof input.nodes)[number] | undefined>((best, node) => {
        return !best || costs.get(node.id)! < costs.get(best.id)! ? node : best;
      }, undefined);
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
}
