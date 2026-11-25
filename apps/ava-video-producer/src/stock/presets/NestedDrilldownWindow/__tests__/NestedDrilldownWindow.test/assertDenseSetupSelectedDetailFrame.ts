import { NestedDrilldownWindowTestState } from "./NestedDrilldownWindowTestState";

const { render, slips: _slips } = NestedDrilldownWindowTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../NestedDrilldownWindow.schema";
import { assertDenseSetupSelectedDetailRect as _assertDenseSetupSelectedDetailRect } from "./assertDenseSetupSelectedDetailRect";

/**
 * Asserts dense setup and selected detail geometry stays bounded through
 * both narrowing beats.
 */
export function assertDenseSetupSelectedDetailFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Readonly<Input> }>): void {
  const rects = _slips(render({ frame: frame, input: input }));
  assert.ok(rects.length > 0);
  rects.forEach((rect) => {
    const x = SvgAttributes.getNumberFromMarkup({
        attributes: rect,
        name: "x",
      }),
      y = SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "y" });
    assert.ok(
      x >= 0 &&
        x +
          SvgAttributes.getNumberFromMarkup({
            attributes: rect,
            name: "width",
          }) <=
          960,
    );
    assert.ok(
      y >= 0 &&
        y +
          SvgAttributes.getNumberFromMarkup({
            attributes: rect,
            name: "height",
          }) <=
          600,
    );
  });
  if (frame === 150) {
    rects.forEach((rect, index) => {
      return _assertDenseSetupSelectedDetailRect({ rect, index, rects });
    });
  }
}
