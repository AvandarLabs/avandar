import { useLingui } from "@lingui/react";
import { useMemo } from "react";
import { EVENTS, Joyride } from "react-joyride";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { buildJoyrideSteps } from "@/components/Nux/NuxTour/buildJoyrideSteps";
import { NuxTooltip } from "@/components/Nux/NuxTour/NuxTooltip";
import { FIRST_DASHBOARD_MILESTONES } from "@/components/Nux/tutorials/firstDashboard";
import type { ReactNode } from "react";
import type { EventHandler } from "react-joyride";

/**
 * Sits above Mantine's modal layer. Milestones 3 and 4 both spotlight controls
 * inside portals, and Joyride's default of 100 would put the overlay behind
 * them.
 */
const NUX_TOUR_Z_INDEX = 400;

/**
 * Renders the active milestone's tooltips.
 *
 * Controlled mode: `stepIndex` comes from `NuxStateManager`, not from
 * Joyride's own cursor, because the tour also advances on real product events
 * that Joyride knows nothing about.
 */
export function NuxTour(): ReactNode {
  const { i18n } = useLingui();
  const [state, dispatch] = NuxStateManager.useContext();

  const milestone = useMemo(() => {
    return FIRST_DASHBOARD_MILESTONES.find((candidate) => {
      return candidate.key === state.activeMilestoneKey;
    });
  }, [state.activeMilestoneKey]);

  const steps = useMemo(() => {
    return milestone ? buildJoyrideSteps({ milestone, i18n }) : [];
  }, [milestone, i18n]);

  if (!milestone || steps.length === 0) {
    return null;
  }

  const onEvent: EventHandler = (data) => {
    if (data.type === EVENTS.STEP_AFTER) {
      // The last step of a milestone deliberately does NOT complete it.
      // Milestones are completed by real outcomes on the event bus, so a user
      // who clicks Next without acting is simply out of tooltips.
      const nextIndex =
        data.action === "prev" ? data.index - 1 : data.index + 1;
      if (nextIndex >= steps.length) {
        dispatch.closeTour();
        return;
      }
      dispatch.goToStep(nextIndex);
      return;
    }
    if (data.type === EVENTS.TARGET_NOT_FOUND || data.type === EVENTS.ERROR) {
      // The target never appeared within its wait timeout. Collapse to the
      // pill rather than leaving an overlay over a page with no spotlight.
      dispatch.closeTour();
      return;
    }
    if (data.type === EVENTS.TOUR_END) {
      dispatch.closeTour();
    }
  };

  return (
    <Joyride
      steps={steps}
      run
      continuous
      stepIndex={Math.min(state.activeStepIndex, steps.length - 1)}
      onEvent={onEvent}
      tooltipComponent={NuxTooltip}
      options={{
        zIndex: NUX_TOUR_Z_INDEX,
        // Clicking the backdrop should not end the tutorial: the user is very
        // likely clicking the control the tooltip just told them to click.
        overlayClickAction: false,
        spotlightPadding: 6,
      }}
    />
  );
}
