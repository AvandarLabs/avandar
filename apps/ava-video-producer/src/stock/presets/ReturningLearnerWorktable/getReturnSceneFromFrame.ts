import { EASE, mix, ramp } from "../../../motion";
/** Frame-local rigid portfolio travel and sequential teacher placements. */
export function getReturnSceneFromFrame({
  frame,
  numActivities,
}: Readonly<{ frame: number; numActivities: number }>): {
  portfolioOffset: number;
  teacherX: number;
  handX: number;
} {
  const away =
    ramp(frame, 36, 24, EASE.inOut) * (1 - ramp(frame, 72, 18, EASE.inOut));
  const activeIndex = Math.min(
    numActivities - 1,
    Math.max(0, Math.floor((frame - 90) / 16)),
  );
  const cycleStart = 90 + activeIndex * 16;
  const pickup = ramp(frame, cycleStart, 4, EASE.inOut);
  const placement = ramp(frame, cycleStart + 4, 12, EASE.inOut);
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
