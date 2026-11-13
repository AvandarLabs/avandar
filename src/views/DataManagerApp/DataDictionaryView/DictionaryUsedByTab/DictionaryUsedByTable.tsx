import { Link } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Group, Table, Text } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { DictionaryUsageRow } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { ReactNode } from "react";

type Props = {
  rows: readonly DictionaryUsageRow[];
};

function UsageRow({ row }: Readonly<{ row: DictionaryUsageRow }>): ReactNode {
  const { i18n } = useLingui();
  const workspace = useCurrentWorkspace();
  const link = AppLinks.dataManagerDatasetView({
    workspaceSlug: workspace.slug,
    datasetId: row.datasetId,
    datasetName: row.datasetName,
  });
  return (
    <Table.Tr>
      <Table.Td>
        <Link to={link.to} params={link.params} size="sm" fw={500}>
          {row.datasetName}
        </Link>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Badge
            variant="light"
            color="neutral"
            leftSection={<IconTag size={12} aria-hidden />}
          >
            <Trans>Reference</Trans>
          </Badge>
          <Text size="xs" c="dimmed">
            <Trans>data unchanged, always current</Trans>
          </Text>
        </Group>
      </Table.Td>
      <Table.Td ta="end">{i18n.number(row.entryCount)}</Table.Td>
      <Table.Td>
        <Badge variant="light" color="green">
          <Trans>Up to date</Trans>
        </Badge>
      </Table.Td>
    </Table.Tr>
  );
}

/** One row per dataset the dictionary is applied to, and how. */
export function DictionaryUsedByTable({ rows }: Readonly<Props>): ReactNode {
  return (
    <Table layout="fixed" verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <Trans>Dataset</Trans>
          </Table.Th>
          <Table.Th w="40%">
            <Trans>How it was applied</Trans>
          </Table.Th>
          <Table.Th w="10%" ta="end">
            <Trans>Entries</Trans>
          </Table.Th>
          <Table.Th w="16%">
            <Trans>Status</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => {
          return <UsageRow key={row.datasetId} row={row} />;
        })}
      </Table.Tbody>
    </Table>
  );
}
