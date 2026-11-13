import { Trans, useLingui } from "@lingui/react/macro";
import { Table, Text } from "@mantine/core";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { ReactNode } from "react";

type Props = {
  values: readonly ColumnProfile.Value[];
  pairs: readonly DataDictionaryCodeList.Pair[];
  direction: DictionaryBinding.Direction;
};

/** The pair a value in the data stands for, in the column's direction. */
function _findPair(
  value: string,
  props: Readonly<Props>,
): DataDictionaryCodeList.Pair | undefined {
  const key = ColumnProfile.getComparisonKey(value);
  return props.pairs.find((pair) => {
    const spellings =
      props.direction === "decode"
        ? [pair.code]
        : [pair.label, ...pair.acceptedSpellings];
    return spellings.some((spelling) => {
      return (
        spelling.trim() !== "" &&
        ColumnProfile.getComparisonKey(spelling) === key
      );
    });
  });
}

function MeaningCell(
  props: Readonly<{
    pair: DataDictionaryCodeList.Pair | undefined;
    direction: Props["direction"];
  }>,
): ReactNode {
  const { pair } = props;
  if (!pair) {
    return (
      <Text size="sm" c="warning.8">
        <Trans>Not in the list</Trans>
      </Text>
    );
  }
  const code = pair.code;
  if (props.direction === "encode") {
    return <Trans>code {code}</Trans>;
  }
  return pair.label.trim() === "" ? (
    <Text size="sm" c="dimmed" fs="italic">
      <Trans>No label yet</Trans>
    </Text>
  ) : (
    pair.label
  );
}

/**
 * Each value in a column, its rows, and what the code list says it means,
 * so the user can check a match before attaching it.
 */
export function ColumnValuesTable(props: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  return (
    <Table verticalSpacing={4} fz="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <Trans>Value in data</Trans>
          </Table.Th>
          <Table.Th ta="end">
            <Trans>Rows</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Means</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {props.values.map((item) => {
          return (
            <Table.Tr key={item.value}>
              <Table.Td fw={600}>{item.value}</Table.Td>
              <Table.Td ta="end">{i18n.number(item.rowCount)}</Table.Td>
              <Table.Td>
                <MeaningCell
                  pair={_findPair(item.value, props)}
                  direction={props.direction}
                />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
