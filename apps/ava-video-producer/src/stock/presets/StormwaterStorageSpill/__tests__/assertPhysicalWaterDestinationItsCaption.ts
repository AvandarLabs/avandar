import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { assertPhysicalWaterDestinationItsPoolOwned as _assertPhysicalWaterDestinationItsPoolOwned } from "./assertPhysicalWaterDestinationItsPoolOwned";
import { type AssertPhysicalWaterDestinationItsCaptionOptions } from "./StormwaterStorageSpillContractTestState.types";

/**
 * Asserts each physical water destination and its caption share a visible
 * unique key.
 */
export function assertPhysicalWaterDestinationItsCaption({
  caption,
  color,
  physical,
  index,
  destination,
  markup,
  supplied,
}: Readonly<AssertPhysicalWaterDestinationItsCaptionOptions>): void {
  assert.equal(caption.match(/<circle[^>]*fill="([^"]+)"/)![1], color);
  assert.match(physical, new RegExp(`<tspan[^>]*>${index + 1}</tspan>`));
  assert.match(caption, new RegExp(`<tspan[^>]*>${index + 1}</tspan>`));
  const pool =
    destination === "detained"
      ? SvgAttributes.fromMarker({ markup, marker: "water" })
      : destination === "overflow"
        ? SvgAttributes.fromMarker({ markup, marker: "overflow-pool" })
        : markup.match(
            new RegExp(`<rect[^>]*data-water-pool="${destination}"[^>]*>`),
          )![0];
  _assertPhysicalWaterDestinationItsPoolOwned({
    pool,
    color,
    destination,
    physical,
    markup,
    supplied,
  });
}
