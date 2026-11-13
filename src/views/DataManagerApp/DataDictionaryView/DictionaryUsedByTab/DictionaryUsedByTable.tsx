import { Link } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ReapplyButton } from "@/components/dataDictionaries/ReapplyButton/ReapplyButton";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { HowAppliedCell } from "@/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/HowAppliedCell";
import { UsageStatusCell } from "@/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/UsageStatusCell";
import type {
  DictionaryUsage,
  DictionaryUsageRow,
} from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { ReactNode } from "react";

type Props = {
  usage: DictionaryUsage;
};

type RowProps = {
  row: DictionaryUsageRow;
  usage: DictionaryUsage;
  canEdit: boolean;
};

/** A row's status, with Re-apply when it is behind and the user can edit. */
function RowStatusCell({ row, usage, canEdit }: Readonly<RowProps>): ReactNode {
  return (
    <UsageStatusCell
      row={row}
      currentVersion={usage.currentVersion}
      action={
        canEdit && row.isBehind ? (
          <ReapplyButton
            dataset={{
              id: row.datasetId,
              name: row.datasetName,
              sourceType: row.sourceType,
            }}
            dictionaryId={usage.dictionaryId}
            dictionaryName={usage.dictionaryName}
          />
        ) : undefined
      }
    />
  );
}

function UsageRow({ row, usage, canEdit }: Readonly<RowProps>): ReactNode {
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
        <HowAppliedCell howApplied={row.howApplied} />
      </Table.Td>
      <Table.Td ta="end">{i18n.number(row.entryCount)}</Table.Td>
      <Table.Td>
        <RowStatusCell row={row} usage={usage} canEdit={canEdit} />
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * One row per dataset the dictionary is applied to, and how, with
 * Re-apply on a dataset that is behind and that the user can edit.
 */
export function DictionaryUsedByTable({ usage }: Readonly<Props>): ReactNode {
  const workspace = useCurrentWorkspace();
  const [editableIds] = DatasetClient.useGetEditableIds({
    workspaceId: workspace.id,
  });
  const editableIdSet = new Set<string>(editableIds ?? []);
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
          <Table.Th w="22%">
            <Trans>Status</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {usage.rows.map((row) => {
          return (
            <UsageRow
              key={row.datasetId}
              row={row}
              usage={usage}
              canEdit={editableIdSet.has(row.datasetId)}
            />
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
