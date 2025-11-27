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
import { modals } from "@mantine/modals";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { capitalize } from "$/lib/utils/strings/capitalize/capitalize";
import { useState } from "react";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useWorkspaceRole } from "@/hooks/workspaces/useWorkspaceRole";
import { useBoolean } from "@/lib/hooks/state/useBoolean";
import { Modal } from "@/lib/ui/Modal";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import { notifyNotImplemented } from "@/lib/ui/notifications/notifyNotImplemented";
import { WorkspaceRole } from "@/models/Workspace/Workspace.types";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

const IS_USER_INVITES_DISABLED = isFlagEnabled(FeatureFlag.DisableUserInvites);

export function WorkspaceUserForm(): JSX.Element | null {
  const [isOpened, open, close] = useBoolean(false);
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
      WorkspaceClient.QueryKeys.getUsersForWorkspace({
        workspaceId: workspace.id,
      }),
    ],
  });

  const handleFakeInvite = () => {
    setInviteEmail("");
    setInviteRole("member");
    notifyNotImplemented();
    close();
  };

  const isAdmin = workspaceRole === "admin";

  const allWorkspaceUsers = workspaceUsers?.map((user) => {
    return (
      <Table.Tr key={user.fullName}>
        <Table.Td>{user.fullName}</Table.Td>
        <Table.Td>{capitalize(user.role)}</Table.Td>
        {isAdmin ?
          <Table.Td>
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
                  onConfirm: () => {
                    removeMember({
                      workspaceId: workspace.id,
                      userId: user.id,
                    });
                  },
                });
              }}
            />
          </Table.Td>
        : null}
      </Table.Tr>
    );
  });

  if (IS_USER_INVITES_DISABLED) {
    return (
      <Card
        withBorder
        p="xl"
        w="100%"
        maw="600px"
        mx="auto"
        mt="xl"
        shadow="sm"
        radius="md"
      >
        <Flex direction="column" align="center" justify="center" gap="md">
          <Flex
            w="4rem"
            h="4rem"
            bg="linear-gradient(135deg, #DEE2FF 0%, #A5D8FF 100%)"
            align="center"
            justify="center"
            mb="md"
            bdrs="2rem"
          >
            <IconPencil size={32} color="#4263EB" />
          </Flex>
          <Text size="lg" fw={700} ta="center">
            Inviting Users is Temporarily Disabled
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={380}>
            Inviting new users to your team is currently <b>disabled</b>.<br />
            This feature will be coming <u>very soon</u>.<br />
            Stay tuned for updates and thank you for your patience!
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Box w="100%">
      <LoadingOverlay
        visible={workspaceUsersLoading || isRemovingMember}
        zIndex={1000}
      />
      <Card withBorder p="lg" w="100%" maw="1000px">
        <Flex justify="flex-end" align="center" mb="md">
          <Button onClick={open}>Invite User</Button>
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
      <Modal opened={isOpened} onClose={close} title="Add User to Workspace">
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
    </Box>
  );
}
