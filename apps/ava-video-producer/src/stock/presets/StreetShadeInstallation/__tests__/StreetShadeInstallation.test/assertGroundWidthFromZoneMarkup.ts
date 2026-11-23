import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/** Asserts zone ground retains its complete width. */
export function assertGroundWidthFromZoneMarkup({
  markup,
  index,
}: Readonly<{ markup: string; index: number }>): void {
  const ground = markup.match(
    new RegExp(`<rect[^>]*data-ground="${index}"[^>]*>`),
  )![0];
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: ground, name: "width" }),
    600,
  );
}
