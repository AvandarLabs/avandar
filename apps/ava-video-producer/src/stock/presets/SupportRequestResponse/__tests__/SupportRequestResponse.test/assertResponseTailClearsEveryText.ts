import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertResponseTailClearsEveryAttributes as _assertResponseTailClearsEveryAttributes } from "./assertResponseTailClearsEveryAttributes";

/**
 * Asserts response tail clears every painted line of accepted dense
 * colleague names.
 */
export function assertResponseTailClearsEveryText({
  text,
  colleague,
  tailBox,
}: Readonly<{
  text: RegExpMatchArray;
  colleague: string;
  tailBox: Readonly<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }>;
}>): void {
  const fontSize = SvgAttributes.getNumberFromMarkup({
    attributes: text[1],
    name: "font-size",
  });
  assert.equal(fontSize, 20);
  const spans = [...text[2].matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g)];
  assert.equal(
    spans
      .map(([, , line]) => {
        return line;
      })
      .join("")
      .replace(/\s/gu, ""),
    colleague.replace(/\s/gu, ""),
  );
  spans.forEach(([, attributes, line], index) => {
    return _assertResponseTailClearsEveryAttributes({
      attributes,
      line,
      index,
      text,
      spans,
      fontSize,
      tailBox,
    });
  });
}
