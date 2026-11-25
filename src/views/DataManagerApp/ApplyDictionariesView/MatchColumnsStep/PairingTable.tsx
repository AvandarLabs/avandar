import { Trans } from "@lingui/react/macro";
import { Table, Text } from "@mantine/core";
import { toColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import { isSamePick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { ColumnNameCell } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnNameCell";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import { MatchPickButton } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchPickButton";
import { ModeChip } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ModeChip";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type {
  ApplyDictionariesAction,
  ApplyDictionariesState,
  ColumnPick,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ConversionCopy } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/useConversionCopy";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { Dispatch, ReactNode } from "react";

type Props = {
  rows: readonly ApplyColumnRow[];
  /** The dictionaries in use, one table column each. */
  dictionaries: ReadonlyArray<Pick<DataDictionary.T, "id" | "name">>;
  state: ApplyDictionariesState;
  copy: ConversionCopy;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

type CellProps = {
  row: ApplyColumnRow;
  dictionaryId: DataDictionary.Id;
  nameId: string;
  pick: ColumnPick | undefined;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

/**
 * The match a dictionary's cell shows: the column's pick when it comes from
 * this dictionary, so a picked entry is never hidden behind a better-ranked
 * one, else the dictionary's best match.
 */
function _findCellMatch(
  props: Readonly<CellProps>,
): DictionaryMatch.T | undefined {
  const matches = props.row.matches.filter((match) => {
    return match.dictionaryId === props.dictionaryId;
  });
  return (
    matches.find((match) => {
      return isSamePick(props.pick, toColumnPick(match));
    }) ?? matches[0]
  );
}

function PairingCell(props: Readonly<CellProps>): ReactNode {
  const match = _findCellMatch(props);
  if (!match) {
    return (
      <Text size="sm" c="dimmed">
        <Trans>No match</Trans>
      </Text>
    );
  }
  const columnId = props.row.column.id;
  return (
    <MatchPickButton
      match={match}
      isPicked={isSamePick(props.pick, toColumnPick(match))}
      describedById={props.nameId}
      onPick={() => {
        props.dispatch({
          type: "toggle_pick",
          columnId,
          pick: toColumnPick(match),
        });
      }}
    />
  );
}

/** A row's Values cell: the mode chip, for a pick with a code list. */
export function ValuesCell(
  props: Readonly<{
    columnId: DatasetColumn.Id;
    nameId: string;
    pick: ColumnPick | undefined;
    copy: ConversionCopy;
    dispatch: Dispatch<ApplyDictionariesAction>;
  }>,
): ReactNode {
  const { columnId, pick } = props;
  if (!pick?.codeListId) {
    return null;
  }
  return (
    <ModeChip
      mode={pick.mode}
      nameId={props.nameId}
      copy={props.copy}
      onToggle={() => {
        props.dispatch({
          type: "set_mode",
          columnId,
          mode: pick.mode === "convert" ? "reference" : "convert",
        });
      }}
    />
  );
}

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
        return (
          <Table.Td key={dictionary.id}>
            <PairingCell
              row={row}
              dictionaryId={dictionary.id}
              nameId={nameId}
              pick={state.picks[columnId]}
              dispatch={dispatch}
            />
          </Table.Td>
        );
      })}
      <Table.Td>
        <ValuesCell
          columnId={columnId}
          nameId={nameId}
          pick={state.picks[columnId]}
          copy={props.copy}
          dispatch={dispatch}
        />
      </Table.Td>
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
          <Table.Th w="8.5rem">
            <Trans>Values</Trans>
          </Table.Th>
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
