import type { fixtures } from "../StormwaterStorageSpill.fixtures";
import type { REVIEW_FIXTURES } from "../StormwaterStorageSpill.reviewFixtures";
import { assertPhysicalWaterDestinationItsOverflowSide as _assertPhysicalWaterDestinationItsOverflowSide } from "./assertPhysicalWaterDestinationItsOverflowSide";

/**
 * Asserts each physical water destination and its caption share a visible
 * unique key.
 */
export function assertPhysicalWaterDestinationItsId({
  id,
  input,
}: Readonly<{
  id: ((typeof REVIEW_FIXTURES)[number] | (typeof fixtures)[number])["id"];
  input: (
    | (typeof REVIEW_FIXTURES)[number]
    | (typeof fixtures)[number]
  )["input"];
}>): void {
  Array.from(["left", "right"] as const).forEach((overflowSide) => {
    return _assertPhysicalWaterDestinationItsOverflowSide({
      overflowSide,
      input,
      id,
    });
  });
}
