import { Callout } from "@avandar/ui";
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { List } from "@mantine/core";
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

/** The unlabeled values and the code lists they are in. */
function useUnlabeledValues(
  proposal: DictionaryProposal.T,
  labels: DictionaryProposal.Labels,
): { valueCount: number; listNames: string } {
  const { i18n } = useLingui();
  const unlabeled = useMemo(() => {
    const { codeLists } = DictionaryProposal.getCodings(proposal);
    return DictionaryProposal.getUnlabeledValues(labels, codeLists);
  }, [proposal, labels]);
  const listNames = new Intl.ListFormat(i18n.locale, {
    type: "conjunction",
  }).format(unlabeled.codeListNames);
  return { valueCount: unlabeled.valueCount, listNames };
}

/** The warning for values saved without a label, worded for how many. */
function useUnlabeledMessage(valueCount: number, listNames: string): string {
  // The whole sentence sits in each plural branch, so the verb and the
  // pronoun agree with the count in every language.
  return plural(valueCount, {
    one: `# value in ${listNames} has no label yet. It is saved without one and marked as needing a label, so you can finish it on the dictionary.`,
    other: `# values in ${listNames} have no label yet. They are saved without one and marked as needing a label, so you can finish them on the dictionary.`,
  });
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
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const { valueCount, listNames } = useUnlabeledValues(proposal, labels);
  const unlabeledMessage = useUnlabeledMessage(valueCount, listNames);

  return (
    <>
      {valueCount > 0 ? (
        <Callout
          color="warning"
          icon={<IconAlertTriangle size={18} aria-hidden />}
          messageSize="sm"
          message={unlabeledMessage}
        />
      ) : null}
      {issues.length > 0 ? (
        <Callout
          title={t`Fix these before saving`}
          titleOrder={3}
          messageSize="sm"
        >
          <List size="sm" withPadding>
            {issues.map((issue) => {
              return (
                <List.Item key={JSON.stringify(issue)}>
                  {`${_describeWhere(draft, issue)}: ${copy.describeIssue(issue)}`}
                </List.Item>
              );
            })}
          </List>
        </Callout>
      ) : null}
    </>
  );
}
