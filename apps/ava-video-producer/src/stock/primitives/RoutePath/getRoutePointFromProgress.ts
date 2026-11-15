/** Normalized route points stay within the authored rectangular stage. */
export type RoutePoint = { x: number; y: number };

type RouteTravel = { points: readonly RoutePoint[]; progress: number };

function _validateRouteTravel({
  points,
  progress,
}: Readonly<RouteTravel>): void {
  if (
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 1 ||
    points.length < 2 ||
    points.length > 32 ||
    points.some(
      (point) =>
        ![point.x, point.y].every(
          (value) => Number.isFinite(value) && value >= 0 && value <= 1,
        ),
    )
  ) {
    throw new Error(
      "Routes require two to thirty-two normalized points and bounded progress.",
    );
  }
}

/** Locates a marker by total polyline length, independently of prior seeks. */
export function getRoutePointFromProgress({
  points,
  progress,
}: Readonly<RouteTravel>): RoutePoint {
  _validateRouteTravel({ points, progress });
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point.x - points[index].x, point.y - points[index].y),
    );
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0) {
    throw new Error("A route needs a nonzero length.");
  }
  if (progress === 1) {
    return { ...points.at(-1)! };
  }
  const distance = progress * total;
  const index = lengths.findIndex(
    (length, segmentIndex) =>
      length > 0 &&
      lengths
        .slice(0, segmentIndex + 1)
        .reduce((sum, segment) => sum + segment, 0) >= distance,
  );
  const covered = lengths
    .slice(0, index)
    .reduce((sum, length) => sum + length, 0);
  const fraction = (distance - covered) / lengths[index];
  return {
    x: points[index].x + (points[index + 1].x - points[index].x) * fraction,
    y: points[index].y + (points[index + 1].y - points[index].y) * fraction,
  };
}
export type { RouteTravel };
