import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import type { fixtures } from "../SavedSeedSeasonReturn.fixtures";
import { makeCultivatorHandsTouchActualFrameFromFrame as _makeCultivatorHandsTouchActualFrameFromFrame } from "./makeCultivatorHandsTouchActualFrameFromFrame";

/**
 * Asserts cultivator hands touch the actual transferred lot after the jar
 * opening.
 */
export function assertCultivatorHandsTouchActualFrame({
  frame,
  input,
}: Readonly<{
  frame: number;
  input: (typeof fixtures)[number]["input"];
}>): void {
  const { markup, hand, band, widths } =
    _makeCultivatorHandsTouchActualFrameFromFrame({ frame, input });
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "x2" }) -
        (SvgAttributes.getNumberFromMarkup({ attributes: band, name: "x" }) +
          widths.reduce((sum, width) => {
            return sum + width;
          }, 0) /
            2),
    ) < 1e-9,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "y2" }),
    SvgAttributes.getNumberFromMarkup({ attributes: band, name: "y" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup, marker: "jar-lid" }),
      name: "y",
    }) < 265,
  );
}
