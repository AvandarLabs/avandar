import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertConcentratedInstallationsTileTheirLeftOptions } from "./StreetShadeInstallationTestState";

/**
 * Asserts concentrated installations tile their actual zone without covering
 * unchanged neighbors.
 */
export function assertConcentratedInstallationsTileTheirLeft({
  left,
  right,
  width,
  footprint,
  index,
}: Readonly<AssertConcentratedInstallationsTileTheirLeftOptions>): void {
  assert.ok(left >= right - 1e-9);
  assert.ok(left + width <= 885 + 1e-9);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: footprint, name: "y" }),
    165 + index * 65,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: footprint,
      name: "height",
    }),
    36,
  );
}
