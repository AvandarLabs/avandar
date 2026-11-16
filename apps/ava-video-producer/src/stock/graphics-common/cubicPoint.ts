import type { Point } from "./graphicCommon.types";

/** Geometry only: the shared frame helpers supply the motion. */
export function cubicPoint(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  t: number,
): Point {
  const u = 1 - t;
  return {
    x:
      u ** 3 * a.x + 3 * u ** 2 * t * b.x + 3 * u * t ** 2 * c.x + t ** 3 * d.x,
    y:
      u ** 3 * a.y + 3 * u ** 2 * t * b.y + 3 * u * t ** 2 * c.y + t ** 3 * d.y,
  };
}
