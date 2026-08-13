import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { PrivateResourceAdminClient } from "@/clients/permissions/PrivateResourceAdminClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";

type Props = {
  /** The member whose resources are being reassigned. */
  fromUserId: string;
  onClose: () => void;
};

/**
 * Picks a new owner for a departing member's private resources.
 *
 * The admin cannot see the resources, so this transfers by owner rather than
 * per resource: it is the only shape available without leaking what exists.
 * Bulk-by-owner is also what offboarding actually needs.
 */
export function ReassignOwnerModal({
  fromUserId,
  onClose,
}: Props): React.ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [toUserId, setToUserId] = useState<string | null>(null);

  const [members = []] = WorkspaceClient.useGetUsersForWorkspace({
    workspaceId: workspace.id,
  });

  const [transferAllOwnedResources, isTransferring] =
    PrivateResourceAdminClient.useTransferAllOwnedResources({
      queriesToInvalidate: [
        PrivateResourceAdminClient.QueryKeys.getPrivateResourceCounts({
          workspaceId: workspace.id,
        }),
      ],
      onSuccess: () => {
        notifySuccess(t`Ownership reassigned.`);
        onClose();
      },
      onError: (error: Error) => {
        notifyError({ title: t`Reassign failed`, message: error.message });
      },
    });

  const options = members
    .filter((member) => {
      return member.userId !== fromUserId;
    })
    .map((member) => {
      return {
        value: member.userId,
        label: member.displayName || member.fullName,
      };
    });

  return (
    <Modal opened onClose={onClose} title={t`Reassign private resources`}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          <Trans>
            Choose who should own this member&rsquo;s private dashboards and
            datasets. You will not gain access to them.
          </Trans>
        </Text>

        <Select
          label={t`New owner`}
          data={options}
          value={toUserId}
          onChange={setToUserId}
          searchable
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!toUserId}
            loading={isTransferring}
            onClick={() => {
              if (!toUserId) {
                return;
              }
              transferAllOwnedResources({
                workspaceId: workspace.id,
                fromUserId,
                newOwnerId: toUserId,
              });
            }}
          >
            <Trans>Reassign</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
