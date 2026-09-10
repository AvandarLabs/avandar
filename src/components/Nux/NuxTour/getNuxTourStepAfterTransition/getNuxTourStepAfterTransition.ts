/**
 * What the tour should do after Joyride reports the user left a tooltip.
 */
export type NuxTourStepAfterTransition =
  | { kind: "close" }
  | { kind: "goToStep"; index: number };

/**
 * Maps a Joyride `step:after` action to a tour transition.
 *
 * Close and skip collapse the tour. They must not be treated as Next:
 * Joyride fires the same STEP_AFTER event for all three, and advancing
 * would wait for the next tooltip's target, which is often not on the
 * page yet (gray overlay and a center loader).
 */
export function getNuxTourStepAfterTransition(options: {
  action: string;
  currentIndex: number;
  stepCount: number;
}): NuxTourStepAfterTransition {
  const nextIndex =
    options.action === "prev"
      ? options.currentIndex - 1
      : options.currentIndex + 1;
  return options.action === "close" ||
    options.action === "skip" ||
    nextIndex >= options.stepCount
    ? { kind: "close" }
    : { kind: "goToStep", index: nextIndex };
}
