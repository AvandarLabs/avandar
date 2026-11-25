import { assertBothSupportChoicesPreserveShowPracticeStrip as _assertBothSupportChoicesPreserveShowPracticeStrip } from "./assertBothSupportChoicesPreserveShowPracticeStrip";

/**
 * Asserts both support choices preserve rehearsal people and stop identity
 * with either optional trace.
 */
export function assertBothSupportChoicesPreserveFinalStepSupport(
  finalStepSupport: "alongside" | "stands-back",
): void {
  return [true, false].forEach((showPracticeStrip) => {
    return _assertBothSupportChoicesPreserveShowPracticeStrip({
      showPracticeStrip,
      finalStepSupport,
    });
  });
}
