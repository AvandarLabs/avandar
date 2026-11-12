import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { CodeListEditorActions } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditorActions";
import { CodeListEditorHeader } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditorHeader";
import { CodePairList } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairList";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  codeListId: DataDictionaryCodeList.Id;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onDraftChange: (draft: DataDictionary.Draft) => void;
};

/**
 * Edits one code list: its name, whether it is ordered, and its values.
 * Ordered lists can be reordered by dragging, and that order is the
 * scale's order wherever the list is used.
 */
export function CodeListEditor({
  draft,
  codeListId,
  issues,
  canEdit,
  onDraftChange,
}: Readonly<Props>): ReactNode {
  const copy = useDictionaryCopy();
  const list = draft.codeLists.find((current) => {
    return current.id === codeListId;
  });
  if (!list) {
    return null;
  }
  const setPairs = (pairs: DataDictionaryCodeList.Pair[]): void => {
    onDraftChange(DataDictionary.replaceCodeList(draft, { ...list, pairs }));
  };
  const pairIssue = (index: number): string | undefined => {
    const issue = issues.find((current) => {
      return (
        "pairIndex" in current &&
        current.codeListId === list.id &&
        current.pairIndex === index
      );
    });
    return issue ? copy.describeIssue(issue) : undefined;
  };

  return (
    <Stack gap="md">
      <CodeListEditorHeader
        list={list}
        usedByNames={DataDictionary.getEntriesUsingCodeList(draft, list.id).map(
          (entry) => {
            return entry.name;
          },
        )}
        nameIssue={issues.find((issue) => {
          return (
            issue.type === "code_list_name_required" &&
            issue.codeListId === list.id
          );
        })}
        canEdit={canEdit}
        onListChange={(nextList) => {
          onDraftChange(DataDictionary.replaceCodeList(draft, nextList));
        }}
      />
      <CodePairList
        list={list}
        canEdit={canEdit}
        pairIssue={pairIssue}
        onPairsChange={setPairs}
      />
      {canEdit ? (
        <CodeListEditorActions pairs={list.pairs} onPairsChange={setPairs} />
      ) : null}
      <Text size="sm" c="dimmed" maw="70ch">
        <Trans>
          Pairs work both ways. Applying this list to a column of codes turns
          them into labels, and applying it to a column of labels turns them
          into codes. Matching ignores capitalization and extra spaces, and also
          accepts the other spellings listed beside each label.
        </Trans>
      </Text>
    </Stack>
  );
}
