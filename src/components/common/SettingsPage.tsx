import { Container, Stack, Title } from "@mantine/core";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { BasicForm } from "@/lib/ui/BasicForm";
import { notifyError } from "@/lib/ui/notifications/notifyError";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

export function SettingsPage(): JSX.Element {
  const workspace = useCurrentWorkspace();

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

  return (
    <Container size="sm">
      <Stack>
        <Title order={2}>Workspace Settings</Title>

        <BasicForm
          introText="Update your workspace name. Editing the slug will come later."
          fields={{
            workspaceName: {
              type: "text",
              initialValue: workspace.name,
              label: "Workspace Name",
            },
          }}
          formElements={["workspaceName"]}
          disableSubmitWhileUnchanged
          buttonAlignment="right"
          submitIsLoading={isWorkspaceSaving}
          onSubmit={(values) => {
            saveWorkspace({
              id: workspace.id,
              data: {
                name: values.workspaceName,
              },
            });
          }}
        />
      </Stack>
    </Container>
  );
}
