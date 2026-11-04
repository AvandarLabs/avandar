import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import {
  type ServiceObstacle,
  type ServicePoint,
  type ServiceSegment,
  type ServiceParticipantGeometry,
  ServiceSvgGeometry,
} from "./ServiceSvgGeometry";

function _getPointDistance({
  point,
  segment: { start, end },
}: {
  point: Readonly<ServicePoint>;
  segment: Readonly<ServiceSegment>;
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

function _getSegmentDistance({
  first,
  second,
}: {
  first: Readonly<ServiceSegment>;
  second: Readonly<ServiceSegment>;
}): number {
  const dx1 = first.end.x - first.start.x,
    dy1 = first.end.y - first.start.y;
  const dx2 = second.end.x - second.start.x,
    dy2 = second.end.y - second.start.y;
  const denominator = dx1 * dy2 - dy1 * dx2;
  const dx = second.start.x - first.start.x,
    dy = second.start.y - first.start.y;
  if (Math.abs(denominator) > 1e-12) {
    const firstFraction = (dx * dy2 - dy * dx2) / denominator;
    const secondFraction = (dx * dy1 - dy * dx1) / denominator;
    if (
      firstFraction >= 0 &&
      firstFraction <= 1 &&
      secondFraction >= 0 &&
      secondFraction <= 1
    ) {
      return 0;
    }
  }
  return Math.min(
    _getPointDistance({ point: first.start, segment: second }),
    _getPointDistance({ point: first.end, segment: second }),
    _getPointDistance({ point: second.start, segment: first }),
    _getPointDistance({ point: second.end, segment: first }),
  );
}

function _isInside({
  point,
  obstacle,
}: {
  point: Readonly<ServicePoint>;
  obstacle: Readonly<ServiceObstacle>;
}): boolean {
  if (!obstacle.hasFill) {
    return false;
  }
  assert.equal(obstacle.segments.length, 4);
  assert.ok(
    obstacle.segments.every(
      ({ start, end }) => start.x === end.x || start.y === end.y,
    ),
  );
  const points = obstacle.segments.map(prop("start"));
  return (
    point.x >= Math.min(...points.map(prop("x"))) &&
    point.x <= Math.max(...points.map(prop("x"))) &&
    point.y >= Math.min(...points.map(prop("y"))) &&
    point.y <= Math.max(...points.map(prop("y")))
  );
}

function _assertWheelchairContact({
  participant,
  segments,
}: {
  participant: Readonly<ServiceParticipantGeometry>;
  segments: readonly ServiceSegment[];
}): void {
  const [head, rear, front, hand] = participant.circles;
  [rear, front].forEach((wheel) => {
    const floor = segments.find(
      ({ start, end }) => wheel.x >= start.x && wheel.x <= end.x,
    );
    assert.ok(floor);
    const floorY =
      floor.start.y +
      ((wheel.x - floor.start.x) * (floor.end.y - floor.start.y)) /
        (floor.end.x - floor.start.x);
    assert.ok(wheel.y < floorY);
    assert.ok(
      Math.abs(
        Math.min(
          ...segments.map((segment) =>
            _getPointDistance({ point: wheel, segment: segment }),
          ),
        ) - wheel.radius,
      ) < 1e-8,
    );
    assert.ok(
      Math.hypot(head.x - wheel.x, head.y - wheel.y) >
        head.radius + wheel.radius,
    );
  });
  assert.ok(
    Math.abs(Math.hypot(hand.x - rear.x, hand.y - rear.y) - rear.rimRadius) <
      1e-8,
  );
  assert.deepEqual(participant.segments.at(-1)!.end, { x: hand.x, y: hand.y });
}

function _assertWalkingContact({
  markup,
  segments,
}: {
  markup: string;
  segments: readonly ServiceSegment[];
}): void {
  const body = markup.match(/<path\b[^>]*data-participant-body[^>]*>/);
  assert.ok(body);
  ServiceSvgGeometry.getPathSegmentsFromTag(body[0])
    .slice(1)
    .forEach(({ end }) => {
      assert.ok(
        Math.min(
          ...segments.map((segment) =>
            _getPointDistance({ point: end, segment: segment }),
          ),
        ) < 1e-8,
      );
    });
}

function _assertParticipantCanvas(
  participant: Readonly<ServiceParticipantGeometry>,
): void {
  participant.circles.forEach(({ x, y, radius }) =>
    assert.ok(
      x - radius >= 0 &&
        x + radius <= 960 &&
        y - radius >= 0 &&
        y + radius <= 640,
    ),
  );
  participant.segments.forEach(({ start, end, strokeWidth }) =>
    [start, end].forEach(({ x, y }) =>
      assert.ok(
        x >= strokeWidth / 2 &&
          x <= 960 - strokeWidth / 2 &&
          y >= strokeWidth / 2 &&
          y <= 640 - strokeWidth / 2,
      ),
    ),
  );
}

function _assertObstacleClearance({
  participant,
  obstacle,
  frame,
}: {
  participant: Readonly<ServiceParticipantGeometry>;
  obstacle: Readonly<ServiceObstacle>;
  frame: number;
}): void {
  participant.circles.forEach((circle) => {
    const distance = _isInside({ point: circle, obstacle })
      ? 0
      : Math.min(
          ...obstacle.segments.map((segment) =>
            _getPointDistance({ point: circle, segment: segment }),
          ),
        );
    assert.ok(
      distance > circle.radius + obstacle.strokeWidth / 2,
      `participant circle (${circle.x},${circle.y}), radius ${circle.radius}, intersects unchanged barrier at frame ${frame}`,
    );
  });
  participant.segments.forEach((segment) => {
    const distance =
      _isInside({ point: segment.start, obstacle }) ||
      _isInside({ point: segment.end, obstacle })
        ? 0
        : Math.min(
            ...obstacle.segments.map((edge) =>
              _getSegmentDistance({ first: segment, second: edge }),
            ),
          );
    assert.ok(
      distance > (segment.strokeWidth + obstacle.strokeWidth) / 2,
      `participant body/arm/spoke stroke intersects unchanged barrier at frame ${frame}`,
    );
  });
}

/** Geometry assertions for participants traveling around service barriers. */
export const ServiceParticipantAssertions = {
  /** Both wheels touch the route, hands touch the rim, and the head clears wheels. */
  assertWheelchairContact: _assertWheelchairContact,
  /** Walking foot strokes remain in contact with the authored route. */
  assertWalkingContact: _assertWalkingContact,
  /** Complete participant circles and strokes remain inside the canvas. */
  assertCanvas: _assertParticipantCanvas,
  /** Participant circles and strokes clear the unchanged barrier geometry. */
  assertObstacleClearance: _assertObstacleClearance,
};
