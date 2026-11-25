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

/** Makes a lookup of the issue, or else the warning, on one pair of a list. */
function _makePairIssueGetter(
  options: Readonly<{
    issues: readonly DataDictionary.DraftIssue[];
    warnings: readonly DataDictionary.DraftWarning[];
    listId: DataDictionaryCodeList.Id;
    describeIssue: (issue: DataDictionary.DraftIssue) => string;
    describeWarning: (warning: DataDictionary.DraftWarning) => string;
  }>,
): (pairIndex: number) => CodePairIssue | undefined {
  const { issues, warnings, listId } = options;
  return (pairIndex) => {
    const issue = issues.find((current) => {
      return (
        "pairIndex" in current &&
        current.codeListId === listId &&
        current.pairIndex === pairIndex
      );
    });
    if (issue) {
      return {
        type: issue.type,
        message: options.describeIssue(issue),
        severity: "error",
      };
    }
    const warning = warnings.find((current) => {
      return current.codeListId === listId && current.pairIndex === pairIndex;
    });
    return warning
      ? {
          type: warning.type,
          message: options.describeWarning(warning),
          severity: "warning",
        }
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
        Pairs work both ways. Applying this list to a column of source values
        turns them into target values, and applying it to a column of target
        values turns them into source values. Matching ignores capitalization
        and extra spaces, and also accepts the other spellings listed beside
        each target value.
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
          warnings: DataDictionary.findDraftWarnings(draft),
          listId: list.id,
          describeIssue: copy.describeIssue,
          describeWarning: copy.describeWarning,
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
