import assert from "node:assert/strict";
import {
  changedInput,
  denseInput,
  minimumInput,
} from "../SharedReadingCircles.fixtures";
import { assertEachReaderKeepsItsAuthoredBook as _assertEachReaderKeepsItsAuthoredBook } from "./assertEachReaderKeepsItsAuthoredBook";
import {
  _render,
  _bookPositions,
} from "./SharedReadingCirclesTestHelpers/SharedReadingCirclesTestHelpers";

/**
 * Asserts four copies and nonuniform reader groups survive both shelf
 * positions and hidden counts.
 */
export function assertFourCopiesNonuniformReaderFixture({
  fixture,
  startingShelf,
  showGroupCounts,
}: Readonly<{
  fixture: typeof denseInput | typeof changedInput | typeof minimumInput;
  startingShelf: "front" | "side";
  showGroupCounts: boolean;
}>): void {
  const input = { ...fixture, startingShelf, showGroupCounts };
  [
    0, 24, 43.999, 44, 44.001, 64.5, 93.999, 94, 94.001, 107.999, 108, 108.001,
    124, 150,
  ].forEach((frame) => {
    const markup = _render({ frame, input });
    assert.equal(_bookPositions(markup).length, input.books.length);
    _bookPositions(markup).forEach(([, bookY]) => {
      return assert.ok(
        bookY - 20 > 188.6,
        `${input.startingShelf} frame ${frame}: book enters maximum-label roster rail`,
      );
    });
    _assertEachReaderKeepsItsAuthoredBook({ input, markup });
    _bookPositions(markup).forEach(([x, y], index, positions) => {
      const halfWidth = frame <= 94 ? 23 : 41;
      assert.ok(
        x - halfWidth >= 0 &&
          x + halfWidth <= 960 &&
          y - 22 > 180 &&
          y + 24 < 440,
      );
      positions.slice(index + 1).forEach(([otherX, otherY]) => {
        return assert.ok(
          Math.abs(x - otherX) >= 2 * halfWidth || Math.abs(y - otherY) >= 46,
        );
      });
    });
  });
}
