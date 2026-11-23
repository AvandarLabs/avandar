import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../UncertaintyUnfold.schema";

/**
 * Asserts one fixed ruler positions the estimate, both endpoints and an
 * immovable optional reference.
 */
export function assertOneFixedRulerPositionsHold({
  hold,
  scale,
  input,
}: Readonly<{
  hold: string;
  scale: (value: number) => number;
  input: Readonly<Input>;
}>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "upper-endpoint",
      }),
      name: "x1",
    }),
    scale(input.estimate.upper),
  );
  const band = SvgAttributes.fromMarker({
    markup: hold,
    marker: "interval-band",
  });
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: band, name: "width" }) -
        (scale(input.estimate.upper) - scale(input.estimate.lower)),
    ) < 1e-9,
  );
  assert.doesNotMatch(hold, /NaN|Infinity/);
}
