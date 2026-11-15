import { EASE, mix, ramp } from "../../../motion";
/**
 * The carried request follows one fixed grip until release onto the counter.
 */
export function getOrderSlipPoseFromFrame(frame: number): {
  x: number;
  y: number;
} {
  const placement = ramp(frame, 28, 8, EASE.inOut);
  return { x: mix(placement, 620, 590), y: mix(placement, 250, 268) };
}
