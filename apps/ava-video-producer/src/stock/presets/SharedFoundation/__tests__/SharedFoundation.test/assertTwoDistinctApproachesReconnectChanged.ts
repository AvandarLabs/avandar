import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../SharedFoundation.fixtures";

/**
 * Asserts two distinct approaches reconnect to one changing common
 * foundation.
 */
export function assertTwoDistinctApproachesReconnectChanged({
  changed,
  held,
}: Readonly<{ changed: string; held: string }>): void {
  assert.ok(changed.includes("A different authored purpose"));
  assert.ok(!changed.includes(DEFAULT_INPUT.sharedPrinciple));
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: held,
        marker: "foundation-left",
      }),
      name: "width",
    }),
    400,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: held,
        marker: "foundation-right",
      }),
      name: "x",
    }),
    480,
  );
}
