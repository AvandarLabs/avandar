import { getOrientationFromTriangle } from "./getOrientationFromTriangle";

type Point = readonly [number, number];
type Triangle = { first: Point; second: Point; third: Point };
/** Whether the third point lies on the closed segment. */
export function isPointOnSegment({
  first,
  second,
  third,
}: Readonly<Triangle>): boolean {
  return (
    getOrientationFromTriangle({ first, second, third }) === 0 &&
    third[0] >= Math.min(first[0], second[0]) &&
    third[0] <= Math.max(first[0], second[0]) &&
    third[1] >= Math.min(first[1], second[1]) &&
    third[1] <= Math.max(first[1], second[1])
  );
}
