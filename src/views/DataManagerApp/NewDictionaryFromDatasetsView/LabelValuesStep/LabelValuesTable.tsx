import { Trans } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { LabelValueRow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValueRow";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  codeList: DictionaryProposal.CodeList;
  labels: DictionaryProposal.Labels;
  dispatch: Dispatch<NewDictionaryAction>;
};

/** One code list's values, each with its row count, label, and missing flag. */
export function LabelValuesTable({
  codeList,
  labels,
  dispatch,
}: Readonly<Props>): ReactNode {
  const codeListKey = codeList.key;
  return (
    <Table verticalSpacing="xs" maw={760}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={140}>
            <Trans>Value in data</Trans>
          </Table.Th>
          <Table.Th w={90} ta="right">
            <Trans>Rows</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Label</Trans>
          </Table.Th>
          <Table.Th w={130}>
            <Trans>Missing value</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {codeList.values.map((item) => {
          return (
            <LabelValueRow
              key={item.value}
              item={item}
              codeListKey={codeListKey}
              label={DictionaryProposal.getValueLabel(labels, {
                codeListKey,
                code: item.value,
              })}
              dispatch={dispatch}
            />
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
