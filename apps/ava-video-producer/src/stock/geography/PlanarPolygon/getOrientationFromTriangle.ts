import { binary64ToInteger } from "./binary64ToInteger";

type Point = readonly [number, number];
type Triangle = { first: Point; second: Point; third: Point };
/** The exact orientation sign of three binary64 coordinate pairs. */
export function getOrientationFromTriangle({
  first,
  second,
  third,
}: Readonly<Triangle>): number {
  const [firstX, firstY] = first.map(binary64ToInteger);
  const [secondX, secondY] = second.map(binary64ToInteger);
  const [thirdX, thirdY] = third.map(binary64ToInteger);
  const determinant =
    (secondX - firstX) * (thirdY - firstY) -
    (secondY - firstY) * (thirdX - firstX);
  return determinant > 0n ? 1 : determinant < 0n ? -1 : 0;
}
