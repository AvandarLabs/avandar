import { Text, UnstyledButton } from "@mantine/core";
import type { ApplyColumnRow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";
import type { ReactNode } from "react";

/** How many of a column's values the table lists under its name. */
const SAMPLE_VALUE_COUNT = 4;

type Props = {
  row: ApplyColumnRow;
  /** The id other cells point at to say which column they are for. */
  nameId: string;
  isSelected: boolean;
  onSelect: () => void;
};

function _formatSample(row: ApplyColumnRow): string {
  const values = row.profile?.values ?? [];
  const sample = values.slice(0, SAMPLE_VALUE_COUNT).map((item) => {
    return item.value;
  });
  return values.length > SAMPLE_VALUE_COUNT
    ? `${sample.join(", ")}…`
    : sample.join(", ");
}

/**
 * A column's name, which selects the column for the side pane, and its
 * first few values.
 */
export function ColumnNameCell({
  row,
  nameId,
  isSelected,
  onSelect,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <UnstyledButton
        id={nameId}
        fw={500}
        fz="sm"
        aria-current={isSelected || undefined}
        onClick={onSelect}
      >
        {row.column.name}
      </UnstyledButton>
      <Text size="xs" c="dimmed" truncate>
        {_formatSample(row)}
      </Text>
    </>
  );
}
