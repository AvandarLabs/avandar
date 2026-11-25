import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { AccessParticipant } from "../../AccessParticipant";
import { ChosenServiceAccess } from "../../ChosenServiceAccess";
import { ServiceSvgGeometry } from "../../ServiceSvgGeometry";
import type { Input } from "../../ChosenServiceAccess.schema";
import type { Circle, Point, Pose } from "./ServiceApproachGeometry.types";
/**
 * Geometry assertions ignore colour, so the participant draws in the
 * inherited colour.
 */
const GEOMETRY_ACCENT = "currentColor";
function _getPathCoordinates(tag: string): number[] {
  const path = tag.match(/\bd="([^"]*)"/);
  assert.ok(path);
  return [...path[1].matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)].map(
    (match) => {
      return Number(match[0]);
    },
  );
}
function _getCircle({
  tags,
  radius,
}: {
  tags: readonly string[];
  radius: number;
}): Circle {
  const tag = tags.find((circle) => {
    return (
      SvgAttributes.getNumberFromMarkup({ attributes: circle, name: "r" }) ===
      radius
    );
  });
  assert.ok(tag);
  return {
    x: SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
    y: SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" }),
    radius,
  };
}
function _getPathPoints(tag: string): Point[] {
  const path = tag.match(/\bd="([^"]*)"/);
  assert.ok(path);
  return [...path[1].matchAll(/([MLVH])([^MLVH]+)/g)].reduce<Point[]>(
    (points, [, command, values]) => {
      const coordinates = values.trim().split(/\s+/).map(Number);
      const lastPoint = points.at(-1) ?? { x: 0, y: 0 };
      points.push(
        command === "V"
          ? { x: lastPoint.x, y: coordinates[0] }
          : command === "H"
            ? { x: coordinates[0], y: lastPoint.y }
            : { x: coordinates[0], y: coordinates[1] },
      );
      return points;
    },
    [],
  );
}
function _getParticipantBounds({
  circles,
  paths,
}: {
  circles: readonly string[];
  paths: readonly string[];
}): Pose["bounds"] {
  const shapes = _getParticipantBoundShapes({ circles, paths });
  return {
    left: Math.min(
      ...shapes.map((shape) => {
        return shape.x - shape.padding;
      }),
    ),
    top: Math.min(
      ...shapes.map((shape) => {
        return shape.y - shape.padding;
      }),
    ),
    right: Math.max(
      ...shapes.map((shape) => {
        return shape.x + shape.padding;
      }),
    ),
    bottom: Math.max(
      ...shapes.map((shape) => {
        return shape.y + shape.padding;
      }),
    ),
  };
}
function _getPose({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): Pose {
  const markup = renderToStaticMarkup(
    createElement(AccessParticipant, { frame, input, accent: GEOMETRY_ACCENT }),
  );
  const circles = [...markup.matchAll(/<circle\b[^>]*>/g)].map((match) => {
    return match[0];
  });
  const paths = [...markup.matchAll(/<path\b[^>]*>/g)].map((match) => {
    return match[0];
  });
  const head = _getCircle({ tags: circles, radius: 8 }),
    rear = _getCircle({ tags: circles, radius: 20 }),
    front = _getCircle({ tags: circles, radius: 5 }),
    hand = _getCircle({ tags: circles, radius: 3 });
  const arm = _getPathCoordinates(paths.at(-1)!);
  return {
    head,
    rear,
    front,
    hand,
    coordinates: [
      ...circles.flatMap((circle) => {
        return [
          SvgAttributes.getNumberFromMarkup({ attributes: circle, name: "cx" }),
          SvgAttributes.getNumberFromMarkup({ attributes: circle, name: "cy" }),
        ];
      }),
      ...paths.flatMap(_getPathCoordinates),
    ],
    armEndpoint: { x: arm.at(-2)!, y: arm.at(-1)! },
    bounds: _getParticipantBounds({ circles, paths }),
  };
}
function _getFloorSegments({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): Array<[Point, Point]> {
  const markup = renderToStaticMarkup(
    createElement(ChosenServiceAccess, {
      frame,
      input,
      accent: GEOMETRY_ACCENT,
      id: "test",
    }),
  );
  const route = markup.match(/<path\b[^>]*\bdata-access-route[^>]*>/);
  assert.ok(route);
  return ServiceSvgGeometry.getPathSegmentsFromTag(route[0]).map(
    ({ start, end }) => {
      return [start, end];
    },
  );
}
function _getSegmentDistance({
  point,
  segment: [start, end],
}: {
  point: Readonly<Point>;
  segment: readonly [Point, Point];
}): number {
  const dx = end.x - start.x,
    dy = end.y - start.y;
  const fraction = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );
  return Math.hypot(
    point.x - start.x - fraction * dx,
    point.y - start.y - fraction * dy,
  );
}
/**
 * Reads participant poses and floor-contact geometry for approach assertions.
 */
export const ServiceApproachGeometry = {
  /**
   * Geometry assertions ignore colour, so the participant draws in the
   * inherited colour.
   */
  GEOMETRY_ACCENT,
  /** Reads participant joints, arm endpoint, and bounds from rendered SVG. */
  getPose: _getPose,
  /** Reads the rendered access route as floor-contact line segments. */
  getFloorSegments: _getFloorSegments,
  /** Returns the shortest distance from a point to a finite segment. */
  getSegmentDistance: _getSegmentDistance,
} as const;

type GetParticipantBoundShapesOptions = {
  circles: readonly string[];
  paths: readonly string[];
};
/** Reads stroke-inclusive circle and path points for participant bounds. */
function _getParticipantBoundShapes({
  circles,
  paths,
}: Readonly<GetParticipantBoundShapesOptions>): Array<{
  x: number;
  y: number;
  padding: number;
}> {
  return [
    ...circles.map((tag) => {
      const radius = SvgAttributes.getNumberFromMarkup({
        attributes: tag,
        name: "r",
      });
      const stroke = Number(
        tag.match(/stroke-width="([^"]*)"/)?.[1] ?? (radius === 3 ? 0 : 2),
      );
      return {
        x: SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cx" }),
        y: SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "cy" }),
        padding: radius + stroke / 2,
      };
    }),
    ...paths.flatMap((tag) => {
      return _getPathPoints(tag).map((point) => {
        return { ...point, padding: 1.5 };
      });
    }),
  ];
}
