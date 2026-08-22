import { useMemo } from "react";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useNuxStepFacts } from "@/components/Nux/NuxTour/useNuxStepFacts";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";
import { getVisibleNuxSteps } from "@/components/Nux/tutorials/getVisibleNuxSteps/getVisibleNuxSteps";
import type { NuxStep } from "@/components/Nux/tutorials/NuxTutorial.types";

/**
 * The open milestone's tooltips after applying live `when` conditions.
 *
 * `activeStepIndex` is an index into this list. When a query lands and the
 * "run a query first" tooltip drops out, index 0 becomes Save.
 */
export function useVisibleNuxSteps(): NuxStep[] {
  const state = NuxStateManager.useState();
  const facts = useNuxStepFacts();
  const milestone = FIRST_DASHBOARD_MILESTONES.find((candidate) => {
    return candidate.key === state.activeMilestoneKey;
  });
  return useMemo(() => {
    return getVisibleNuxSteps({
      steps: milestone?.steps ?? [],
      facts,
    });
  }, [facts, milestone]);
}
