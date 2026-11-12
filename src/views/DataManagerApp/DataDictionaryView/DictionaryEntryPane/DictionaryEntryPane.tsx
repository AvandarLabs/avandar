import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Textarea } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { EntryCodesFields } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/EntryCodesFields";
import { EntryIdentityFields } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/EntryIdentityFields";
import { EntryNumberFields } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/EntryNumberFields";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  entry: DataDictionary.EntryDraft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onDraftChange: (draft: DataDictionary.Draft) => void;
  onOpenCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
};

/** Edits one entry: name, other column names, kind, codes, description. */
export function DictionaryEntryPane(props: Readonly<Props>): ReactNode {
  const { draft, entry, issues, canEdit, onDraftChange } = props;
  const { t } = useLingui();
  const update = (changes: Partial<DataDictionary.EntryDraft>): void => {
    onDraftChange(DataDictionary.replaceEntry(draft, { ...entry, ...changes }));
  };
  return (
    <Stack gap="md">
      <EntryIdentityFields
        entry={entry}
        issues={issues}
        canEdit={canEdit}
        onChange={update}
      />
      {DataDictionary.isCodedKind(entry.kind) ? (
        <EntryCodesFields {...props} />
      ) : null}
      {entry.kind === "number" ? (
        <EntryNumberFields
          entry={entry}
          issues={issues}
          canEdit={canEdit}
          onChange={update}
        />
      ) : null}
      <Textarea
        label={t`Description`}
        description={t`Applying this entry to a dataset adds this description to the column.`}
        placeholder={t`What this column means, so teammates read it the same way`}
        value={entry.description}
        disabled={!canEdit}
        autosize
        minRows={3}
        onChange={(event) => {
          update({ description: event.currentTarget.value });
        }}
      />
      {canEdit ? (
        <Group>
          <Button
            variant="subtle"
            color="danger"
            leftSection={<IconTrash size={14} aria-hidden />}
            onClick={() => {
              onDraftChange(DataDictionary.removeEntry(draft, entry.id));
            }}
          >
            <Trans>Remove entry</Trans>
          </Button>
        </Group>
      ) : null}
    </Stack>
  );
}
