import { SpatialGridBinningTestState } from "./SpatialGridBinningTestState";

const { render: _render } = SpatialGridBinningTestState;

import assert from "node:assert/strict";
import { getSvgAttributeMatchesFromMarkup } from "../../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { CHANGED_INPUT } from "../../SpatialGridBinning.fixtures";

/**
 * Asserts changed point labels remain visible above the authored cell layer.
 */
export function assertChangedPointLabelsAndSourceLayers(): void {
  const markup = _render({ frame: 150, input: CHANGED_INPUT });
  assert.equal(
    getSvgAttributeMatchesFromMarkup({
      markup: markup,
      attribute: "data-source-ghost",
    }).tags.length,
    0,
  );
  CHANGED_INPUT.points.forEach((point) => {
    return assert.ok(markup.includes(`aria-label="${point.id}"`));
  });
  assert.ok(
    markup.indexOf("data-cell-shade") < markup.indexOf("data-count-token"),
  );
}
