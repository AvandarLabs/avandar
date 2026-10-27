import { propNotEq } from "@avandar/utils";
import { projectGlobePoint } from "../../geography/projectGlobePoint/projectGlobePoint";
import type { Input } from "./FictionalConflictGlobe.schema";

type Point = { x: number; y: number };
/** Data for Options. */
type OptionsResult = {
  incident: Input["incidents"][number];
  incidents: Input["incidents"];
  longitude: number;
  labelY: number;
};

type Options = Point & OptionsResult;
/** Data for RouteNode. */
type RouteNodeResult = {
  index: number;
  distance: number;
  previousIndex?: number;
  visited: boolean;
};

type RouteNode = Point & RouteNodeResult;

function _getShortestRoute({
  points,
  blockers,
}: {
  points: readonly Point[];
  blockers: readonly Point[];
}): Point[] {
  const nodes: RouteNode[] = points.map((point, index) => ({
    ...point,
    index,
    distance: index ? Infinity : 0,
    visited: false,
  }));
  nodes.forEach(() => _visitClosestNode({ nodes, blockers }));
  if (!Number.isFinite(nodes[1].distance)) {
    // Overlapping geographic footprints may leave no distinct routing corridor.
    return [points[0], points[1]];
  }
  const route: Point[] = [];
  let cursorIndex: number | undefined = 1;
  nodes.forEach(() => {
    if (cursorIndex !== undefined) {
      const node: RouteNode = nodes[cursorIndex];
      route.push({ x: node.x, y: node.y });
      cursorIndex = node.previousIndex;
    }
  });
  return route.reverse();
}

/** Continuous bent leaders preserve geography and clear unrelated crosses. */
export function buildIncidentLeaderFromPoints(
  options: Readonly<Options>,
): string {
  const { incident, incidents, longitude, x, y, labelY } = options;
  const start = { x, y };
  const blockers = incidents
    .filter(propNotEq("id", incident.id))
    .flatMap((other) => {
      const point = projectGlobePoint({
        ...other,
        centerLongitude: longitude,
        centerLatitude: 0,
        radius: 195,
      });
      const marker = { x: 390 + point.x, y: 285 + point.y };
      // Coincident footprints retain their shared geographic location.
      return point.visible && Math.hypot(marker.x - x, marker.y - y) > 18
        ? [marker]
        : [];
    });
  const points = [
    start,
    { x: 604, y: labelY - 5 },
    ...blockers.flatMap((marker) =>
      [-24, 24].flatMap((offsetX) =>
        [-24, 24].map((offsetY) => ({
          x: marker.x + offsetX,
          y: marker.y + offsetY,
        })),
      ),
    ),
  ];
  const route = _getShortestRoute({ points, blockers });
  return `${route
    .map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`)
    .join(" ")} H608`;
}

function _visitClosestNode({
  nodes,
  blockers,
}: {
  nodes: RouteNode[];
  blockers: readonly Point[];
}): void {
  const closest = nodes
    .filter((node) => !node.visited)
    .sort((first, second) => first.distance - second.distance)[0];
  if (!closest || !Number.isFinite(closest.distance)) {
    return;
  }
  closest.visited = true;
  nodes.forEach((node) => {
    if (
      node.visited ||
      !_isClearSegment({ start: closest, end: node, blockers })
    ) {
      return;
    }
    const distance =
      closest.distance + Math.hypot(node.x - closest.x, node.y - closest.y);
    if (distance < node.distance) {
      node.distance = distance;
      node.previousIndex = closest.index;
    }
  });
}

function _isClearSegment({
  start,
  end,
  blockers,
}: {
  start: Readonly<Point>;
  end: Readonly<Point>;
  blockers: readonly Point[];
}): boolean {
  const deltaX = end.x - start.x,
    deltaY = end.y - start.y;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;
  return blockers.every((marker) => {
    const progress = Math.max(
      0,
      Math.min(
        1,
        ((marker.x - start.x) * deltaX + (marker.y - start.y) * deltaY) /
          lengthSquared,
      ),
    );
    return (
      Math.hypot(
        marker.x - start.x - progress * deltaX,
        marker.y - start.y - progress * deltaY,
      ) >= 18
    );
  });
}
