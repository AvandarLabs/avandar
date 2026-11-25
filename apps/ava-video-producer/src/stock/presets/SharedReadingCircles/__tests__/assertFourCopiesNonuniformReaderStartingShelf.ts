import { assertFourCopiesNonuniformReaderShowGroupCounts as _assertFourCopiesNonuniformReaderShowGroupCounts } from "./assertFourCopiesNonuniformReaderShowGroupCounts";

/**
 * Asserts four copies and nonuniform reader groups survive both shelf
 * positions and hidden counts.
 */
export function assertFourCopiesNonuniformReaderStartingShelf(
  startingShelf: "front" | "side",
): void {
  [true, false].forEach((showGroupCounts) => {
    return _assertFourCopiesNonuniformReaderShowGroupCounts({
      showGroupCounts,
      startingShelf,
    });
  });
}
