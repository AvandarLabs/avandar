import { Trans } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { useMemo } from "react";
import { MappingRow } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/MappingRow";
import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/MappingTable.module.css";
import { useFillSummary } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/useFillSummary";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

/** What the mapping table shows and the one thing it does. */
export type MappingTableProps = {
  draft: CrosswalkDraft.T;
  /** The layout whose fills the table shows. */
  layoutId: CrosswalkLayout.Id;
  /** Names the code lists that fills translate with. */
  entriesById: ReadonlyMap<string, DictionaryMatch.Entry>;
  /** The row the side pane edits, if any. */
  selectedColumnId: CrosswalkColumn.Id | undefined;
  onSelectColumn: (columnId: CrosswalkColumn.Id) => void;
};

/** Every code list's name, by id, across the entries. */
function useCodeListNames(
  entriesById: ReadonlyMap<string, DictionaryMatch.Entry>,
): ReadonlyMap<string, string> {
  return useMemo(() => {
    return new Map(
      [...entriesById.values()].flatMap((entry) => {
        return entry.codeLists.map((codeList) => {
          return [codeList.id, codeList.name] as const;
        });
      }),
    );
  }, [entriesById]);
}

/**
 * Step 2's table for one layout: one row per column of the combined
 * dataset, in position order, with what fills it from this layout and
 * why. Selecting a row sets the column the side pane edits.
 */
export function MappingTable(props: Readonly<MappingTableProps>): ReactNode {
  const describeFill = useFillSummary(useCodeListNames(props.entriesById));
  const mappings = props.draft.mappings[props.layoutId] ?? {};
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="30%">
            <Trans>Column of the combined dataset</Trans>
          </Table.Th>
          <Table.Th className={css.filledFrom}>
            <Trans>Filled from this dataset</Trans>
          </Table.Th>
          <Table.Th w="13rem">
            <Trans>Match</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {props.draft.columns.map((column) => {
          return (
            <MappingRow
              key={column.id}
              column={column}
              mapping={mappings[column.id]}
              isSelected={column.id === props.selectedColumnId}
              describeFill={describeFill}
              onSelect={() => {
                props.onSelectColumn(column.id);
              }}
            />
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
