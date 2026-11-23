import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { assertPhysicalWaterDestinationItsPool as _assertPhysicalWaterDestinationItsPool } from "./assertPhysicalWaterDestinationItsPool";
import { type AssertPhysicalWaterDestinationItsPoolPoolOptions } from "./StormwaterStorageSpillContractTestState.types";

/**
 * Asserts each physical water destination and its caption share a visible
 * unique key.
 */
export function assertPhysicalWaterDestinationItsPoolPool({
  pool,
  color,
  destination,
  physical,
}: Readonly<AssertPhysicalWaterDestinationItsPoolPoolOptions>): void {
  _assertPhysicalWaterDestinationItsPool({
    pool,
    color,
    destination,
    physical,
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: physical, name: "cy" }),
    destination === "detained"
      ? SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: pool,
            name: "height",
          }) +
          12
      : SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "y" }) - 10,
  );
}
