import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
/** Frame-local rigid portfolio travel and sequential teacher placements. */
export function getReturnSceneFromFrame({
  frame,
  numActivities,
  motion,
}: Readonly<{ frame: number; numActivities: number; motion: VideoMotion }>): {
  portfolioOffset: number;
  teacherX: number;
  handX: number;
} {
  const away =
    motion.ramp(frame, 36, motion.scale(24), motion.travel.easing) *
    (1 - motion.ramp(frame, 72, motion.hero, motion.travel.easing));
  const activeIndex = Math.min(
    numActivities - 1,
    Math.max(0, Math.floor((frame - 90) / 16)),
  );
  const cycleStart = 90 + activeIndex * 16;
  const pickup = motion.ramp(
    frame,
    cycleStart,
    motion.press.duration,
    motion.travel.easing,
  );
  const placement = motion.ramp(
    frame,
    cycleStart + 4,
    motion.scale(12),
    motion.travel.easing,
  );
  const previousX = activeIndex === 0 ? 700 : 350 + (activeIndex - 1) * 110;
  const teacherX =
    frame < 90
      ? 700
      : frame >= 90 + numActivities * 16
        ? 350 + (numActivities - 1) * 110
        : frame < cycleStart + 4
          ? mix(pickup, previousX, 700)
          : mix(placement, 700, 350 + activeIndex * 110);
  return { portfolioOffset: 500 * away, teacherX, handX: teacherX - 50 };
}
