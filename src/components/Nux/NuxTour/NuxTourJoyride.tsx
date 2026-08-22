import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxStep } from "@/components/Nux/tutorials/NuxTutorial.types";
import type { ReactNode, RefObject } from "react";
import type { Step } from "react-joyride";

import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Joyride } from "react-joyride";

import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { buildNuxTourFloatingOptions } from "@/components/Nux/NuxTour/buildNuxTourFloatingOptions/buildNuxTourFloatingOptions";
import { NuxTooltip } from "@/components/Nux/NuxTour/NuxTooltip/NuxTooltip";
import { NuxTourCaret } from "@/components/Nux/NuxTour/NuxTourCaret/NuxTourCaret";
import { nuxTourJoyrideStyles } from "@/components/Nux/NuxTour/nuxTourJoyrideStyles";
import { onNuxTourJoyrideEvent } from "@/components/Nux/NuxTour/onNuxTourJoyrideEvent";
import { NUX_CHECKLIST_Z_INDEX } from "@/config/Theme/Theme";

const NUX_TOUR_JOYRIDE_OPTIONS = {
  zIndex: NUX_CHECKLIST_Z_INDEX,
  overlayClickAction: false,
  closeButtonAction: "skip",
  spotlightPadding: 6,
} as const;

type Props = {
  activeStepIndexRef: RefObject<number>;
  joyrideTargetEpoch: number;
  milestoneKey: NuxProgress.MilestoneKey;
  steps: readonly Step[];
  visibleSteps: readonly NuxStep[];
};

/** Controlled Joyride instance for the open NUX milestone. */
export function NuxTourJoyride({
  activeStepIndexRef,
  joyrideTargetEpoch,
  milestoneKey,
  steps,
  visibleSteps,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [state, dispatch] = NuxStateManager.useContext();
  return (
    <Joyride
      key={`${milestoneKey}-${state.activeStepIndex}-${visibleSteps
        .map(prop("anchor"))
        .join(",")}-${joyrideTargetEpoch}`}
      steps={[...steps]}
      run
      continuous
      stepIndex={Math.min(state.activeStepIndex, steps.length - 1)}
      onEvent={(data) => {
        onNuxTourJoyrideEvent({
          data,
          stepCount: steps.length,
          activeStepIndex: activeStepIndexRef.current,
          closeTour: dispatch.closeTour,
          goToStep: dispatch.goToStep,
        });
      }}
      tooltipComponent={NuxTooltip}
      arrowComponent={NuxTourCaret}
      locale={{
        back: t`Back`,
        close: t`Close`,
        last: t`Done`,
        next: t`Next`,
        skip: t`Skip`,
      }}
      styles={nuxTourJoyrideStyles}
      floatingOptions={buildNuxTourFloatingOptions()}
      options={NUX_TOUR_JOYRIDE_OPTIONS}
    />
  );
}
