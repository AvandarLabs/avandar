import { Trans } from "@lingui/react/macro";
import { Table, Text } from "@mantine/core";
import { toColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import { isSamePick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { ColumnNameCell } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnNameCell";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import { MatchPickButton } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchPickButton";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type {
  ApplyDictionariesAction,
  ApplyDictionariesState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { Dispatch, ReactNode } from "react";

type Props = {
  rows: readonly ApplyColumnRow[];
  /** The dictionaries in use, one table column each. */
  dictionaries: ReadonlyArray<Pick<DataDictionary.T, "id" | "name">>;
  state: ApplyDictionariesState;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

function PairingRow(
  props: Readonly<Omit<Props, "rows"> & { row: ApplyColumnRow }>,
): ReactNode {
  const { row, state, dispatch } = props;
  const columnId = row.column.id;
  const nameId = `apply-column-${columnId}`;
  return (
    <Table.Tr
      className={css.matchColumnsRow}
      data-selected={state.selectedColumnId === columnId}
    >
      <Table.Td>
        <ColumnNameCell
          row={row}
          nameId={nameId}
          isSelected={state.selectedColumnId === columnId}
          onSelect={() => {
            dispatch({ type: "select_column", columnId });
          }}
        />
      </Table.Td>
      {props.dictionaries.map((dictionary) => {
        const match = row.matches.find((candidate) => {
          return candidate.dictionaryId === dictionary.id;
        });
        return (
          <Table.Td key={dictionary.id}>
            {match ? (
              <MatchPickButton
                match={match}
                isPicked={isSamePick(
                  state.picks[columnId],
                  toColumnPick(match),
                )}
                describedById={nameId}
                onPick={() => {
                  dispatch({
                    type: "toggle_pick",
                    columnId,
                    pick: toColumnPick(match),
                  });
                }}
              />
            ) : (
              <Text size="sm" c="dimmed">
                <Trans>No match</Trans>
              </Text>
            )}
          </Table.Td>
        );
      })}
    </Table.Tr>
  );
}

/**
 * One row per column and one column per dictionary in use, each cell that
 * dictionary's best match for the column. Used with three dictionaries or
 * fewer.
 */
export function PairingTable(props: Readonly<Props>): ReactNode {
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="22%">
            <Trans>Column in this dataset</Trans>
          </Table.Th>
          {props.dictionaries.map((dictionary) => {
            return <Table.Th key={dictionary.id}>{dictionary.name}</Table.Th>;
          })}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {props.rows.map((row) => {
          return <PairingRow key={row.column.id} {...props} row={row} />;
        })}
      </Table.Tbody>
    </Table>
  );
}
