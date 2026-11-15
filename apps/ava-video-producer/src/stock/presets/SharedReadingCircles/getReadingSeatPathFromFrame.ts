import { EASE, mix, ramp } from "../../../motion";
/** Rotates chair geometry toward its book while retaining caption clearance. */
export function getReadingSeatPathFromFrame({
  frame,
  angle,
}: Readonly<{ frame: number; angle: number }>): string {
  const progress = ramp(frame, 44, 64, EASE.inOut);
  const rotation = angle * progress;
  const pivotY = mix(progress, 25, 16);
  return [
    [-16, 0],
    [16, 0],
    [-12, 0],
    [-12, 10],
    [12, 0],
    [12, 10],
  ]
    .map(
      ([x, y], index) =>
        `${index % 2 === 0 ? "M" : "L"}${x * Math.cos(rotation) - y * Math.sin(rotation)} ${pivotY + x * Math.sin(rotation) + y * Math.cos(rotation)}`,
    )
    .join(" ");
}
