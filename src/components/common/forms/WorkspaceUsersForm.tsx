import {
  Box,
  Button,
  Card,
  Flex,
  Group,
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
import { Modal } from "@/lib/ui/Modal";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { WorkspaceRole } from "@/models/Workspace/types";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

export function WorkspaceUserForm(): JSX.Element {
  const [opened, open, close] = useBoolean(false);
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<WorkspaceRole | "">("");

  const workspaceRole = useWorkspaceRole();
  const workspace = useCurrentWorkspace();

  const [workspaceUsers, workspaceUsersLoading] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId: workspace.id,
    });

  // temporary until API is built for this functionality
  const handleFakeInvite = () => {
    notifySuccess({
      title: "Invite sent!",
      message: `Invite sent to ${emails} as ${role}`,
    });
    close();
  };

  const isAdmin = workspaceRole === "admin";

  const allWorkspaceUsers = workspaceUsers?.map((user) => (
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
  ));

  return (
    <Box w="100%" px="lg">
      <LoadingOverlay visible={workspaceUsersLoading} zIndex={1000} />
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
            Type or paste in emails below, separated by commas. Your workspace
            will be billed by members.
          </Text>
          <TextInput
            label="Email addresses"
            placeholder="Search names or emails"
            value={emails}
            onChange={(e) => setEmails(e.currentTarget.value)}
          />
          <Select
            label="Role"
            value={role}
            onChange={(val) => setRole(val as "member" | "admin")}
            data={[
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
            ]}
          />
          <Button onClick={handleFakeInvite} disabled={isDisabled}>
            Send invite
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
