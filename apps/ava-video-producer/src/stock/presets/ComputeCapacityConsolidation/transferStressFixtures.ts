import { DEFAULT_INPUT } from "./ComputeCapacityConsolidation.fixtures";
import type { Input } from "./ComputeCapacityConsolidation.schema";
const hosts: Array<{ id: string; label: string; capacityCpuHours: number }> =
  Array.from({ length: 4 }, (_, index) => ({
    id: `host-${index}`,
    label: `Host ${index + 1}`,
    capacityCpuHours: 64,
  }));
const PERMUTATIONS: number[][] = [
  [1, 2, 3, 0],
  [3, 0, 1, 2],
  [3, 2, 1, 0],
  [2, 3, 0, 1],
  [1, 0, 3, 2],
  [0, 2, 1, 3],
];
/**
 * Maximum-size opaque jobs exercise crossed, cyclic and unchanged assignments.
 */
export const transferStressFixtures: Array<{ id: string; input: Input }> =
  PERMUTATIONS.flatMap((targets, variant) =>
    [false, true].map((isReversed) => {
      const jobs = Array.from({ length: 8 }, (_, index) => ({
        id: `job-${index}`,
        label: `Job ${index + 1}`,
        cpuHours: 32,
        initialHostId: `host-${Math.floor(index / 2)}`,
        finalHostId: `host-${targets[Math.floor(index / 2)]}`,
      }));
      return {
        id: `full-eight-${variant}-${isReversed}`,
        input: {
          ...DEFAULT_INPUT,
          hosts,
          jobs: isReversed ? [...jobs].reverse() : jobs,
          emptyHostState: isReversed ? "available" : "sleep",
        },
      };
    }),
  );
