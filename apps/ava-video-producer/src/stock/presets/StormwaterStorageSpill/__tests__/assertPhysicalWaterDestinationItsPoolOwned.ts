import assert from "node:assert/strict";
import { assertPhysicalWaterDestinationItsPoolPool as _assertPhysicalWaterDestinationItsPoolPool } from "./assertPhysicalWaterDestinationItsPoolPool";
import { type AssertPhysicalWaterDestinationItsPoolOwnedOptions } from "./StormwaterStorageSpillContractTestState.types";

/**
 * Asserts each physical water destination and its caption share a visible
 * unique key.
 */
export function assertPhysicalWaterDestinationItsPoolOwned({
  pool,
  color,
  destination,
  physical,
  markup,
  supplied,
}: Readonly<AssertPhysicalWaterDestinationItsPoolOwnedOptions>): void {
  _assertPhysicalWaterDestinationItsPoolPool({
    pool,
    color,
    destination,
    physical,
  });
  const owned = markup.match(
    new RegExp(`<g data-destination="${destination}">(.*?)</g>(.*?)</g>`),
  )![2];
  const remaining =
    supplied.event.incomingM3 -
    supplied.event.infiltratedM3 -
    supplied.event.dischargedM3;
  const stored = Math.min(remaining, supplied.detentionCapacityM3);
  const amounts = {
    infiltration: supplied.event.infiltratedM3,
    discharge: supplied.event.dischargedM3,
    detained: stored,
    overflow: remaining - stored,
  };
  const name = destination as keyof typeof amounts;
  assert.ok(owned.includes(`aria-label="${supplied.copy[name]}"`));
  assert.ok(
    owned.includes(`aria-label="${amounts[name]} ${supplied.copy.unit}"`),
  );
}
