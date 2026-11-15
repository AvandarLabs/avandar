/** Behavioral conservation and physical choreography assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { inputSchema } from ".././SharedReadingCircles.schema";
import {
  _render,
  _bookPositions,
  _getReaderPosition,
  _assertReaderSeparation,
  _createRouteInputs,
} from "./SharedReadingCirclesTestHelpers";

test("crossing and concentrated routes retain full reader and key envelopes on both shelves", () => {
  const joins = [
    24,
    44,
    64,
    94,
    96,
    108,
    116,
    118,
    ...[0, 1, 2, 3].flatMap((index) =>
      [0, 4, 7, 10, 20, 23, 27].map((offset) => 24 + index * 18 + offset),
    ),
  ];
  const frames = [
    ...Array.from({ length: 241 }, (_, index) => index / 2),
    ...joins.flatMap((frame) => [frame - 0.001, frame, frame + 0.001]),
    150,
  ];
  _createRouteInputs().forEach((fixture) => {
    (["front", "side"] as const).forEach((startingShelf) => {
      const input = { ...fixture, startingShelf };
      assert.deepEqual(inputSchema.parse(input), input);
      const original = structuredClone(input);
      frames.forEach((frame) => _assertReaderSeparation({ input, frame }));
      assert.deepEqual(input, original);
    });
  });
});

test("reader and book routes stay continuous across fractional phase joins", () => {
  const joins = [
    24,
    44,
    64,
    94,
    104,
    108,
    118,
    ...[0, 1, 2, 3].flatMap((index) =>
      [0, 4, 7, 10, 20, 23, 27].map((offset) => 24 + index * 18 + offset),
    ),
  ];
  _createRouteInputs().forEach((fixture) => {
    (["front", "side"] as const).forEach((startingShelf) => {
      const input = { ...fixture, startingShelf };
      joins.forEach((frame) => {
        const before = _render({ frame: frame - 0.001, input: input });
        const after = _render({ frame: frame + 0.001, input: input });
        const startPoints = [
          ..._bookPositions(before),
          ...input.learners.map(({ id }) =>
            _getReaderPosition({ markup: before, id }),
          ),
        ];
        const endPoints = [
          ..._bookPositions(after),
          ...input.learners.map(({ id }) =>
            _getReaderPosition({ markup: after, id }),
          ),
        ];
        startPoints.forEach(([x, y], index) =>
          assert.ok(
            Math.hypot(x - endPoints[index][0], y - endPoints[index][1]) < 0.5,
            `${startingShelf} frame ${frame}: discontinuous object ${index}`,
          ),
        );
      });
      assert.notDeepEqual(
        input.learners.map(({ id }) =>
          _getReaderPosition({
            markup: _render({ frame: 0, input: input }),
            id,
          }),
        ),
        input.learners.map(({ id }) =>
          _getReaderPosition({
            markup: _render({ frame: 150, input: input }),
            id,
          }),
        ),
      );
    });
  });
});
