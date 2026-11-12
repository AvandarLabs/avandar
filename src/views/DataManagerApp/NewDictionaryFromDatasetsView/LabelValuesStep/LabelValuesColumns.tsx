import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { CodeListLabelsPane } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListLabelsPane";
import { CodeListsToLabelNav } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListsToLabelNav";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep.module.css";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { LabelsBlockReason } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { Dispatch, ReactNode, Ref } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  codeLists: readonly DictionaryProposal.CodeList[];
  selected: DictionaryProposal.CodeList;
  labels: DictionaryProposal.Labels;
  suggestionAvailability: DictionarySuggestionAvailability;
  isSuggesting: boolean;
  /** True while any list's suggestion is pending, not only the selected one. */
  isSuggestionPending: boolean;
  blockReason: LabelsBlockReason | undefined;
  titleRef: Ref<HTMLHeadingElement>;
  dispatch: Dispatch<NewDictionaryAction>;
  onSuggest: (codeList: DictionaryProposal.CodeList) => void;
};

/**
 * The Label values step's two regions: the flank of code lists to label and
 * the column holding the selected list's values.
 */
export function LabelValuesColumns(props: Readonly<Props>): ReactNode {
  const { proposal, selected, labels, dispatch } = props;
  return (
    <div className={css.labelValuesStep}>
      <CodeListsToLabelNav
        codeLists={props.codeLists}
        labels={labels}
        selectedKey={selected.key}
        onSelect={(codeListKey) => {
          dispatch({ type: "select_code_list", codeListKey });
        }}
      />
      <AppViewBody>
        <CodeListLabelsPane
          codeList={selected}
          entries={proposal.entries.filter((entry) => {
            return selected.entryKeys.includes(entry.key);
          })}
          labels={labels}
          suggestionAvailability={props.suggestionAvailability}
          isSuggesting={props.isSuggesting}
          isSuggestionPending={props.isSuggestionPending}
          blockReason={props.blockReason}
          titleRef={props.titleRef}
          dispatch={dispatch}
          onSuggest={props.onSuggest}
        />
      </AppViewBody>
    </div>
  );
}
