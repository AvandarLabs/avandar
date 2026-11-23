import { NestedDrilldownWindowTestState } from "./NestedDrilldownWindowTestState";

const { slips: _slips } = NestedDrilldownWindowTestState;
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertDenseSetupSelectedDetailX as _assertDenseSetupSelectedDetailX } from "./assertDenseSetupSelectedDetailX";

/**
 * Asserts dense setup and selected detail geometry stays bounded through
 * both narrowing beats.
 */
export function assertDenseSetupSelectedDetailOther({
  other,
  rect,
}: Readonly<{
  other: ReturnType<typeof _slips>[number];
  rect: ReturnType<typeof _slips>[number];
}>): void {
  const x = SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "x" }),
    y = SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "y" }),
    ox = SvgAttributes.getNumberFromMarkup({ attributes: other, name: "x" }),
    oy = SvgAttributes.getNumberFromMarkup({ attributes: other, name: "y" });
  _assertDenseSetupSelectedDetailX({
    x,
    rect,
    ox,
    other,
    y,
    oy,
  });
}
