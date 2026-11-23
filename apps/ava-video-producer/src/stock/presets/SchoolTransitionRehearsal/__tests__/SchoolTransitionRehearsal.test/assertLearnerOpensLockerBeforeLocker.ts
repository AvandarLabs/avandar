import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts learner opens the locker before approaching the classroom with
 * chosen support.
 */
export function assertLearnerOpensLockerBeforeLocker({
  locker,
  hold,
}: Readonly<{ locker: string; hold: string }>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: locker,
        marker: "learner",
      }),
      name: "cx",
    }),
    390,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: locker,
        marker: "locker-door",
      }),
      name: "width",
    }) < 20,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup: hold, marker: "learner" }),
      name: "cx",
    }),
    730,
  );
}
