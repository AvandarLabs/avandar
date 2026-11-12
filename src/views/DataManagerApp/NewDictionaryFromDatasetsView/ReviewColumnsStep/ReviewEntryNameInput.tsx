import { useLingui } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  nameIssue: DictionaryProposal.EntryNameIssue | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The name an entry will be saved under, editable in place. It is labeled
 * by the entry's first column, which stays put while the name is typed, and
 * it flags the name problems the save RPC refuses.
 */
export function ReviewEntryNameInput({
  entry,
  nameIssue,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const firstColumnName =
    DictionaryProposal.getColumns(entry)[0]?.columnName ?? "";
  const issueMessages: Record<DictionaryProposal.EntryNameIssue, string> = {
    name_required: t`Give this entry a name.`,
    name_not_unique: t`Another entry already has this name.`,
  };
  return (
    <TextInput
      size="xs"
      aria-label={t`Name of the entry from ${firstColumnName}`}
      value={entry.name}
      error={nameIssue ? issueMessages[nameIssue] : undefined}
      onChange={(event) => {
        const name = event.currentTarget.value;
        dispatch({ type: "rename_entry", entryKey: entry.key, name });
      }}
    />
  );
}
