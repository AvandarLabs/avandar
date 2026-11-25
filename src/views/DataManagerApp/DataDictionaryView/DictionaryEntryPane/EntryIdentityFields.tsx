import { useLingui } from "@lingui/react/macro";
import { Select, Stack, TagsInput, TextInput } from "@mantine/core";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { findEntryIssue } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/findEntryIssue";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { ReactNode } from "react";

type Props = {
  entry: DataDictionary.EntryDraft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onChange: (changes: Partial<DataDictionary.EntryDraft>) => void;
};

/** The name, the other column names, and the kind of an entry. */
export function EntryIdentityFields({
  entry,
  issues,
  canEdit,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const nameIssue = findEntryIssue({
    issues,
    entryId: entry.id,
    types: ["entry_name_required", "entry_name_not_unique"],
  });

  return (
    <Stack gap="md">
      <TextInput
        label={t`Name`}
        value={entry.name}
        disabled={!canEdit}
        error={nameIssue ? copy.describeIssue(nameIssue) : undefined}
        onChange={(event) => {
          onChange({ name: event.currentTarget.value });
        }}
      />
      <TagsInput
        label={t`Also matches columns named`}
        placeholder={t`Type a column name and press Enter`}
        value={entry.columnNames}
        disabled={!canEdit}
        onChange={(columnNames) => {
          onChange({ columnNames });
        }}
      />
      <Select
        label={t`Kind`}
        value={entry.kind}
        disabled={!canEdit}
        allowDeselect={false}
        data={DataDictionary.ENTRY_KINDS.map((kind) => {
          return { value: kind, label: copy.kindLabels[kind] };
        })}
        onChange={(kind) => {
          if (kind) {
            onChange({ kind: kind as DataDictionaryEntry.Kind });
          }
        }}
      />
    </Stack>
  );
}
