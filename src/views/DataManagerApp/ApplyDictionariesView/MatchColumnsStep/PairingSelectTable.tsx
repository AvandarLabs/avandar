import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Select, Table, Text } from "@mantine/core";
import { toColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import { ColumnNameCell } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/ColumnNameCell";
import css from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep.module.css";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type {
  ApplyDictionariesAction,
  ApplyDictionariesState,
  ColumnPick,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { Dispatch, ReactNode } from "react";

type Props = {
  rows: readonly ApplyColumnRow[];
  dictionaries: ReadonlyArray<Pick<DataDictionary.T, "id" | "name">>;
  state: ApplyDictionariesState;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

function _toKey(
  match: Pick<DictionaryMatch.T, "dictionaryId" | "entryId">,
): string {
  return `${match.dictionaryId}:${match.entryId}`;
}

/** The Select's options: Don't apply, then each match, best first. */
function useMatchOptions(
  row: ApplyColumnRow,
  dictionaries: Props["dictionaries"],
): Array<{ value: string; label: string }> {
  const { t } = useLingui();
  return [
    { value: "", label: t`Don't apply` },
    ...row.matches.map((match) => {
      const { entryName } = match;
      const codeListText = match.codeListName ?? t`description`;
      const dictionaryName = dictionaries.find((dictionary) => {
        return dictionary.id === match.dictionaryId;
      })?.name;
      return {
        value: _toKey(match),
        label:
          dictionaryName === undefined
            ? t`${entryName} · ${codeListText}`
            : t`${entryName} · ${codeListText} · from ${dictionaryName}`,
      };
    }),
  ];
}

function OtherMatchesText({
  row,
}: Readonly<{ row: ApplyColumnRow }>): ReactNode {
  const otherCount = row.matches.length - 1;
  if (row.matches.length === 0) {
    return <Trans>No match</Trans>;
  }
  return otherCount === 0 ? (
    <Trans>Only match</Trans>
  ) : (
    plural(otherCount, { one: "# other match", other: "# other matches" })
  );
}

/** The Select that picks a column's entry from every match. */
function MatchSelect(
  props: Readonly<{
    row: ApplyColumnRow;
    options: Array<{ value: string; label: string }>;
    pick: ColumnPick | undefined;
    dispatch: Dispatch<ApplyDictionariesAction>;
  }>,
): ReactNode {
  const { t } = useLingui();
  const { row, dispatch } = props;
  const columnId = row.column.id;
  const columnName = row.column.name;
  return (
    <Select
      aria-label={t`Entry to apply to ${columnName}`}
      data={props.options}
      value={props.pick ? _toKey(props.pick) : ""}
      allowDeselect={false}
      onChange={(value) => {
        const match = row.matches.find((candidate) => {
          return _toKey(candidate) === value;
        });
        dispatch({
          type: "set_pick",
          columnId,
          pick: match ? toColumnPick(match) : undefined,
        });
      }}
    />
  );
}

function SelectRow(
  props: Readonly<Omit<Props, "rows"> & { row: ApplyColumnRow }>,
): ReactNode {
  const { row, state, dispatch } = props;
  const columnId = row.column.id;
  const options = useMatchOptions(row, props.dictionaries);
  const pick = state.picks[columnId];
  return (
    <Table.Tr
      className={css.matchColumnsRow}
      data-selected={state.selectedColumnId === columnId}
    >
      <Table.Td>
        <ColumnNameCell
          row={row}
          nameId={`apply-column-${columnId}`}
          isSelected={state.selectedColumnId === columnId}
          onSelect={() => {
            dispatch({ type: "select_column", columnId });
          }}
        />
      </Table.Td>
      <Table.Td>
        <MatchSelect
          row={row}
          options={options}
          pick={pick}
          dispatch={dispatch}
        />
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          <OtherMatchesText row={row} />
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * One row per column with one Select of every match from every dictionary
 * in use. Used with more than three dictionaries, where a column per
 * dictionary would not fit.
 */
export function PairingSelectTable(props: Readonly<Props>): ReactNode {
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="22%">
            <Trans>Column in this dataset</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Apply</Trans>
          </Table.Th>
          <Table.Th w="18%">
            <Trans>Other matches</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {props.rows.map((row) => {
          return <SelectRow key={row.column.id} {...props} row={row} />;
        })}
      </Table.Tbody>
    </Table>
  );
}
