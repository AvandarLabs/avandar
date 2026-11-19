import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
/** Overlapping arrival/departure beats preserve physical classroom cover. */
export function getCoverPositionsFromFrame(
  frame: number,
  motion: VideoMotion,
): {
  teacherX: number;
  coverX: number;
  mentorX: number;
} {
  const coverTravel =
    motion.ramp(frame, 24, motion.hero, motion.travel.easing) *
    (1 - motion.ramp(frame, 132, motion.hero, motion.travel.easing));
  const teacherTravel =
    motion.ramp(frame, 48, motion.scale(24), motion.travel.easing) *
    (1 - motion.ramp(frame, 104, motion.scale(20), motion.travel.easing));
  return {
    teacherX: mix(teacherTravel, 360, 660),
    coverX: mix(coverTravel, 55, 180),
    mentorX: 850,
  };
}
