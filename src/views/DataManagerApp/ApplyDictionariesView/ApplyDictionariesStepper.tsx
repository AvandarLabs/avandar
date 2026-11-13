import { Stepper } from "@mantine/core";
import css from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepper.module.css";
import { useApplyStepLabels } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyStepLabels";
import type {
  ApplyDictionariesAction,
  ApplyStep,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { Dispatch, ReactNode } from "react";

const STEPS: readonly ApplyStep[] = ["match", "attach"];

type Props = {
  step: ApplyStep;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

/**
 * The apply flow's step bar: Match columns, then Attach, with the earlier
 * step one click away.
 */
export function ApplyDictionariesStepper({
  step,
  dispatch,
}: Readonly<Props>): ReactNode {
  const labels = useApplyStepLabels();
  return (
    <div className={css.applyDictionariesStepper}>
      <Stepper
        size="sm"
        active={STEPS.indexOf(step)}
        allowNextStepsSelect={false}
        onStepClick={(index) => {
          const nextStep = STEPS[index];
          if (nextStep) {
            dispatch({ type: "go_to_step", step: nextStep });
          }
        }}
      >
        {STEPS.map((item) => {
          return <Stepper.Step key={item} label={labels[item]} />;
        })}
      </Stepper>
    </div>
  );
}
