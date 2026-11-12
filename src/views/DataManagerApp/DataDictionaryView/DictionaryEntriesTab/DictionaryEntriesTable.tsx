import { Plural, Trans } from "@lingui/react/macro";
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
  /** Values that still need a label, by code list. */
  unlabeledCounts: ReadonlyMap<DataDictionaryCodeList.Id, number>;
  kindShortLabels: Record<DataDictionaryEntry.Kind, string>;
  onSelect: (entryId: DataDictionaryEntry.Id) => void;
};

type RowProps = {
  entry: DataDictionary.EntryDraft;
  isSelected: boolean;
  listNames: Props["listNames"];
  /** Values that still need a label, by code list. */
  unlabeledCounts: Props["unlabeledCounts"];
  kindShortLabels: Props["kindShortLabels"];
  onSelect: Props["onSelect"];
};

function DictionaryEntryRow({
  entry,
  isSelected,
  listNames,
  unlabeledCounts,
  kindShortLabels,
  onSelect,
}: Readonly<RowProps>): ReactNode {
  const primaryId = DataDictionary.getPrimaryCodeListId(entry);
  const unlabeledCount = entry.codings.reduce((sum, coding) => {
    return sum + (unlabeledCounts.get(coding.codeListId) ?? 0);
  }, 0);

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
        <Text size="sm">{kindShortLabels[entry.kind]}</Text>
        <Text size="xs" c="dimmed">
          {primaryId ? listNames.get(primaryId) : <Trans>Any value</Trans>}
        </Text>
        {unlabeledCount > 0 ? (
          <Text size="xs" c="dimmed">
            <Plural
              value={unlabeledCount}
              one="# value needs a label"
              other="# values need a label"
            />
          </Text>
        ) : null}
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
  unlabeledCounts,
  kindShortLabels,
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
              unlabeledCounts={unlabeledCounts}
              kindShortLabels={kindShortLabels}
              onSelect={onSelect}
            />
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
