import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccessParticipant } from "./AccessParticipant";
import { ChosenServiceAccess } from "./ChosenServiceAccess";
import {
  CHANGED_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
} from "./ChosenServiceAccess.fixtures";
import { inputSchema, type Input } from "./ChosenServiceAccess.schema";
import { ServiceParticipantAssertions } from "./ServiceParticipantAssertions";
import {
  type ServiceParticipantGeometry,
  ServiceSvgGeometry,
} from "./ServiceSvgGeometry";

function _renderParticipant({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): string {
  return renderToStaticMarkup(
    createElement(AccessParticipant, { input, frame, accent: "#9fefca" }),
  );
}

function _renderScene({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): string {
  return renderToStaticMarkup(
    createElement(ChosenServiceAccess, {
      input,
      frame,
      accent: "#9fefca",
      id: "test",
    }),
  );
}

function _assertBarrierClearance({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): void {
  const markup = _renderScene({ frame, input });
  const participant = ServiceSvgGeometry.getParticipantGeometryFromMarkup(
    _renderParticipant({ frame, input }),
  );
  const obstacles = ServiceSvgGeometry.getObstaclesFromMarkup(markup);
  assert.equal(obstacles.length, input.services.length - 1);
  assert.deepEqual(
    obstacles,
    ServiceSvgGeometry.getObstaclesFromMarkup(
      _renderScene({ frame: 24, input }),
    ),
  );
  obstacles.forEach((obstacle) =>
    ServiceParticipantAssertions.assertObstacleClearance({
      participant,
      obstacle,
      frame,
    }),
  );
  const route = markup.match(/<path data-access-route[^>]*>/);
  assert.ok(route);
  const segments = ServiceSvgGeometry.getPathSegmentsFromTag(route[0]);
  if (input.participantMobility === "wheelchair") {
    ServiceParticipantAssertions.assertWheelchairContact({
      participant,
      segments,
    });
  } else {
    ServiceParticipantAssertions.assertWalkingContact({ markup, segments });
  }
  ServiceParticipantAssertions.assertCanvas(participant);
}

function _getFrameFromX({
  targetX,
  input,
}: {
  targetX: number;
  input: Readonly<Input>;
}): number {
  let lowerFrame = 78,
    upperFrame = 120;
  Array.from({ length: 40 }).forEach(() => {
    const frame = (lowerFrame + upperFrame) / 2;
    const head = ServiceSvgGeometry.getParticipantGeometryFromMarkup(
      _renderParticipant({ frame, input }),
    ).circles[0];
    if (head.x < targetX) {
      lowerFrame = frame;
    } else {
      upperFrame = frame;
    }
  });
  return (lowerFrame + upperFrame) / 2;
}

function _getJoinFrames(input: Readonly<Input>): number[] {
  const route = _renderScene({ frame: 120, input }).match(
    /<path data-access-route[^>]*>/,
  );
  assert.ok(route);
  const startX = ServiceSvgGeometry.getParticipantGeometryFromMarkup(
    _renderParticipant({ frame: 78, input }),
  ).circles[0].x;
  const endX = ServiceSvgGeometry.getParticipantGeometryFromMarkup(
    _renderParticipant({ frame: 120, input }),
  ).circles[0].x;
  const positions = ServiceSvgGeometry.getPathSegmentsFromTag(route[0])
    .slice(0, -1)
    .flatMap(({ end }) =>
      [0, -33, -27, -21, -15, 6, 27].map((offset) => end.x + offset),
    )
    .filter((x) => x > startX && x < endX);
  return [...new Set(positions)].map((x) =>
    _getFrameFromX({ targetX: x, input }),
  );
}

function _getCoordinates(
  geometry: Readonly<ServiceParticipantGeometry>,
): number[] {
  return [
    ...geometry.circles.flatMap(({ x, y, radius }) => [x, y, radius]),
    ...geometry.segments.flatMap(({ start, end, strokeWidth }) => [
      start.x,
      start.y,
      end.x,
      end.y,
      strokeWidth,
    ]),
  ];
}

function _assertJoin({
  frame,
  input,
}: {
  frame: number;
  input: Readonly<Input>;
}): void {
  const boundary = _getCoordinates(
    ServiceSvgGeometry.getParticipantGeometryFromMarkup(
      _renderParticipant({ frame, input }),
    ),
  );
  [frame - 0.000001, frame, frame + 0.000001].forEach((sample) => {
    _assertBarrierClearance({ frame: sample, input });
    const coordinates = _getCoordinates(
      ServiceSvgGeometry.getParticipantGeometryFromMarkup(
        _renderParticipant({ frame: sample, input }),
      ),
    );
    coordinates.forEach((coordinate, index) =>
      assert.ok(
        Math.abs(coordinate - boundary[index]) < 0.0001,
        `participant coordinate jumps at fractional route join ${frame}`,
      ),
    );
  });
}

function _registerTravelCase(input: Readonly<Input>): void {
  test(`N2 ${input.services.length} services, chosen ${JSON.stringify(input.chosenServiceId)}, ${input.accessChange}, ${input.participantMobility}: full travel clears every unchosen barrier`, () => {
    const frames = [
      ...Array.from({ length: 169 }, (_, index) => 78 + index / 4),
      77.999999,
      78.000001,
      97.999999,
      98.000001,
      119.999999,
      120.000001,
    ];
    frames.forEach((frame) => _assertBarrierClearance({ frame, input }));
    _getJoinFrames(input).forEach((frame) => _assertJoin({ frame, input }));
  });
}

/** Protect complete participant clearance around every unchanged barrier. */
export function registerServiceBarrierAssertions(): void {
  test("N2 exact frame-88 wheelchair stays outside the unchosen shelter obstruction", () => {
    const input = inputSchema.parse({
      ...CHANGED_INPUT,
      participantMobility: "wheelchair",
    });
    _assertBarrierClearance({ frame: 88, input });
  });
  [MINIMUM_INPUT, DENSE_INPUT].forEach((fixture) =>
    fixture.services.forEach((service) => {
      (["unfold-ramp", "clear-entrance"] as const).forEach((accessChange) => {
        (["wheelchair", "walking"] as const).forEach((participantMobility) => {
          const input = inputSchema.parse({
            ...fixture,
            chosenServiceId: service.id,
            accessChange,
            participantMobility,
            showChoiceLabel: false,
          });
          _registerTravelCase(input);
        });
      });
    }),
  );
}
