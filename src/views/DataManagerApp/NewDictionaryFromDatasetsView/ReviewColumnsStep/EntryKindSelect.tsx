import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  dispatch: Dispatch<NewDictionaryAction>;
};

/** Picks the kind a proposed entry is saved as. */
export function EntryKindSelect({
  entry,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const entryName = entry.name;
  return (
    <Select
      size="xs"
      aria-label={t`Kind for ${entryName}`}
      allowDeselect={false}
      value={entry.kind}
      data={DataDictionary.ENTRY_KINDS.map((kind) => {
        return { value: kind, label: copy.kindShortLabels[kind] };
      })}
      onChange={(value) => {
        const kind = DataDictionary.ENTRY_KINDS.find((current) => {
          return current === value;
        });
        if (kind) {
          dispatch({ type: "set_entry_kind", entryKey: entry.key, kind });
        }
      }}
    />
  );
}
