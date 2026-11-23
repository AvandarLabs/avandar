import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../StormwaterStorageSpill.fixtures";
import { assertWaterFractionsConserveInflowSpillCrest as _assertWaterFractionsConserveInflowSpillCrest } from "./assertWaterFractionsConserveInflowSpillCrest";
import { _render } from "./StormwaterStorageSpillTestHelpers";

/**
 * Asserts water fractions conserve inflow without positive minima and spill
 * after filling.
 */
export function assertWaterFractionsConserveInflowInput(
  input: (typeof fixtures)[number]["input"],
): void {
  const incoming = input.event.incomingM3;
  const remaining =
    incoming - (input.event.infiltratedM3 + input.event.dischargedM3);
  const detained = Math.min(remaining, input.detentionCapacityM3);
  const overflow = remaining - detained;
  const markup = _render({ frame: 150, input: input });
  const pool = SvgAttributes.fromMarker({ markup, marker: "water" });
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "height" }) -
        (detained / incoming) * 140,
    ) < 1e-9,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "y" }) +
      SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "height" }),
    380,
  );
  const spill = SvgAttributes.fromMarker({ markup, marker: "overflow-pool" });
  _assertWaterFractionsConserveInflowSpillCrest({
    spill,
    overflow,
    incoming,
    markup,
    input,
    detained,
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: spill, name: "x" }),
    input.overflowSide === "left" ? 55 : 855,
  );
}
