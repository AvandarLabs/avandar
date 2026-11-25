import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
/**
 * The carried request follows one fixed grip until release onto the counter.
 */
export function getOrderSlipPoseFromFrame({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: VideoMotion;
}>): {
  x: number;
  y: number;
} {
  const placement = motion.ramp(frame, 28, motion.whip, motion.travel.easing);
  return {
    x: Motion.mix({
      t: placement,
      from: 620,
      to: 590,
    }),
    y: Motion.mix({
      t: placement,
      from: 250,
      to: 268,
    }),
  };
}
