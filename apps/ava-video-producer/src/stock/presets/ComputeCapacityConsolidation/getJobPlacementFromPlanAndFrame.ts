import { propEq } from "@avandar/utils";
import { mix, ramp, EASE } from "../../../motion";
import type { JobRectangle } from "./findJobRoute";
import type { JobTransferPlan, JobTransfer } from "./makeJobTransfersFromInput";
function _getTravelPoint({
  transfer,
  distance,
}: {
  transfer: JobTransfer;
  distance: number;
}) {
  let remaining = Math.max(0, Math.min(transfer.length, distance));
  const segmentIndex = transfer.points.slice(1).findIndex((point, index) => {
    const prior = transfer.points[index];
    const length = Math.abs(point.x - prior.x) + Math.abs(point.y - prior.y);
    if (remaining <= length) {
      return true;
    }
    remaining -= length;
    return false;
  });
  if (segmentIndex < 0) {
    return transfer.points.at(-1)!;
  }
  const prior = transfer.points[segmentIndex];
  const point = transfer.points[segmentIndex + 1];
  const length = Math.abs(point.x - prior.x) + Math.abs(point.y - prior.y);
  return {
    x: mix(length ? remaining / length : 1, prior.x, point.x),
    y: mix(length ? remaining / length : 1, prior.y, point.y),
  };
}
/** Intact blocks move one at a time along full-rectangle clearance routes. */
export function getJobPlacementFromPlanAndFrame({
  plan,
  index,
  frame,
}: Readonly<{ plan: JobTransferPlan; index: number; frame: number }>):
  | JobRectangle
  | { height: number; x: number; y: number } {
  const slot = plan.slots[index];
  if (!slot.isMoving) {
    return slot.initial;
  }
  if (frame <= 48) {
    return {
      ...slot.initial,
      y: slot.initial.y - 160 * ramp(frame, 36, 12, EASE.inOut),
    };
  }
  const order = plan.transfers.findIndex(propEq("index", index));
  const preceding = plan.transfers
    .slice(0, order)
    .reduce((sum, transfer) => sum + transfer.length, 0);
  const distance =
    plan.totalLength * ramp(frame, 48, 60, EASE.inOut) - preceding;
  return {
    ..._getTravelPoint({ transfer: plan.transfers[order], distance }),
    height: slot.initial.height,
  };
}
