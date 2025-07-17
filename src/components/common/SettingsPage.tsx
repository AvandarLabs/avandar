import { Container, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { BasicForm } from "@/lib/ui/BasicForm";
import { notifyError } from "@/lib/ui/notifications/notifyError";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

export function SettingsPage(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [workspaceName, setWorkspaceName] = useState(workspace.name);

  const [saveWorkspace, isWorkspaceSaving] = WorkspaceClient.useUpdate({
    onSuccess: () => {
      notifySuccess({
        title: "Workspace name updated",
        message: "The workspace name was saved successfully.",
      });
    },
    onError: (error) => {
      notifyError({
        title: "Failed to update workspace name",
        message: error.message,
      });
    },
  });

  const onSubmit = () => {
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

        <BasicForm
          fields={{
            workspaceName: {
              type: "text",
              initialValue: workspace.name,
              label: "Workspace Name",
            },
          }}
          formElements={["workspaceName"]}
          disableSubmitWhileUnchanged={workspaceName === workspace.name}
          buttonAlignment="right"
          onSubmit={onSubmit}
        />
      </Stack>
    </Container>
  );
}
