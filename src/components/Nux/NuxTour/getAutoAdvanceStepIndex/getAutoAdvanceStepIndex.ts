import type { NuxStep } from "@/components/Nux/tutorials/NuxTutorial.types";

/**
 * Next step index when the current tooltip is gated on an anchor that is
 * already in the document.
 *
 * The tour follows the user: they did the thing (parsed a file, opened a
 * tab), so the next tooltip appears without a Next click. Returns
 * `undefined` while the gate is missing, when the current tooltip is
 * not anchor-gated, or when the user has already been to a later tooltip
 * (so Back does not bounce forward). Event-gated steps advance through
 * `completeMilestone`.
 */
export function getAutoAdvanceStepIndex(options: {
  steps: readonly NuxStep[];
  activeStepIndex: number;
  isGateAnchorPresent: boolean;
  /**
   * The furthest tooltip index this milestone visit has already shown.
   * Auto-advance never moves backward onto a tooltip the user already left:
   * Back would otherwise bounce straight forward again because the gate is
   * still in the document.
   */
  highestStepIndexReached?: number;
}): number | undefined {
  const currentStep = options.steps[options.activeStepIndex];
  const nextStep = options.steps[options.activeStepIndex + 1];
  const nextIndex = options.activeStepIndex + 1;
  const highestStepIndexReached =
    options.highestStepIndexReached ?? options.activeStepIndex;
  if (
    currentStep?.disableNextUntilAnchor === undefined ||
    nextStep === undefined ||
    !options.isGateAnchorPresent ||
    nextIndex <= highestStepIndexReached
  ) {
    return undefined;
  }
  return nextIndex;
}
