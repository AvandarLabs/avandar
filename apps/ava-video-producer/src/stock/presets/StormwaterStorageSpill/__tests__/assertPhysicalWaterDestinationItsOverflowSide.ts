import { fixtures } from "../StormwaterStorageSpill.fixtures";
import { REVIEW_FIXTURES } from "../StormwaterStorageSpill.reviewFixtures";
import { assertPhysicalWaterDestinationItsShowBalance as _assertPhysicalWaterDestinationItsShowBalance } from "./assertPhysicalWaterDestinationItsShowBalance";

/**
 * Asserts each physical water destination and its caption share a visible
 * unique key.
 */
export function assertPhysicalWaterDestinationItsOverflowSide({
  overflowSide,
  input,
  id,
}: Readonly<{
  overflowSide: "left" | "right";
  input: (typeof fixtures)[number]["input"];
  id: ((typeof REVIEW_FIXTURES)[number] | (typeof fixtures)[number])["id"];
}>): void {
  Array.from([false, true]).forEach((showBalance) => {
    return _assertPhysicalWaterDestinationItsShowBalance({
      showBalance,
      input,
      overflowSide,
      id,
    });
  });
}
