import { prop } from "@avandar/utils";
import type { Input } from "./ComputeCapacityConsolidation.schema";
/** Data for getJobSlotFromInput. */
type GetJobSlotResult = { width: number; x: number; y: number; height: number };

/** A job retains the shared capacity scale and its stable stacked slot. */
export function getJobSlotFromInput({
  input,
  index,
  placement,
}: Readonly<
  Omit<{ input: Input; index: number; frame: number }, "frame"> & {
    placement: "initialHostId" | "finalHostId";
  }
>): GetJobSlotResult {
  const job = input.jobs[index];
  const hostIndex = input.hosts.findIndex(({ id }) => id === job[placement]);
  const maxCapacity = Math.max(...input.hosts.map(prop("capacityCpuHours")));
  const unchanged = input.jobs.filter(
    (item) =>
      item.initialHostId === item.finalHostId &&
      item[placement] === job[placement],
  );
  const before =
    job.initialHostId === job.finalHostId
      ? unchanged.slice(0, unchanged.indexOf(job))
      : [
          ...unchanged,
          ...input.jobs
            .slice(0, index)
            .filter(
              (item) =>
                item.initialHostId !== item.finalHostId &&
                item[placement] === job[placement],
            ),
        ];
  const used = before.reduce((sum, item) => sum + item.cpuHours, 0);
  return {
    width: 80,
    x: 75 + hostIndex * 215,
    // A valid full stack can exceed its 110-unit span by summation roundoff.
    y: Math.max(260, 370 - ((used + job.cpuHours) / maxCapacity) * 110),
    height: (job.cpuHours / maxCapacity) * 110,
  };
}
