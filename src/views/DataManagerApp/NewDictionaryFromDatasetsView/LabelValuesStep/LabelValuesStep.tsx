import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { CodeListLabelsPane } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListLabelsPane";
import { CodeListsToLabelNav } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListsToLabelNav";
import { LabelValuesFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesFooter";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep.module.css";
import { NothingToLabel } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/NothingToLabel";
import { useFocusTitleAfterAccept } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/useFocusTitleAfterAccept";
import type { LabelsBlockReason } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  labels: DictionaryProposal.Labels;
  selectedCodeListKey: string | undefined;
  suggestionAvailability: DictionarySuggestionAvailability;
  suggestingCodeListKey: string | undefined;
  /** Why a list's values cannot be sent for suggestions, if they cannot. */
  getLabelsBlockReason: (
    codeList: DictionaryProposal.CodeList,
  ) => LabelsBlockReason | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
  onSuggest: (codeList: DictionaryProposal.CodeList) => void;
};

/**
 * The third step of learning a dictionary: label every code list's values,
 * by hand or with suggestions. Labels can be left unfinished and finished
 * on the dictionary later. After Accept and next list, focus moves to the
 * title of the list that comes next.
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
  const { titleRef, onAccepted } = useFocusTitleAfterAccept(
    selected?.key,
    labels,
  );

  return (
    <>
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
          <AppViewBody>
            <CodeListLabelsPane
              codeList={selected}
              entries={proposal.entries.filter((entry) => {
                return selected.entryKeys.includes(entry.key);
              })}
              labels={labels}
              suggestionAvailability={props.suggestionAvailability}
              isSuggesting={props.suggestingCodeListKey === selected.key}
              blockReason={props.getLabelsBlockReason(selected)}
              titleRef={titleRef}
              dispatch={dispatch}
              onSuggest={props.onSuggest}
            />
          </AppViewBody>
        </div>
      ) : (
        <AppViewBody>
          <NothingToLabel />
        </AppViewBody>
      )}
      <LabelValuesFooter
        selectedKey={selected?.key}
        dispatch={dispatch}
        onAccepted={onAccepted}
      />
    </>
  );
}
