import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { assertFullLabeledResultStaysFrame as _assertFullLabeledResultStaysFrame } from "./assertFullLabeledResultStaysFrame";
import { type AssertFullLabeledResultStaysMarkupOptions } from "./ReadinessLatchContractTestState.types";
import { _getAttributesFromMarkup } from "./ReadinessLatchTestHelpers";

/**
 * Asserts the full labeled result stays upstream until a visible opening
 * clears its path.
 */
export function assertFullLabeledResultStaysMarkup({
  markup,
  orientation,
  moving,
  input,
}: Readonly<AssertFullLabeledResultStaysMarkupOptions>): void {
  const before = _getAttributesFromMarkup({
    markup,
    id: "before",
    kind: "gate",
  });
  const after = _getAttributesFromMarkup({ markup, id: "after", kind: "gate" });
  const clearFrom = SvgAttributes.getNumberFromMarkup({
    attributes: before,
    name: orientation === "horizontal" ? "y2" : "x2",
  });
  const clearTo = SvgAttributes.getNumberFromMarkup({
    attributes: after,
    name: orientation === "horizontal" ? "y1" : "x1",
  });
  assert.ok(
    orientation === "horizontal"
      ? clearFrom + 2.5 < moving.top && clearTo - 2.5 > moving.bottom
      : clearFrom + 2.5 < moving.left && clearTo - 2.5 > moving.right,
  );
  [36, 130, 138, 146].forEach((frame) => {
    return _assertFullLabeledResultStaysFrame({ frame, input });
  });
}
