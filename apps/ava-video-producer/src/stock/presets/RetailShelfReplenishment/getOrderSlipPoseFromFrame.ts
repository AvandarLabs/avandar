import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
/**
 * The carried request follows one fixed grip until release onto the counter.
 */
export function getOrderSlipPoseFromFrame(
  frame: number,
  motion: VideoMotion,
): {
  x: number;
  y: number;
} {
  const placement = motion.ramp(frame, 28, motion.whip, motion.travel.easing);
  return { x: mix(placement, 620, 590), y: mix(placement, 250, 268) };
}
