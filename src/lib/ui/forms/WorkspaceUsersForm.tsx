import {
  Box,
  Button,
  Card,
  Flex,
  Group,
  LoadingOverlay,
  Table,
  Text,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceRole } from "@/hooks/workspaces/useWorkspaceRole";
import { uuid } from "@/lib/utils/uuid";
import { UserId } from "@/models/User/types";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";
import { notifyError } from "../notifications/notifyError";
import { notifySuccess } from "../notifications/notifySuccess";

export function WorkspaceUserForm(): JSX.Element {
  const workspaceRole = useWorkspaceRole();
  const workspace = useCurrentWorkspace();

  const [workspaceUsers, workspaceUsersLoading] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId: workspace.id,
    });

  const [availableUsers, availableUsersLoading] =
    WorkspaceClient.useGetUsersAvailableForWorkspace({
      workspaceId: workspace.id,
    });

  const [addMember, isAddingMember] = WorkspaceClient.useAddMember({
    onSuccess: () => {
      notifySuccess({
        title: "User added to workspace!",
        message: "The user was successfully added to the workspace!",
      });
    },
    onError: (error) => {
      if (String(error).includes("duplicate key")) {
        notifyError({
          title: "User already added",
          message: "This user is already a member of the workspace.",
        });
      } else {
        notifyError({
          title: "Failed to add user",
          message: error.message,
        });
      }
    },
    queriesToInvalidate: [
      [WorkspaceClient.getClientName()],
      ["getUsersForWorkspace"],
    ],
  });

  const isAdmin = workspaceRole === "admin";

  const allWorkspaceUsers = workspaceUsers?.map((user) => {
    return (
      <Table.Tr key={user.fullName}>
        <Table.Td>{user.fullName}</Table.Td>
        <Table.Td>{user.role}</Table.Td>
        {isAdmin && (
          <Table.Td>
            <Group gap="xs" justify="flex-end">
              <IconPencil size={16} />
              <IconTrash size={16} />
            </Group>
          </Table.Td>
        )}
      </Table.Tr>
    );
  });

  return (
    <Box w="100%" px="lg">
      <LoadingOverlay
        visible={
          workspaceUsersLoading || availableUsersLoading || isAddingMember
        }
        zIndex={1000}
      />
      <Card withBorder mt="md" p="lg" w="100%" maw="1000px">
        <Flex justify="space-between" align="center" mb="md">
          <Text>Workspace Users</Text>
          <Button
            onClick={() =>
              addMember({
                workspaceId: workspace.id,
                userId: uuid<UserId>("313d9c5a-8d08-492e-abc9-e459827a2604"),
                role: "member",
              })
            }
            loading={isAddingMember}
          >
            Add User
          </Button>
        </Flex>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="300px">
                <Box pr="lg">Name</Box>
              </Table.Th>
              <Table.Th w="600px">Role</Table.Th>
              <Table.Th w="200x">Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{allWorkspaceUsers}</Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
}
