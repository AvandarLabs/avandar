import {
  PdfNearestLabelReviewTestState,
  type AssertCornerExtractionRowsKeepFrameOptions,
} from "./PdfNearestLabelReviewTestState";

const { render: _render } = PdfNearestLabelReviewTestState;
import assert from "node:assert/strict";
import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { assertCornerExtractionRowsKeepMarkup as _assertCornerExtractionRowsKeepMarkup } from "./assertCornerExtractionRowsKeepMarkup";
import { makeCornerExtractionRowsKeepMarkupFromMarkup as _makeCornerExtractionRowsKeepMarkupFromMarkup } from "./makeCornerExtractionRowsKeepMarkupFromMarkup";

/**
 * Asserts corner extraction rows keep complete text clear of source anchors
 * guides and ratio copy.
 */
export function assertCornerExtractionRowsKeepFrame({
  frame,
  input,
  x,
  y,
  showDistanceValues,
}: Readonly<AssertCornerExtractionRowsKeepFrameOptions>): void {
  const markup = _render({ frame: frame, input: input });
  const { row, left, right, top, bottom } =
    _makeCornerExtractionRowsKeepMarkupFromMarkup(markup);
  assert.ok(
    left > 460 + 8,
    `row covers retained source at ${x},${y}, frame ${frame}`,
  );
  const rowMarkup = markup
    .slice(markup.indexOf(row))
    .split("data-review-choice=")[0];
  const texts = [...rowMarkup.matchAll(/<text[^>]*>[\s\S]*?<\/text>/g)].map(
    ([text]) => {
      return text;
    },
  );
  assert.equal(texts.length, 3);
  SvgPaintAssertions.assertTextCanvasBounds({
    markup: `<g transform="translate(${-left} ${-top})">${texts.join("")}</g>`,
    width: right - left,
    height: bottom - top,
  });
  _assertCornerExtractionRowsKeepMarkup({
    markup,
    left,
    showDistanceValues,
    input,
    top,
    right,
    bottom,
  });
}
