import { useLingui } from "@lingui/react/macro";
import { useEffect, useMemo, useRef } from "react";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { makeJoyrideStepsFromMilestone } from "@/components/Nux/NuxTour/makeJoyrideStepsFromMilestone/makeJoyrideStepsFromMilestone";
import { NuxTourJoyride } from "@/components/Nux/NuxTour/NuxTourJoyride";
import { useNuxAutoAdvance } from "@/components/Nux/NuxTour/useNuxAutoAdvance/useNuxAutoAdvance";
import { useNuxJoyrideTargetEpoch } from "@/components/Nux/NuxTour/useNuxJoyrideTargetEpoch";
import { useNuxScrollParentToTop } from "@/components/Nux/NuxTour/useNuxScrollParentToTop/useNuxScrollParentToTop";
import { useNuxTourRelayoutOnChatAside } from "@/components/Nux/NuxTour/useNuxTourRelayoutOnChatAside/useNuxTourRelayoutOnChatAside";
import { useVisibleNuxSteps } from "@/components/Nux/NuxTour/useVisibleNuxSteps/useVisibleNuxSteps";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard/firstDashboard";
import type { ReactNode } from "react";

/**
 * Renders the active milestone's tooltips.
 *
 * Controlled mode: `stepIndex` comes from `NuxStateManager`, not from
 * Joyride's own cursor, because the tour also advances on real product events
 * that Joyride knows nothing about.
 */
export function NuxTour(): ReactNode {
  const { i18n } = useLingui();
  const state = NuxStateManager.useState();
  useNuxAutoAdvance();
  useNuxScrollParentToTop();
  useNuxTourRelayoutOnChatAside();
  const activeStepIndexRef = useRef(state.activeStepIndex);
  useEffect(
    function trackActiveStepIndex() {
      activeStepIndexRef.current = state.activeStepIndex;
    },
    [state.activeStepIndex],
  );
  const milestone = FIRST_DASHBOARD_MILESTONES.find((candidate) => {
    return candidate.key === state.activeMilestoneKey;
  });
  const visibleSteps = useVisibleNuxSteps();
  const joyrideTargetEpoch = useNuxJoyrideTargetEpoch(
    visibleSteps[state.activeStepIndex]?.anchor,
  );
  const steps = useMemo(() => {
    return milestone ?
        makeJoyrideStepsFromMilestone({
          milestone: { ...milestone, steps: visibleSteps },
          i18n,
        })
      : [];
  }, [i18n, milestone, visibleSteps]);
  if (!milestone || steps.length === 0) {
    return null;
  }
  return (
    <NuxTourJoyride
      activeStepIndexRef={activeStepIndexRef}
      joyrideTargetEpoch={joyrideTargetEpoch}
      milestoneKey={milestone.key}
      steps={steps}
      visibleSteps={visibleSteps}
    />
  );
}
