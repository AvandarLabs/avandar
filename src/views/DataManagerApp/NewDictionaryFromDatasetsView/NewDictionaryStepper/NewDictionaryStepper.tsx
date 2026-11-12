import { Stepper } from "@mantine/core";
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

const STEPS_FROM_PICK: readonly NewDictionaryStep[] = [
  "pick",
  "review",
  "label",
  "save",
];
const STEPS_FROM_DATASET: readonly NewDictionaryStep[] = [
  "review",
  "label",
  "save",
];

/**
 * The step bar of learning a dictionary: where the flow is, with earlier
 * steps one click away. A flow opened from a dataset's menu has no Pick
 * datasets step.
 */
export function NewDictionaryStepper({
  state,
  dispatch,
}: Readonly<Props>): ReactNode {
  const labels = useNewDictionaryStepLabels();
  const steps = state.originDatasetId ? STEPS_FROM_DATASET : STEPS_FROM_PICK;

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
