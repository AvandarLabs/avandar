import { UncertaintyUnfoldTestState } from "./UncertaintyUnfoldTestState";

const { render } = UncertaintyUnfoldTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../../UncertaintyUnfold.fixtures";
import { assertOneFixedRulerPositionsFrame as _assertOneFixedRulerPositionsFrame } from "./assertOneFixedRulerPositionsFrame";
import { assertOneFixedRulerPositionsHold as _assertOneFixedRulerPositionsHold } from "./assertOneFixedRulerPositionsHold";

/**
 * Asserts one fixed ruler positions the estimate, both endpoints and an
 * immovable optional reference.
 */
export function assertOneFixedRulerPositionsInput(
  input: (typeof fixtures)[number]["input"],
): void {
  const scale = (value: number) => {
    const fraction =
      input.axis.min === -1e308
        ? (value / 1e308 + 1) / 2
        : (value - input.axis.min) / (input.axis.max - input.axis.min);
    return 100 + 760 * fraction;
  };
  [12, 38, 72, 108, 150].forEach((frame) => {
    return _assertOneFixedRulerPositionsFrame({ frame, input, scale });
  });
  const hold = render({ frame: 150, input: input });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "lower-endpoint",
      }),
      name: "x1",
    }),
    scale(input.estimate.lower),
  );
  _assertOneFixedRulerPositionsHold({ hold, scale, input });
}
