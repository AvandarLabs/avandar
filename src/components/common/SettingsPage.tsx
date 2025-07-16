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
  const [name, setName] = useState(workspace.name);

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
        ...workspace,
        name,
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
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button
            onClick={handleSave}
            loading={isWorkspaceSaving}
            disabled={name === workspace.name}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
