import { useLingui } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  proposal: DictionaryProposal.T;
  labels: DictionaryProposal.Labels;
  learnedFromNames: readonly string[];
};

/** What the new dictionary will hold, and where it was learned from. */
export function SaveSummary({
  draft,
  proposal,
  labels,
  learnedFromNames,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const { codeLists } = useMemo(() => {
    return DictionaryProposal.getCodings(proposal);
  }, [proposal]);
  const valueCount = codeLists.reduce((sum, codeList) => {
    return sum + codeList.values.length;
  }, 0);
  const unlabeledCount = DictionaryProposal.getUnlabeledValues(
    labels,
    codeLists,
  ).valueCount;
  const labeledCount = valueCount - unlabeledCount;
  const facts = [
    { label: t`Entries`, value: i18n.number(draft.entries.length) },
    { label: t`Code lists`, value: i18n.number(draft.codeLists.length) },
    { label: t`Values labeled`, value: t`${labeledCount} of ${valueCount}` },
    {
      label: t`Learned from`,
      value: new Intl.ListFormat(i18n.locale, { type: "conjunction" }).format(
        learnedFromNames,
      ),
    },
  ];

  return (
    <AppViewSection title={t`What you're saving`}>
      <Table withRowBorders={false} verticalSpacing={4}>
        <Table.Tbody>
          {facts.map((fact) => {
            return (
              <Table.Tr key={fact.label}>
                <Table.Th scope="row" w={160} fw={500} c="dimmed">
                  {fact.label}
                </Table.Th>
                <Table.Td>{fact.value}</Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </AppViewSection>
  );
}
