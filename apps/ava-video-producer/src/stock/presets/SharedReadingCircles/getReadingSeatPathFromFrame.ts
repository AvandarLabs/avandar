import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
/** Rotates chair geometry toward its book while retaining caption clearance. */
export function getReadingSeatPathFromFrame({
  frame,
  angle,
  motion,
}: Readonly<{
  frame: number;
  angle: number;
  motion: VideoMotion;
}>): string {
  const progress = motion.ramp(
    frame,
    44,
    motion.scale(64),
    motion.travel.easing,
  );
  const rotation = angle * progress;
  const pivotY = Motion.mix({
    t: progress,
    from: 25,
    to: 16,
  });
  return [
    [-16, 0],
    [16, 0],
    [-12, 0],
    [-12, 10],
    [12, 0],
    [12, 10],
  ]
    .map(([x, y], index) => {
      return `${index % 2 === 0 ? "M" : "L"}${x * Math.cos(rotation) - y * Math.sin(rotation)} ${pivotY + x * Math.sin(rotation) + y * Math.cos(rotation)}`;
    })
    .join(" ");
}
