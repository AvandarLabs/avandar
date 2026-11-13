import { Stepper } from "@mantine/core";
import css from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesStepper.module.css";
import type {
  ApplyDictionariesAction,
  ApplyStep,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { Dispatch, ReactNode } from "react";

const STEPS: readonly ApplyStep[] = ["match", "unmatched", "save"];

type Props = {
  step: ApplyStep;
  labels: Record<ApplyStep, string>;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

/**
 * The apply flow's step bar: Match columns, Unmatched values, then the last
 * step, with earlier steps one click away.
 */
export function ApplyDictionariesStepper({
  step,
  labels,
  dispatch,
}: Readonly<Props>): ReactNode {
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
