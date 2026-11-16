import { Stepper } from "@mantine/core";
import css from "@/views/DataManagerApp/CrosswalkView/CrosswalkStepper/CrosswalkStepper.module.css";
import type { CrosswalkStep } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { ReactNode } from "react";

const STEPS: readonly CrosswalkStep[] = ["datasets", "map", "combine"];

type Props = {
  step: CrosswalkStep;
  labels: Record<CrosswalkStep, string>;
  /** The steps the crosswalk can open now; any other step does nothing. */
  reachableSteps: ReadonlySet<CrosswalkStep>;
  onStepClick: (step: CrosswalkStep) => void;
};

/**
 * The crosswalk's step bar: Choose datasets, Map each dataset, then Create
 * or Update combined dataset. Unlike the create flow's, a later step opens
 * as soon as the crosswalk can reach it, since a saved crosswalk is
 * revisited, not walked once.
 */
export function CrosswalkStepper({
  step,
  labels,
  reachableSteps,
  onStepClick,
}: Readonly<Props>): ReactNode {
  const isSelectable = (item: CrosswalkStep): boolean => {
    return item !== step && reachableSteps.has(item);
  };
  return (
    <div className={css.crosswalkStepper}>
      <Stepper
        size="sm"
        active={STEPS.indexOf(step)}
        onStepClick={(index) => {
          const target = STEPS[index];
          if (target && isSelectable(target)) {
            onStepClick(target);
          }
        }}
      >
        {STEPS.map((item) => {
          return (
            <Stepper.Step
              key={item}
              label={labels[item]}
              allowStepSelect={isSelectable(item)}
            />
          );
        })}
      </Stepper>
    </div>
  );
}
