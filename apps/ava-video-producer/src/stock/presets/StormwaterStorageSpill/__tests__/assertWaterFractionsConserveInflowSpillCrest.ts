import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { assertWaterFractionsConserveInflowSpill as _assertWaterFractionsConserveInflowSpill } from "./assertWaterFractionsConserveInflowSpill";
import { type AssertWaterFractionsConserveInflowSpillCrestOptions } from "./StormwaterStorageSpillContractTestState.types";
import { _render } from "./StormwaterStorageSpillTestHelpers";

/**
 * Asserts water fractions conserve inflow without positive minima and spill
 * after filling.
 */
export function assertWaterFractionsConserveInflowSpillCrest({
  spill,
  overflow,
  incoming,
  markup,
  input,
  detained,
}: Readonly<AssertWaterFractionsConserveInflowSpillCrestOptions>): void {
  _assertWaterFractionsConserveInflowSpill({
    spill,
    overflow,
    incoming,
    markup,
    input,
    detained,
  });
  const crest = SvgAttributes.fromMarker({
    markup: _render({ frame: 83, input: input }),
    marker: "crest",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: crest,
      name: "stroke-dashoffset",
    }),
    1,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup, marker: "crest" }),
      name: "opacity",
    }),
    overflow > 0 ? 1 : 0,
  );
}
