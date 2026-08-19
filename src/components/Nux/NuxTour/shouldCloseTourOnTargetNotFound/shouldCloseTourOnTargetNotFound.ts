/**
 * Event types that currently collapse the tutorial. Kept as the Joyride
 * string values so `NuxTour` can pass `data.type` through without mapping.
 */
export type NuxTourCloseEventType =
  | "error:target_not_found"
  | "error"
  | "tour:end";

/**
 * Whether a Joyride close-class event should collapse the tutorial.
 *
 * A backgrounded tab can make the current target look missing. Closing then
 * drops the overlay and tooltip, so a hidden document never closes. On a
 * visible page, TARGET_NOT_FOUND still ignores stale steps (save unmounts
 * the previous target in the same tick as the payoff jump); TOUR_END and
 * ERROR always close.
 */
export function shouldCloseTourOnTargetNotFound(options: {
  eventType: NuxTourCloseEventType;
  eventStepIndex: number;
  activeStepIndex: number;
  isDocumentVisible: boolean;
}): boolean {
  if (!options.isDocumentVisible) {
    return false;
  }
  if (options.eventType === "error:target_not_found") {
    return options.eventStepIndex === options.activeStepIndex;
  }
  return true;
}
