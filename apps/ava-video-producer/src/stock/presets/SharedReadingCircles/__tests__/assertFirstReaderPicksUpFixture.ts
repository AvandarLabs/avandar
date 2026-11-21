import assert from "node:assert/strict";
import { denseInput } from "../SharedReadingCircles.fixtures";
import { assertFirstReaderPicksUpGroup as _assertFirstReaderPicksUpGroup } from "./assertFirstReaderPicksUpGroup";
import {
  _render,
  _bookPositions,
  _createRouteInputs,
} from "./SharedReadingCirclesTestHelpers/SharedReadingCirclesTestHelpers";

/**
 * Asserts the first reader picks up and carries the single physical copy
 * with hand contact.
 */
export function assertFirstReaderPicksUpFixture({
  fixture,
  startingShelf,
}: Readonly<{
  fixture: typeof denseInput | ReturnType<typeof _createRouteInputs>[number];
  startingShelf: "front" | "side";
}>): void {
  const input = { ...fixture, startingShelf };
  input.readingGroups.forEach((group, index) => {
    return _assertFirstReaderPicksUpGroup({
      group,
      index,
      startingShelf,
      input,
    });
  });
  assert.notDeepEqual(
    _bookPositions(_render({ frame: 24, input })),
    _bookPositions(_render({ frame: 101, input })),
  );
  assert.equal(
    [..._render({ frame: 130, input }).matchAll(/data-page-turn=/g)].length,
    input.books.length,
  );
  assert.equal(
    [..._render({ frame: 150, input }).matchAll(/data-page-turn=/g)].length,
    0,
  );
}
