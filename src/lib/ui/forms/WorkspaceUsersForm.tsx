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
import { UserClient } from "@/models/User/UserClient";

export function WorkspaceUserForm(): JSX.Element {
  const workspaceRole = useWorkspaceRole();
  const workspace = useCurrentWorkspace();

  const [users, isLoading] = UserClient.useGetUsersForWorkspace({
    workspaceId: workspace.id,
  });

  const isAdmin = workspaceRole === "admin";

  const userTest = users?.map((user) => {
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
      <LoadingOverlay visible={isLoading} zIndex={1000} />
      <Card withBorder mt="md" p="lg" w="100%" maw="1000px">
        <Flex justify="space-between" align="center" mb="md">
          <Text>Workspace UserTest</Text>
          <Button>Add User</Button>
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
          <Table.Tbody>{userTest}</Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
}
