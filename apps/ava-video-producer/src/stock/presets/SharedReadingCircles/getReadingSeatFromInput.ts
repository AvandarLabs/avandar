import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";

type Options = {
  frame: number;
  memberIndex: number;
  tableX: number;
  isSide: boolean;
  motion: VideoMotion;
};
/** Stages the upper seats before sliding lower seats into the vacated space. */
export function getReadingSeatFromInput({
  frame,
  memberIndex,
  tableX,
  isSide,
  motion,
}: Readonly<Options>): { x: number; y: number } {
  const targetX =
    tableX + (memberIndex % 2 === 0 ? -60 : 60) * (isSide ? 1 : -1);
  const targetY = memberIndex < 2 ? 265 : 395;
  if (!isSide) {
    return {
      x: targetX,
      y: mix(
        motion.ramp(frame, 44, motion.scale(50), motion.travel.easing),
        memberIndex < 2 ? 330 : 395,
        targetY,
      ),
    };
  }
  const initialX =
    tableX + (memberIndex === 2 ? -60 : memberIndex === 3 ? 0 : 60);
  return {
    x: mix(
      motion.ramp(frame, 44, motion.scale(20), motion.travel.easing),
      initialX,
      targetX,
    ),
    y: mix(
      motion.ramp(frame, 24, motion.scale(20), motion.travel.easing),
      395,
      targetY,
    ),
  };
}
