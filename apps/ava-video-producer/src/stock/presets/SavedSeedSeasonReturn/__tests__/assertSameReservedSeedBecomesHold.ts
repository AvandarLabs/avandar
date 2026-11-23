import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { _render } from "./SavedSeedSeasonReturnTestHelpers";

/**
 * Asserts the same reserved seed becomes exact loss, sowing and unsown
 * remainder.
 */
export function assertSameReservedSeedBecomesHold(
  hold: ReturnType<typeof _render>,
): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "seed-loss",
      }),
      name: "width",
    }),
    15,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "seed-sown",
      }),
      name: "width",
    }),
    30,
  );
  assert.match(hold, /aria-label="1 kg"/);
  assert.doesNotMatch(hold, /sprout|germinat|yield-quantity/);
}
