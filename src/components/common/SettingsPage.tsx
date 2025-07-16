import {
  Button,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

export function SettingsPage() {
  const workspace = useCurrentWorkspace();
  const [workspaceName, setWorkspaceName] = useState(workspace.name);

  const [saveWorkspace, isWorkspaceSaving] = WorkspaceClient.useUpdate({
    onSuccess: () => {
      notifications.show({
        title: "Workspace name updated",
        message: "The workspace name was saved successfully.",
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Failed to update workspace name",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSave = () => {
    saveWorkspace({
      id: workspace.id,
      data: {
        name: workspaceName,
      },
    });
  };

  return (
    <Container size="sm">
      <Stack>
        <Title order={2}>Workspace Settings</Title>

        <Text c="dimmed" size="sm">
          Update your workspace name. Editing the slug will come later.
        </Text>

        <TextInput
          label="Workspace Name"
          value={workspaceName}
          onChange={(event) => setWorkspaceName(event.currentTarget.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button
            onClick={handleSave}
            loading={isWorkspaceSaving}
            disabled={workspaceName === workspace.name}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
