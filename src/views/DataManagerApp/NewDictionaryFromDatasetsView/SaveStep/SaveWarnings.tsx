import { Callout } from "@avandar/ui";
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  issues: readonly DataDictionary.DraftIssue[];
  proposal: DictionaryProposal.T;
  labels: DictionaryProposal.Labels;
};

function _describeWhere(
  draft: DataDictionary.Draft,
  issue: DataDictionary.DraftIssue,
): string {
  if ("codeListId" in issue) {
    return (
      draft.codeLists.find((codeList) => {
        return codeList.id === issue.codeListId;
      })?.name ?? ""
    );
  }
  return (
    draft.entries.find((entry) => {
      return entry.id === issue.entryId;
    })?.name ?? ""
  );
}

/**
 * The Save step's warnings: values with no label yet, which are saved
 * without one and marked as needing a label on the dictionary, and anything
 * the dictionary would refuse, which blocks Create dictionary until it is
 * fixed.
 */
export function SaveWarnings({
  draft,
  issues,
  proposal,
  labels,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const copy = useDictionaryCopy();
  const unlabeled = useMemo(() => {
    const { codeLists } = DictionaryProposal.getCodings(proposal);
    return DictionaryProposal.getUnlabeledValues(labels, codeLists);
  }, [proposal, labels]);
  const unlabeledCount = unlabeled.valueCount;
  const listNames = new Intl.ListFormat(i18n.locale, {
    type: "conjunction",
  }).format(unlabeled.codeListNames);
  const issueText = issues
    .map((issue) => {
      return `${_describeWhere(draft, issue)}: ${copy.describeIssue(issue)}`;
    })
    .join(" ");

  return (
    <>
      {unlabeledCount > 0 ? (
        <Callout
          color="warning"
          icon={<IconAlertTriangle size={18} aria-hidden />}
          messageSize="sm"
          message={t`${plural(unlabeledCount, {
            one: "# value",
            other: "# values",
          })} in ${listNames} have no label yet. They are saved without one and marked as needing a label, so you can finish them on the dictionary.`}
        />
      ) : null}
      {issues.length > 0 ? (
        <Callout
          title={t`Fix these before saving`}
          messageSize="sm"
          message={issueText}
        />
      ) : null}
    </>
  );
}
