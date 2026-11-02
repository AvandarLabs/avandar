import { Trans } from "@lingui/react/macro";
import { Button, Table } from "@mantine/core";
import type { PrivateResourceCount } from "@/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient";

type Props = {
  privateResourceCount: PrivateResourceCount;
  memberName: string;
  onReassign: (userId: string) => void;
};

/** Renders one member's private-resource counts and available action. */
export function PrivateResourceRow({
  privateResourceCount,
  memberName,
  onReassign,
}: Readonly<Props>): React.ReactNode {
  const hasPrivateResources =
    privateResourceCount.privateDashboardCount > 0 ||
    privateResourceCount.privateDatasetCount > 0 ||
    privateResourceCount.privateMapCount > 0;

  return (
    <Table.Tr>
      <Table.Td>{memberName}</Table.Td>
      <Table.Td>{privateResourceCount.privateDashboardCount}</Table.Td>
      <Table.Td>{privateResourceCount.privateDatasetCount}</Table.Td>
      <Table.Td>{privateResourceCount.privateMapCount}</Table.Td>
      <Table.Td>
        {hasPrivateResources ? (
          <Button
            size="compact-sm"
            variant="subtle"
            onClick={() => {
              onReassign(privateResourceCount.userId);
            }}
          >
            <Trans>Reassign</Trans>
          </Button>
        ) : null}
      </Table.Td>
    </Table.Tr>
  );
}
