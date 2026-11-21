import assert from "node:assert/strict";
import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";

/** Asserts the complete retry caption fits inside its authored canvas. */
export function assertRetryCaptionPaintBounds({
  markup,
  caption,
  x,
}: Readonly<{ markup: string; caption: string; x: number }>): void {
  const completeText = markup
    .slice(markup.indexOf(caption))
    .match(/<text[^>]*>[\s\S]*?<\/text>/)?.[0];
  assert.ok(completeText);
  SvgPaintAssertions.assertTextCanvasBounds({
    markup: `<g transform="translate(${-x} -74)">${completeText}</g>`,
    width: 360,
    height: 64,
  });
}
