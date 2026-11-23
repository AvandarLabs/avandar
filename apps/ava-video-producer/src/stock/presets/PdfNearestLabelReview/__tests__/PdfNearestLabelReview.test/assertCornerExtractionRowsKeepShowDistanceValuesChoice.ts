import {
  PdfNearestLabelReviewTestState,
  type ChoiceGeometryOptions,
} from "./PdfNearestLabelReviewTestState";

const { markedShape: _markedShape } = PdfNearestLabelReviewTestState;
import assert from "node:assert/strict";
import { assertCornerExtractionRowsKeepShowDistanceValuesRatio as _assertCornerExtractionRowsKeepShowDistanceValuesRatio } from "./assertCornerExtractionRowsKeepShowDistanceValuesRatio";

/**
 * Asserts corner extraction rows keep complete text clear of source anchors
 * guides and ratio copy.
 */
export function assertCornerExtractionRowsKeepShowDistanceValuesChoice({
  showDistanceValues,
  markup,
  left,
  input,
  top,
  right,
  bottom,
}: Readonly<ChoiceGeometryOptions>): void {
  _assertCornerExtractionRowsKeepShowDistanceValuesRatio({
    showDistanceValues,
    markup,
    left,
    input,
  });
  assert.ok(top - 0.5 > 438);
  const choice = _markedShape({ markup, marker: "review-choice" });
  assert.ok(choice.includes(`H${right + 8} V${top} H${right}`));
  assert.ok(right + 9 < 960);
  const link = _markedShape({ markup, marker: "extracted-source-link" });
  const route = link.match(
    /d="M([\d.]+) ([\d.]+) H([\d.]+) V([\d.]+) H([\d.]+)"/,
  );
  assert.ok(route, "source link follows the clear exterior lane");
  assert.equal(Number(route[1]), 100);
  assert.equal(Number(route[2]), 153);
  assert.ok(Number(route[3]) > 492 + 8 && Number(route[3]) < left);
  assert.equal(Number(route[4]), bottom);
  assert.equal(Number(route[5]), left);
}
