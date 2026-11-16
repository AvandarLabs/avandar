import { useMemo } from "react";
import { NewDictionaryReading } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryReading";
import { PickDatasetsStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsStep";
import { ProposalStepBody } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ProposalStepBody";
import type {
  NewDictionaryAction,
  NewDictionaryState,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { NewDictionaryFlow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow";
import type { NewDictionarySources } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources";
import type { Dispatch, ReactNode } from "react";

type Props = {
  state: NewDictionaryState;
  dispatch: Dispatch<NewDictionaryAction>;
  sources: NewDictionarySources;
  flow: NewDictionaryFlow;
  originDatasetName: string | undefined;
};

/** The current step of learning a dictionary, or a wait while it reads. */
export function NewDictionaryStepBody({
  state,
  dispatch,
  sources,
  flow,
  originDatasetName,
}: Readonly<Props>): ReactNode {
  const columnCounts = useMemo(() => {
    return new Map(
      [...sources.columnsByDatasetId].map(([datasetId, columns]) => {
        return [datasetId, columns.length];
      }),
    );
  }, [sources.columnsByDatasetId]);

  if (state.step === "pick") {
    return (
      <PickDatasetsStep
        datasets={sources.datasets}
        columnCounts={columnCounts}
        pickedDatasetIds={state.pickedDatasetIds}
        isLoading={sources.isLoading}
        isReading={flow.isReading}
        dispatch={dispatch}
        onRead={flow.readPickedDatasets}
      />
    );
  }
  if (!state.proposal) {
    return <NewDictionaryReading datasetName={originDatasetName} />;
  }
  return (
    <ProposalStepBody
      proposal={state.proposal}
      state={state}
      dispatch={dispatch}
      flow={flow}
      originDatasetName={originDatasetName}
    />
  );
}
