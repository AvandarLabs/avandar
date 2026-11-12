import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, MultiSelect, Select, Stack } from "@mantine/core";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { CodeListValuesTable } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/CodeListValuesTable";
import { findEntryIssue } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/findEntryIssue";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

/** The Code list select's value for "make a new list for this entry". */
const NEW_CODE_LIST_VALUE = "__new__";

type Props = {
  draft: DataDictionary.Draft;
  entry: DataDictionary.EntryDraft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onDraftChange: (draft: DataDictionary.Draft) => void;
  onOpenCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
};

type OtherProps = Pick<Props, "draft" | "entry" | "canEdit" | "onDraftChange">;

/** The code lists an entry also recognizes besides its primary one. */
function OtherCodeListsSelect({
  draft,
  entry,
  canEdit,
  onDraftChange,
}: Readonly<OtherProps>): ReactNode {
  const { t } = useLingui();
  const primaryId = DataDictionary.getPrimaryCodeListId(entry);

  return (
    <MultiSelect
      label={t`Also recognizes these code lists`}
      description={t`For data that writes the same values another way, such as M and F instead of 1 and 2.`}
      value={entry.codings
        .filter((coding) => {
          return !coding.isPrimary;
        })
        .map((coding) => {
          return coding.codeListId;
        })}
      data={draft.codeLists
        .filter((list) => {
          return list.id !== primaryId;
        })
        .map((list) => {
          return { value: list.id, label: list.name };
        })}
      disabled={!canEdit}
      onChange={(codeListIds) => {
        onDraftChange(
          DataDictionary.setOtherCodeLists(draft, {
            entryId: entry.id,
            codeListIds: codeListIds as DataDictionaryCodeList.Id[],
          }),
        );
      }}
    />
  );
}

/**
 * The code list a categorical or ordered entry uses, a read-only preview of
 * its values, and the other code lists the entry also recognizes.
 */
export function EntryCodesFields(props: Readonly<Props>): ReactNode {
  const { draft, entry, issues, canEdit, onDraftChange, onOpenCodeList } =
    props;
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const primaryId = DataDictionary.getPrimaryCodeListId(entry);
  const primaryList = draft.codeLists.find((list) => {
    return list.id === primaryId;
  });
  const listOptions = draft.codeLists.map((list) => {
    return { value: list.id, label: list.name };
  });
  const primaryIssue = findEntryIssue({
    issues,
    entryId: entry.id,
    types: ["entry_primary_required"],
  });
  const onPrimaryChange = (value: string | null): void => {
    if (value === NEW_CODE_LIST_VALUE) {
      onDraftChange(DataDictionary.addCodeListForEntry(draft, entry.id).draft);
      return;
    }
    onDraftChange(
      DataDictionary.setPrimaryCodeList(draft, {
        entryId: entry.id,
        codeListId: (value ?? undefined) as
          | DataDictionaryCodeList.Id
          | undefined,
      }),
    );
  };

  return (
    <Stack gap="xs">
      <Select
        label={t`Code list`}
        placeholder={t`No code list`}
        value={primaryId ?? null}
        disabled={!canEdit}
        clearable
        error={primaryIssue ? copy.describeIssue(primaryIssue) : undefined}
        data={[
          ...listOptions,
          {
            value: NEW_CODE_LIST_VALUE,
            label: t`New code list for this entry`,
          },
        ]}
        onChange={onPrimaryChange}
      />
      {primaryList ? (
        <>
          <CodeListValuesTable codeList={primaryList} />
          <Group>
            <Button
              variant="subtle"
              size="compact-sm"
              onClick={() => {
                onOpenCodeList(primaryList.id);
              }}
            >
              <Trans>Edit {primaryList.name}</Trans>
            </Button>
          </Group>
          <OtherCodeListsSelect
            draft={draft}
            entry={entry}
            canEdit={canEdit}
            onDraftChange={onDraftChange}
          />
        </>
      ) : null}
    </Stack>
  );
}
