import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertDenseSetupSelectedDetailXOptions } from "./NestedDrilldownWindowTestState";

/**
 * Asserts dense setup and selected detail geometry stays bounded through
 * both narrowing beats.
 */
export function assertDenseSetupSelectedDetailX({
  x,
  rect,
  ox,
  other,
  y,
  oy,
}: Readonly<AssertDenseSetupSelectedDetailXOptions>): void {
  assert.ok(
    x +
      SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "width" }) <=
      ox ||
      ox +
        SvgAttributes.getNumberFromMarkup({
          attributes: other,
          name: "width",
        }) <=
        x ||
      y +
        SvgAttributes.getNumberFromMarkup({
          attributes: rect,
          name: "height",
        }) <=
        oy ||
      oy +
        SvgAttributes.getNumberFromMarkup({
          attributes: other,
          name: "height",
        }) <=
        y,
  );
}
