import { Stack, Text } from "@mantine/core";
import { CodeListPaneHeader } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListPaneHeader";
import { EntryDescriptionField } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/EntryDescriptionField";
import { LabelValuesTable } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesTable";
import { SuggestionsOffNote } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/SuggestionsOffNote";
import { useCodeListHint } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/useCodeListHint";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { LabelsBlockReason } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { Dispatch, ReactNode, Ref } from "react";

type Props = {
  codeList: DictionaryProposal.CodeList;
  /** The entries that use the list. */
  entries: readonly DictionaryProposal.Entry[];
  labels: DictionaryProposal.Labels;
  suggestionAvailability: DictionarySuggestionAvailability;
  isSuggesting: boolean;
  /** True while any list's suggestion is pending, not only this one. */
  isSuggestionPending: boolean;
  /** Why the list's values cannot be sent for suggestions, if they cannot. */
  blockReason: LabelsBlockReason | undefined;
  /** The list's title, which the step focuses after accepting a list. */
  titleRef: Ref<HTMLHeadingElement>;
  dispatch: Dispatch<NewDictionaryAction>;
  onSuggest: (codeList: DictionaryProposal.CodeList) => void;
};

/** The selected code list: its values to map and Suggest target values. */
export function CodeListLabelsPane({
  codeList,
  entries,
  labels,
  suggestionAvailability,
  isSuggesting,
  isSuggestionPending,
  blockReason,
  titleRef,
  dispatch,
  onSuggest,
}: Readonly<Props>): ReactNode {
  const hint = useCodeListHint(codeList, entries);
  const [onlyEntry] = entries.length === 1 ? entries : [];
  const isOff =
    suggestionAvailability === "unavailable" ||
    suggestionAvailability === "declined";

  return (
    <Stack gap="md" miw={0}>
      <CodeListPaneHeader
        title={codeList.name}
        titleRef={titleRef}
        isSuggesting={isSuggesting}
        isSuggestOff={isOff || blockReason !== undefined || isSuggestionPending}
        onSuggest={() => {
          onSuggest(codeList);
        }}
      />
      <Text size="sm" c="dimmed">
        {hint}
      </Text>
      <SuggestionsOffNote
        availability={suggestionAvailability}
        blockReason={blockReason}
        valueCount={codeList.values.length}
      />
      <LabelValuesTable
        codeList={codeList}
        labels={labels}
        dispatch={dispatch}
      />
      {onlyEntry ? (
        <EntryDescriptionField entry={onlyEntry} dispatch={dispatch} />
      ) : null}
    </Stack>
  );
}
