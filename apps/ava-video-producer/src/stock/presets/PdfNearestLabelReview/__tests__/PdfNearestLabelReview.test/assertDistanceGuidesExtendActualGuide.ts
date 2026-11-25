import { PdfNearestLabelReviewTestState } from "./PdfNearestLabelReviewTestState";

const { markedShape: _markedShape, render: _render } =
  PdfNearestLabelReviewTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts distance guides extend from actual anchors before the selected row
 * travels.
 */
export function assertDistanceGuidesExtendActualGuide(
  guide: (frame: number) => string,
): void {
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: guide(75), name: "x2" }) <
      250 &&
      SvgAttributes.getNumberFromMarkup({ attributes: guide(75), name: "x2" }) >
        205,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: guide(95), name: "x2" }),
    205,
  );
  const row = (frame: number) => {
    return _markedShape({
      markup: _render({ frame: frame }),
      marker: "extracted-row",
    });
  };
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: row(115), name: "x" }) <
      588 &&
      SvgAttributes.getNumberFromMarkup({ attributes: row(115), name: "x" }) >
        540,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: row(139), name: "x" }),
    540,
  );
}
