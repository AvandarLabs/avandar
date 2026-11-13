import { Trans, useLingui } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { ResolutionControl } from "@/views/DataManagerApp/ApplyDictionariesView/UnmatchedValuesStep/ResolutionControl";
import type {
  ApplyDictionariesAction,
  ApplyDictionariesState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { UnmatchedRow } from "@/views/DataManagerApp/ApplyDictionariesView/UnmatchedValuesStep/buildUnmatchedRows";
import type { Dispatch, ReactNode } from "react";

type Props = {
  rows: readonly UnmatchedRow[];
  resolutions: ApplyDictionariesState["resolutions"];
  canEditDictionaries: boolean;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

/**
 * One row per unmatched value: its column, the value, its rows, and what to
 * do with it.
 */
export function UnmatchedValuesTable(props: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  return (
    <Table layout="fixed" verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="16%">
            <Trans>Column</Trans>
          </Table.Th>
          <Table.Th w="16%">
            <Trans>Value</Trans>
          </Table.Th>
          <Table.Th w="8%" ta="end">
            <Trans>Rows</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>What to do</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {props.rows.map((row) => {
          const { column, item } = row;
          return (
            <Table.Tr key={`${column.id}:${item.valueKey}`}>
              <Table.Td>{column.name}</Table.Td>
              <Table.Td fw={600}>{item.value}</Table.Td>
              <Table.Td ta="end">{i18n.number(item.rowCount)}</Table.Td>
              <Table.Td>
                <ResolutionControl
                  row={row}
                  resolution={props.resolutions[column.id]?.[item.valueKey]}
                  canEditDictionaries={props.canEditDictionaries}
                  dispatch={props.dispatch}
                />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
