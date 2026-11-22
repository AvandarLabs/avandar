import type { fixtures } from "../StormwaterStorageSpill.fixtures";
import type { REVIEW_FIXTURES } from "../StormwaterStorageSpill.reviewFixtures";
import { assertDestinationKeysClearCompleteOverflowSide as _assertDestinationKeysClearCompleteOverflowSide } from "./assertDestinationKeysClearCompleteOverflowSide";

/** Asserts destination keys clear the complete visible overflow crest. */
export function assertDestinationKeysClearCompleteInput(
  input: (
    | (typeof REVIEW_FIXTURES)[number]
    | (typeof fixtures)[number]
  )["input"],
): void {
  Array.from(["left", "right"] as const).forEach((overflowSide) => {
    return _assertDestinationKeysClearCompleteOverflowSide({
      overflowSide,
      input,
    });
  });
}
