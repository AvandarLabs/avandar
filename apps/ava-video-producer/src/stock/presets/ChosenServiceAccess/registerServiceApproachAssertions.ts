import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { AccessParticipant } from "./AccessParticipant";
import { ChosenServiceAccess } from "./ChosenServiceAccess";
import {
  CHANGED_INPUT,
  DENSE_INPUT,
  MINIMUM_INPUT,
} from "./ChosenServiceAccess.fixtures";
import { inputSchema, type Input } from "./ChosenServiceAccess.schema";
import { ServiceSvgGeometry } from "./ServiceSvgGeometry";

type Point = { x: number; y: number };
type Circle = Point & { radius: number };
/** Data for Pose. */
type PoseBounds = { left: number; top: number; right: number; bottom: number };

type Pose = {
  head: Circle;
  rear: Circle;
  front: Circle;
  hand: Circle;
  coordinates: number[];
  armEndpoint: Point;
  bounds: PoseBounds;
};

function _getPathCoordinates(tag: string): number[] {
  const path = tag.match(/\bd="([^"]*)"/);
  assert.ok(path);
  return [...path[1].matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)].map((match) =>
    Number(match[0]),
  );
}

function _getCircle({
  tags,
  radius,
}: {
  tags: readonly string[];
  radius: number;
}): Circle {
  const tag = tags.find(
    (circle) =>
      SvgAttributes.getNumberFromMarkup({ attributes: circle, name: "r" }) ===
      radius,
  );
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
  const shapes = [
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
    ...paths.flatMap((tag) =>
      _getPathPoints(tag).map((point) => ({ ...point, padding: 1.5 })),
    ),
  ];
  return {
    left: Math.min(...shapes.map((shape) => shape.x - shape.padding)),
    top: Math.min(...shapes.map((shape) => shape.y - shape.padding)),
    right: Math.max(...shapes.map((shape) => shape.x + shape.padding)),
    bottom: Math.max(...shapes.map((shape) => shape.y + shape.padding)),
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
    createElement(AccessParticipant, { frame, input, accent: "#9fefca" }),
  );
  const circles = [...markup.matchAll(/<circle\b[^>]*>/g)].map(
    (match) => match[0],
  );
  const paths = [...markup.matchAll(/<path\b[^>]*>/g)].map((match) => match[0]);
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
      ...circles.flatMap((circle) => [
        SvgAttributes.getNumberFromMarkup({ attributes: circle, name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes: circle, name: "cy" }),
      ]),
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
      accent: "#9fefca",
      id: "test",
    }),
  );
  const route = markup.match(/<path data-access-route[^>]*>/);
  assert.ok(route);
  return ServiceSvgGeometry.getPathSegmentsFromTag(route[0]).map(
    ({ start, end }) => [start, end],
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

function _assertWheelFloorContact({
  wheel,
  segments,
  frame,
}: {
  wheel: Readonly<Circle>;
  segments: ReadonlyArray<readonly [Point, Point]>;
  frame: number;
}): void {
  const distances = segments.map((segment) =>
    _getSegmentDistance({ point: wheel, segment: segment }),
  );
  assert.ok(
    Math.abs(Math.min(...distances) - wheel.radius - 1) < 1e-8,
    `wheel r${wheel.radius} misses the stroke-inclusive floor contact at frame ${frame}`,
  );
  Array.from({ length: 73 }, (_, index) => (index * Math.PI) / 36).forEach(
    (angle) => {
      const point = {
        x: wheel.x + (wheel.radius + 1) * Math.cos(angle),
        y: wheel.y + (wheel.radius + 1) * Math.sin(angle),
      };
      const segment = segments.find(
        ([start, end]) => point.x >= start.x && point.x <= end.x,
      );
      assert.ok(segment);
      const [start, end] = segment;
      const floorY =
        start.y + ((point.x - start.x) * (end.y - start.y)) / (end.x - start.x);
      assert.ok(
        point.y <= floorY + 1e-8,
        `wheel crosses the emitted floor at frame ${frame}`,
      );
    },
  );
}

function _assertFloorContact({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): void {
  const pose = _getPose({ frame, input }),
    segments = _getFloorSegments({ frame, input });
  [pose.rear, pose.front].forEach((wheel) =>
    _assertWheelFloorContact({ wheel, segments, frame }),
  );
  assert.ok(
    Math.abs(
      Math.hypot(pose.hand.x - pose.rear.x, pose.hand.y - pose.rear.y) -
        pose.rear.radius,
    ) < 1e-8,
  );
  assert.deepEqual(pose.armEndpoint, { x: pose.hand.x, y: pose.hand.y });
}

function _assertContinuousBoundary({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): void {
  const poses = [frame - 0.000001, frame, frame + 0.000001].map((sample) =>
    _getPose({ frame: sample, input }),
  );
  [poses[0], poses[2]].forEach((pose) => {
    assert.equal(pose.coordinates.length, poses[1].coordinates.length);
    pose.coordinates.forEach((coordinate, index) =>
      assert.ok(
        Math.abs(coordinate - poses[1].coordinates[index]) < 0.0001,
        `emitted coordinate ${index} jumps ${Math.abs(coordinate - poses[1].coordinates[index])} pixels at frame ${frame}`,
      ),
    );
  });
}

function _assertParticipantEnvelope({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): void {
  const { bounds } = _getPose({ frame, input });
  assert.ok(
    bounds.left >= 0 &&
      bounds.right <= 960 &&
      bounds.top >= 0 &&
      bounds.bottom <= 640,
  );
  if (frame < 78) {
    const firstDoorLeft = 160 + 320 / input.services.length - 68;
    assert.ok(
      bounds.right < firstDoorLeft,
      "setup participant overlaps an entrance",
    );
  }
  const markup = renderToStaticMarkup(
    createElement(ChosenServiceAccess, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
  [...markup.matchAll(/<text\b([^>]*)>(.*?)<\/text>/g)].forEach((text) => {
    const baseline = SvgAttributes.getNumberFromMarkup({
        attributes: ` ${text[1]}`,
        name: "y",
      }),
      fontSize = SvgAttributes.getNumberFromMarkup({
        attributes: ` ${text[1]}`,
        name: "font-size",
      });
    const displacement = [
      ...text[2].matchAll(/<tspan\b[^>]*dy="([^"]*)"/g),
    ].reduce((sum, span) => sum + Number(span[1]), 0);
    assert.ok(
      bounds.bottom < baseline - fontSize ||
        bounds.top > baseline + displacement + fontSize * 0.4,
      `actual participant envelope intersects a label at frame ${frame}`,
    );
  });
}

function _registerApproachCase(input: Readonly<Input>): void {
  test(`N1 ${input.services.length} services, chosen ${JSON.stringify(input.chosenServiceId)}, ${input.accessChange}: complete approach keeps wheels grounded with actual hand contact`, () => {
    const frames = [
      ...Array.from({ length: 85 }, (_, index) => 78 + index / 2),
      77.999999,
      78.000001,
      97.999999,
      98.000001,
      119.999999,
      120.000001,
    ];
    frames.forEach((frame) => _assertFloorContact({ frame, input }));
    [78, 98, 120].forEach((frame) =>
      _assertContinuousBoundary({ frame, input }),
    );
    const boundaryBefore = _getPose({ frame: 98, input });
    const final = _getPose({ frame: 120, input });
    assert.deepEqual(_getPose({ frame: 98, input }), boundaryBefore);
    assert.deepEqual(_getPose({ frame: 120, input }), final);
    assert.notEqual(
      boundaryBefore.head.x,
      _getPose({ frame: 78, input }).head.x,
    );
    [false, true].forEach((showChoiceLabel) => {
      [0, 24, 36, 77, 78, 88, 97.999999, 98, 108, 120].forEach((frame) =>
        _assertParticipantEnvelope({
          frame,
          input: { ...input, showChoiceLabel },
        }),
      );
    });
  });
}

/**
 * Protect physical approach, entry and fractional wheel/body boundary contact.
 */
export function registerServiceApproachAssertions(): void {
  test("N1 reviewed frame-98 wheel/body geometry is continuous across fractional seeks", () => {
    const input = inputSchema.parse({
      ...CHANGED_INPUT,
      accessChange: "unfold-ramp",
      participantMobility: "wheelchair",
    });
    const before = _getPose({ frame: 97.999999, input }),
      boundary = _getPose({ frame: 98, input });
    assert.ok(
      Math.abs(before.front.y - boundary.front.y) < 0.0001,
      `front wheel jumps ${Math.abs(before.front.y - boundary.front.y)} pixels at frame 98`,
    );
    _assertContinuousBoundary({ frame: 98, input });
  });
  [MINIMUM_INPUT, DENSE_INPUT].forEach((fixture) => {
    fixture.services.forEach((service) => {
      (["unfold-ramp", "clear-entrance"] as const).forEach((accessChange) => {
        const input = inputSchema.parse({
          ...fixture,
          chosenServiceId: service.id,
          accessChange,
          showChoiceLabel: false,
        });
        _registerApproachCase(input);
      });
    });
  });
}
