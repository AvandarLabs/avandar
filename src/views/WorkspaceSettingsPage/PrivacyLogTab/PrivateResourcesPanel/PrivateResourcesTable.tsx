import { Trans } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { PrivateResourceRow } from "./PrivateResourceRow";
import type { PrivateResourceCount } from "@/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient";

type Props = {
  privateResourceCounts: readonly PrivateResourceCount[];
  nameByUserId: Readonly<Record<string, string>>;
  onReassign: (userId: string) => void;
};

/** Renders member-level private-resource counts. */
export function PrivateResourcesTable({
  privateResourceCounts,
  nameByUserId,
  onReassign,
}: Readonly<Props>): React.ReactNode {
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            <Trans>Member</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Private dashboards</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Private datasets</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Maps</Trans>
          </Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {privateResourceCounts.map((privateResourceCount) => {
          const memberName = nameByUserId[privateResourceCount.userId];
          if (!memberName) {
            return null;
          }

          return (
            <PrivateResourceRow
              key={privateResourceCount.userId}
              privateResourceCount={privateResourceCount}
              memberName={memberName}
              onReassign={onReassign}
            />
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
