import { Group, Stack } from "@mantine/core";
import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
import { EntryDescription } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/EntryDescription";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  name: string;
  codes: ColumnCodes.T;
  /** False when the column has a description of its own, which wins. */
  showsEntryDescription: boolean;
};

/**
 * A bound column's name in the dataset's column list: the name, the tag
 * that opens its code list, and the entry's description when the column
 * has none of its own.
 */
export function BoundColumnName({
  name,
  codes,
  showsEntryDescription,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap={2}>
      <Group gap={4} wrap="nowrap">
        <span>{name}</span>
        {codes.pairs.length > 0 ? (
          <CodeListPopover columnName={name} codes={codes} />
        ) : null}
      </Group>
      {showsEntryDescription && codes.description ? (
        <EntryDescription codes={codes} />
      ) : null}
    </Stack>
  );
}
