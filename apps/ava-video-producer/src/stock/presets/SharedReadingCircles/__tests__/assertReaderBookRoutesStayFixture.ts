import assert from "node:assert/strict";
import {
  _render,
  _bookPositions,
  _getReaderPosition,
  _createRouteInputs,
} from "./SharedReadingCirclesTestHelpers/SharedReadingCirclesTestHelpers";

/**
 * Asserts reader and book routes stay continuous across fractional phase
 * joins.
 */
export function assertReaderBookRoutesStayFixture({
  fixture,
  joins,
}: Readonly<{
  fixture: ReturnType<typeof _createRouteInputs>[number];
  joins: readonly number[];
}>): void {
  (["front", "side"] as const).forEach((startingShelf) => {
    const input = { ...fixture, startingShelf };
    joins.forEach((frame) => {
      const before = _render({ frame: frame - 0.001, input });
      const after = _render({ frame: frame + 0.001, input });
      const startPoints = [
        ..._bookPositions(before),
        ...input.learners.map(({ id }) => {
          return _getReaderPosition({ markup: before, id });
        }),
      ];
      const endPoints = [
        ..._bookPositions(after),
        ...input.learners.map(({ id }) => {
          return _getReaderPosition({ markup: after, id });
        }),
      ];
      startPoints.forEach(([x, y], index) => {
        return assert.ok(
          Math.hypot(x - endPoints[index][0], y - endPoints[index][1]) < 0.5,
          `${startingShelf} frame ${frame}: discontinuous object ${index}`,
        );
      });
    });
    assert.notDeepEqual(
      input.learners.map(({ id }) => {
        return _getReaderPosition({ markup: _render({ frame: 0, input }), id });
      }),
      input.learners.map(({ id }) => {
        return _getReaderPosition({
          markup: _render({ frame: 150, input }),
          id,
        });
      }),
    );
  });
}
