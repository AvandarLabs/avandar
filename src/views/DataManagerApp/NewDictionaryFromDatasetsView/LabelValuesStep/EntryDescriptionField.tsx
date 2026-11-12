import { useLingui } from "@lingui/react/macro";
import { Textarea } from "@mantine/core";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The description of the one entry a code list belongs to. A suggested
 * description says so until the user edits it.
 */
export function EntryDescriptionField({
  entry,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const entryName = entry.name;
  return (
    <Textarea
      maw={760}
      label={t`Description of ${entryName}`}
      description={
        entry.isDescriptionSuggested
          ? t`Suggested from the column name and values. Edit it or keep it.`
          : undefined
      }
      autosize
      minRows={2}
      value={entry.description}
      onChange={(event) => {
        const description = event.currentTarget.value;
        dispatch({
          type: "set_entry_description",
          entryKey: entry.key,
          description,
        });
      }}
    />
  );
}
