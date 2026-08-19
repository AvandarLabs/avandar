import { useLayoutEffect } from "react";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { scrollNuxAnchorScrollParentToTop } from "@/components/Nux/NuxTour/scrollNuxAnchorScrollParentToTop/scrollNuxAnchorScrollParentToTop";
import { useNuxAnchorPresent } from "@/components/Nux/NuxTour/useNuxAnchorPresent";
import { useVisibleNuxSteps } from "@/components/Nux/NuxTour/useVisibleNuxSteps/useVisibleNuxSteps";

/**
 * When the current step asks for it, jumps the target's internal scroller
 * to the top before paint so Joyride measures the spotlight against the
 * reset pane.
 */
export function useNuxScrollParentToTop(): void {
  const state = NuxStateManager.useState();
  const visibleSteps = useVisibleNuxSteps();
  const currentStep = visibleSteps[state.activeStepIndex];
  const shouldScroll = currentStep?.scrollParentToTop === true;
  const anchor = shouldScroll ? currentStep.anchor : undefined;
  const isAnchorPresent = useNuxAnchorPresent(anchor);

  useLayoutEffect(
    function scrollInternalScrollerToTop() {
      if (!shouldScroll || !isAnchorPresent || anchor === undefined) {
        return;
      }
      scrollNuxAnchorScrollParentToTop(anchor);
    },
    [anchor, isAnchorPresent, shouldScroll],
  );
}
