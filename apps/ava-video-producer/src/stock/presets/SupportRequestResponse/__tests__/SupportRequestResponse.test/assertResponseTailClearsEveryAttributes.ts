import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../../../text/getConservativeWidthFromText";
import { type AssertResponseTailClearsEveryAttributesOptions } from "./SupportRequestResponseTestState";

/**
 * Asserts response tail clears every painted line of accepted dense
 * colleague names.
 */
export function assertResponseTailClearsEveryAttributes({
  attributes,
  line,
  index,
  text,
  spans,
  fontSize,
  tailBox,
}: Readonly<AssertResponseTailClearsEveryAttributesOptions>): void {
  assert.doesNotMatch(line, /^[\u0300-\u036f\u200d]/u);
  const left = SvgAttributes.getNumberFromMarkup({ attributes, name: "x" });
  const top =
    SvgAttributes.getNumberFromMarkup({ attributes: text[1], name: "y" }) +
    spans.slice(0, index + 1).reduce((offset, [, spanAttributes]) => {
      return offset + Number(spanAttributes.match(/ dy="([^"]*)"/)?.[1] ?? 0);
    }, 0) -
    fontSize;
  const right = left + getConservativeWidthFromText({ text: line, fontSize });
  const bottom = top + fontSize * 1.3;
  assert.ok(
    right < tailBox.left ||
      left > tailBox.right ||
      bottom < tailBox.top ||
      top > tailBox.bottom,
    `tail intersects colleague line ${index}`,
  );
}
