import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { CodeListEditor } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor";
import { CodeListNav } from "@/views/DataManagerApp/DataDictionaryView/DictionaryCodeListsTab/CodeListNav";
import css from "@/views/DataManagerApp/DataDictionaryView/DictionaryCodeListsTab/DictionaryCodeListsTab.module.css";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  selectedCodeListId: DataDictionaryCodeList.Id | undefined;
  onSelectCodeList: (codeListId: DataDictionaryCodeList.Id) => void;
  onDraftChange: (draft: DataDictionary.Draft) => void;
};

/** Returns an opener for the confirmation that removes a code list. */
function useConfirmRemoveCodeList(
  options: Readonly<{
    draft: DataDictionary.Draft;
    onDraftChange: (draft: DataDictionary.Draft) => void;
  }>,
): (list: DataDictionary.CodeListDraft) => void {
  const { draft, onDraftChange } = options;
  const { t } = useLingui();

  return (list) => {
    const entryCount = DataDictionary.getEntriesUsingCodeList(
      draft,
      list.id,
    ).length;
    const listName = list.name;
    modals.openConfirmModal({
      title: t`Remove ${listName}`,
      children: (
        <Text>
          {entryCount > 0 ? (
            <Plural
              value={entryCount}
              one="# entry uses this code list. Removing it removes it from that entry too."
              other="# entries use this code list. Removing it removes it from them too."
            />
          ) : (
            <Trans>No entry uses this code list.</Trans>
          )}
        </Text>
      ),
      labels: { confirm: t`Remove`, cancel: t`Cancel` },
      confirmProps: { color: "danger" },
      onConfirm: () => {
        onDraftChange(DataDictionary.removeCodeList(draft, list.id));
      },
    });
  };
}

type DetailProps = {
  draft: DataDictionary.Draft;
  list: DataDictionary.CodeListDraft;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onDraftChange: (draft: DataDictionary.Draft) => void;
};

/** The selected code list's editor and its Remove code list button. */
function CodeListDetail({
  draft,
  list,
  issues,
  canEdit,
  onDraftChange,
}: Readonly<DetailProps>): ReactNode {
  const confirmRemove = useConfirmRemoveCodeList({ draft, onDraftChange });

  return (
    <Stack gap="md" miw={0}>
      <CodeListEditor
        draft={draft}
        codeListId={list.id}
        issues={issues}
        canEdit={canEdit}
        onDraftChange={onDraftChange}
      />
      {canEdit ? (
        <div>
          <Button
            variant="subtle"
            color="danger"
            size="compact-sm"
            leftSection={<IconTrash size={14} aria-hidden />}
            onClick={() => {
              confirmRemove(list);
            }}
          >
            <Trans>Remove code list</Trans>
          </Button>
        </div>
      ) : null}
    </Stack>
  );
}

/** Every code list in the dictionary beside the selected list's editor. */
export function DictionaryCodeListsTab({
  draft,
  issues,
  canEdit,
  selectedCodeListId,
  onSelectCodeList,
  onDraftChange,
}: Readonly<Props>): ReactNode {
  const selected =
    draft.codeLists.find((list) => {
      return list.id === selectedCodeListId;
    }) ?? draft.codeLists[0];

  return (
    <div className={css.dictionaryCodeListsTab}>
      <CodeListNav
        draft={draft}
        selectedCodeListId={selected?.id}
        canEdit={canEdit}
        onSelectCodeList={onSelectCodeList}
        onDraftChange={onDraftChange}
      />
      {selected ? (
        <CodeListDetail
          key={selected.id}
          draft={draft}
          list={selected}
          issues={issues}
          canEdit={canEdit}
          onDraftChange={onDraftChange}
        />
      ) : (
        <Text c="dimmed">
          <Trans>
            No code lists yet. A code list holds values such as 1 = Male, and
            any entry can use it.
          </Trans>
        </Text>
      )}
    </div>
  );
}
