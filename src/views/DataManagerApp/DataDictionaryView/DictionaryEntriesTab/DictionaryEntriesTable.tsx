import { Trans } from "@lingui/react/macro";
import { Badge, Table, Text, UnstyledButton } from "@mantine/core";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import css from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab.module.css";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { ReactNode } from "react";

type Props = {
  rows: readonly DataDictionary.EntryDraft[];
  selectedId: DataDictionaryEntry.Id | undefined;
  listNames: ReadonlyMap<DataDictionaryCodeList.Id, string>;
  kindLabels: Record<DataDictionaryEntry.Kind, string>;
  onSelect: (entryId: DataDictionaryEntry.Id) => void;
};

type RowProps = {
  entry: DataDictionary.EntryDraft;
  isSelected: boolean;
  listNames: Props["listNames"];
  kindLabels: Props["kindLabels"];
  onSelect: Props["onSelect"];
};

function DictionaryEntryRow({
  entry,
  isSelected,
  listNames,
  kindLabels,
  onSelect,
}: Readonly<RowProps>): ReactNode {
  const primaryId = DataDictionary.getPrimaryCodeListId(entry);

  return (
    <Table.Tr
      className={css.dictionaryEntriesTabRow}
      data-selected={isSelected}
    >
      <Table.Td>
        <UnstyledButton
          fw={500}
          fz="sm"
          aria-current={isSelected || undefined}
          onClick={() => {
            onSelect(entry.id);
          }}
        >
          {entry.name}
        </UnstyledButton>
      </Table.Td>
      <Table.Td>
        {entry.columnNames.map((name) => {
          return (
            <Badge
              key={name}
              variant="outline"
              color="neutral"
              size="sm"
              radius="xs"
              tt="none"
              className={css.dictionaryEntriesTabAlias}
            >
              {name}
            </Badge>
          );
        })}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{kindLabels[entry.kind].split(":")[0]}</Text>
        <Text size="xs" c="dimmed">
          {primaryId ? listNames.get(primaryId) : <Trans>Any value</Trans>}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text
          size="sm"
          lineClamp={2}
          c={entry.description ? undefined : "dimmed"}
        >
          {entry.description || <Trans>No description</Trans>}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

/** One row per entry. Selecting a row opens it in the entry pane. */
export function DictionaryEntriesTable({
  rows,
  selectedId,
  listNames,
  kindLabels,
  onSelect,
}: Readonly<Props>): ReactNode {
  return (
    <Table highlightOnHover layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="24%">
            <Trans>Entry</Trans>
          </Table.Th>
          <Table.Th w="26%">
            <Trans>Also matches columns named</Trans>
          </Table.Th>
          <Table.Th w="22%">
            <Trans>Kind and values</Trans>
          </Table.Th>
          <Table.Th w="28%">
            <Trans>Description</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((entry) => {
          return (
            <DictionaryEntryRow
              key={entry.id}
              entry={entry}
              isSelected={entry.id === selectedId}
              listNames={listNames}
              kindLabels={kindLabels}
              onSelect={onSelect}
            />
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
