import { useLingui } from "@lingui/react/macro";
import { Stepper } from "@mantine/core";
import type { InstallWizardStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type { ReactNode } from "react";

type Props = Readonly<{
  steps: readonly InstallWizardStep[];
  activeStep: InstallWizardStep;

  /** The page of the active step. */
  children: ReactNode;
}>;

/**
 * The install wizard's row of steps, with the active step's page below it.
 * The steps are progress markers, not navigation: the wizard moves only
 * through its Back and Next buttons, so each marker is out of the tab order
 * and the active one is marked as the current step.
 */
export function InstallWizardStepper({
  steps,
  activeStep,
  children,
}: Props): JSX.Element {
  const { t } = useLingui();
  const labels: Record<InstallWizardStep, string> = {
    review: t`Review`,
    dataSlots: t`Records`,
    content: t`Datasets`,
    confirm: t`Confirm`,
  };
  const activeIndex = steps.indexOf(activeStep);
  return (
    <Stepper active={activeIndex} size="sm">
      {steps.map((step, index) => {
        return (
          <Stepper.Step
            key={step}
            label={labels[step]}
            aria-current={index === activeIndex ? "step" : undefined}
          >
            {index === activeIndex ? children : null}
          </Stepper.Step>
        );
      })}
    </Stepper>
  );
}
