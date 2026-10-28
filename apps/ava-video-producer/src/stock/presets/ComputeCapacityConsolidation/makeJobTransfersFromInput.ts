import { findJobRoute, type JobPoint, type JobRectangle } from "./findJobRoute";
import { getJobSlotFromInput } from "./getJobSlotFromInput";
import type { Input } from "./ComputeCapacityConsolidation.schema";

type Slot = { initial: JobRectangle; final: JobRectangle; isMoving: boolean };
/** One job follows this unobstructed polyline while every other job holds. */
export type JobTransfer = { index: number; points: JobPoint[]; length: number };
/** Geometry and serialized transfers retain all authored work blocks. */
export type JobTransferPlan = {
  slots: Slot[];
  transfers: JobTransfer[];
  totalLength: number;
};
function _getRaised(slot: Slot): JobRectangle {
  return { ...slot.initial, y: slot.initial.y - (slot.isMoving ? 160 : 0) };
}
/** Inputs for findTransfers. */
type FindTransfersOptions = {
  slots: Slot[];
  mask: number;
  failed: Set<number>;
  captions: JobRectangle[];
};

function _findTransfers({
  slots,
  mask,
  failed,
  captions,
}: FindTransfersOptions): JobTransfer[] | undefined {
  if (slots.every((slot, index) => !slot.isMoving || mask & (1 << index))) {
    return [];
  }
  if (failed.has(mask)) {
    return undefined;
  }
  const transferPlan = slots.reduce<JobTransfer[] | undefined>(
    (foundPlan, slot, index) => {
      if (foundPlan) {
        return foundPlan;
      }
      if (!slot.isMoving || mask & (1 << index)) {
        return undefined;
      }
      const obstacles = slots.flatMap((other, otherIndex) =>
        otherIndex === index
          ? []
          : [mask & (1 << otherIndex) ? other.final : _getRaised(other)],
      );
      const points = findJobRoute({
        from: _getRaised(slot),
        to: slot.final,
        height: slot.initial.height,
        obstacles: [...obstacles, ...captions],
      });
      if (!points) {
        return undefined;
      }
      const remaining = _findTransfers({
        slots,
        mask: mask | (1 << index),
        failed,
        captions,
      });
      if (remaining) {
        const length = points
          .slice(1)
          .reduce(
            (sum, point, pointIndex) =>
              sum +
              Math.abs(point.x - points[pointIndex].x) +
              Math.abs(point.y - points[pointIndex].y),
            0,
          );
        return [{ index, points, length }, ...remaining];
      }
      return undefined;
    },
    undefined,
  );
  if (transferPlan) {
    return transferPlan;
  }
  failed.add(mask);
  return undefined;
}
/** Lifts moving stacks, then searches the at-most-256 settled-job subsets. */
export function makeJobTransfersFromInput(
  input: Readonly<Input>,
): JobTransferPlan {
  const slots = input.jobs.map((job, index) => ({
    initial: getJobSlotFromInput({ input, index, placement: "initialHostId" }),
    final: getJobSlotFromInput({ input, index, placement: "finalHostId" }),
    isMoving: job.initialHostId !== job.finalHostId,
  }));
  const captions = input.hosts.map((_, index) => ({
    x: 165 + index * 215,
    y: 354,
    width: 65,
    height: 32,
  }));
  const transfers = _findTransfers({
    slots,
    mask: 0,
    failed: new Set(),
    captions,
  });
  if (!transfers) {
    throw new Error("Complete work blocks have no clear transfer route.");
  }
  return {
    slots,
    transfers,
    totalLength: transfers.reduce((sum, transfer) => sum + transfer.length, 0),
  };
}
