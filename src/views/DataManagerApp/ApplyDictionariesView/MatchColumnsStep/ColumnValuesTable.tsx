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
  mode: DictionaryBinding.Mode;
};

/** The pair a value stands for, and whether an accepted spelling found it. */
type FoundPair = {
  pair: DataDictionaryCodeList.Pair;
  isAcceptedSpelling: boolean;
};

function _isSameValue(spelling: string, key: string): boolean {
  return (
    spelling.trim() !== "" && ColumnProfile.getComparisonKey(spelling) === key
  );
}

function _findPair(
  value: string,
  props: Readonly<Props>,
): FoundPair | undefined {
  const key = ColumnProfile.getComparisonKey(value);
  for (const pair of props.pairs) {
    if (
      props.direction === "decode"
        ? _isSameValue(pair.code, key)
        : _isSameValue(pair.label, key)
    ) {
      return { pair, isAcceptedSpelling: false };
    }
    if (
      props.direction === "encode" &&
      pair.acceptedSpellings.some((spelling) => {
        return _isSameValue(spelling, key);
      })
    ) {
      return { pair, isAcceptedSpelling: true };
    }
  }
  return undefined;
}

function NotInList({ mode }: Readonly<Pick<Props, "mode">>): ReactNode {
  return (
    <Text size="sm" c="warning.8">
      {mode === "convert" ? (
        <Trans>Not in the list, kept as is</Trans>
      ) : (
        <Trans>Not in the list</Trans>
      )}
    </Text>
  );
}

function MeaningCell(
  props: Readonly<{
    found: FoundPair | undefined;
    direction: Props["direction"];
    mode: Props["mode"];
  }>,
): ReactNode {
  if (!props.found) {
    return <NotInList mode={props.mode} />;
  }
  const { pair, isAcceptedSpelling } = props.found;
  const code = pair.code;
  if (props.direction === "encode") {
    return (
      <>
        {props.mode === "convert" ? code : <Trans>code {code}</Trans>}
        {isAcceptedSpelling ? (
          <Text span size="xs" c="dimmed">
            {" "}
            <Trans>(accepted spelling)</Trans>
          </Text>
        ) : null}
      </>
    );
  }
  return pair.label.trim() === "" ? (
    <Text size="sm" c="dimmed" fs="italic">
      {props.mode === "convert" ? (
        <Trans>No label yet, kept as is</Trans>
      ) : (
        <Trans>No label yet</Trans>
      )}
    </Text>
  ) : (
    pair.label
  );
}

/**
 * Each value in a column, its rows, and what the code list says it means,
 * or, when the column converts, what it becomes. Accepted spellings are
 * marked, and a value the list does not hold says it is kept as is.
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
            {props.mode === "convert" ? (
              <Trans>Becomes</Trans>
            ) : (
              <Trans>Means</Trans>
            )}
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
                  found={_findPair(item.value, props)}
                  direction={props.direction}
                  mode={props.mode}
                />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
