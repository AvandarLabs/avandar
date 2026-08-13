import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Button, Loader, Stack, Table, Text } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { PrivateResourceAdminClient } from "@/clients/permissions/PrivateResourceAdminClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ReassignOwnerModal } from "./ReassignOwnerModal";

/**
 * Counts-only view of each member's private dashboards and datasets, plus an
 * ownership-reassignment action.
 *
 * Workspace admins deliberately cannot read resources their owner kept private,
 * which would otherwise make offboarding impossible: `owner_id` is
 * ON DELETE NO ACTION, so a member owning resources cannot be removed. This
 * panel is how an admin discovers that and resolves it without ever seeing the
 * content.
 */
export function PrivateResourcesPanel(): React.ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [reassignUserId, setReassignUserId] = useState<string | undefined>(
    undefined,
  );

  const [counts = [], isLoadingCounts] =
    PrivateResourceAdminClient.useGetPrivateResourceCounts({
      workspaceId: workspace.id,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });

  const [members = [], isLoadingMembers] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId: workspace.id,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });

  const nameByUserId = useMemo((): Record<string, string> => {
    const entries = members.map((member): [string, string] => {
      return [member.userId, member.displayName || member.fullName];
    });
    return Object.fromEntries(entries);
  }, [members]);

  if (isLoadingCounts || isLoadingMembers) {
    return <Loader size="sm" />;
  }

  const rows = counts.map((row) => {
    const hasAnything =
      row.privateDashboardCount > 0 || row.privateDatasetCount > 0;
    return (
      <Table.Tr key={row.userId}>
        <Table.Td>{nameByUserId[row.userId] ?? t`Unknown user`}</Table.Td>
        <Table.Td>{row.privateDashboardCount}</Table.Td>
        <Table.Td>{row.privateDatasetCount}</Table.Td>
        <Table.Td>
          {hasAnything ?
            <Button
              size="compact-sm"
              variant="subtle"
              onClick={() => {
                setReassignUserId(row.userId);
              }}
            >
              <Trans>Reassign</Trans>
            </Button>
          : null}
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Stack gap="md">
      <Alert
        color="blue"
        variant="light"
        icon={<IconLock size={16} aria-hidden />}
      >
        <Text size="sm">
          <Trans>
            Counts only. Private content is never visible to workspace admins.
            You can reassign ownership without gaining access.
          </Trans>
        </Text>
      </Alert>

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
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>

      {reassignUserId ?
        <ReassignOwnerModal
          fromUserId={reassignUserId}
          onClose={() => {
            setReassignUserId(undefined);
          }}
        />
      : null}
    </Stack>
  );
}
