import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { CodeListLabelsPane } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListLabelsPane";
import { CodeListsToLabelNav } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListsToLabelNav";
import { LabelValuesFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesFooter";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep.module.css";
import { NothingToLabel } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/NothingToLabel";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  labels: DictionaryProposal.Labels;
  selectedCodeListKey: string | undefined;
  suggestionAvailability: DictionarySuggestionAvailability;
  suggestingCodeListKey: string | undefined;
  /** Whether a list's values can be sent for suggestions at all. */
  canSuggestLabels: (codeList: DictionaryProposal.CodeList) => boolean;
  dispatch: Dispatch<NewDictionaryAction>;
  onSuggest: (codeList: DictionaryProposal.CodeList) => void;
};

/**
 * The third step of learning a dictionary: label every code list's values,
 * by hand or with suggestions. Labels can be left unfinished and finished
 * on the dictionary later.
 */
export function LabelValuesStep(props: Readonly<Props>): ReactNode {
  const { proposal, labels, dispatch } = props;
  const { codeLists } = useMemo(() => {
    return DictionaryProposal.getCodings(proposal);
  }, [proposal]);
  const selected =
    codeLists.find((codeList) => {
      return codeList.key === props.selectedCodeListKey;
    }) ?? codeLists[0];
  const canSuggest = selected ? props.canSuggestLabels(selected) : false;

  return (
    <AppViewBody>
      {selected ? (
        <div className={css.labelValuesStep}>
          <CodeListsToLabelNav
            codeLists={codeLists}
            labels={labels}
            selectedKey={selected.key}
            onSelect={(codeListKey) => {
              dispatch({ type: "select_code_list", codeListKey });
            }}
          />
          <CodeListLabelsPane
            codeList={selected}
            entries={proposal.entries.filter((entry) => {
              return selected.entryKeys.includes(entry.key);
            })}
            labels={labels}
            suggestionAvailability={props.suggestionAvailability}
            isSuggesting={props.suggestingCodeListKey === selected.key}
            canSuggest={canSuggest}
            dispatch={dispatch}
            onSuggest={props.onSuggest}
          />
        </div>
      ) : (
        <NothingToLabel />
      )}
      <LabelValuesFooter selectedKey={selected?.key} dispatch={dispatch} />
    </AppViewBody>
  );
}
