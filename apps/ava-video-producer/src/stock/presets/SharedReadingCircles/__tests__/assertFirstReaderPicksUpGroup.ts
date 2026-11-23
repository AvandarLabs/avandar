import assert from "node:assert/strict";
import { type AssertFirstReaderPicksUpGroupOptions } from "./SharedReadingCirclesContractTestState.types";
import {
  _render,
  _bookPositions,
  _getReaderPosition,
} from "./SharedReadingCirclesTestHelpers/SharedReadingCirclesTestHelpers";

/**
 * Asserts the first reader picks up and carries the single physical copy
 * with hand contact.
 */
export function assertFirstReaderPicksUpGroup({
  group,
  index,
  startingShelf,
  input,
}: Readonly<AssertFirstReaderPicksUpGroupOptions>): void {
  const start = 24 + index * 18;
  const frames =
    startingShelf === "front"
      ? [44, 44.001, 64.5, 93.999, 94]
      : [4, 4.001, 7, 10, 15.5, 19.999, 20, 22.999, 23].map((offset) => {
          return start + offset;
        });
  frames.forEach((frame) => {
    const markup = _render({ frame, input });
    const books = _bookPositions(markup);
    const [readerX, readerY] = _getReaderPosition({
      markup,
      id: group.learnerIds[0],
    });
    const hand = markup.match(
      new RegExp(`data-reading-hand="${group.learnerIds[0]}" d="([^"]+)"`),
    );
    assert.ok(hand);
    const coordinates = hand[1].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    assert.ok(
      Math.abs(
        readerX +
          coordinates.at(-2)! -
          (books[index][0] + (startingShelf === "front" ? 22 : -22)),
      ) < 0.001,
    );
    assert.ok(
      Math.abs(readerY + coordinates.at(-1)! - (books[index][1] - 12)) < 0.001,
    );
  });
}
