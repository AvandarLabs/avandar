import type { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import type { EventData } from "react-joyride";

import { EVENTS } from "react-joyride";

import { getNuxTourStepAfterTransition } from "@/components/Nux/NuxTour/getNuxTourStepAfterTransition/getNuxTourStepAfterTransition";
import { shouldCloseTourOnTargetNotFound } from "@/components/Nux/NuxTour/shouldCloseTourOnTargetNotFound/shouldCloseTourOnTargetNotFound";

type Options = {
  activeStepIndex: number;
  closeTour: ReturnType<typeof NuxStateManager.useDispatch>["closeTour"];
  data: EventData;
  goToStep: ReturnType<typeof NuxStateManager.useDispatch>["goToStep"];
  stepCount: number;
};

/**
 * Maps a Joyride event onto tour state. Completing a milestone is a product
 * outcome, not a Next click, so the last tooltip never auto-completes.
 */
export function onNuxTourJoyrideEvent(options: Readonly<Options>): void {
  const { data } = options;
  if (data.type === EVENTS.STEP_AFTER) {
    const transition = getNuxTourStepAfterTransition({
      action: data.action,
      currentIndex: data.index,
      stepCount: options.stepCount,
    });
    if (transition.kind === "close") {
      options.closeTour();
      return;
    }
    options.goToStep(transition.index);
    return;
  }
  if (
    data.type !== EVENTS.TARGET_NOT_FOUND &&
    data.type !== EVENTS.ERROR &&
    data.type !== EVENTS.TOUR_END
  ) {
    return;
  }
  if (
    !shouldCloseTourOnTargetNotFound({
      eventType: data.type,
      eventStepIndex: data.index,
      activeStepIndex: options.activeStepIndex,
      isDocumentVisible: document.visibilityState === "visible",
    })
  ) {
    return;
  }
  options.closeTour();
}
