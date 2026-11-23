import { denseInput } from "../SharedReadingCircles.fixtures";
import { assertFirstReaderPicksUpFixture as _assertFirstReaderPicksUpFixture } from "./assertFirstReaderPicksUpFixture";
import { _createRouteInputs } from "./SharedReadingCirclesTestHelpers/SharedReadingCirclesTestHelpers";

/**
 * Asserts the first reader picks up and carries the single physical copy
 * with hand contact.
 */
export function assertFirstReaderPicksUpStartingShelf(
  startingShelf: "front" | "side",
): void {
  [denseInput, ..._createRouteInputs()].forEach((fixture) => {
    return _assertFirstReaderPicksUpFixture({ fixture, startingShelf });
  });
}
