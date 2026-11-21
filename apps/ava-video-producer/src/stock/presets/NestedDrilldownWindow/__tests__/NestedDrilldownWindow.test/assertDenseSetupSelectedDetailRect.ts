import { NestedDrilldownWindowTestState } from "./NestedDrilldownWindowTestState";

const { slips: _slips } = NestedDrilldownWindowTestState;
import { assertDenseSetupSelectedDetailOther as _assertDenseSetupSelectedDetailOther } from "./assertDenseSetupSelectedDetailOther";

/**
 * Asserts dense setup and selected detail geometry stays bounded through
 * both narrowing beats.
 */
export function assertDenseSetupSelectedDetailRect({
  rect,
  index,
  rects,
}: Readonly<{
  rect: ReturnType<typeof _slips>[number];
  index: number;
  rects: ReturnType<typeof _slips>;
}>): void {
  return rects.slice(index + 1).forEach((other) => {
    return _assertDenseSetupSelectedDetailOther({ other, rect });
  });
}
