import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
/** Nonzero loss opens a bounded storage interval after the initial closure. */
export function getJarOpeningFromFrame({
  frame,
  loss,
  motion,
}: Readonly<{ frame: number; loss: number; motion: VideoMotion }>): number {
  const lossOpening =
    loss > 0
      ? motion.ramp(frame, 68, motion.chip, motion.travel.easing) *
        (1 - motion.ramp(frame, 92, motion.whip, motion.travel.easing))
      : 0;
  // Lateral loss travel finishes before 92, clearing the whole jar opening.
  return (
    1 -
    motion.ramp(frame, 49, motion.scale(7), motion.travel.easing) +
    lossOpening +
    motion.ramp(frame, 101, motion.scale(10), motion.travel.easing)
  );
}
