import { useReducer } from "react";
import { AppView } from "@/components/layouts/AppView/AppView";
import { NewDictionaryHeader } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryHeader";
import {
  makeInitialNewDictionaryState,
  newDictionaryReducer,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import { NewDictionaryStepBody } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepBody";
import { NewDictionaryStepHeading } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepHeading";
import { NewDictionaryStepper } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepper/NewDictionaryStepper";
import { useNewDictionaryFlow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow";
import { useNewDictionarySources } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  originDatasetId: Dataset.Id | undefined;
};

/**
 * The create flow itself, for someone allowed to create dictionaries: its
 * state, the datasets it reads, and the header, step bar, and current step.
 */
export function NewDictionaryFlowView({
  originDatasetId,
}: Readonly<Props>): ReactNode {
  const [state, dispatch] = useReducer(
    newDictionaryReducer,
    originDatasetId,
    makeInitialNewDictionaryState,
  );
  const sources = useNewDictionarySources();
  const flow = useNewDictionaryFlow({ state, dispatch, sources });
  const originDatasetName = state.originDatasetId
    ? (sources.datasets.find((dataset) => {
        return dataset.id === state.originDatasetId;
      })?.name ?? "")
    : undefined;

  return (
    <AppView>
      <NewDictionaryHeader
        cancelDatasetId={originDatasetId}
        originDatasetName={originDatasetName}
      />
      <NewDictionaryStepper state={state} dispatch={dispatch} />
      <NewDictionaryStepHeading step={state.step} />
      <NewDictionaryStepBody
        state={state}
        dispatch={dispatch}
        sources={sources}
        flow={flow}
        originDatasetName={originDatasetName}
      />
    </AppView>
  );
}
