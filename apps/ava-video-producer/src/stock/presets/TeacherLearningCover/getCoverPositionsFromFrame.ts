import { EASE, mix, ramp } from "../../../motion";
/** Overlapping arrival/departure beats preserve physical classroom cover. */
export function getCoverPositionsFromFrame(frame: number): {
  teacherX: number;
  coverX: number;
  mentorX: number;
} {
  const coverTravel =
    ramp(frame, 24, 18, EASE.inOut) * (1 - ramp(frame, 132, 18, EASE.inOut));
  const teacherTravel =
    ramp(frame, 48, 24, EASE.inOut) * (1 - ramp(frame, 104, 20, EASE.inOut));
  return {
    teacherX: mix(teacherTravel, 360, 660),
    coverX: mix(coverTravel, 55, 180),
    mentorX: 850,
  };
}
