import { PublicWorksMeasurementCheckTestState } from "./PublicWorksMeasurementCheckTestState";

const { render: _render } = PublicWorksMeasurementCheckTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../PublicWorksMeasurementCheck.schema";
import { assertShorterEqualLongerObservationsOutline as _assertShorterEqualLongerObservationsOutline } from "./assertShorterEqualLongerObservationsOutline";

/**
 * Asserts shorter equal and longer observations retain one scale in either
 * structure.
 */
export function assertShorterEqualLongerObservationsFrame({
  frame,
  input,
  length,
}: Readonly<{ frame: number; input: Readonly<Input>; length: number }>): void {
  const markup = _render({ frame: frame, input: input });
  const actual = SvgAttributes.fromMarker({
    markup,
    marker: "actual-structure",
  });
  const outline = SvgAttributes.fromMarker({
    markup,
    marker: "promised-outline",
  });
  const tape = SvgAttributes.fromMarker({ markup, marker: "tape" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: actual, name: "width" }),
    length * 65,
  );
  _assertShorterEqualLongerObservationsOutline({ outline, markup, tape });
  if (frame >= 108) {
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: tape, name: "x2" }),
      200 + length * 65,
    );
  }
}
