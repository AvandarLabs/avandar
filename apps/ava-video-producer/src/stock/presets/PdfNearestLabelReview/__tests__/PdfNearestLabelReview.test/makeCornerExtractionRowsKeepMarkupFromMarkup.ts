import {
  PdfNearestLabelReviewTestState,
  type MakeCornerExtractionRowsKeepMarkupFromMarkupResult,
} from "./PdfNearestLabelReviewTestState";

const { markedShape: _markedShape } = PdfNearestLabelReviewTestState;

import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Makes fresh fixture state for corner extraction rows keep complete text
 * clear of source anchors guides and ratio copy.
 */
export function makeCornerExtractionRowsKeepMarkupFromMarkup(
  markup: string,
): MakeCornerExtractionRowsKeepMarkupFromMarkupResult {
  const row = _markedShape({ markup, marker: "extracted-row" });
  const left = SvgAttributes.getNumberFromMarkup({
      attributes: row,
      name: "x",
    }),
    right =
      left +
      SvgAttributes.getNumberFromMarkup({ attributes: row, name: "width" }),
    top = SvgAttributes.getNumberFromMarkup({ attributes: row, name: "y" }),
    bottom =
      top +
      SvgAttributes.getNumberFromMarkup({ attributes: row, name: "height" });
  return { row, left, right, top, bottom };
}
