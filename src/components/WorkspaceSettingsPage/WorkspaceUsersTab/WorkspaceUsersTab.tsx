import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  LoadingOverlay,
  Table,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "@ui";
import { capitalize } from "@utils";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule";
import { useState } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { WorkspaceInviteClient } from "@/clients/WorkspaceInviteClient";
import { WorkspaceUserPermissionsDrawer } from "@/components/WorkspaceSettingsPage/WorkspaceUserPermissionsDrawer/WorkspaceUserPermissionsDrawer";
import { useWorkspaceInviteModal } from "@/components/WorkspaceSettingsPage/WorkspaceUsersForm/useWorkspaceInviteModal";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { WorkspaceMemberProfile } from "$/models/User/UserProfile.types";

/**
 * Members and pending invites table with invite and per-member permissions.
 */
export function WorkspaceUsersTab(): JSX.Element | null {
  const isAdmin = useIsGlobalAdmin();
  const workspace = useCurrentWorkspace();
  const [drawerMember, setDrawerMember] =
    useState<WorkspaceMemberProfile | null>(null);

  const [workspaceUsers = [], workspaceUsersLoading] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId: workspace.id,
    });
  const [pendingInvites = [], pendingInvitesLoading] =
    WorkspaceInviteClient.useGetPendingInvites({
      workspaceId: workspace.id,
    });
  const [roleGroups = [], roleGroupsLoading] =
    PermissionsClient.useGetRoleGroupsWithMatrices({
      workspaceId: workspace.id,
    });

  const [removeMember, isRemovingMember] = WorkspaceClient.useRemoveMember({
    onSuccess: () => {
      return notifySuccess({ title: "User removed" });
    },
    onError: (error: Error) => {
      return notifyError({ title: "Remove failed", message: error.message });
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
  const openInviteModal = useWorkspaceInviteModal({
    numberOfSeats:
      loadingSeats ? undefined : pendingInvites.length + workspaceUsers.length,
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
    const roleLabel =
      user.roleGroupName ?? (user.role === "admin" ? "Admin" : "Member");
    return (
      <Table.Tr key={user.userId}>
        <Table.Td>{user.displayName}</Table.Td>
        <Table.Td>
          <Group gap="xs">
            <Text size="sm">{roleLabel}</Text>
            {user.tags.length > 0 ?
              user.tags.map((tag) => {
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
        {isAdmin ?
          <Table.Td>
            <Group gap="xs">
              {!isWorkspaceOwner(user.userId) ?
                <>
                  <IconEdit
                    size={18}
                    style={{ cursor: "pointer" }}
                    aria-label="Edit permissions"
                    onClick={() => {
                      setDrawerMember(user);
                    }}
                  />
                  <IconTrash
                    size={18}
                    style={{ cursor: "pointer" }}
                    aria-label="Remove member"
                    onClick={() => {
                      modals.openConfirmModal({
                        title: "Remove User",
                        children:
                          "Are you sure you want to remove this user from the workspace?",
                        labels: { confirm: "Remove", cancel: "Cancel" },
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
              : <Text size="xs" c="dimmed">
                  Owner
                </Text>
              }
            </Group>
          </Table.Td>
        : null}
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
        {isAdmin ?
          <Table.Td>
            <Text size="sm" c="dimmed">
              {invite.inviteStatus}
            </Text>
          </Table.Td>
        : null}
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
          isRemovingMember ||
          pendingInvitesLoading ||
          roleGroupsLoading
        }
        zIndex={1000}
      />
      <Card withBorder p="lg" w="100%" maw="1000px">
        <Flex justify="space-between" align="center" mb="md">
          {!loadingSeats && maxSeats != null ?
            <Text size="sm" c="dimmed">
              {`${usedSeats} of ${maxSeats} seat${maxSeats === 1 ? "" : "s"} used · ${remainingSeats} remaining`}
            </Text>
          : <Box />}
          {isAdmin ?
            <Button disabled={loadingSeats} onClick={openInviteModal}>
              Invite member
            </Button>
          : null}
        </Flex>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="280px">Name</Table.Th>
              <Table.Th>Role & tags</Table.Th>
              {isAdmin ?
                <Table.Th w="120px" />
              : null}
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
