import { Card, Container, Table } from "@mantine/core";

const userTable = [
  { name: "Jane Doe", role: "Admin" },
  { name: "Jim Dae", role: "Admin" },
  { name: "Alice Waters", role: "Member" },
];

export function WorkspaceUserForm(): JSX.Element {
  const users: any = userTable.map((user) => {
    return (
      <Table.Tr key={user.name}>
        <Table.Td>{user.name}</Table.Td>
        <Table.Td>{user.role}</Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Container>
      <Card withBorder mt="md" p="lg">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Role</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{users}</Table.Tbody>
        </Table>
      </Card>
    </Container>
  );
}
