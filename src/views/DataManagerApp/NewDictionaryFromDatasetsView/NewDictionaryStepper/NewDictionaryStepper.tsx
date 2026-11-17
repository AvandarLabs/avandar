import { Stepper } from "@mantine/core";
import { hasValuesToMap } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepper/NewDictionaryStepper.module.css";
import { useNewDictionaryStepLabels } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryStepLabels";
import type {
  NewDictionaryAction,
  NewDictionaryState,
  NewDictionaryStep,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  state: NewDictionaryState;
  dispatch: Dispatch<NewDictionaryAction>;
};

const STEPS_AFTER_REVIEW: readonly NewDictionaryStep[] = [
  "review",
  "label",
  "describe",
  "save",
];

/**
 * The steps the flow goes through. Pick is left out when the flow opened
 * from a dataset's menu, and Map values when no included entry has values
 * to map. Describe is never left out.
 */
function _getSteps(state: NewDictionaryState): readonly NewDictionaryStep[] {
  const hasMapStep = state.proposal ? hasValuesToMap(state.proposal) : true;
  const stepsAfterPick = STEPS_AFTER_REVIEW.filter((step) => {
    return step !== "label" || hasMapStep;
  });
  return state.originDatasetId ? stepsAfterPick : ["pick", ...stepsAfterPick];
}

/**
 * The step bar of learning a dictionary: where the flow is, with earlier
 * steps one click away. A flow opened from a dataset's menu has no Pick
 * datasets step, and one with no values to map has no Map values step.
 */
export function NewDictionaryStepper({
  state,
  dispatch,
}: Readonly<Props>): ReactNode {
  const labels = useNewDictionaryStepLabels();
  const steps = _getSteps(state);

  return (
    <div className={css.newDictionaryStepper}>
      <Stepper
        size="sm"
        active={steps.indexOf(state.step)}
        allowNextStepsSelect={false}
        onStepClick={(index) => {
          const step = steps[index];
          if (step) {
            dispatch({ type: "go_to_step", step });
          }
        }}
      >
        {steps.map((step) => {
          return <Stepper.Step key={step} label={labels[step]} />;
        })}
      </Stepper>
    </div>
  );
}
