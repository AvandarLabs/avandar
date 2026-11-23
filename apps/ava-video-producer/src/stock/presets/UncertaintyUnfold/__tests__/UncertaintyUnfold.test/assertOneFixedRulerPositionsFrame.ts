import { UncertaintyUnfoldTestState } from "./UncertaintyUnfoldTestState";

const { render } = UncertaintyUnfoldTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../UncertaintyUnfold.schema";

/**
 * Asserts one fixed ruler positions the estimate, both endpoints and an
 * immovable optional reference.
 */
export function assertOneFixedRulerPositionsFrame({
  frame,
  input,
  scale,
}: Readonly<{
  frame: number;
  input: Readonly<Input>;
  scale: (value: number) => number;
}>): void {
  const markup = render({ frame: frame, input: input });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup,
        marker: "estimate-point",
      }),
      name: "cx",
    }),
    scale(input.estimate.point),
  );
  if (input.reference) {
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup,
          marker: "reference-blade",
        }),
        name: "x1",
      }),
      scale(input.reference.value),
    );
  } else {
    assert.ok(!markup.includes("data-reference-blade"));
  }
}
