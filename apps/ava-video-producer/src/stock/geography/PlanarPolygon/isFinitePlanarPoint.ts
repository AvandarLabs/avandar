type Point = readonly [number, number];
/** Whether a planar coordinate pair contains finite values. */
export function isFinitePlanarPoint(point: Point): boolean {
  return point.length === 2 && point.every(Number.isFinite);
}
