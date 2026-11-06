import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import type { Input } from "./MapClusterUnfold.schema";
/** Authored point and cluster endpoints share exact canvas-coordinate holds. */
export function getClusterPointPositionFromPoint({
  point,
  cluster,
  grouping,
}: Readonly<{
  point: Input["points"][number];
  cluster: Input["clusters"][number];
  grouping: number;
}>): { x: number; y: number; isStationary: boolean } {
  return {
    x: interpolateFiniteRange({
      from: 48 + point.x * 4.8,
      to: 48 + cluster.x * 4.8,
      progress: grouping,
    }),
    y: interpolateFiniteRange({
      from: 140 + point.y * 3.6,
      to: 140 + cluster.y * 3.6,
      progress: grouping,
    }),
    isStationary: point.x === cluster.x && point.y === cluster.y,
  };
}
