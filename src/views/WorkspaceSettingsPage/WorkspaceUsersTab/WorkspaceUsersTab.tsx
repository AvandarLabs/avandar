import { capitalize } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  LoadingOverlay,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconEdit, IconLock, IconTrash } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { WorkspaceInviteClient } from "@/clients/WorkspaceInviteClient";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { WorkspaceUserPermissionsDrawer } from "@/views/WorkspaceSettingsPage/WorkspaceUserPermissionsDrawer/WorkspaceUserPermissionsDrawer";
import { useWorkspaceInviteModal } from "@/views/WorkspaceSettingsPage/WorkspaceUsersForm/useWorkspaceInviteModal";
import { usePrivateResourceRemovalState } from "./usePrivateResourceRemovalState/usePrivateResourceRemovalState";
import type { WorkspaceMemberProfile } from "$/models/User/UserProfile.types";

/**
 * Members and pending invites table with invite and per-member permissions.
 */
export function WorkspaceUsersTab(): JSX.Element | null {
  const { t } = useLingui();
  const isAdmin = useIsGlobalAdmin();
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();
  const [drawerMember, setDrawerMember] =
    useState<WorkspaceMemberProfile | null>(null);

  const [workspaceUsers = [], workspaceUsersLoading] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId: workspace.id,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const [pendingInvites = [], pendingInvitesLoading] =
    WorkspaceInviteClient.useGetPendingInvites({
      workspaceId: workspace.id,
    });
  const [roleGroups = [], roleGroupsLoading] =
    PermissionsClient.useGetRoleGroupsWithMatrices({
      workspaceId: workspace.id,
    });
  const { isFetchingPrivateCounts, privateResourceTotalByUserId } =
    usePrivateResourceRemovalState(workspace.id);

  const [removeMember, isRemovingMember] = WorkspaceClient.useRemoveMember({
    onSuccess: () => {
      return notifySuccess({ title: t`User removed` });
    },
    onError: (error: Error) => {
      return notifyError({ title: t`Remove failed`, message: error.message });
    },
    queriesToInvalidate: [
      WorkspaceClient.QueryKeys.getUsersForWorkspace({
        workspaceId: workspace.id,
      }),
      WorkspaceInviteClient.QueryKeys.getPendingInvites({
        workspaceId: workspace.id,
      }),
    ],
  });

  const loadingSeats = pendingInvitesLoading || workspaceUsersLoading;
  const offline = useOfflineGate();
  const openInviteModal = useWorkspaceInviteModal({
    numberOfSeats: loadingSeats
      ? undefined
      : pendingInvites.length + workspaceUsers.length,
    roleGroups,
  });

  const { usedSeats, maxSeats, remainingSeats } =
    SubscriptionModule.getSeatInfo({
      subscription: workspace.subscription,
      numMembersInWorkspace: workspaceUsers.length + pendingInvites.length,
    });

  const isWorkspaceOwner = (userId: string): boolean => {
    return workspace.ownerId === userId;
  };

  const memberRows = workspaceUsers.map((user) => {
    const roleLabel = user.roleGroupName ?? t`Custom role`;
    return (
      <Table.Tr key={user.userId}>
        <Table.Td>{user.displayName}</Table.Td>
        <Table.Td>
          <Group gap="xs">
            <Text size="sm">{roleLabel}</Text>
            {user.tags.length > 0
              ? user.tags.map((tag) => {
                  return (
                    <Badge
                      key={tag.id}
                      size="sm"
                      color={tag.color}
                      variant="light"
                    >
                      {tag.name}
                    </Badge>
                  );
                })
              : null}
          </Group>
        </Table.Td>
        {isAdmin ? (
          <Table.Td>
            <Group gap="xs">
              {!isWorkspaceOwner(user.userId) ? (
                <>
                  <IconEdit
                    size={18}
                    style={{ cursor: "pointer" }}
                    aria-label={t`Edit permissions`}
                    onClick={() => {
                      setDrawerMember(user);
                    }}
                  />
                  <IconTrash
                    size={18}
                    style={{ cursor: "pointer" }}
                    aria-label={t`Remove member`}
                    onClick={() => {
                      const privateTotal =
                        privateResourceTotalByUserId[user.userId] ?? 0;

                      // A member who still owns resources cannot be removed:
                      // owner_id is ON DELETE NO ACTION. Admins cannot see
                      // private ones, so explain it and point at the fix
                      // rather than surfacing a foreign-key error.
                      if (privateTotal > 0) {
                        modals.open({
                          title: t`Reassign private resources first`,
                          children: (
                            <Stack gap="sm">
                              <Text size="sm">
                                <Trans>
                                  This member owns {privateTotal} private
                                  resources. They cannot be removed until
                                  someone else owns them. Private content is not
                                  visible to workspace admins, so reassign
                                  ownership from the Privacy log.
                                </Trans>
                              </Text>
                              <Button
                                leftSection={<IconLock size={16} />}
                                onClick={() => {
                                  modals.closeAll();
                                  navigate({
                                    to: "/$workspaceSlug/settings/$tabName",
                                    params: {
                                      workspaceSlug: workspace.slug,
                                      tabName: "privacy",
                                    },
                                  });
                                }}
                              >
                                <Trans>Go to Privacy log</Trans>
                              </Button>
                            </Stack>
                          ),
                        });
                        return;
                      }

                      modals.openConfirmModal({
                        title: t`Remove User`,
                        children: t`Are you sure you want to remove this user from the workspace?`,
                        labels: { confirm: t`Remove`, cancel: t`Cancel` },
                        confirmProps: { color: "red" },
                        onConfirm: () => {
                          removeMember({
                            workspaceId: workspace.id,
                            userId: user.userId,
                          });
                        },
                      });
                    }}
                  />
                </>
              ) : (
                <Text size="xs" c="dimmed">
                  <Trans>Owner</Trans>
                </Text>
              )}
            </Group>
          </Table.Td>
        ) : null}
      </Table.Tr>
    );
  });

  const inviteRows = pendingInvites.map((invite) => {
    const roleLabel = invite.roleGroupName ?? capitalize(invite.role);
    return (
      <Table.Tr key={invite.id}>
        <Table.Td>{invite.email}</Table.Td>
        <Table.Td>
          <Text size="sm">{roleLabel}</Text>
        </Table.Td>
        {isAdmin ? (
          <Table.Td>
            <Text size="sm" c="dimmed">
              {invite.inviteStatus}
            </Text>
          </Table.Td>
        ) : null}
      </Table.Tr>
    );
  });

  return (
    <Box w="100%">
      <WorkspaceUserPermissionsDrawer
        isOpen={drawerMember !== null}
        onClose={() => {
          setDrawerMember(null);
        }}
        member={drawerMember}
        roleGroups={roleGroups}
      />
      <LoadingOverlay
        visible={
          workspaceUsersLoading ||
          isFetchingPrivateCounts ||
          isRemovingMember ||
          pendingInvitesLoading ||
          roleGroupsLoading
        }
        zIndex={1000}
      />
      <Card withBorder p="lg" w="100%" maw="1000px">
        <Flex justify="space-between" align="center" mb="md">
          {!loadingSeats && maxSeats != null ? (
            <Text size="sm" c="dimmed">
              {maxSeats === 1 ? (
                <Trans>
                  {usedSeats} of {maxSeats} seat used · {remainingSeats}{" "}
                  remaining
                </Trans>
              ) : (
                <Trans>
                  {usedSeats} of {maxSeats} seats used · {remainingSeats}{" "}
                  remaining
                </Trans>
              )}
            </Text>
          ) : (
            <Box />
          )}
          {isAdmin ? (
            <OfflineGated isBlocked={offline.isBlocked}>
              <Button
                data-disabled={loadingSeats || offline.isBlocked || undefined}
                aria-disabled={loadingSeats || offline.isBlocked}
                disabled={loadingSeats}
                onClick={offline.guard(openInviteModal)}
              >
                <Trans>Invite member</Trans>
              </Button>
            </OfflineGated>
          ) : null}
        </Flex>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="280px">
                <Trans>Name</Trans>
              </Table.Th>
              <Table.Th>
                <Trans>Role & user groups</Trans>
              </Table.Th>
              {isAdmin ? <Table.Th w="120px" /> : null}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {memberRows}
            {inviteRows}
          </Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
}
