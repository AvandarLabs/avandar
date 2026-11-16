import { Trans } from "@lingui/react/macro";
import { Group, Table } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyLookups } from "@/views/DataManagerApp/ApplyDictionariesView/applyLookups";
import type { ReactNode } from "react";

type Props = {
  /** The picked columns, in the dataset's order. */
  picked: ReadonlyArray<{ column: DatasetColumn.T; pick: ColumnPick }>;
  lookups: ApplyLookups;
};

function WhatHappens({ pick }: Readonly<{ pick: ColumnPick }>): ReactNode {
  return pick.codeListId ? (
    <Group gap={6} wrap="nowrap">
      <IconTag size={14} aria-hidden />
      <Trans>Attached as reference, values unchanged</Trans>
    </Group>
  ) : (
    <Trans>Description added</Trans>
  );
}

/** One row per picked column: where its entry comes from and what happens. */
export function AttachSummaryTable({
  picked,
  lookups,
}: Readonly<Props>): ReactNode {
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="24%">
            <Trans>Column</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>From</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>What happens</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {picked.map(({ column, pick }) => {
          const dictionaryName =
            lookups.dictionaryNames.get(pick.dictionaryId) ?? "";
          const entryName = lookups.entries.get(pick.entryId)?.name ?? "";
          return (
            <Table.Tr key={column.id}>
              <Table.Td fw={500}>{column.name}</Table.Td>
              <Table.Td>
                <Trans>
                  {dictionaryName} › {entryName}
                </Trans>
              </Table.Td>
              <Table.Td>
                <WhatHappens pick={pick} />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
