import { Trans } from "@lingui/react/macro";
import { Table, VisuallyHidden } from "@mantine/core";
import type { ReactNode } from "react";

/** The column headings of the Pick step's dataset table. */
export function PickDatasetsTableHead(): ReactNode {
  return (
    <Table.Thead>
      <Table.Tr>
        <Table.Th w={44}>
          <VisuallyHidden>
            <Trans>Pick</Trans>
          </VisuallyHidden>
        </Table.Th>
        <Table.Th>
          <Trans>Dataset</Trans>
        </Table.Th>
        <Table.Th>
          <Trans>Source</Trans>
        </Table.Th>
        <Table.Th ta="right">
          <Trans>Columns</Trans>
        </Table.Th>
      </Table.Tr>
    </Table.Thead>
  );
}
