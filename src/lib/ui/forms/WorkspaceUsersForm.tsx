import { Box, Button, Card, Flex, Group, Table, Text } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useWorkspaceRole } from "@/hooks/workspaces/useWorkspaceRole";

const userTable = [
  { name: "Jane Doe", role: "Admin" },
  { name: "Jim Dae", role: "Admin" },
  { name: "Alice Waters", role: "Member" },
];

export function WorkspaceUserForm(): JSX.Element {
  const workspaceRole = useWorkspaceRole();

  const isAdmin = workspaceRole === "admin";

  const users: any = userTable.map((user) => {
    return (
      <Table.Tr key={user.name}>
        <Table.Td>{user.name}</Table.Td>
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
      <Card withBorder mt="md" p="lg" w="100%" maw="1000px">
        <Flex justify="space-between" align="center" mb="md">
          <Text>Workspace Users</Text>
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
          <Table.Tbody>{users}</Table.Tbody>
        </Table>
      </Card>
    </Box>
  );
}
