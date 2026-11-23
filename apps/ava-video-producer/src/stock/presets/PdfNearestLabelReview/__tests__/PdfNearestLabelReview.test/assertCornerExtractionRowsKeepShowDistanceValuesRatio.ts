import assert from "node:assert/strict";
import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { type DistanceRatioOptions } from "./PdfNearestLabelReviewTestState";

/**
 * Asserts corner extraction rows keep complete text clear of source anchors
 * guides and ratio copy.
 */
export function assertCornerExtractionRowsKeepShowDistanceValuesRatio({
  showDistanceValues,
  markup,
  left,
  input,
}: Readonly<DistanceRatioOptions>): void {
  if (showDistanceValues) {
    const ratio = markup.slice(markup.indexOf("data-ratio-value="));
    const ratioTexts = [...ratio.matchAll(/<text[^>]*>[\s\S]*?<\/text>/g)]
      .slice(0, 2)
      .map(([text]) => {
        return text;
      });
    assert.equal(ratioTexts.length, 2);
    SvgPaintAssertions.assertTextCanvasBounds({
      markup: `<g transform="translate(-60 -490)">${ratioTexts.join("")}</g>`,
      width: 400,
      height: 80,
    });
    assert.ok(left > 460);
  }
  const title = [...markup.matchAll(/(<text[^>]*>)[\s\S]*?<\/text>/g)].find(
    ([block]) => {
      return block.includes(`aria-label="${input.copy.result}"`);
    },
  );
  assert.ok(title);
  SvgPaintAssertions.assertTextCanvasBounds({
    markup: `<g transform="translate(-540 -377)">${title[0]}</g>`,
    width: 360,
    height: 61,
  });
}
