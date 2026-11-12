import { Trans } from "@lingui/react/macro";
import { Table, VisuallyHidden } from "@mantine/core";
import type { ReactNode } from "react";

/** The column headings of a group of proposed entries. */
export function ReviewEntriesTableHead(): ReactNode {
  return (
    <Table.Thead>
      <Table.Tr>
        <Table.Th w={44}>
          <VisuallyHidden>
            <Trans>Include</Trans>
          </VisuallyHidden>
        </Table.Th>
        <Table.Th>
          <Trans>Entry name and the columns it came from</Trans>
        </Table.Th>
        <Table.Th w={160}>
          <Trans>Kind</Trans>
        </Table.Th>
        <Table.Th>
          <Trans>Values seen</Trans>
        </Table.Th>
        <Table.Th w={140}>
          <VisuallyHidden>
            <Trans>What comes next</Trans>
          </VisuallyHidden>
        </Table.Th>
      </Table.Tr>
    </Table.Thead>
  );
}
