import {
  Box,
  Button,
  Card,
  Flex,
  LoadingOverlay,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceRole } from "@/hooks/workspaces/useWorkspaceRole";
import { useBoolean } from "@/lib/hooks/state/useBoolean";
import { ConfirmModal } from "@/lib/ui/ConfirmationModal";
import { Modal } from "@/lib/ui/Modal";
import { notifyError } from "@/lib/ui/notifications/notifyError";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { UserId } from "@/models/User/types";
import { WorkspaceRole } from "@/models/Workspace/types";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

export function WorkspaceUserForm(): JSX.Element {
  const [opened, open, close] = useBoolean(false);
  const [confirmDeleteOpen, openConfirmDelete, closeConfirmDelete] =
    useBoolean(false);
  const [userToDelete, setUserToDelete] = useState<UserId | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");

  const workspaceRole = useWorkspaceRole();
  const workspace = useCurrentWorkspace();

  const [workspaceUsers, workspaceUsersLoading] =
    WorkspaceClient.useGetUsersForWorkspace({
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
      [WorkspaceClient.getClientName()],
      ["getUsersForWorkspace"],
    ],
  });

  const handleFakeInvite = () => {
    notifySuccess({
      title: "Invite sent!",
      message: `Invite sent to ${inviteEmail} as ${inviteRole}`,
    });
    close();
  };

  const isAdmin = workspaceRole === "admin";

  const allWorkspaceUsers = workspaceUsers?.map((user) => {
    return (
      <Table.Tr key={user.fullName}>
        <Table.Td>{user.fullName}</Table.Td>
        <Table.Td>{user.role}</Table.Td>
        {isAdmin ?
          <Table.Td>
            <Flex align="flex-end" gap="xs">
              <IconPencil size={18} />
              <IconTrash
                style={{ cursor: "pointer" }}
                size={18}
                onClick={() => {
                  setUserToDelete(user.id);
                  openConfirmDelete();
                }}
              />
            </Flex>
          </Table.Td>
        : null}
      </Table.Tr>
    );
  });

  return (
    <Box w="100%" px="lg">
      <LoadingOverlay
        visible={workspaceUsersLoading || isRemovingMember}
        zIndex={1000}
      />
      <Card withBorder mt="md" p="lg" w="100%" maw="1000px">
        <Flex justify="space-between" align="center" mb="md">
          <Text>Workspace Users</Text>
          <Button onClick={open}>Invite User</Button>
        </Flex>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="300px">
                <Box pr="lg">Name</Box>
              </Table.Th>
              <Table.Th w="600px">Role</Table.Th>
              <Table.Th w="200px">Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{allWorkspaceUsers}</Table.Tbody>
        </Table>
      </Card>

      <Modal opened={opened} onClose={close} title="Add User to Workspace">
        <Stack>
          <Text size="sm" c="dimmed">
            Type or paste in email below. Your workspace will be billed by
            members.
          </Text>
          <TextInput
            label="Email address"
            placeholder="Enter email"
            value={inviteEmail}
            onChange={(e) => {
              return setInviteEmail(e.currentTarget.value);
            }}
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(val) => {
              return setInviteRole(val as WorkspaceRole);
            }}
            data={[
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
            ]}
          />
          <Button
            onClick={handleFakeInvite}
            disabled={!inviteEmail || !inviteRole}
          >
            Send invite
          </Button>
        </Stack>
      </Modal>
      <ConfirmModal
        opened={confirmDeleteOpen}
        onClose={closeConfirmDelete}
        onConfirm={() => {
          if (userToDelete) {
            return removeMember({
              workspaceId: workspace.id,
              userId: userToDelete,
            });
          }
        }}
        loading={isRemovingMember}
        title="Remove User"
        message="Are you sure you want to remove this user from the workspace?"
        confirmText="Remove"
      />
    </Box>
  );
}
