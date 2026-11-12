import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { LabelValuesStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep";
import { ReviewColumnsStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep";
import { SaveStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep";
import type {
  NewDictionaryAction,
  NewDictionaryState,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { NewDictionaryFlow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  state: NewDictionaryState;
  dispatch: Dispatch<NewDictionaryAction>;
  flow: NewDictionaryFlow;
  originDatasetName: string | undefined;
};

function _getLearnedFromNames(proposal: DictionaryProposal.T): string[] {
  const names = proposal.entries.flatMap((entry) => {
    return DictionaryProposal.getColumns(entry).map((column) => {
      return column.datasetName;
    });
  });
  return [...new Set(names)];
}

/** The step to show once the datasets are read: Review, Label, or Save. */
export function ProposalStepBody({
  proposal,
  state,
  dispatch,
  flow,
  originDatasetName,
}: Readonly<Props>): ReactNode {
  if (state.step === "label") {
    return (
      <LabelValuesStep
        proposal={proposal}
        labels={state.labels}
        selectedCodeListKey={state.selectedCodeListKey}
        suggestionAvailability={flow.suggestionAvailability}
        suggestingCodeListKey={flow.suggestingCodeListKey}
        getLabelsBlockReason={flow.getLabelsBlockReason}
        dispatch={dispatch}
        onSuggest={flow.suggestLabels}
      />
    );
  }
  if (state.step === "save") {
    return (
      <SaveStep
        proposal={proposal}
        labels={state.labels}
        name={state.name}
        description={state.description}
        originDatasetName={originDatasetName}
        learnedFromNames={_getLearnedFromNames(proposal)}
        isCreating={flow.isCreating}
        dispatch={dispatch}
        onCreate={flow.createDictionary}
      />
    );
  }
  return (
    <ReviewColumnsStep
      proposal={proposal}
      originDatasetName={originDatasetName}
      meaningMatchStatus={flow.meaningMatchStatus}
      dispatch={dispatch}
    />
  );
}
