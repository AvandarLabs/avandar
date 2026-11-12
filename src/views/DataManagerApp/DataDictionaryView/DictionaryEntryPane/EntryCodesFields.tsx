import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, MultiSelect, Select, Stack } from "@mantine/core";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { CodeListValuesTable } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/CodeListValuesTable";
import { findEntryIssue } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/findEntryIssue";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
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

type PrimaryProps = Pick<
  Props,
  "draft" | "entry" | "issues" | "canEdit" | "onDraftChange"
>;

/** The draft after the Code list select picks a list, or a new one. */
function _applyPrimaryChange(
  options: Readonly<{
    draft: DataDictionary.Draft;
    entryId: DataDictionaryEntry.Id;
    value: string | null;
  }>,
): DataDictionary.Draft {
  const { draft, entryId, value } = options;
  if (value === NEW_CODE_LIST_VALUE) {
    return DataDictionary.addCodeListForEntry(draft, entryId).draft;
  }
  return DataDictionary.setPrimaryCodeList(draft, {
    entryId,
    codeListId: (value ?? undefined) as DataDictionaryCodeList.Id | undefined,
  });
}

/** The Code list select, including the option to make a new list. */
function PrimaryCodeListSelect({
  draft,
  entry,
  issues,
  canEdit,
  onDraftChange,
}: Readonly<PrimaryProps>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const primaryIssue = findEntryIssue({
    issues,
    entryId: entry.id,
    types: ["entry_primary_required"],
  });

  return (
    <Select
      label={t`Code list`}
      placeholder={t`No code list`}
      value={DataDictionary.getPrimaryCodeListId(entry) ?? null}
      disabled={!canEdit}
      clearable
      error={primaryIssue ? copy.describeIssue(primaryIssue) : undefined}
      data={[
        ...draft.codeLists.map((list) => {
          return { value: list.id, label: list.name };
        }),
        { value: NEW_CODE_LIST_VALUE, label: t`New code list for this entry` },
      ]}
      onChange={(value: string | null) => {
        onDraftChange(_applyPrimaryChange({ draft, entryId: entry.id, value }));
      }}
    />
  );
}

/**
 * The code list a categorical or ordered entry uses, a read-only preview of
 * its values, and the other code lists the entry also recognizes.
 */
export function EntryCodesFields(props: Readonly<Props>): ReactNode {
  const { draft, entry, canEdit, onDraftChange, onOpenCodeList } = props;
  const primaryId = DataDictionary.getPrimaryCodeListId(entry);
  const primaryList = draft.codeLists.find((list) => {
    return list.id === primaryId;
  });
  const listName = primaryList?.name;

  return (
    <Stack gap="xs">
      <PrimaryCodeListSelect {...props} />
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
              <Trans>Edit {listName}</Trans>
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
