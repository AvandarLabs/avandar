import {
  changedInput,
  denseInput,
  minimumInput,
} from "../SharedReadingCircles.fixtures";
import { assertFourCopiesNonuniformReaderFixture as _assertFourCopiesNonuniformReaderFixture } from "./assertFourCopiesNonuniformReaderFixture";

/**
 * Asserts four copies and nonuniform reader groups survive both shelf
 * positions and hidden counts.
 */
export function assertFourCopiesNonuniformReaderShowGroupCounts({
  showGroupCounts,
  startingShelf,
}: Readonly<{
  showGroupCounts: boolean;
  startingShelf: "front" | "side";
}>): void {
  [denseInput, changedInput, minimumInput].forEach((fixture) => {
    return _assertFourCopiesNonuniformReaderFixture({
      fixture,
      startingShelf,
      showGroupCounts,
    });
  });
}
