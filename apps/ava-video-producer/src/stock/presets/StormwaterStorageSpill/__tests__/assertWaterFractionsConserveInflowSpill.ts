import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { type AssertWaterFractionsConserveInflowSpillOptions } from "./StormwaterStorageSpillContractTestState.types";

/** Asserts an independently authored portion of the rendered contract. */
export function assertWaterFractionsConserveInflowSpill({
  spill,
  overflow,
  incoming,
  markup,
  input,
  detained,
}: Readonly<AssertWaterFractionsConserveInflowSpillOptions>): void {
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: spill, name: "width" }) -
        (50 * overflow) / incoming,
    ) < 1e-9,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup, marker: "overflow" }),
      name: "data-quantity",
    }),
    overflow,
  );
  assert.ok(
    Math.abs(
      input.event.infiltratedM3 +
        input.event.dischargedM3 +
        detained +
        overflow -
        incoming,
    ) <=
      incoming * 1e-12,
  );
}
