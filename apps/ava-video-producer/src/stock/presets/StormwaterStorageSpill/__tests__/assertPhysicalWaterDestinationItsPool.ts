import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { type AssertPhysicalWaterDestinationItsPoolOptions } from "./StormwaterStorageSpillContractTestState.types";

/** Asserts an independently authored portion of the rendered contract. */
export function assertPhysicalWaterDestinationItsPool({
  pool,
  color,
  destination,
  physical,
}: Readonly<AssertPhysicalWaterDestinationItsPoolOptions>): void {
  assert.equal(pool.match(/fill="([^"]+)"/)![1], color);
  const expectedKeyX =
    destination === "detained"
      ? SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "width" }) -
        20
      : SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "x" }) - 18;
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: physical, name: "cx" }),
    expectedKeyX,
  );
}
