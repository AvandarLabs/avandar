import { assertBothSupportChoicesPreserveShowFootprints as _assertBothSupportChoicesPreserveShowFootprints } from "./assertBothSupportChoicesPreserveShowFootprints";

/**
 * Asserts both support choices preserve rehearsal people and stop identity
 * with either optional trace.
 */
export function assertBothSupportChoicesPreserveShowPracticeStrip({
  showPracticeStrip,
  finalStepSupport,
}: Readonly<{
  showPracticeStrip: boolean;
  finalStepSupport: "alongside" | "stands-back";
}>): void {
  return [true, false].forEach((showFootprints) => {
    return _assertBothSupportChoicesPreserveShowFootprints({
      showFootprints,
      finalStepSupport,
      showPracticeStrip,
    });
  });
}
