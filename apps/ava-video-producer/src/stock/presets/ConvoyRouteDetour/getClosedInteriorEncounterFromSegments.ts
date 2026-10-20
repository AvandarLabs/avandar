type Point = { x: number; y: number };
type Encounter = { from: Point; to: Point; start: Point; end: Point };
/**
 * First travel fraction meeting a closed segment interior, excluding its ends.
 */
export function getClosedInteriorEncounterFromSegments({
  from,
  to,
  start,
  end,
}: Readonly<Encounter>): number | undefined {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const sx = end.x - start.x;
  const sy = end.y - start.y;
  const length = sx * sx + sy * sy;
  if (length === 0) {
    return undefined;
  }
  const denominator = dx * sy - dy * sx;
  const ax = start.x - from.x;
  const ay = start.y - from.y;
  if (denominator !== 0) {
    const travel = (ax * sy - ay * sx) / denominator;
    const closed = (ax * dy - ay * dx) / denominator;
    return travel >= 0 && travel <= 1 && closed > 0 && closed < 1
      ? travel
      : undefined;
  }
  if (ax * sy - ay * sx !== 0) {
    return undefined;
  }
  const first = ((from.x - start.x) * sx + (from.y - start.y) * sy) / length;
  const last = ((to.x - start.x) * sx + (to.y - start.y) * sy) / length;
  if (first === last) {
    return first > 0 && first < 1 ? 0 : undefined;
  }
  const lower = Math.max(0, Math.min(first, last));
  const upper = Math.min(1, Math.max(first, last));
  if (lower >= upper) {
    return undefined;
  }
  return first < last
    ? Math.max(0, (lower - first) / (last - first))
    : Math.max(0, (upper - first) / (last - first));
}
