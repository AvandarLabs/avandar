import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts shorter equal and longer observations retain one scale in either
 * structure.
 */
export function assertShorterEqualLongerObservationsOutline({
  outline,
  markup,
  tape,
}: Readonly<{ outline: string; markup: string; tape: string }>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: outline, name: "width" }),
    227.5,
  );
  const hands = [...markup.matchAll(/<line data-tape-hand="[^"]*"[^>]*>/g)];
  hands.forEach(([hand], index) => {
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "x2" }),
      SvgAttributes.getNumberFromMarkup({
        attributes: tape,
        name: index === 0 ? "x1" : "x2",
      }),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "y2" }),
      SvgAttributes.getNumberFromMarkup({ attributes: tape, name: "y1" }),
    );
  });
}
