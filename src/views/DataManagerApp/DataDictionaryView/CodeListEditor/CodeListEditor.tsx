import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { CodeListEditorActions } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditorActions";
import { CodeListEditorHeader } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditorHeader";
import { CodePairList } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairList";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { CodePairIssue } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairRow";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  codeListId: DataDictionaryCodeList.Id;
  issues: readonly DataDictionary.DraftIssue[];
  canEdit: boolean;
  onDraftChange: (draft: DataDictionary.Draft) => void;
};

/** Makes a lookup of the issue on one pair of a list, with its copy. */
function _makePairIssueGetter(
  options: Readonly<{
    issues: readonly DataDictionary.DraftIssue[];
    listId: DataDictionaryCodeList.Id;
    describeIssue: (issue: DataDictionary.DraftIssue) => string;
  }>,
): (pairIndex: number) => CodePairIssue | undefined {
  const { issues, listId, describeIssue } = options;
  return (pairIndex) => {
    const issue = issues.find((current) => {
      return (
        "pairIndex" in current &&
        current.codeListId === listId &&
        current.pairIndex === pairIndex
      );
    });
    return issue
      ? { type: issue.type, message: describeIssue(issue) }
      : undefined;
  };
}

function _findCodeList(
  options: Readonly<{
    draft: DataDictionary.Draft;
    codeListId: DataDictionaryCodeList.Id;
  }>,
): DataDictionary.CodeListDraft | undefined {
  return options.draft.codeLists.find((current) => {
    return current.id === options.codeListId;
  });
}

function _getUsedByNames(
  options: Readonly<{
    draft: DataDictionary.Draft;
    listId: DataDictionaryCodeList.Id;
  }>,
): string[] {
  return DataDictionary.getEntriesUsingCodeList(
    options.draft,
    options.listId,
  ).map((entry) => {
    return entry.name;
  });
}

function _getNameIssue(
  options: Readonly<{
    issues: readonly DataDictionary.DraftIssue[];
    listId: DataDictionaryCodeList.Id;
  }>,
): DataDictionary.DraftIssue | undefined {
  return options.issues.find((issue) => {
    return (
      issue.type === "code_list_name_required" &&
      issue.codeListId === options.listId
    );
  });
}

function PairsWorkBothWaysNote(): ReactNode {
  return (
    <Text size="sm" c="dimmed" maw="70ch">
      <Trans>
        Pairs work both ways. Applying this list to a column of codes turns them
        into labels, and applying it to a column of labels turns them into
        codes. Matching ignores capitalization and extra spaces, and also
        accepts the other spellings listed beside each label.
      </Trans>
    </Text>
  );
}

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
  const list = _findCodeList({ draft, codeListId });
  if (!list) {
    return null;
  }
  const setPairs = (pairs: DataDictionaryCodeList.Pair[]): void => {
    onDraftChange(DataDictionary.replaceCodeList(draft, { ...list, pairs }));
  };

  return (
    <Stack gap="md">
      <CodeListEditorHeader
        list={list}
        usedByNames={_getUsedByNames({ draft, listId: list.id })}
        nameIssue={_getNameIssue({ issues, listId: list.id })}
        canEdit={canEdit}
        onListChange={(nextList) => {
          onDraftChange(DataDictionary.replaceCodeList(draft, nextList));
        }}
      />
      <CodePairList
        list={list}
        canEdit={canEdit}
        pairIssue={_makePairIssueGetter({
          issues,
          listId: list.id,
          describeIssue: copy.describeIssue,
        })}
        onPairsChange={setPairs}
      />
      {canEdit ? (
        <CodeListEditorActions pairs={list.pairs} onPairsChange={setPairs} />
      ) : null}
      <PairsWorkBothWaysNote />
    </Stack>
  );
}
