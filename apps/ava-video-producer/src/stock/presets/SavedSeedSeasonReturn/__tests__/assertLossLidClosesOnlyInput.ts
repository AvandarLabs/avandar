import assert from "node:assert/strict";
import { assertLossLidClosesOnlyFrame as _assertLossLidClosesOnlyFrame } from "./assertLossLidClosesOnlyFrame";
import { _lid, _lossInputs } from "./SavedSeedSeasonReturnTestHelpers";

/**
 * Asserts loss lid closes only after the full material shape clears its
 * opening.
 */
export function assertLossLidClosesOnlyInput(
  input: ReturnType<typeof _lossInputs>[number],
): void {
  assert.equal(
    _lid({ frame: 74, input }),
    250,
    "loss opening precedes extraction",
  );
  Array.from(
    { length: Math.max(0, Math.floor((101 - 74) / 0.25) + 1) },
    (_, sampleIndex) => {
      return 74 + sampleIndex * 0.25;
    },
  ).forEach((frame) => {
    return _assertLossLidClosesOnlyFrame({ frame, input });
  });
}
