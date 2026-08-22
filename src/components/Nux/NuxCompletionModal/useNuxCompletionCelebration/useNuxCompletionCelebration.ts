import type { NuxEvent } from "@/components/Nux/NuxEvents/NuxEvents";

import { useCallback, useEffect, useRef, useState } from "react";

import { shouldCelebrateFirstDashboardCompletion } from "@/components/Nux/NuxCompletionModal/shouldCelebrateFirstDashboardCompletion/shouldCelebrateFirstDashboardCompletion";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";

type NuxCompletionCelebration = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Opens the tutorial finale when a first publish completes the last
 * milestone. Hydration of an already-finished tutorial does not open it.
 */
export function useNuxCompletionCelebration(): NuxCompletionCelebration {
  const [isOpen, setIsOpen] = useState(false);
  const state = NuxStateManager.useState();
  const latestStateRef = useRef({
    completedMilestones: state.completedMilestones,
    status: state.status,
  });
  useEffect(
    function trackLatestNuxState() {
      latestStateRef.current = {
        completedMilestones: state.completedMilestones,
        status: state.status,
      };
    },
    [state.completedMilestones, state.status],
  );

  useEffect(function subscribeToFirstDashboardFinale() {
    return NuxEvents.subscribe((event: NuxEvent) => {
      if (
        shouldCelebrateFirstDashboardCompletion({
          completedMilestones: latestStateRef.current.completedMilestones,
          eventName: event.name,
          status: latestStateRef.current.status,
        })
      ) {
        setIsOpen(true);
      }
    });
  }, []);

  const onClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, onClose };
}
