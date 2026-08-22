import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";

import { useEffect, useState } from "react";

import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { getAutoAdvanceStepIndex } from "@/components/Nux/NuxTour/getAutoAdvanceStepIndex/getAutoAdvanceStepIndex";
import { useNuxAnchorPresent } from "@/components/Nux/NuxTour/useNuxAnchorPresent";
import { useVisibleNuxSteps } from "@/components/Nux/NuxTour/useVisibleNuxSteps/useVisibleNuxSteps";

/**
 * The furthest tooltip shown on this milestone visit. Resets when the
 * open milestone changes. Used so auto-advance cannot fight Back.
 */
function useHighestStepIndexReached(
  milestoneKey: NuxProgress.MilestoneKey | undefined,
  activeStepIndex: number,
): number {
  const [trackedMilestoneKey, setTrackedMilestoneKey] = useState(milestoneKey);
  const [highestStepIndex, setHighestStepIndex] = useState(activeStepIndex);
  if (trackedMilestoneKey !== milestoneKey) {
    setTrackedMilestoneKey(milestoneKey);
    setHighestStepIndex(activeStepIndex);
    return activeStepIndex;
  }
  if (activeStepIndex > highestStepIndex) {
    setHighestStepIndex(activeStepIndex);
    return activeStepIndex;
  }
  return highestStepIndex;
}

/**
 * Moves the tour onto the next tooltip when that tooltip's target is the
 * current step's gate and the target has appeared (page or modal).
 */
export function useNuxAutoAdvance(): void {
  const [state, dispatch] = NuxStateManager.useContext();
  const visibleSteps = useVisibleNuxSteps();
  const currentStep = visibleSteps[state.activeStepIndex];
  const gateAnchor = currentStep?.disableNextUntilAnchor;
  const isGateAnchorPresent = useNuxAnchorPresent(gateAnchor);
  const highestStepIndexReached = useHighestStepIndexReached(
    state.activeMilestoneKey,
    state.activeStepIndex,
  );
  const nextIndex = getAutoAdvanceStepIndex({
    steps: visibleSteps,
    activeStepIndex: state.activeStepIndex,
    isGateAnchorPresent,
    highestStepIndexReached,
  });

  useEffect(
    function advanceWhenNextTargetIsPresent() {
      if (nextIndex === undefined) {
        return;
      }
      dispatch.goToStep(nextIndex);
    },
    [dispatch, nextIndex],
  );
}
