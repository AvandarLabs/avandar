import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { ChosenServiceAccess } from "../ChosenServiceAccess";
import {
  CHANGED_INPUT,
  DENSE_INPUT,
  MINIMUM_INPUT,
} from "../ChosenServiceAccess.fixtures";
import { inputSchema, type Input } from "../ChosenServiceAccess.schema";
import { ServiceApproachGeometry } from "./ServiceApproachGeometry";
import { type Circle, type Point } from "./ServiceApproachGeometry.types";

function _assertWheelFloorContact({
  wheel,
  segments,
  frame,
}: {
  wheel: Readonly<Circle>;
  segments: ReadonlyArray<readonly [Point, Point]>;
  frame: number;
}): void {
  const distances = segments.map((segment) => {
    return ServiceApproachGeometry.getSegmentDistance({
      point: wheel,
      segment,
    });
  });
  assert.ok(
    Math.abs(Math.min(...distances) - wheel.radius - 1) < 1e-8,
    `wheel r${wheel.radius} misses the stroke-inclusive floor contact at frame ${frame}`,
  );
  Array.from({ length: 73 }, (_, index) => {
    return (index * Math.PI) / 36;
  }).forEach((angle) => {
    const point = {
      x: wheel.x + (wheel.radius + 1) * Math.cos(angle),
      y: wheel.y + (wheel.radius + 1) * Math.sin(angle),
    };
    const segment = segments.find(([start, end]) => {
      return point.x >= start.x && point.x <= end.x;
    });
    assert.ok(segment);
    const [start, end] = segment;
    const floorY =
      start.y + ((point.x - start.x) * (end.y - start.y)) / (end.x - start.x);
    assert.ok(
      point.y <= floorY + 1e-8,
      `wheel crosses the emitted floor at frame ${frame}`,
    );
  });
}
function _assertFloorContact({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): void {
  const pose = ServiceApproachGeometry.getPose({ frame, input }),
    segments = ServiceApproachGeometry.getFloorSegments({ frame, input });
  [pose.rear, pose.front].forEach((wheel) => {
    return _assertWheelFloorContact({ wheel, segments, frame });
  });
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
  const poses = [frame - 0.000001, frame, frame + 0.000001].map((sample) => {
    return ServiceApproachGeometry.getPose({ frame: sample, input });
  });
  [poses[0], poses[2]].forEach((pose) => {
    assert.equal(pose.coordinates.length, poses[1].coordinates.length);
    pose.coordinates.forEach((coordinate, index) => {
      return assert.ok(
        Math.abs(coordinate - poses[1].coordinates[index]) < 0.0001,
        `emitted coordinate ${index} jumps ${Math.abs(coordinate - poses[1].coordinates[index])} pixels at frame ${frame}`,
      );
    });
  });
}
function _assertParticipantEnvelope({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): void {
  const { bounds } = ServiceApproachGeometry.getPose({ frame, input });
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
      accent: ServiceApproachGeometry.GEOMETRY_ACCENT,
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
    ].reduce((sum, span) => {
      return sum + Number(span[1]);
    }, 0);
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
      ...Array.from({ length: 85 }, (_, index) => {
        return 78 + index / 2;
      }),
      77.999999,
      78.000001,
      97.999999,
      98.000001,
      119.999999,
      120.000001,
    ];
    frames.forEach((frame) => {
      return _assertFloorContact({ frame, input });
    });
    [78, 98, 120].forEach((frame) => {
      return _assertContinuousBoundary({ frame, input });
    });
    const boundaryBefore = ServiceApproachGeometry.getPose({
      frame: 98,
      input,
    });
    assert.notEqual(
      boundaryBefore.head.x,
      ServiceApproachGeometry.getPose({ frame: 78, input }).head.x,
    );
    [false, true].forEach((showChoiceLabel) => {
      [0, 24, 36, 77, 78, 88, 97.999999, 98, 108, 120].forEach((frame) => {
        return _assertParticipantEnvelope({
          frame,
          input: { ...input, showChoiceLabel },
        });
      });
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
    const before = ServiceApproachGeometry.getPose({ frame: 97.999999, input }),
      boundary = ServiceApproachGeometry.getPose({ frame: 98, input });
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
