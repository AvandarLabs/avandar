import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertCornerExtractionRowsKeepShowDistanceValuesChoice as _assertCornerExtractionRowsKeepShowDistanceValuesChoice } from "./assertCornerExtractionRowsKeepShowDistanceValuesChoice";
import { type AssertCornerExtractionRowsKeepMarkupOptions } from "./PdfNearestLabelReviewTestState";

/**
 * Asserts corner extraction rows keep complete text clear of source anchors
 * guides and ratio copy.
 */
export function assertCornerExtractionRowsKeepMarkup({
  markup,
  left,
  showDistanceValues,
  input,
  top,
  right,
  bottom,
}: Readonly<AssertCornerExtractionRowsKeepMarkupOptions>): void {
  [...markup.matchAll(/<line[^>]*data-distance-guide[^>]*>/g)].forEach(
    ([guide]) => {
      const guideRight =
        Math.max(
          SvgAttributes.getNumberFromMarkup({ attributes: guide, name: "x1" }),
          SvgAttributes.getNumberFromMarkup({ attributes: guide, name: "x2" }),
        ) + 1;
      assert.ok(guideRight < left);
    },
  );
  _assertCornerExtractionRowsKeepShowDistanceValuesChoice({
    showDistanceValues,
    markup,
    left,
    input,
    top,
    right,
    bottom,
  });
}
