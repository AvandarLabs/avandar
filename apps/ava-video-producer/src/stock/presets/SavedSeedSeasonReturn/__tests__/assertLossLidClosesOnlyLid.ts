import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { type AssertLossLidClosesOnlyLidOptions } from "./SavedSeedSeasonReturnStorageLidStaysClosedTestState.types";
import { _lid } from "./SavedSeedSeasonReturnTestHelpers";

/**
 * Asserts loss lid closes only after the full material shape clears its
 * opening.
 */
export function assertLossLidClosesOnlyLid({
  lid,
  left,
  lidRight,
  right,
  top,
  loss,
  frame,
  input,
}: Readonly<AssertLossLidClosesOnlyLidOptions>): void {
  const lidBottom =
    SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "y" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "height" });
  if (
    left < lidRight &&
    right > SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "x" })
  ) {
    assert.ok(
      lidBottom <= top ||
        top +
          SvgAttributes.getNumberFromMarkup({
            attributes: loss,
            name: "height",
          }) <=
          SvgAttributes.getNumberFromMarkup({ attributes: lid, name: "y" }),
      `whole loss band clears the lid at ${frame}`,
    );
  }
  if (_lid({ frame, input }) > _lid({ frame: frame - 0.25, input })) {
    assert.ok(
      left > lidRight + 1.5,
      `whole loss portion clears before closure at ${frame}`,
    );
  }
}
