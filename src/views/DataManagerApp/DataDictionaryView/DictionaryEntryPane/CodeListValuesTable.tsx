import { Trans, useLingui } from "@lingui/react/macro";
import { Table, Text } from "@mantine/core";
import { ValueSideHeading } from "@/components/dataDictionaries/ValueSideHint/ValueSideHeading";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  codeList: DataDictionary.CodeListDraft;
};

/** A read-only table of a code list's source values and target values. */
export function CodeListValuesTable({ codeList }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const listName = codeList.name;

  return (
    <Table withTableBorder fz="sm" aria-label={t`Values in ${listName}`}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <ValueSideHeading side="source" />
          </Table.Th>
          <Table.Th>
            <ValueSideHeading side="target" />
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {codeList.pairs.map((pair, index) => {
          return (
            // Pairs have no id, and this table is read-only.
            <Table.Tr key={`${pair.code}-${index}`}>
              <Table.Td fw={600}>{pair.code}</Table.Td>
              <Table.Td>
                {pair.label.trim() === "" ? (
                  <Text span c="dimmed" fs="italic">
                    <Trans>No target value yet</Trans>
                  </Text>
                ) : (
                  pair.label
                )}
                {pair.isMissing ? (
                  <Text span c="dimmed" size="xs">
                    {" "}
                    <Trans>(missing value)</Trans>
                  </Text>
                ) : null}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
