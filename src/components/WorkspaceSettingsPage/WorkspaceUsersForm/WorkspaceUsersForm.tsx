import {
  Box,
  Button,
  Card,
  Flex,
  LoadingOverlay,
  Table,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "@ui/notifications/notify";
import { capitalize } from "@utils/strings/capitalize/capitalize";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule";
import { Workspace } from "$/models/Workspace/Workspace";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { useWorkspaceInviteModal } from "@/components/WorkspaceSettingsPage/WorkspaceUsersForm/useWorkspaceInviteModal";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceRole } from "@/hooks/workspaces/useWorkspaceRole";
import type { UserProfileWithRole } from "$/models/User/UserProfile.types";

export function WorkspaceUsersForm(): JSX.Element | null {
  const workspaceRole = useWorkspaceRole();
  const workspace = useCurrentWorkspace();
  const [workspaceUsers = [], workspaceUsersLoading] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId: workspace.id,
    });
  const [pendingInvites = [], pendingInvitesLoading] =
    WorkspaceClient.useGetPendingInvites({
      workspaceId: workspace.id,
    });
  const [removeMember, isRemovingMember] = WorkspaceClient.useRemoveMember({
    onSuccess: () => {
      return notifySuccess({ title: "User removed" });
    },
    onError: (error) => {
      return notifyError({ title: "Remove failed", message: error.message });
    },
    queriesToInvalidate: [
      WorkspaceClient.QueryKeys.getUsersForWorkspace({
        workspaceId: workspace.id,
      }),
      WorkspaceClient.QueryKeys.getPendingInvites({
        workspaceId: workspace.id,
      }),
    ],
  });

  const loadingSeats = pendingInvitesLoading || workspaceUsersLoading;

  const openInviteModal = useWorkspaceInviteModal({
    numberOfSeats:
      loadingSeats ? undefined : pendingInvites.length + workspaceUsers.length,
  });

  const isAdmin = workspaceRole === "admin";

  const { usedSeats, maxSeats, remainingSeats } =
    SubscriptionModule.getSeatInfo({
      subscription: workspace.subscription,
      numMembersInWorkspace: workspaceUsers.length + pendingInvites.length,
    });

  const allWorkspaceUsers = [...workspaceUsers, ...pendingInvites].map(
    (user: UserProfileWithRole | Workspace.Invite) => {
      return (
        <Table.Tr key={user.email}>
          <Table.Td>{"fullName" in user ? user.fullName : user.email}</Table.Td>
          <Table.Td>{capitalize(user.role)}</Table.Td>
          {isAdmin ?
            <Table.Td>
              {"userId" in user ?
                <IconTrash
                  style={{ cursor: "pointer" }}
                  size={18}
                  onClick={() => {
                    modals.openConfirmModal({
                      title: "Remove User",
                      children:
                        "Are you sure you want to remove this user from the workspace?",
                      labels: { confirm: "Remove", cancel: "Cancel" },
                      confirmProps: { color: "red" },
                      onConfirm: async () => {
                        removeMember({
                          workspaceId: workspace.id,
                          userId: user.userId,
                        });
                      },
                    });
                  }}
                />
              : user.invite_status}
            </Table.Td>
          : null}
        </Table.Tr>
      );
    },
  );

  return (
    <Box w="100%">
      <LoadingOverlay
        visible={
          workspaceUsersLoading || isRemovingMember || pendingInvitesLoading
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
          <Button disabled={loadingSeats} onClick={openInviteModal}>
            Invite User
          </Button>
        </Flex>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="300px">
                <Box pr="lg">Name</Box>
              </Table.Th>
              <Table.Th w="600px">Role</Table.Th>
              <Table.Th w="200px" /> {/* Action column. No header text. */}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{allWorkspaceUsers}</Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
}
